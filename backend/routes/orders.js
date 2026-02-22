// Updated orders.js (with stock update and other post-payment logic in both webhook and verify-payment)
import express from 'express';
import pool from '../config/db.js';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import crypto from 'crypto';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';

dotenv.config();
const router = express.Router();

// ================= CONFIG =================
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET = process.env.CASHFREE_SECRET;
const CASHFREE_URL = 'https://sandbox.cashfree.com/pg/orders';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || '';

// iThink Logistics Configuration
const ITHINK_API_KEY = process.env.ITHINK_API_KEY;
const ITHINK_SECRET = process.env.ITHINK_SECRET;
const ITHINK_URL = 'https://apiv2.ithinklogistics.com/v3'; // iThink API v3 endpoint

const SELLER_EMAIL = process.env.SELLER_EMAIL || 'seller@example.com';

// Seller pickup address (configure this in your .env)
const SELLER_PICKUP = {
  name: process.env.SELLER_NAME || 'Your Store Name',
  address: process.env.SELLER_ADDRESS || 'Your Store Address',
  city: process.env.SELLER_CITY || 'Your City',
  state: process.env.SELLER_STATE || 'Your State',
  pincode: process.env.SELLER_PINCODE || '123456',
  phone: process.env.SELLER_PHONE || '9876543210',
  email: process.env.SELLER_EMAIL || 'seller@example.com'
};

