import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
const token = jwt.sign({ user_id: 1, role: 'admin', branch_id: 1 }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });
console.log(token);
