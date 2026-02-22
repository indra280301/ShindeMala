import db from './db.js';
import bcrypt from 'bcrypt';

async function fixPassword() {
    const hash = await bcrypt.hash('password', 10);
    await db.query('UPDATE users SET password_hash = ? WHERE username = ?', [hash, 'admin']);
    console.log('Password hash updated successfully!');
    process.exit(0);
}

fixPassword();
