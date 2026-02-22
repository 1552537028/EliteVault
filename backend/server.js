import express from 'express';
import auth from './routes/auth.js';
import products from './routes/products.js';
import orders from './routes/orders.js';
import reviewsRouter from './routes/reviews.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

import bodyParser from 'body-parser';

// Before app.use(express.json())
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
// Enable CORS for your frontend
const allowedOrigins = ['https://elite-vault.onrender.com'];

app.use(cors({
  origin: function(origin, callback){
    if(!origin) return callback(null, true); // allow non-browser requests
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json());

// Create uploads directory if it doesn't exist
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use('/auth', auth);
app.use('/products', products);
app.use('/orders', orders);
app.use('/reviews', reviewsRouter);


app.get('/', (req, res) => {
  res.send('Welcome to the EliteVault API');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
