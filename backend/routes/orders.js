import express from 'express';
import sql from '../config/db.js';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

dotenv.config();

const router = express.Router();

const cleanEnv = (value) => String(value || '').trim().replace(/^['"]|['"]$/g, '');

const CASHFREE_APP_ID = cleanEnv(process.env.CASHFREE_APP_ID);
const CASHFREE_SECRET = cleanEnv(process.env.CASHFREE_SECRET);
const CASHFREE_URL = 'https://sandbox.cashfree.com/pg/orders';
const FRONTEND_URL = cleanEnv(process.env.FRONTEND_URL) || 'https://elite-vault.onrender.com';
const WEBHOOK_BASE_URL = cleanEnv(process.env.WEBHOOK_BASE_URL);

const ITHINK_API_KEY = cleanEnv(process.env.ITHINK_API_KEY);
const ITHINK_SECRET = cleanEnv(process.env.ITHINK_SECRET);
const ITHINK_URL = 'https://apiv2.ithinklogistics.com/v3';

const configuredSellerEmail = cleanEnv(process.env.SELLER_EMAIL);
const SELLER_EMAIL =
  !configuredSellerEmail || configuredSellerEmail === 'seller@yourstore.com'
    ? cleanEnv(process.env.EMAIL_USER) || 'seller@example.com'
    : configuredSellerEmail;

function createOrderMailTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    return nodemailer.createTransport({
      host: cleanEnv(process.env.SMTP_HOST),
      port: Number(cleanEnv(process.env.SMTP_PORT)),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: cleanEnv(process.env.SMTP_USER),
            pass: cleanEnv(process.env.SMTP_PASS),
          }
        : undefined,
    });
  }

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: cleanEnv(process.env.EMAIL_USER), pass: cleanEnv(process.env.EMAIL_PASS) },
    });
  }

  return null;
}

const mailTransporter = createOrderMailTransporter();

async function createIThinkOrder(order, user, product, address) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const payload = {
      api_key: ITHINK_API_KEY,
      secret: ITHINK_SECRET,
      order: {
        order_id: order.id,
        order_date: today,
        pickup_location: 'store1',
        channel_id: 'website',
        comment: `Order for ${product.name}`,
        billing_customer_name: user.name,
        billing_address: address.address1,
        billing_address_2: address.address2 || '',
        billing_city: address.city,
        billing_state: address.state,
        billing_pincode: address.pincode,
        billing_country: 'India',
        billing_email: user.email,
        billing_phone: user.phone,
        shipping_is_billing: true,
        order_items: [
          {
            name: product.name,
            sku: String(product.id).slice(0, 20),
            units: order.quantity,
            selling_price: Number(product.price),
            discount: 0,
            tax: 0,
            hsn: product.hsn_code || 9983,
          },
        ],
        payment_method: 'Prepaid',
        shipping_charges: 0,
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: 0,
        sub_total: Number(order.total_price),
        length: product.length || 20,
        breadth: product.breadth || 15,
        height: product.height || 10,
        weight: product.weight || 0.5,
      },
    };

    const response = await fetch(`${ITHINK_URL}/orders/create/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!(responseData.status === 1 || responseData.status === 'success')) {
      console.error('iThink order creation failed:', responseData.message || responseData.error || responseData);
      return null;
    }

    const awbNumber = responseData.awb || responseData.shipment_id || responseData.tracking_number;

    if (awbNumber) {
      await sql`
        UPDATE orders
        SET
          logistic_order_id = ${String(awbNumber)},
          awb = ${String(awbNumber)},
          tracking_status = ${'ORDER_CONFIRMED'}
        WHERE id = ${order.id}
      `;
    }

    return responseData;
  } catch (error) {
    console.error('iThink order error:', error);
    return null;
  }
}

async function trackIThinkOrder(awbNumber) {
  try {
    const response = await fetch(`${ITHINK_URL}/orders/track/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: ITHINK_API_KEY,
        secret: ITHINK_SECRET,
        awb: awbNumber,
      }),
    });

    return response.json();
  } catch (error) {
    console.error('iThink tracking error:', error);
    return null;
  }
}

