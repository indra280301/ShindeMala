import pool from '../db.js';

async function migrate() {
    try {
        console.log('Creating cancelled_orders table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS cancelled_orders (
                cancel_id INT AUTO_INCREMENT PRIMARY KEY,
                branch_id INT NOT NULL,
                table_number VARCHAR(20) NOT NULL,
                waiter_name VARCHAR(100) DEFAULT 'Unknown',
                items JSON,
                cancel_reason VARCHAR(255) DEFAULT 'Not specified',
                total_amount DECIMAL(10,2) DEFAULT 0.00,
                cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE
            )
        `);

        console.log('Migration successful.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
