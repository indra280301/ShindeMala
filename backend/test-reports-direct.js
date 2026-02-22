import { generateReport } from './controllers/reportsController.js';

async function testDirect() {
    console.log("Testing Reports logic directly...");
    const req = { 
        user: { branch_id: 1 }, 
        body: { startDate: '2024-01-01', endDate: '2026-12-31' } 
    };
    const res = {
        json: (data) => console.log("SUCCESS JSON Length:", JSON.stringify(data).length),
        status: (code) => ({
            json: (data) => console.log(`FAILED JSON (Status ${code}):`, data)
        })
    };
    try {
        await generateReport(req, res);
    } catch(err) {
        console.error("DIRECT SCRATCH CRASH:", err);
    } finally {
        process.exit(0);
    }
}
testDirect();