async function sendOrderEmails(order, user, product, address, shippingMeta) {
  if (!mailTransporter) {
    console.warn('Order emails skipped: SMTP or EMAIL env vars are not configured.');
    return;
  }

  const awb = shippingMeta?.awb || shippingMeta?.shipment_id || null;

  const trackingHtml = awb
    ? `
      <div style="margin: 20px 0; padding: 15px; background-color: #f0f9ff; border-radius: 5px; border-left: 4px solid #C6A75E;">
        <h3 style="color: #333; margin-top: 0;">Tracking Information</h3>
        <p><strong>AWB Number:</strong> ${awb}</p>
        <p><strong>Courier:</strong> ${shippingMeta?.courier_name || 'iThink Logistics'}</p>
        <p><strong>Status:</strong> Order confirmed and ready for pickup</p>
      </div>
    `
    : '';

  const invoiceHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1C1C1C; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; color: #C6A75E;">Order Confirmed</h1>
      </div>
      <div style="padding: 20px;">
        <h2 style="color: #333; border-bottom: 2px solid #C6A75E; padding-bottom: 10px;">Invoice</h2>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleString('en-IN')}</p>
        <p><strong>Product:</strong> ${product.name}</p>
        <p><strong>Quantity:</strong> ${order.quantity}</p>
        <p><strong>Total:</strong> INR ${order.total_price}</p>
        ${order.color ? `<p><strong>Color:</strong> ${order.color}</p>` : ''}
        ${order.size ? `<p><strong>Size:</strong> ${order.size}</p>` : ''}
        <hr />
        <p><strong>Shipping Address:</strong></p>
        <p>${user.name}</p>
        <p>${address.address1}${address.address2 ? `, ${address.address2}` : ''}</p>
        <p>${address.city}, ${address.state} - ${address.pincode}</p>
        <p>Phone: ${user.phone || '-'}</p>
        ${trackingHtml}
      </div>
    </div>
  `;

  const from =
    cleanEnv(process.env.ORDER_EMAIL_FROM) ||
    cleanEnv(process.env.EMAIL_FROM) ||
    cleanEnv(process.env.EMAIL_USER) ||
    'no-reply@elitevault.local';

  const tasks = [
    mailTransporter.sendMail({
      from,
      to: user.email,
      subject: `Order Confirmed: #${String(order.id).slice(0, 8)}`,
      html: invoiceHtml,
    }),
  ];

  if (SELLER_EMAIL) {
    tasks.push(
      mailTransporter.sendMail({
        from,
        to: SELLER_EMAIL,
        subject: `New Order Received: #${String(order.id).slice(0, 8)}`,
        html:
          invoiceHtml +
          `
            <div style="margin-top: 20px; padding: 10px; background-color: #fff3cd; border: 1px solid #ffeeba;">
              <h3>Admin Information</h3>
              <p><strong>Buyer Email:</strong> ${user.email}</p>
              <p><strong>Buyer Phone:</strong> ${user.phone || '-'}</p>
              <p><strong>Payment Status:</strong> PAID</p>
            </div>
          `,
      })
    );
  }

  const results = await Promise.allSettled(tasks);
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(index === 0 ? 'Buyer email sent' : 'Admin email sent');
    } else {
      console.error(index === 0 ? 'Buyer email failed' : 'Admin email failed', result.reason);
    }
  });
}

