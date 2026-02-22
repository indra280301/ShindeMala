import axios from 'axios';

async function testDashboardApi() {
    try {
        console.log("Testing /api/dashboard/metrics GET endpoint...");
        const res = await axios.get('http://localhost:5001/api/dashboard/metrics', {
             headers: {
                 'Authorization': 'Bearer test' 
             }
        });
        console.log("Dashboard API Success:", res.data);
    } catch (err) {
        if (err.response) {
            console.error("Dashboard API Error Response:", err.response.data);
        } else {
            console.error("Dashboard API Error:", err.message);
        }
    }
}

testDashboardApi();
