import http from 'http';
import mysql from 'mysql2/promise';

async function test() {
    try {
        const db = await mysql.createConnection({host:'localhost',user:'root',password:'admin123',database:'shinde_mala_erp'});
        const [users] = await db.query("SELECT token FROM users WHERE role='admin' LIMIT 1");
        const token = users[0].token;
        const req = http.get('http://localhost:5001/api/orders/history', { headers: { Authorization: `Bearer ${token}` } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const json = JSON.parse(data);
                console.log("Total length:", json.length);
                const proc = json.filter(o => o.order_status === 'processing');
                console.log("Processing array length:", proc.length);
                if (proc.length > 0) console.log("First Processing ID:", proc[0].order_id, "Type:", proc[0].order_type);
                if (json.length > 0) console.log("First Order in History Array:", json[0].order_id, "Type:", json[0].order_type, "Status:", json[0].order_status);
            });
        });
        req.on('error', e => console.error("HTTP Fetch Error:", e));
    } catch (e) { console.error("Database or Node Error:", e.message); }
}
test();
