import axios from 'axios';

async function testReportsApi() {
    try {
        console.log("Testing /api/reports POST endpoint...");
        const res = await axios.post('http://localhost:5001/api/reports', {
            startDate: '2024-01-01',
            endDate: '2026-12-31'
        }, {
             headers: {
                 // Simulate Admin Login (Hardcoded user to bypass auth for this debug test)
                 'Authorization': 'Bearer test' 
             }
        });
        console.log("API Success:", res.data);
    } catch (err) {
        if (err.response) {
            console.error("API Error Response:", err.response.data);
        } else {
            console.error("API Error:", err.message);
        }
    }
}

testReportsApi();
