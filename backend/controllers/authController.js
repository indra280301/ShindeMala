import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'shinde_mala_super_secret_key_2025';

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const [users] = await db.query('SELECT * FROM users WHERE username = ? AND is_active = TRUE', [username]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials or inactive account' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?', [user.user_id]);

        const token = jwt.sign(
            { user_id: user.user_id, branch_id: user.branch_id, role: user.role, username: user.username },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                user_id: user.user_id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                branch_id: user.branch_id
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getMe = async (req, res) => {
    try {
        const [users] = await db.query('SELECT user_id, username, full_name, role, branch_id FROM users WHERE user_id = ?', [req.user.user_id]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(users[0]);
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
