import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import sql from "../config/db.js";

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

    const [newProduct] = await sql`
      INSERT INTO products 
      (id, name, description, price, offer, category, stock, image_urls,
       weight, length, breadth, height, hsn_code, colors, sizes)
      VALUES (
        ${uuidv4()},
        ${name},
        ${description || null},
        ${Number(price)},
        ${Number(offer || 0)},
        ${category || null},
        ${Number(stock || 0)},
        ${JSON.stringify(imageUrls)},
        ${Number(weight || 0.5)},
        ${Number(length || 20)},
        ${Number(breadth || 15)},
        ${Number(height || 10)},
        ${hsn_code || "9983"},
        ${JSON.stringify(parsedColors)},
        ${JSON.stringify(parsedSizes)}
      )
      RETURNING *
    `;

    res.status(201).json({
      message: "Product created successfully",
      product: newProduct,
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
    let products;
    if (q) {
      products = await sql`
        SELECT * FROM products
        WHERE LOWER(name) LIKE LOWER(${"%" + q + "%"})
        ORDER BY created_at DESC
      `;
    } else {
      products = await sql`
        SELECT * FROM products
        ORDER BY created_at DESC
      `;
    }

    res.json(products);
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
    const product = await sql`
      SELECT * FROM products WHERE id = ${id}
    `;

    if (product.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product[0]);
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

    const existing = await sql`SELECT * FROM products WHERE id = ${id}`;
    if (existing.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const current = existing[0];
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

    const [updated] = await sql`
      UPDATE products
      SET name = COALESCE(${name}, name),
          description = COALESCE(${description}, description),
          price = COALESCE(${price ? Number(price) : null}, price),
          offer = COALESCE(${offer ? Number(offer) : null}, offer),
          category = COALESCE(${category}, category),
          stock = COALESCE(${stock !== undefined ? Number(stock) : null}, stock),
          image_urls = ${JSON.stringify(imageUrls)},
          colors = ${JSON.stringify(parsedColors)},
          sizes = ${JSON.stringify(parsedSizes)}
      WHERE id = ${id}
      RETURNING *
    `;

    res.json({
      message: "Product updated",
      product: updated
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

    const products = await sql`
      SELECT * FROM products
      WHERE LOWER(category) = LOWER(${category})
      ORDER BY created_at DESC
    `;

    res.json(products);
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

    const productResult = await sql`
      SELECT * FROM products WHERE id = ${id}
    `;

    if (productResult.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = productResult[0];

    // Delete all images
    if (product.image_urls && product.image_urls.length > 0) {
      product.image_urls.forEach((img) => {
        const imagePath = path.join("uploads", path.basename(img));
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    }

    await sql`DELETE FROM products WHERE id = ${id}`;

    res.json({
      message: "Product and images deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
