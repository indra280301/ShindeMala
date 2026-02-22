-- Core Structure
CREATE DATABASE IF NOT EXISTS shinde_mala_erp;
USE shinde_mala_erp;

CREATE TABLE branches (
    branch_id INT AUTO_INCREMENT PRIMARY KEY,
    branch_name VARCHAR(100) NOT NULL,
    location TEXT,
    phone VARCHAR(20),
    gst_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    role ENUM('admin', 'waiter', 'kitchen') NOT NULL,
    profile_photo VARCHAR(255) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE
);

CREATE TABLE dining_tables (
    table_id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    table_number VARCHAR(20) NOT NULL,
    capacity INT DEFAULT 4,
    status ENUM('available', 'occupied', 'reserved', 'cleaning') DEFAULT 'available',
    current_order_id INT NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE
);

CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE
);

CREATE TABLE menu_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    category_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2) NOT NULL,
    dietary_flag ENUM('veg', 'non-veg', 'egg') DEFAULT 'veg',
    cgst_rate DECIMAL(5,2) DEFAULT 2.50,
    sgst_rate DECIMAL(5,2) DEFAULT 2.50,
    vat_rate DECIMAL(5,2) DEFAULT 10.00,
    preparation_time_minutes INT DEFAULT 15,
    is_available BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
);

CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    table_id INT NULL,
    order_type ENUM('dine_in', 'takeaway', 'zomato', 'swiggy') NOT NULL,
    waiter_id INT NULL,
    order_status ENUM('pending', 'preparing', 'ready', 'served', 'completed', 'cancelled') DEFAULT 'pending',
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    cgst_total DECIMAL(10,2) DEFAULT 0.00,
    sgst_total DECIMAL(10,2) DEFAULT 0.00,
    vat_total DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    grand_total DECIMAL(10,2) DEFAULT 0.00,
    payment_status ENUM('unpaid', 'paid') DEFAULT 'unpaid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE,
    FOREIGN KEY (table_id) REFERENCES dining_tables(table_id) ON DELETE SET NULL,
    FOREIGN KEY (waiter_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Circular foreign key on dining_tables
ALTER TABLE dining_tables
ADD FOREIGN KEY (current_order_id) REFERENCES orders(order_id) ON DELETE SET NULL;

CREATE TABLE order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    cgst_amount DECIMAL(10,2) DEFAULT 0.00,
    sgst_amount DECIMAL(10,2) DEFAULT 0.00,
    vat_amount DECIMAL(10,2) DEFAULT 0.00,
    line_total DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES menu_items(item_id) ON DELETE RESTRICT
);

CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    payment_method ENUM('cash', 'card', 'upi', 'split') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    transaction_reference VARCHAR(100),
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

CREATE TABLE inventory_items (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    unit ENUM('kg', 'litre', 'pcs', 'gm', 'ml') NOT NULL,
    current_stock DECIMAL(10,2) DEFAULT 0.00,
    minimum_stock DECIMAL(10,2) DEFAULT 0.00,
    supplier_name VARCHAR(100),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE
);

CREATE TABLE attendance_logs (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    login_time TIMESTAMP NOT NULL,
    logout_time TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    reference_id INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Initial Data
INSERT INTO branches (branch_name, location, phone, gst_number) 
VALUES ('Shinde Mala', 'Konkan', '9999999999', '27AAAAA0000A1Z5');

-- Password is 'password' hashed with bcrypt
INSERT INTO users (branch_id, username, password_hash, full_name, role)
VALUES (1, 'admin', '$2b$10$mY9RhG07tt8RpnK1r0A/0uhQ.7vYHvLjY63UM0R93a6tWsXgSXYZS', 'Super Admin', 'admin');

-- Default Categories Include: Breads, Main Course, Starters, Rice & Biryani, Soups, Snacks, Beer, Whisky, Rum, Cocktails, Mocktails, Desserts
INSERT INTO categories (branch_id, category_name, display_order) VALUES
(1, 'Starters', 1),
(1, 'Soups', 2),
(1, 'Snacks', 3),
(1, 'Breads', 4),
(1, 'Rice & Biryani', 5),
(1, 'Main Course', 6),
(1, 'Beer', 7),
(1, 'Whisky', 8),
(1, 'Rum', 9),
(1, 'Cocktails', 10),
(1, 'Mocktails', 11),
(1, 'Desserts', 12);

-- Default Tables
INSERT INTO dining_tables (branch_id, table_number) VALUES
(1, 'T1'), (1, 'T2'), (1, 'T3'), (1, 'T4'), (1, 'T5'), (1, 'T6');
