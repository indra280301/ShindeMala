import db from '../db.js';
import { io } from '../index.js';

export const getTables = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const role = req.user.role;
        const user_id = req.user.user_id;

        if (role === 'waiter') {
            const [userCheck] = await db.query('SELECT is_active FROM users WHERE user_id = ?', [user_id]);
            if (!userCheck[0] || !userCheck[0].is_active) {
                return res.status(403).json({ error: 'Account inactive. Contact manager.' });
            }

            const [tables] = await db.query(
                `SELECT d.* FROM dining_tables d 
                 JOIN waiter_tables w ON d.table_id = w.table_id 
                 WHERE d.branch_id = ? AND w.waiter_id = ?`,
                [branch_id, user_id]
            );
            return res.json(tables);
        }

        const [tables] = await db.query('SELECT * FROM dining_tables WHERE branch_id = ?', [branch_id]);
        res.json(tables);
    } catch (error) {
        console.error('Error fetching tables:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateTableStatus = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const { id } = req.params;
        const { status } = req.body;

        if (status === 'available') {
            await db.query('UPDATE dining_tables SET status = ?, current_order_id = NULL WHERE table_id = ? AND branch_id = ?', [status, id, branch_id]);
        } else {
            await db.query('UPDATE dining_tables SET status = ? WHERE table_id = ? AND branch_id = ?', [status, id, branch_id]);
        }

        res.json({ message: 'Table status updated successfully' });
        io.emit('table_updated');
    } catch (error) {
        console.error('Error updating table status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createTable = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const { table_number, capacity, section, shape, grid_row, grid_col } = req.body;
        const [result] = await db.query(
            'INSERT INTO dining_tables (branch_id, table_number, capacity, section, shape, grid_row, grid_col, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [branch_id, table_number, capacity || 4, section || 'Main', shape || 'square', grid_row, grid_col, 'available']
        );
        res.status(201).json({ message: 'Table created', table_id: result.insertId });
        io.emit('table_updated');
    } catch (error) {
        console.error('Error creating table:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateTable = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const { id } = req.params;
        const { table_number, capacity, section, shape, grid_row, grid_col } = req.body;
        await db.query(
            'UPDATE dining_tables SET table_number = ?, capacity = ?, section = ?, shape = ?, grid_row = ?, grid_col = ? WHERE table_id = ? AND branch_id = ?',
            [table_number, capacity, section, shape, grid_row, grid_col, id, branch_id]
        );
        res.json({ message: 'Table updated successfully' });
        io.emit('table_updated');
    } catch (error) {
        console.error('Error updating table:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteTable = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const { id } = req.params;
        // Basic check if occupied
        const [table] = await db.query('SELECT status FROM dining_tables WHERE table_id = ? AND branch_id = ?', [id, branch_id]);
        if (table.length > 0 && table[0].status !== 'available' && table[0].status !== 'cleaning') {
            return res.status(400).json({ error: 'Cannot delete an occupied or reserved table.' });
        }
        await db.query('DELETE FROM dining_tables WHERE table_id = ? AND branch_id = ?', [id, branch_id]);
        res.json({ message: 'Table deleted successfully' });
        io.emit('table_updated');
    } catch (error) {
        console.error('Error deleting table:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
