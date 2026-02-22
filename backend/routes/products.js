import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import pool from "../config/db.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

// ────────────────────────────────────────────────
//  CREATE PRODUCT (updated with colors & sizes)
// ────────────────────────────────────────────────
router.post("/add", upload.array("image", 5), async (req, res) => {
  try {
    const { 
      name, description, price, offer, category, stock,
      weight, length, breadth, height, hsn_code,
      colors, sizes 
    } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: "Name and price are required" });
    }

    const imageUrls = req.files
      ? req.files.map((file) => `/uploads/${file.filename}`)
      : [];

    // Parse colors & sizes (they come as JSON strings from frontend)
    let parsedColors = [];
    let parsedSizes = [];

    try {
      if (colors && colors !== "[]") parsedColors = JSON.parse(colors);
      if (sizes  && sizes  !== "[]")  parsedSizes  = JSON.parse(sizes);
    } catch (e) {
      console.warn("Invalid colors/sizes format:", e);
    }

    const newProduct = await pool.query(
      `INSERT INTO products 
       (id, name, description, price, offer, category, stock, image_urls,
        weight, length, breadth, height, hsn_code, colors, sizes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        uuidv4(),
        name,
        description || null,
        Number(price),
        Number(offer || 0),
        category || null,
        Number(stock || 0),
        JSON.stringify(imageUrls),
        Number(weight || 0.5),
        Number(length || 20),
        Number(breadth || 15),
        Number(height || 10),
        hsn_code || '9983',
        JSON.stringify(parsedColors),
        JSON.stringify(parsedSizes)
      ]
    );

    res.status(201).json({
      message: "Product created successfully",
      product: newProduct.rows[0],
    });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/* ===========================
   GET ALL PRODUCTS (with optional search query)
=========================== */
router.get("/", async (req, res) => {
  try {
    const { q } = req.query; // Use 'q' for search term
    let query = "SELECT * FROM products";
    const params = [];

    if (q) {
      query += " WHERE LOWER(name) LIKE LOWER($1)";
      params.push(`%${q}%`);
    }

    query += " ORDER BY created_at DESC";

    const products = await pool.query(query, params);
    res.json(products.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ────────────────────────────────────────────────
//  GET PRODUCT BY ID (already returns colors & sizes)
// ────────────────────────────────────────────────
router.get("/product/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await pool.query(
      "SELECT * FROM products WHERE id = $1",
      [id]
    );

    if (product.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ────────────────────────────────────────────────
//  UPDATE PRODUCT (updated to handle colors/sizes)
// ────────────────────────────────────────────────
router.put("/update/:id", upload.array("image", 5), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, offer, category, stock, colors, sizes } = req.body;

    const existing = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const current = existing.rows[0];
    let imageUrls = current.image_urls || [];

    if (req.files?.length > 0) {
      // Optional: delete old images
      imageUrls.forEach(img => {
        const filepath = path.join("uploads", path.basename(img));
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      });
      imageUrls = req.files.map(f => `/uploads/${f.filename}`);
    }

    let parsedColors = current.colors;
    let parsedSizes  = current.sizes;

    try {
      if (colors) parsedColors = JSON.parse(colors);
      if (sizes)  parsedSizes  = JSON.parse(sizes);
    } catch {}

    const updated = await pool.query(
      `UPDATE products
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           offer = COALESCE($4, offer),
           category = COALESCE($5, category),
           stock = COALESCE($6, stock),
           image_urls = $7,
           colors = $8,
           sizes = $9
       WHERE id = $10
       RETURNING *`,
      [
        name,
        description,
        price ? Number(price) : null,
        offer ? Number(offer) : null,
        category,
        stock !== undefined ? Number(stock) : null,
        JSON.stringify(imageUrls),
        JSON.stringify(parsedColors),
        JSON.stringify(parsedSizes),
        id
      ]
    );

    res.json({
      message: "Product updated",
      product: updated.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===========================
   GET PRODUCTS BY CATEGORY
=========================== */
router.get("/category/:category", async (req, res) => {
  try {
    const { category } = req.params;

    const products = await pool.query(
      "SELECT * FROM products WHERE LOWER(category) = LOWER($1) ORDER BY created_at DESC",
      [category]
    );

    res.json(products.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===========================
   DELETE PRODUCT
=========================== */
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const productResult = await pool.query(
      "SELECT * FROM products WHERE id = $1",
      [id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = productResult.rows[0];

    // Delete all images
    if (product.image_urls && product.image_urls.length > 0) {
      product.image_urls.forEach((img) => {
        const imagePath = path.join("uploads", path.basename(img));
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    }

    await pool.query("DELETE FROM products WHERE id = $1", [id]);

    res.json({
      message: "Product and images deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;