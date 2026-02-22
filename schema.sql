CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  category VARCHAR(100),
  offer INTEGER ,
  stock INTEGER DEFAULT 0,
  image_urls JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



--RECOMEDED USERS MODEL-
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone VARCHAR(20),
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  address1 VARCHAR(255) NOT NULL,
  address2 VARCHAR(255),
  landmark VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

--RECOMEDED ORDERS MODEL-
CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  address_id          UUID REFERENCES addresses(id) ON DELETE SET NULL,
  quantity            INTEGER NOT NULL DEFAULT 1,
  total_price         NUMERIC(12,2) NOT NULL,
  status              VARCHAR(50) DEFAULT 'PENDING',
  color               VARCHAR(100),
  size                VARCHAR(50),
  logistic_order_id VARCHAR(255),
  awb                 VARCHAR(100),
  tracking_status     VARCHAR(100),
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Add product dimensions to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS weight DECIMAL(10,2) DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS length INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS breadth INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS height INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20) DEFAULT '9983';


-- Add colors & sizes to products (if not already added)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS colors JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS sizes  JSONB DEFAULT '[]'::jsonb;

-- New table: product reviews
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating     INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment    TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, user_id)   -- one review per user per product
);