async function handlePaymentSuccess(orderId) {
  try {
    const orderRes = await sql`
      SELECT * FROM orders
      WHERE id = ${orderId}
        AND status = ${'PAID'}
    `;
    const order = orderRes[0];
    if (!order) {
      return { success: false, error: 'Paid order not found' };
    }

    const userRes = await sql`SELECT * FROM users WHERE id = ${order.user_id}`;
    const productRes = await sql`SELECT * FROM products WHERE id = ${order.product_id}`;
    const addressRes = await sql`SELECT * FROM addresses WHERE id = ${order.address_id}`;

    const user = userRes[0];
    const product = productRes[0];
    const address = addressRes[0];

    if (!user || !product || !address) {
      return { success: false, error: 'Missing related data for post-processing' };
    }

    const stockUpdateRes = await sql`
      UPDATE products
      SET stock = stock - ${order.quantity}
      WHERE id = ${order.product_id} AND stock >= ${order.quantity}
      RETURNING stock
    `;

    if (stockUpdateRes.length === 0) {
      return { success: false, error: 'Insufficient stock while finalizing paid order' };
    }

    let shippingMeta = null;
    if (ITHINK_API_KEY && ITHINK_SECRET) {
      shippingMeta = await createIThinkOrder(order, user, product, address);
    }

    await sendOrderEmails(order, user, product, address, shippingMeta);

    return { success: true };
  } catch (err) {
    console.error('handlePaymentSuccess error:', err);
    return { success: false, error: err.message };
  }
}

function runPostProcessingInBackground(orderId) {
  setImmediate(async () => {
    const result = await handlePaymentSuccess(orderId);
    if (!result.success) {
      console.error('Post-payment processing failed:', result.error);
    }
  });
}

router.post('/create-session', async (req, res) => {
  try {
    const { productId, total_price, userId, addressId, quantity, color, size } = req.body;

    if (!productId || !total_price || !userId || !addressId || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const orderId = uuidv4();

    const userRes = await sql`SELECT * FROM users WHERE id = ${userId}`;
    const productRes = await sql`SELECT * FROM products WHERE id = ${productId}`;
    const addressRes = await sql`
      SELECT * FROM addresses
      WHERE id = ${addressId} AND user_id = ${userId}
    `;

    if (!userRes[0] || !productRes[0] || !addressRes[0]) {
      return res.status(404).json({ error: 'Invalid user, product, or address' });
    }

    const user = userRes[0];
    const product = productRes[0];

    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    const resolvedWebhookBaseUrl = WEBHOOK_BASE_URL || `${req.protocol}://${req.get('host')}`;

    const cashfreePayload = {
      order_id: orderId,
      order_amount: Number(total_price),
      order_currency: 'INR',
      order_meta: {
        return_url: `${FRONTEND_URL}/user-orders/me?orderId=${orderId}`,
        ...(resolvedWebhookBaseUrl
          ? { notify_url: `${resolvedWebhookBaseUrl}/orders/cashfree-webhook` }
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
      console.error('Cashfree create order failed:', errText);
      return res.status(500).json({ error: 'Cashfree API failed' });
    }

    const data = await response.json();
    if (!data.payment_session_id) {
      return res.status(500).json({ error: 'No payment session returned' });
    }

    await sql`
      INSERT INTO orders (
        id, user_id, product_id, address_id, quantity, total_price, status,
        color, size
      ) VALUES (
        ${orderId},
        ${userId},
        ${productId},
        ${addressId},
        ${quantity},
        ${total_price},
        ${'PENDING'},
        ${color || null},
        ${size || null}
      )
    `;

    res.json({ sessionId: data.payment_session_id, orderId });
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Error creating session' });
  }
});

router.post('/cashfree-webhook', async (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    if (!signature || !timestamp) {
      return res.status(400).json({ error: 'Missing webhook signature headers' });
    }

    const computedSignature = crypto.createHmac('sha256', CASHFREE_SECRET).update(timestamp + rawBody).digest('base64');

    if (signature !== computedSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = req.body || {};
    const webhookOrderId = payload.order_id || payload?.data?.order?.order_id || payload?.data?.payment?.order_id;
    const webhookPaymentStatus = (
      payload.payment_status ||
      payload.order_status ||
      payload?.data?.payment?.payment_status ||
      payload?.data?.order?.order_status ||
      ''
    ).toUpperCase();

    if (!webhookOrderId) {
      return res.status(400).json({ error: 'Missing order id in webhook payload' });
    }

    if (!['PAID', 'SUCCESS'].includes(webhookPaymentStatus)) {
      return res.status(200).json({ message: 'Ignored non-success payment event' });
    }

    const updateRes = await sql`
      UPDATE orders
      SET status = ${'PAID'}
      WHERE id = ${webhookOrderId}
        AND status <> ${'PAID'}
      RETURNING id, status
    `;

    if (updateRes.length === 0) {
      return res.status(200).json({ message: 'Order already PAID or not found' });
    }

    res.status(200).json({ message: 'Webhook accepted' });
    runPostProcessingInBackground(webhookOrderId);
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fast order status endpoint (DB only)
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderRes = await sql`
      SELECT id, status, created_at
      FROM orders
      WHERE id = ${orderId}
    `;

    if (orderRes.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRes[0];
    res.json({
      orderId: order.id,
      status: (order.status || 'PENDING').toUpperCase(),
      paid: (order.status || '').toUpperCase() === 'PAID',
    });
  } catch (err) {
    console.error('Status endpoint error:', err);
    res.status(500).json({ error: 'Error fetching order status' });
  }
});

// Gateway fallback verifier
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
      console.error('Cashfree verify API failed:', errText);
      return res.status(502).json({ error: 'Unable to verify payment from gateway' });
    }

    const payments = await response.json();
    const successfulPayment = (Array.isArray(payments) ? payments : []).find((p) =>
      ['SUCCESS', 'PAID'].includes((p.payment_status || '').toUpperCase())
    );

    if (!successfulPayment) {
      return res.json({ paid: false, status: 'PENDING' });
    }

    const updateRes = await sql`
      UPDATE orders
      SET status = ${'PAID'}
      WHERE id = ${orderId}
        AND status <> ${'PAID'}
      RETURNING id
    `;

    if (updateRes.length > 0) {
      runPostProcessingInBackground(orderId);
    }
    res.json({ paid: true, status: 'PAID' });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Error verifying payment' });
  }
});

