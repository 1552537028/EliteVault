import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

// ----------------- SIGNUP USER -----------------
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (name, email, password, phone) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone',
      [name, email, hashedPassword, phone]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating user' });
  }
});

// ----------------- LOGIN USER -----------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const response = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (response.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = response.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error logging in' });
  }
});

// ----------------- LOGOUT USER -----------------
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// ----------------- GET CURRENT USER -----------------
router.get('/user', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const response = await pool.query(
      "SELECT id, name, email, phone FROM users WHERE id = $1",
      [decoded.id]
    );

    if (response.rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    res.json(response.rows[0]);
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});
// ----------------- FORGOT PASSWORD -----------------
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.json({ message: 'If the email exists, a reset link has been sent.' });
    }

    const user = userRes.rows[0];

    // Generate JWT valid for 1 hour
    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const resetLink = `http://localhost:5174/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({
      to: email,
      subject: 'Password Reset',
      html: `
        <p>You requested a password reset.</p>
        <p>Click below to reset:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link expires in 1 hour.</p>
      `
    });

    res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error processing request' });
  }
});

// ----------------- RESET PASSWORD -----------------
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, decoded.id]);

    res.json({ message: 'Password successfully reset' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

// ----------------- ADD ADDRESS -----------------
router.post('/address', async (req, res) => {
  try {
    const { userId, address1, address2, landmark, city, state, pincode } = req.body;
    const result = await pool.query(
      `INSERT INTO addresses 
       (user_id, address1, address2, landmark, city, state, pincode) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, address1, address2, landmark, city, state, pincode]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error adding address' });
  }
});

// ----------------- GET USER ADDRESSES -----------------
router.get('/address/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || userId === "undefined") {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const result = await pool.query(
      'SELECT * FROM addresses WHERE user_id = $1',
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching addresses' });
  }
});


// ----------------- UPDATE ADDRESS -----------------
router.put('/address/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { address1, address2, landmark, city, state, pincode } = req.body;
    const result = await pool.query(
      `UPDATE addresses 
       SET address1 = $1, address2 = $2, landmark = $3, city = $4, state = $5, pincode = $6 
       WHERE id = $7 RETURNING *`,
      [address1, address2, landmark, city, state, pincode, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error updating address' });
  }
});

// ----------------- SEND PHONE OTP -----------------
router.post("/send-phone-otp", async (req, res) => {
  try {
    const { phone } = req.body;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP temporarily (better: store in DB or Redis in production)
    global.phoneOtps = global.phoneOtps || {};
    global.phoneOtps[phone] = otp;

    console.log("OTP:", otp); // For testing only

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to send OTP" });
  }
});


// ----------------- VERIFY PHONE OTP -----------------
router.post("/verify-phone-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (
      !global.phoneOtps ||
      global.phoneOtps[phone] !== otp
    ) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    await pool.query(
      "UPDATE users SET phone_verified = true WHERE phone = $1",
      [phone]
    );

    delete global.phoneOtps[phone];

    res.json({ message: "Phone verified successfully" });
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
});


export default router;
