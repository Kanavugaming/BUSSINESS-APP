-- Run this once against your PostgreSQL (Neon) database to create all tables.
-- Example: psql $DATABASE_URL -f db/schema.sql

-- ===== USERS (role-based auth) =====
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'staff', -- 'admin' | 'manager' | 'staff'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===== CUSTOMERS =====
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150) NULL,
    address VARCHAR(255) NULL,
    loyalty_points INT NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE, -- soft delete
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===== PRODUCTS / INVENTORY =====
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(50) NULL,
    category VARCHAR(100) NULL,
    price DECIMAL(10,2) NOT NULL,
    stock_qty INT NOT NULL DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 5,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===== SALES (bills) =====
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    customer_id INT NULL REFERENCES customers(id),
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_mode VARCHAR(20) NOT NULL DEFAULT 'cash', -- cash | card | upi | other
    created_by INT NULL REFERENCES users(id),
    ai_summary TEXT NULL, -- AI-generated invoice narrative
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===== SALE ITEMS (line items per bill) =====
CREATE TABLE IF NOT EXISTS sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INT NOT NULL REFERENCES sales(id),
    product_id INT NOT NULL REFERENCES products(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2) NOT NULL
);

-- ===== NOTIFICATIONS (real-time via Socket.io, persisted here too) =====
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'low_stock' | 'new_sale' | 'system'
    message VARCHAR(255) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed one admin user so you can log in for the first time.
-- Password below is 'Admin@123' hashed with bcrypt — replace via the /api/auth/register
-- route instead in practice; this is just a fallback.
-- INSERT INTO users (name, email, password_hash, role) VALUES
-- ('Admin', 'admin@example.com', '$2a$10$replace_with_real_bcrypt_hash', 'admin');