router.get('/track/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const orderRes = await sql`
      SELECT o.*, u.name as user_name, u.email, u.phone,
             p.name as product_name, p.price as unit_price, p.image_urls,
             a.address1, a.address2, a.landmark, a.city, a.state, a.pincode
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN products p ON o.product_id = p.id
      JOIN addresses a ON o.address_id = a.id
      WHERE o.id = ${orderId}
    `;

    if (orderRes.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRes[0];

    let trackingInfo = null;
    if (order.awb && ITHINK_API_KEY && ITHINK_SECRET) {
      trackingInfo = await trackIThinkOrder(order.awb);
    }

    res.json({ order, tracking: trackingInfo });
  } catch (err) {
    console.error('Track order error:', err);
    res.status(500).json({ error: 'Error tracking order' });
  }
});

router.get('/user/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const orders = await sql`
      SELECT
        o.*,
        p.name AS product_name,
        p.image_urls,
        a.city,
        a.state
      FROM orders o
      JOIN products p ON o.product_id = p.id
      LEFT JOIN addresses a ON o.address_id = a.id
      WHERE o.user_id = ${userId}
      AND UPPER(o.status) = 'PAID'
      ORDER BY o.created_at DESC
    `;

    res.json(orders);
  } catch (err) {
    console.error('Get user orders error:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/all', async (req, res) => {
  try {
    const result = await sql`
      SELECT
        o.id, o.user_id, o.product_id, o.quantity, o.total_price,
        o.status, o.created_at, o.awb, o.color, o.size,
        p.name AS product_name, p.image_urls,
        u.name AS user_name, u.email, u.phone
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `;

    res.json(result);
  } catch (err) {
    console.error('Get all orders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
