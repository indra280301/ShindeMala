import { getDashboardMetrics } from './controllers/dashboardController.js';
import db from './db.js';

async function testDirect() {
    console.log("Mocking Req/Res & testing Dashboard logic directly...");
    const req = { user: { branch_id: 1 } };
    const res = {
        json: (data) => console.log("SUCCESS JSON Length:", JSON.stringify(data).length),
        status: (code) => ({
            json: (data) => console.log(`FAILED JSON (Status ${code}):`, data)
        })
    };
    try {
        await getDashboardMetrics(req, res);
    } catch(err) {
        console.error("DIRECT SCRATCH CRASH:", err);
    } finally {
        process.exit(0);
    }
}
testDirect();
