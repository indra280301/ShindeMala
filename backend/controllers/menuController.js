import db from '../db.js';

export const getCategories = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const [categories] = await db.query('SELECT * FROM categories WHERE branch_id = ? ORDER BY display_order', [branch_id]);
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const addCategory = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const { category_name } = req.body;

        // Get max display order
        const [maxOrder] = await db.query('SELECT MAX(display_order) as max_order FROM categories WHERE branch_id = ?', [branch_id]);
        const nextOrder = (maxOrder[0].max_order || 0) + 1;

        const [result] = await db.query(`
            INSERT INTO categories (branch_id, category_name, display_order) 
            VALUES (?, ?, ?)
        `, [branch_id, category_name, nextOrder]);

        res.status(201).json({ message: 'Category added successfully', category_id: result.insertId });
    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getMenuItems = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const [items] = await db.query(`
            SELECT m.*, c.category_name 
            FROM menu_items m 
            LEFT JOIN categories c ON m.category_id = c.category_id 
            WHERE m.branch_id = ?
        `, [branch_id]);
        res.json(items);
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const addMenuItem = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const { category_id, name, price, cost_price, cgst_rate, sgst_rate, vat_rate, dietary_flag } = req.body;

        const [result] = await db.query(`
            INSERT INTO menu_items (branch_id, category_id, name, price, cost_price, cgst_rate, sgst_rate, vat_rate, dietary_flag) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [branch_id, category_id, name, price, cost_price, cgst_rate, sgst_rate, vat_rate, dietary_flag]);

        res.status(201).json({ message: 'Menu item added successfully', item_id: result.insertId });
    } catch (error) {
        console.error('Error adding menu item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateMenuItem = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const { id } = req.params;
        const { price, cgst_rate, sgst_rate, vat_rate, is_available } = req.body;

        await db.query(`
            UPDATE menu_items 
            SET price = ?, cgst_rate = ?, sgst_rate = ?, vat_rate = ?, is_available = ? 
            WHERE item_id = ? AND branch_id = ?
        `, [price, cgst_rate, sgst_rate, vat_rate, is_available, id, branch_id]);

        res.json({ message: 'Menu item updated successfully' });
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
