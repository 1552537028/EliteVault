import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import sql from '../config/db.js';           // ← Neon serverless driver

dotenv.config();

const router = express.Router();

// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await sql`
      INSERT INTO users (name, email, password, phone)
      VALUES (${name}, ${email}, ${hashedPassword}, ${phone})
      RETURNING id, name, email, phone
    `;

    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    // You might want to check if it's unique violation → 409 Conflict
    res.status(500).json({ error: 'Error creating user' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [user] = await sql`
      SELECT * FROM users 
      WHERE email = ${email}
    `;

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { 
      expiresIn: '1h' 
    });

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error logging in' });
  }
});

// LOGOUT (client-side only – no server action needed unless using token blacklist)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// GET CURRENT USER
router.get('/user', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [user] = await sql`
      SELECT id, name, email, phone 
      FROM users 
      WHERE id = ${decoded.id}
    `;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const [user] = await sql`
      SELECT id FROM users 
      WHERE email = ${email}
    `;

    // Always return same message (security best practice)
    if (!user) {
      return res.json({ message: 'If the email exists, a reset link has been sent.' });
    }

    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { 
      expiresIn: '1h' 
    });

    const resetLink = `http://localhost:5173/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      to: email,
      subject: 'Password Reset Request',
      html: `
        <p>You requested a password reset.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
      `
    });

    res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error processing request' });
  }
});

// RESET PASSWORD
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await sql`
      UPDATE users 
      SET password = ${hashedPassword}
      WHERE id = ${decoded.id}
    `;

    res.json({ message: 'Password successfully reset' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

// ─────────────────────────────────────────────
//               Address endpoints
// ─────────────────────────────────────────────

router.post('/address', async (req, res) => {
  try {
    const { userId, address1, address2, landmark, city, state, pincode } = req.body;

    const [newAddress] = await sql`
      INSERT INTO addresses 
        (user_id, address1, address2, landmark, city, state, pincode)
      VALUES 
        (${userId}, ${address1}, ${address2}, ${landmark}, ${city}, ${state}, ${pincode})
      RETURNING *
    `;

    res.status(201).json(newAddress);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error adding address' });
  }
});

router.get('/address/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || userId === 'undefined') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const addresses = await sql`
      SELECT * FROM addresses 
      WHERE user_id = ${userId}
    `;

    res.json(addresses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching addresses' });
  }
});

router.put('/address/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { address1, address2, landmark, city, state, pincode } = req.body;

    const [updated] = await sql`
      UPDATE addresses
      SET 
        address1 = ${address1},
        address2 = ${address2},
        landmark = ${landmark},
        city     = ${city},
        state    = ${state},
        pincode  = ${pincode}
      WHERE id = ${id}
      RETURNING *
    `;

    if (!updated) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error updating address' });
  }
});

// ─────────────────────────────────────────────
//               Phone OTP (demo implementation)
// ─────────────────────────────────────────────

router.post('/send-phone-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    global.phoneOtps = global.phoneOtps || {};
    global.phoneOtps[phone] = otp;

    console.log(`OTP for ${phone}: ${otp}`); // ← remove in production!

    // TODO: Integrate real SMS provider (Twilio, MSG91, etc.)

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

router.post('/verify-phone-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!global.phoneOtps?.[phone] || global.phoneOtps[phone] !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    await sql`
      UPDATE users 
      SET phone_verified = true 
      WHERE phone = ${phone}
    `;

    delete global.phoneOtps[phone];

    res.json({ message: 'Phone verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

export default router;


export default router;