// ================= RAW BODY FOR WEBHOOK =================
router.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// Helper function to create iThink order
async function createIThinkOrder(order, user, product, address) {
  try {
    // Format: YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate dimensions based on product (you can store these in product table)
    const weight = product.weight || 0.5; // in kg
    const length = product.length || 20; // in cm
    const breadth = product.breadth || 15; // in cm
    const height = product.height || 10; // in cm

    const iThinkPayload = {
      api_key: ITHINK_API_KEY,
      secret: ITHINK_SECRET,
      order: {
        order_id: order.id,
        order_date: today,
        pickup_location: "store1",
        channel_id: "website",
        comment: `Order for ${product.name}`,
        
        billing_customer_name: user.name,
        billing_address: address.address1,
        billing_address_2: address.address2 || '',
        billing_city: address.city,
        billing_state: address.state,
        billing_pincode: address.pincode,
        billing_country: "India",
        billing_email: user.email,
        billing_phone: user.phone,
        
        shipping_is_billing: true,
        
        order_items: [{
          name: product.name,
          sku: product.id.substring(0, 20), // SKU should be limited
          units: order.quantity,
          selling_price: Number(product.price),
          discount: 0,
          tax: 0,
          hsn: 9983 // Default HSN code, you can add this to product table
        }],
        
        payment_method: "Prepaid",
        shipping_charges: 0,
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: 0,
        sub_total: Number(order.total_price),
        length: length,
        breadth: breadth,
        height: height,
        weight: weight
      }
    };

    console.log('📦 iThink Payload:', JSON.stringify(iThinkPayload, null, 2));

    const response = await fetch(`${ITHINK_URL}/orders/create/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(iThinkPayload)
    });

    const responseData = await response.json();
    console.log('📦 iThink Response:', responseData);

    if (responseData.status === 1 || responseData.status === 'success') {
      // Update order with iThink tracking details
      const awbNumber = responseData.awb || responseData.shipment_id || responseData.tracking_number;
      
      if (awbNumber) {
        await pool.query(
          `UPDATE orders 
           SET shiprocket_order_id = $1, 
               awb = $2,
               tracking_status = $3 
           WHERE id = $4`,
          [awbNumber, awbNumber, 'ORDER_CONFIRMED', order.id]
        );
      }

      return responseData;
    } else {
      console.error('❌ iThink order creation failed:', responseData.message || responseData.error);
      return null;
    }
  } catch (error) {
    console.error('❌ iThink order error:', error);
    return null;
  }
}

// Helper function to track iThink order
async function trackIThinkOrder(awbNumber) {
  try {
    const payload = {
      api_key: ITHINK_API_KEY,
      secret: ITHINK_SECRET,
      awb: awbNumber
    };

    const response = await fetch(`${ITHINK_URL}/orders/track/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('📦 iThink Track Response:', data);
    return data;
  } catch (error) {
    console.error('❌ iThink tracking error:', error);
    return null;
  }
}

// Helper function to handle post-payment success logic (stock update, shipping, emails)
async function handlePaymentSuccess(orderId) {
  try {
    // Fetch order, user, product, address
    const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = orderRes.rows[0];
    if (!order) return { success: false, error: 'Order not found' };

    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [order.user_id]);
    const productRes = await pool.query('SELECT * FROM products WHERE id = $1', [order.product_id]);
    const addressRes = await pool.query('SELECT * FROM addresses WHERE id = $1', [order.address_id]);

    const user = userRes.rows[0];
    const product = productRes.rows[0];
    const address = addressRes.rows[0];

    if (!user || !product || !address) return { success: false, error: 'Missing related data' };

    // 1️⃣ Reduce stock quantity (atomic decrement to prevent race conditions)
    const stockUpdateRes = await pool.query(
      'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING stock',
      [order.quantity, order.product_id]
    );

    if (stockUpdateRes.rowCount === 0) {
      return { success: false, error: 'Insufficient stock or update failed' };
    }

    console.log("✅ Stock updated successfully");

    // 2️⃣ Create iThink Logistics order
    let iThinkResponse = null;
    if (ITHINK_API_KEY && ITHINK_SECRET) {
      iThinkResponse = await createIThinkOrder(order, user, product, address);
      console.log("📦 iThink Logistics Response:", iThinkResponse);
    }

    // 3️⃣ Send emails
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    // Enhanced email content with tracking info
    const trackingHtml = iThinkResponse?.awb || iThinkResponse?.shipment_id ? `
      <div style="margin: 20px 0; padding: 15px; background-color: #f0f9ff; border-radius: 5px; border-left: 4px solid #C6A75E;">
        <h3 style="color: #333; margin-top: 0;">📦 Tracking Information</h3>
        <p><strong>AWB Number:</strong> ${iThinkResponse.awb || iThinkResponse.shipment_id}</p>
        <p><strong>Courier:</strong> ${iThinkResponse.courier_name || 'iThink Logistics'}</p>
        <p><strong>Status:</strong> Order confirmed and ready for pickup</p>
        <p><strong>Track your order:</strong> <a href="https://www.ithinklogistics.com/track/?awb=${iThinkResponse.awb || iThinkResponse.shipment_id}" style="color: #C6A75E;">Click here to track</a></p>
      </div>
    ` : '';

    const invoiceHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1C1C1C; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; color: #C6A75E;">Order Confirmed!</h1>
        </div>
        
        <div style="padding: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #C6A75E; padding-bottom: 10px;">Invoice</h2>
          
          <div style="margin: 20px 0;">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
          
          <div style="margin: 20px 0; background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
            <h3 style="margin-top: 0;">Product Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td><strong>Product:</strong></td>
                <td>${product.name}</td>
              </tr>
              <tr>
                <td><strong>Quantity:</strong></td>
                <td>${order.quantity}</td>
              </tr>
              ${order.color ? `<tr><td><strong>Color:</strong></td><td>${order.color}</td></tr>` : ''}
              ${order.size ? `<tr><td><strong>Size:</strong></td><td>${order.size}</td></tr>` : ''}
              <tr>
                <td><strong>Unit Price:</strong></td>
                <td>₹${product.price}</td>
              </tr>
              <tr>
                <td><strong>Total Amount:</strong></td>
                <td><strong>₹${order.total_price}</strong></td>
              </tr>
            </table>
          </div>
          
          <div style="margin: 20px 0;">
            <h3>Shipping Address</h3>
            <p><strong>${user.name}</strong></p>
            <p>${address.address1}${address.address2 ? ', ' + address.address2 : ''}</p>
            <p>${address.landmark ? address.landmark + ', ' : ''}${address.city}, ${address.state} - ${address.pincode}</p>
            <p>Phone: ${user.phone}</p>
          </div>
          
          ${trackingHtml}
          
          <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 5px; text-align: center;">
            <p style="margin: 0;">Thank you for shopping with us!</p>
            <p style="margin: 10px 0 0; color: #666; font-size: 14px;">We hope you enjoy your purchase.</p>
          </div>
        </div>
      </div>
    `;

    try {
      // 1️⃣ Send to buyer
      await transporter.sendMail({
        from: `"Your Store" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: `Order Confirmed: #${order.id.slice(0, 8)}`,
        html: invoiceHtml,
      });
      console.log("✅ Buyer email sent");

      // 2️⃣ Send to merchant/seller
      await transporter.sendMail({
        from: `"Your Store" <${process.env.EMAIL_USER}>`,
        to: SELLER_EMAIL,
        subject: 'New Order Received',
        html: invoiceHtml + `
          <div style="margin-top: 20px; padding: 10px; background-color: #fff3cd; border: 1px solid #ffeeba;">
            <h3>Admin Information</h3>
            <p><strong>Buyer Phone:</strong> ${user.phone}</p>
            <p><strong>Payment Status:</strong> PAID</p>
            <p><strong>Shipping Status:</strong> ${iThinkResponse ? 'iThink order created: ' + (iThinkResponse.awb || iThinkResponse.shipment_id) : 'Pending'}</p>
          </div>
        `,
      });
      console.log("✅ Seller email sent");

    } catch (emailErr) {
      console.error("❌ Email sending failed:", emailErr);
    }

    return { success: true };
  } catch (err) {
    console.error('❌ handlePaymentSuccess error:', err);
    return { success: false, error: err.message };
  }
}

