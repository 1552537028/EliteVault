import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import sql from '../config/db.js';

dotenv.config();

const router = express.Router();
const cleanEnv = (value) => String(value || '').trim().replace(/^['"]|['"]$/g, '');

function getTokenFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1];
}

function getTransporter() {
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
      auth: {
        user: cleanEnv(process.env.EMAIL_USER),
        pass: cleanEnv(process.env.EMAIL_PASS),
      },
    });
  }

  return null;
}

// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await sql`
      INSERT INTO users (name, email, password, phone)
      VALUES (${name}, ${email}, ${hashedPassword}, ${phone || null})
      RETURNING id, name, email, phone
    `;

    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
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
      expiresIn: '1h',
    });

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error logging in' });
  }
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// GET CURRENT USER
router.get('/user', async (req, res) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

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

// UPDATE CURRENT USER
router.put('/update-user', async (req, res) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { name, email, phone, password } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    let hashedPassword = null;
    if (password?.trim()) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const [updated] = await sql`
      UPDATE users
      SET
        name = ${name},
        email = ${email},
        phone = ${phone || null},
        password = COALESCE(${hashedPassword}, password)
      WHERE id = ${decoded.id}
      RETURNING id, name, email, phone
    `;

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('Forgot password request for:', email);

    const [user] = await sql`SELECT id FROM users WHERE email = ${email}`;
    console.log('DB query result:', user);

    if (!user) {
      return res.json({ message: 'If the email exists, a reset link has been sent.' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET missing!');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('Reset token generated');

    const resetLink = `${process.env.FRONTEND_URL}reset-password/${resetToken}`;
    const transporter = getTransporter();
    console.log('Transporter:', transporter ? 'ok' : 'not configured');

    if (!transporter) {
      console.warn('No transporter available');
      return res.json({ message: 'If the email exists, a reset link has been sent.' });
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `<a href="${resetLink}">${resetLink}</a>`,
    });

    console.log('Email sent successfully');
    res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot-password error:', err);
    res.status(500).json({ error: 'Error processing request', details: err.message });
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

// ADDRESS ENDPOINTS
router.post('/address', async (req, res) => {
  try {
    const { userId, address1, address2, landmark, city, state, pincode } = req.body;

    if (!userId || !address1 || !city || !state || !pincode) {
      return res.status(400).json({ error: 'Missing required address fields' });
    }

    const [newAddress] = await sql`
      INSERT INTO addresses
        (user_id, address1, address2, landmark, city, state, pincode)
      VALUES
        (${userId}, ${address1}, ${address2 || null}, ${landmark || null}, ${city}, ${state}, ${pincode})
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
      ORDER BY created_at DESC
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
        address2 = ${address2 || null},
        landmark = ${landmark || null},
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

export default router;
