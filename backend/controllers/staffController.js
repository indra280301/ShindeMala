import bcrypt from 'bcrypt';
import db from '../db.js';

// ADMIN: Get all staff
export const getStaff = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const [staff] = await db.query(
            'SELECT user_id, username, full_name, phone, role, is_active, profile_photo FROM users WHERE branch_id = ?',
            [branch_id]
        );
        res.json(staff);
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ADMIN: Create new staff
export const createStaff = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const { username, password, full_name, phone, role } = req.body;

        if (!username || !password || !role) {
            return res.status(400).json({ error: 'Username, password, and role are required' });
        }

        const [existing] = await db.query('SELECT user_id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) return res.status(400).json({ error: 'Username already exists' });

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const profile_photo = req.file ? `/uploads/profiles/${req.file.filename}` : null;

        await db.query(
            'INSERT INTO users (username, password_hash, full_name, phone, role, branch_id, profile_photo) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, password_hash, full_name, phone, role, branch_id, profile_photo]
        );

        res.status(201).json({ message: 'Staff member created successfully' });
    } catch (error) {
        console.error('Error creating staff:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ADMIN: Update staff details (excluding password)
export const updateStaff = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const { id } = req.params;
        const { full_name, phone, role } = req.body;

        if (req.file) {
            const profile_photo = `/uploads/profiles/${req.file.filename}`;
            await db.query(
                'UPDATE users SET full_name = ?, phone = ?, role = ?, profile_photo = ? WHERE user_id = ? AND branch_id = ?',
                [full_name, phone, role, profile_photo, id, branch_id]
            );
        } else {
            await db.query(
                'UPDATE users SET full_name = ?, phone = ?, role = ? WHERE user_id = ? AND branch_id = ?',
                [full_name, phone, role, id, branch_id]
            );
        }

        res.json({ message: 'Staff details updated' });
    } catch (error) {
        console.error('Error updating staff:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ADMIN: Update staff password
export const updateStaffPassword = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const { id } = req.params;
        const { password } = req.body;

        if (!password) return res.status(400).json({ error: 'Password is required' });

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        await db.query(
            'UPDATE users SET password_hash = ? WHERE user_id = ? AND branch_id = ?',
            [password_hash, id, branch_id]
        );

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ADMIN: Toggle Active Status
export const toggleStaffActive = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const { id } = req.params;

        await db.query(
            'UPDATE users SET is_active = NOT is_active WHERE user_id = ? AND branch_id = ?',
            [id, branch_id]
        );

        res.json({ message: 'Staff active status toggled' });
    } catch (error) {
        console.error('Error toggling staff status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ADMIN: Get Assigned Tables for a Waiter
export const getAssignedTables = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const { id } = req.params; // waiter user_id

        const [tables] = await db.query(
            'SELECT table_id FROM waiter_tables WHERE waiter_id = ? AND branch_id = ?',
            [id, branch_id]
        );

        res.json(tables.map(t => t.table_id));
    } catch (error) {
        console.error('Error fetching assigned tables:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ADMIN: Assign Tables to a Waiter
export const assignTables = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const { id } = req.params; // waiter user_id
        const { table_ids } = req.body; // array of table_ids

        await db.query('DELETE FROM waiter_tables WHERE waiter_id = ? AND branch_id = ?', [id, branch_id]);

        if (table_ids && table_ids.length > 0) {
            const values = table_ids.map(table_id => [id, table_id, branch_id]);
            await db.query(
                'INSERT INTO waiter_tables (waiter_id, table_id, branch_id) VALUES ?',
                [values]
            );
        }

        res.json({ message: 'Tables assigned successfully' });
    } catch (error) {
        console.error('Error assigning tables:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ALL USERS: Update My Profile
export const updateMyProfile = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const { full_name, phone, profile_photo } = req.body;

        await db.query(
            'UPDATE users SET full_name = ?, phone = ?, profile_photo = ? WHERE user_id = ?',
            [full_name, phone, profile_photo, user_id]
        );

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
