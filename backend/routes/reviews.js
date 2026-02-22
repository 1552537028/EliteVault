import express from 'express';
import sql from '../config/db.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Middleware to verify JWT and get user ID
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user; // { id: uuid }
    next();
  });
};

// ────────────────────────────────────────────────
//  GET /reviews/:productId
//  Get all reviews for a product (public endpoint)
// ────────────────────────────────────────────────
router.get('/:productId', async (req, res) => {
  const { productId } = req.params;

  try {
    const result = await sql`
      SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.name AS user_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ${productId}
      ORDER BY r.created_at DESC
    `;

    res.json(result);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// ────────────────────────────────────────────────
//  POST /reviews
//  Submit a new review (authenticated)
// ────────────────────────────────────────────────
router.post('/', authenticateToken, async (req, res) => {
  const { productId, rating, comment } = req.body;
  const userId = req.user.id;

  if (!productId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Invalid review data' });
  }

  if (!comment || comment.trim().length < 5) {
    return res.status(400).json({ error: 'Comment must be at least 5 characters' });
  }

  try {
    // Check if user already reviewed this product
    const existing = await sql`
      SELECT id FROM reviews
      WHERE product_id = ${productId} AND user_id = ${userId}
    `;

    if (existing.length > 0) {
      return res.status(403).json({ error: 'You have already reviewed this product' });
    }

    // Insert new review
    const result = await sql`
      INSERT INTO reviews (product_id, user_id, rating, comment)
      VALUES (${productId}, ${userId}, ${rating}, ${comment.trim()})
      RETURNING id, rating, comment, created_at
    `;

    // Optional: update product's avg_rating and review_count
    await sql`
      UPDATE products
      SET 
        avg_rating = (
          SELECT ROUND(AVG(rating)::numeric, 1)
          FROM reviews
          WHERE product_id = ${productId}
        ),
        review_count = (
          SELECT COUNT(*)
          FROM reviews
          WHERE product_id = ${productId}
        )
      WHERE id = ${productId}
    `;

    // Fetch user name for response
    const userRes = await sql`SELECT name FROM users WHERE id = ${userId}`;
    const userName = userRes[0]?.name || 'Anonymous';

    const newReview = {
      ...result[0],
      user_name: userName
    };

    res.status(201).json(newReview);
  } catch (err) {
    console.error('Error creating review:', err);
    if (err.code === '23505') { // unique violation
      return res.status(409).json({ error: 'You have already reviewed this product' });
    }
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// ────────────────────────────────────────────────
//  GET /reviews/user-has-reviewed/:productId
//  Check if current user already reviewed the product
// ────────────────────────────────────────────────
router.get('/user-has-reviewed/:productId', authenticateToken, async (req, res) => {
  const { productId } = req.params;
  const userId = req.user.id;

  try {
    const result = await sql`
      SELECT id FROM reviews
      WHERE product_id = ${productId} AND user_id = ${userId}
    `;

    res.json({ hasReviewed: result.length > 0 });
  } catch (err) {
    console.error('Error checking review status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ────────────────────────────────────────────────
//  (Optional) DELETE /reviews/:reviewId
//  Allow user to delete their own review
// ────────────────────────────────────────────────
router.delete('/:reviewId', authenticateToken, async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user.id;

  try {
    const result = await sql`
      DELETE FROM reviews
      WHERE id = ${reviewId} AND user_id = ${userId}
      RETURNING id
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Review not found or not owned by you' });
    }

    // Optional: recalculate product average after deletion
    const productRes = await sql`
      SELECT product_id FROM reviews WHERE id = ${reviewId}
    `;

    if (productRes.length > 0) {
      const productId = productRes[0].product_id;
      await sql`
        UPDATE products
        SET 
          avg_rating = COALESCE((
            SELECT ROUND(AVG(rating)::numeric, 1)
            FROM reviews
            WHERE product_id = ${productId}
          ), 0),
          review_count = (
            SELECT COUNT(*)
            FROM reviews
            WHERE product_id = ${productId}
          )
        WHERE id = ${productId}
      `;
    }

    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

export default router;