// ---------------- CREATE PAYMENT SESSION ----------------
router.post('/create-session', async (req, res) => {
  try {
    const { productId, total_price, userId, addressId, quantity, color, size } = req.body;

    if (!productId || !total_price || !userId || !addressId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const orderId = uuidv4();

    // Fetch user, product, address
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const productRes = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
    const addressRes = await pool.query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [addressId, userId]
    );

    if (!userRes.rows[0] || !productRes.rows[0] || !addressRes.rows[0]) {
      return res.status(404).json({ error: 'Invalid user, product, or address' });
    }

    const user = userRes.rows[0];
    const product = productRes.rows[0];

    // Check stock availability
    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Create Cashfree payment session
    const cashfreePayload = {
      order_id: orderId,
      order_amount: Number(total_price),
      order_currency: 'INR',
      order_meta: {
        return_url: `${FRONTEND_URL}/payment-status?orderId=${orderId}`,
        ...(WEBHOOK_BASE_URL
          ? { notify_url: `${WEBHOOK_BASE_URL}/api/orders/cashfree-webhook` }
          : {}),
      },
      customer_details: {
        customer_id: String(user.id),
        customer_name: user.name,
        customer_email: user.email,
        customer_phone: user.phone,
      },
    };

    const response = await fetch(CASHFREE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET,
      },
      body: JSON.stringify(cashfreePayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ Cashfree error:", errText);
      return res.status(500).json({ error: 'Cashfree API failed' });
    }

    const data = await response.json();
    if (!data.payment_session_id) {
      return res.status(500).json({ error: 'No payment session returned' });
    }

    await pool.query(`
  INSERT INTO orders (
    id, user_id, product_id, address_id, quantity, total_price, status,
    color, size
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
  ) RETURNING id
`, [
  orderId,
  userId,
  productId,
  addressId,
  quantity,
  total_price,
  'PENDING',
  color || null,     // ← important: allow NULL
  size || null
]);

    res.json({ sessionId: data.payment_session_id, orderId });

  } catch (err) {
    console.error("❌ Create session error:", err);
    res.status(500).json({ error: 'Error creating session' });
  }
});

