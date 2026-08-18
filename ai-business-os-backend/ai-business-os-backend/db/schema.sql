-- Run this once against your SQL Server instance to create the database and tables.
-- CREATE DATABASE AIBusinessOS;
-- GO
-- USE AIBusinessOS;
-- GO

-- ===== USERS (role-based auth) =====
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    email NVARCHAR(150) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    role NVARCHAR(20) NOT NULL DEFAULT 'staff', -- 'admin' | 'manager' | 'staff'
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- ===== CUSTOMERS =====
CREATE TABLE customers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(150) NOT NULL,
    phone NVARCHAR(20) NOT NULL,
    email NVARCHAR(150) NULL,
    address NVARCHAR(255) NULL,
    loyalty_points INT NOT NULL DEFAULT 0,
    is_deleted BIT NOT NULL DEFAULT 0, -- soft delete
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- ===== PRODUCTS / INVENTORY =====
CREATE TABLE products (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(150) NOT NULL,
    sku NVARCHAR(50) NULL,
    category NVARCHAR(100) NULL,
    price DECIMAL(10,2) NOT NULL,
    stock_qty INT NOT NULL DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 5,
    is_deleted BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- ===== SALES (bills) =====
CREATE TABLE sales (
    id INT IDENTITY(1,1) PRIMARY KEY,
    customer_id INT NULL FOREIGN KEY REFERENCES customers(id),
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_mode NVARCHAR(20) NOT NULL DEFAULT 'cash', -- cash | card | upi | other
    created_by INT NULL FOREIGN KEY REFERENCES users(id),
    ai_summary NVARCHAR(MAX) NULL, -- AI-generated invoice narrative
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- ===== SALE ITEMS (line items per bill) =====
CREATE TABLE sale_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    sale_id INT NOT NULL FOREIGN KEY REFERENCES sales(id),
    product_id INT NOT NULL FOREIGN KEY REFERENCES products(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2) NOT NULL
);

-- ===== NOTIFICATIONS (real-time via Socket.io, persisted here too) =====
CREATE TABLE notifications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    type NVARCHAR(50) NOT NULL, -- 'low_stock' | 'new_sale' | 'system'
    message NVARCHAR(255) NOT NULL,
    is_read BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Seed one admin user so you can log in for the first time.
-- Password below is 'Admin@123' hashed with bcrypt — replace via the /api/auth/register
-- route instead in practice; this is just a fallback.
-- INSERT INTO users (name, email, password_hash, role) VALUES
-- ('Admin', 'admin@example.com', '$2a$10$replace_with_real_bcrypt_hash', 'admin');
