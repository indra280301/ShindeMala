import db from '../db.js';

export const generateReport = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const { startDate, endDate } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start Date and End Date are required' });
        }

        // 1. Total Sales and Tax Breakdown
        const [salesRes] = await db.query(
            `SELECT 
                COUNT(*) as total_orders,
                COALESCE(SUM(subtotal), 0) as total_subtotal,
                COALESCE(SUM(cgst_total), 0) as total_cgst,
                COALESCE(SUM(sgst_total), 0) as total_sgst,
                COALESCE(SUM(vat_total), 0) as total_vat,
                COALESCE(SUM(discount_amount), 0) as total_discounts,
                COALESCE(SUM(grand_total), 0) as final_revenue
             FROM orders 
             WHERE branch_id = ? AND order_status = 'completed' 
             AND closed_at >= ? AND closed_at <= ?`,
            [branch_id, `${startDate} 00:00:00`, `${endDate} 23:59:59`]
        );

        // 2. Cancellation Losses
        const [cancelRes] = await db.query(
            `SELECT COUNT(*) as cancel_count, COALESCE(SUM(total_amount), 0) as cancel_loss
             FROM cancelled_orders
             WHERE branch_id = ? AND cancelled_at >= ? AND cancelled_at <= ?`,
            [branch_id, `${startDate} 00:00:00`, `${endDate} 23:59:59`]
        );

        // 3. Item Consumption Matrix
        const [itemsRes] = await db.query(
            `SELECT m.name, m.category_id, SUM(oi.quantity) as qty_sold, SUM(oi.line_total) as revenue_generated
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.order_id
             JOIN menu_items m ON oi.item_id = m.item_id
             WHERE o.branch_id = ? AND o.order_status = 'completed' AND oi.status != 'cancelled'
             AND o.closed_at >= ? AND o.closed_at <= ?
             GROUP BY oi.item_id
             ORDER BY qty_sold DESC`,
            [branch_id, `${startDate} 00:00:00`, `${endDate} 23:59:59`]
        );

        // 4. Waiter Performance
        const [waiterRes] = await db.query(
            `SELECT u.full_name, COUNT(o.order_id) as tables_served, SUM(o.grand_total) as revenue_driven
             FROM orders o
             JOIN users u ON o.waiter_id = u.user_id
             WHERE o.branch_id = ? AND o.order_status = 'completed'
             AND o.closed_at >= ? AND o.closed_at <= ?
             GROUP BY u.user_id
             ORDER BY revenue_driven DESC`,
            [branch_id, `${startDate} 00:00:00`, `${endDate} 23:59:59`]
        );

        res.json({
            summary: {
                ...salesRes[0],
                ...cancelRes[0]
            },
            items: itemsRes,
            waiters: waiterRes
        });

    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
