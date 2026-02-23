import db from '../db.js';

export const getDashboardMetrics = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;

        // 1. Calculate 10 AM to 10 AM timeframe
        const now = new Date();
        let startPeriod = new Date();
        let endPeriod = new Date();

        if (now.getHours() >= 10) {
            // After 10 AM today -> Today 10 AM to Tomorrow 10 AM
            startPeriod.setHours(10, 0, 0, 0);
            endPeriod.setDate(endPeriod.getDate() + 1);
            endPeriod.setHours(10, 0, 0, 0);
        } else {
            // Before 10 AM today -> Yesterday 10 AM to Today 10 AM
            startPeriod.setDate(startPeriod.getDate() - 1);
            startPeriod.setHours(10, 0, 0, 0);
            endPeriod.setHours(10, 0, 0, 0);
        }

        const formatLocalSQLDate = (d) => {
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        };

        const startStr = formatLocalSQLDate(startPeriod);
        const endStr = formatLocalSQLDate(endPeriod);

        // 2. Today's Sales (Completed Dine In & Takeaway inside the 10 AM - 10 AM timeframe)
        const [salesRes] = await db.query(
            `SELECT COALESCE(SUM(grand_total), 0) as total_sales 
             FROM orders 
             WHERE branch_id = ? AND order_status = 'completed' AND closed_at >= ? AND closed_at < ?`,
            [branch_id, startStr, endStr]
        );
        const todaysSales = parseFloat(salesRes[0].total_sales);

        // 3. Active Orders (Occupied tables + Takeaway in progress)
        const [tablesOccupiedRes] = await db.query(
            `SELECT COUNT(*) as count FROM dining_tables WHERE branch_id = ? AND status = 'occupied'`,
            [branch_id]
        );
        const tablesOccupied = tablesOccupiedRes[0].count;

        const [activeTakeawaysRes] = await db.query(
            `SELECT COUNT(*) as count FROM orders WHERE branch_id = ? AND order_type = 'takeaway' AND order_status != 'completed' AND order_status != 'cancelled'`,
            [branch_id]
        );
        const activeOrdersCount = tablesOccupied + activeTakeawaysRes[0].count;

        // Total Tables (Only count tables specifically mapped to the active 2D grid structure)
        const [totalTablesRes] = await db.query(
            `SELECT COUNT(*) as count FROM dining_tables WHERE branch_id = ? AND grid_row IS NOT NULL`,
            [branch_id]
        );
        const totalTables = totalTablesRes[0].count;

        // 4. Recent Orders
        const [recentOrders] = await db.query(
            `SELECT o.order_id, o.order_type, o.grand_total, o.order_status, o.created_at, t.table_number 
             FROM orders o 
             LEFT JOIN dining_tables t ON o.table_id = t.table_id 
             WHERE o.branch_id = ? 
             ORDER BY o.created_at DESC LIMIT 5`,
            [branch_id]
        );

        // 5. Top Selling Items
        const [topItems] = await db.query(
            `SELECT m.name, SUM(oi.quantity) as total_sold
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.order_id
             JOIN menu_items m ON oi.item_id = m.item_id
             WHERE o.branch_id = ? AND o.order_status = 'completed'
             GROUP BY oi.item_id
             ORDER BY total_sold DESC LIMIT 5`,
            [branch_id]
        );

        // 6. Graphs Data (Last 7 Days)
        const [graphData] = await db.query(
            `SELECT DATE(closed_at) as date, SUM(grand_total) as earnings, COUNT(order_id) as orders
             FROM orders 
             WHERE branch_id = ? AND order_status = 'completed' AND closed_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
             GROUP BY DATE(closed_at)
             ORDER BY date ASC`,
            [branch_id]
        );

        const formattedGraphMap = {};
        graphData.forEach(d => {
            // Use local date string to avoid IST->UTC shift
            const dateKey = typeof d.date === 'string' ? d.date : `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}-${String(d.date.getDate()).padStart(2, '0')}`;
            formattedGraphMap[dateKey] = {
                earnings: parseFloat(d.earnings),
                orders: d.orders
            };
        });

        // Ensure the last 7 days are always represented, including forcing Today = todaysSales
        const finalGraph = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            // Use local date format to match IST dates from MySQL
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            if (i === 0) {
                // Force today's node to be the exact computed `todaysSales` which accounts for live transactions bridging the 10 AM boundary
                finalGraph.push({
                    date: dateStr,
                    earnings: todaysSales,
                    orders: formattedGraphMap[dateStr]?.orders || 0
                });
            } else {
                finalGraph.push({
                    date: dateStr,
                    earnings: formattedGraphMap[dateStr]?.earnings || 0,
                    orders: formattedGraphMap[dateStr]?.orders || 0
                });
            }
        }

        res.json({
            todaysSales,
            activeOrdersCount,
            tablesOccupied: `${tablesOccupied} / ${totalTables}`,
            recentOrders,
            topItems,
            graphData: finalGraph
        });

    } catch (error) {
        console.error('Error fetching dashboard metrics', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