// ---------------- CASHFREE WEBHOOK ----------------
router.post('/cashfree-webhook', async (req, res) => {
  try {
    console.log("🔥 CASHFREE WEBHOOK HIT", {
      body: req.body,
      headers: req.headers
    });

    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    console.log("🔑 Raw Body:", rawBody);
    console.log("🔑 Received Signature:", signature);

    // Verify signature
    const computedSignature = crypto.createHmac('sha256', CASHFREE_SECRET)
      .update(timestamp + rawBody)
      .digest('base64');

    console.log("🔑 Computed Signature:", computedSignature);

    if (signature !== computedSignature) {
      console.warn("❌ Invalid signature");
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = req.body || {};
    const webhookOrderId =
      payload.order_id ||
      payload?.data?.order?.order_id ||
      payload?.data?.payment?.order_id;
    const webhookPaymentStatus = (
      payload.payment_status ||
      payload.order_status ||
      payload?.data?.payment?.payment_status ||
      payload?.data?.order?.order_status ||
      ''
    ).toUpperCase();

    console.log("📦 Webhook Parsed Order ID:", webhookOrderId);
    console.log("📦 Webhook Parsed Status:", webhookPaymentStatus);

    // Only proceed for successful payments
    if (!['PAID', 'SUCCESS'].includes(webhookPaymentStatus)) {
      console.log("⚠️ Payment not completed:", webhookPaymentStatus);
      return res.sendStatus(200);
    }

    // Check if the order already has a PAID status
    const existingOrderRes = await pool.query(
      'SELECT status FROM orders WHERE id = $1',
      [webhookOrderId]
    );

    console.log("🔍 Existing Order Query Result:", existingOrderRes.rows);

    if (existingOrderRes.rows.length === 0) {
      console.warn("❌ Order not found:", webhookOrderId);
      return res.status(404).json({ error: 'Order not found' });
    }

    const existingStatus = existingOrderRes.rows[0].status;
    console.log("🔍 Existing Order Status:", existingStatus);

    if ((existingStatus || '').toUpperCase() === 'PAID') {
      console.log("⚠️ Order already marked as PAID:", webhookOrderId);
      return res.status(200).json({ message: 'Order already paid' });
    }

    // Update order status
    const orderRes = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      ['PAID', webhookOrderId]
    );

    console.log("✅ Order Update Query Result:", orderRes.rows);

    const order = orderRes.rows[0];
    if (!order) {
      console.error("❌ Failed to update order status:", webhookOrderId);
      return res.status(500).json({ error: 'Failed to update order status' });
    }

    console.log("✅ Order status updated to PAID for order_id:", webhookOrderId);

    // Handle post-payment logic (stock, shipping, emails)
    const result = await handlePaymentSuccess(webhookOrderId);
    if (!result.success) {
      console.error("❌ Post-payment processing failed:", result.error);
      // Note: You may want to queue this for retry, but for now, log and continue
    }

    res.status(200).json({ message: 'Webhook processed successfully' });

  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------- VERIFY PAYMENT (FALLBACK) ----------------
router.get('/verify-payment/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const response = await fetch(`${CASHFREE_URL}/${orderId}/payments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ Cashfree verify API failed:", errText);
      return res.status(502).json({ error: 'Unable to verify payment from gateway' });
    }

    const payments = await response.json();
    const successfulPayment = (Array.isArray(payments) ? payments : []).find((p) =>
      ['SUCCESS', 'PAID'].includes((p.payment_status || '').toUpperCase())
    );

    if (!successfulPayment) {
      return res.json({ paid: false, status: 'PENDING' });
    }

    // Update status if not already PAID
    const updateRes = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 AND status <> $1 RETURNING *',
      ['PAID', orderId]
    );

    if (updateRes.rowCount > 0) {
      console.log("✅ Order status updated to PAID via fallback for order_id:", orderId);
      
      // Handle post-payment logic (stock, shipping, emails) only if status was updated
      const result = await handlePaymentSuccess(orderId);
      if (!result.success) {
        console.error("❌ Post-payment processing failed in fallback:", result.error);
        // Note: You may want to handle this differently, e.g., return error but still confirm payment
      }
    } else {
      console.log("⚠️ Order already PAID, skipping post-processing");
    }

    res.json({ paid: true, status: 'PAID' });
  } catch (err) {
    console.error("❌ Verify payment error:", err);
    res.status(500).json({ error: 'Error verifying payment' });
  }
});

// ---------------- TRACK ORDER ----------------
router.get('/track/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const orderRes = await pool.query(
      `SELECT o.*, u.name as user_name, u.email, u.phone,
              p.name as product_name, p.price as unit_price, p.image_urls,
              a.address1, a.address2, a.landmark, a.city, a.state, a.pincode
       FROM orders o
       JOIN users u ON o.user_id = u.id
       JOIN products p ON o.product_id = p.id
       JOIN addresses a ON o.address_id = a.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRes.rows[0];

    // Get tracking info from iThink if AWB exists
    let trackingInfo = null;
    if (order.awb && ITHINK_API_KEY && ITHINK_SECRET) {
      trackingInfo = await trackIThinkOrder(order.awb);
    }

    res.json({
      order: order,
      tracking: trackingInfo
    });

  } catch (err) {
    console.error('❌ Track order error:', err);
    res.status(500).json({ error: 'Error tracking order' });
  }
});
// ────────────────────────────────────────────────
//  GET CURRENT USER'S ORDERS (/api/orders/user/me)
// ────────────────────────────────────────────────
// Preferred route – no :userId in URL
router.get('/user/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;  // this is the real UUID

    const orders = await pool.query(
      `SELECT o.*, p.name as product_name, p.image_urls,
              a.city, a.state
       FROM orders o
       JOIN products p ON o.product_id = p.id
       JOIN addresses a ON o.address_id = a.id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [userId]
    );

    res.json(orders.rows);
  } catch (err) {
    console.error('Get user orders error:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// ────────────────────────────────────────────────
//  GET ALL ORDERS – ADMIN ONLY (/api/orders/all)
// ────────────────────────────────────────────────
router.get('/all', async (req, res) => {
  try {
    // TODO: Add proper admin middleware check in production
    // For now: anyone with valid token can access (demo only)

    const result = await pool.query(`
      SELECT 
        o.id, o.user_id, o.product_id, o.quantity, o.total_price,
        o.status, o.created_at, o.awb, o.color, o.size,
        p.name AS product_name, p.image_urls,
        u.name AS user_name, u.email, u.phone
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Get all orders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;