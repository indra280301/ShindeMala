import db from '../db.js';
import { io } from '../index.js';

export const createOrder = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const branch_id = req.user.branch_id;
        const waiter_id = req.user.user_id;
        const { table_id, order_type, items } = req.body;

        let subtotal = 0, cgst_total = 0, sgst_total = 0, vat_total = 0, grand_total = 0;

        items.forEach(item => {
            subtotal += item.price * item.quantity;
            cgst_total += item.cgst_amount;
            sgst_total += item.sgst_amount;
            vat_total += item.vat_amount;
            grand_total += item.line_total;
        });

        let target_order_id = null;

        // Check if there's an existing active order to append to
        if (order_type === 'dine_in' && table_id) {
            const [tableRows] = await connection.query(
                `SELECT current_order_id FROM dining_tables WHERE table_id = ? AND branch_id = ?`,
                [table_id, branch_id]
            );
            if (tableRows.length > 0 && tableRows[0].current_order_id) {
                target_order_id = tableRows[0].current_order_id;
            }
        } else if (order_type === 'takeaway') {
            // Check if there's an active takeaway order to append to
            const [existingOrders] = await connection.query(
                `SELECT order_id FROM orders 
                 WHERE branch_id = ? AND table_id IS NULL AND order_type = 'takeaway' 
                   AND order_status NOT IN ('completed', 'cancelled')
                 ORDER BY created_at DESC LIMIT 1`,
                [branch_id]
            );
            if (existingOrders.length > 0) {
                target_order_id = existingOrders[0].order_id;
            }
        }

        if (target_order_id) {
            // Append to existing order
            await connection.query(
                `UPDATE orders 
                 SET subtotal = subtotal + ?, 
                     cgst_total = cgst_total + ?, 
                     sgst_total = sgst_total + ?, 
                     vat_total = vat_total + ?, 
                     grand_total = grand_total + ? 
                 WHERE order_id = ?`,
                [subtotal, cgst_total, sgst_total, vat_total, grand_total, target_order_id]
            );
        } else {
            // Create new order
            const [orderResult] = await connection.query(
                `INSERT INTO orders (branch_id, table_id, order_type, waiter_id, order_status, subtotal, cgst_total, sgst_total, vat_total, grand_total) 
                 VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
                [branch_id, table_id || null, order_type, waiter_id, subtotal, cgst_total, sgst_total, vat_total, grand_total]
            );
            target_order_id = orderResult.insertId;

            // Update Table Status if dine_in
            if (order_type === 'dine_in' && table_id) {
                await connection.query(
                    `UPDATE dining_tables SET status = 'occupied', current_order_id = ? WHERE table_id = ?`,
                    [target_order_id, table_id]
                );
                io.emit('table_updated');
            }
        }

        // Insert Order Items for both cases (new or append)
        for (const item of items) {
            await connection.query(
                `INSERT INTO order_items (order_id, item_id, quantity, price, cgst_amount, sgst_amount, vat_amount, line_total) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [target_order_id, item.item_id, item.quantity, item.price, item.cgst_amount, item.sgst_amount, item.vat_amount, item.line_total]
            );

            // Fetch true item name from DB to prevent undefined errors
            const [itemDbName] = await connection.query(`SELECT name FROM menu_items WHERE item_id = ?`, [item.item_id]);
            const actualName = itemDbName.length > 0 ? itemDbName[0].name : 'Item';

            // Create Log Entry for addition
            const actionText = `+ ${item.quantity}x ${actualName}`;
            await connection.query(
                `INSERT INTO order_logs (order_id, user_id, action_text) VALUES (?, ?, ?)`,
                [target_order_id, waiter_id, actionText]
            );
        }

        await connection.commit();
        res.status(201).json({ message: 'Order processed successfully', order_id: target_order_id });
        io.emit('order_updated');
    } catch (error) {
        await connection.rollback();
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
};

export const getActiveTakeawayOrder = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;

        const [orders] = await db.query(
            `SELECT * FROM orders 
             WHERE branch_id = ? AND table_id IS NULL AND order_type = 'takeaway' AND order_status NOT IN ('completed', 'cancelled')
             ORDER BY created_at DESC LIMIT 1`,
            [branch_id]
        );

        if (orders.length === 0) {
            return res.json(null);
        }

        const activeOrder = orders[0];

        const [items] = await db.query(
            `SELECT oi.item_id, SUM(oi.quantity) as quantity, m.name, m.category_id, m.dietary_flag, m.cgst_rate, m.sgst_rate, m.vat_rate, MAX(oi.price) as price
             FROM order_items oi 
             JOIN menu_items m ON oi.item_id = m.item_id 
             WHERE oi.order_id = ? AND oi.status != 'cancelled'
             GROUP BY oi.item_id, m.name, m.category_id, m.dietary_flag, m.cgst_rate, m.sgst_rate, m.vat_rate`,
            [activeOrder.order_id]
        );

        res.json({ ...activeOrder, items });
    } catch (error) {
        console.error('Error fetching active takeaway order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getActiveOrderForTable = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const { table_id } = req.params;

        const [orders] = await db.query(
            `SELECT * FROM orders 
             WHERE branch_id = ? AND table_id = ? AND order_status NOT IN ('completed', 'cancelled')
             ORDER BY created_at DESC LIMIT 1`,
            [branch_id, table_id]
        );

        if (orders.length === 0) {
            return res.json(null);
        }

        const activeOrder = orders[0];

        const [items] = await db.query(
            `SELECT oi.item_id, SUM(oi.quantity) as quantity, m.name, m.category_id, m.dietary_flag, m.cgst_rate, m.sgst_rate, m.vat_rate, MAX(oi.price) as price
             FROM order_items oi 
             JOIN menu_items m ON oi.item_id = m.item_id 
             WHERE oi.order_id = ? AND oi.status != 'cancelled'
             GROUP BY oi.item_id, m.name, m.category_id, m.dietary_flag, m.cgst_rate, m.sgst_rate, m.vat_rate`,
            [activeOrder.order_id]
        );

        res.json({ ...activeOrder, items });
    } catch (error) {
        console.error('Error fetching active order for table:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const removeOrderItem = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { order_id, item_id } = req.params;
        const user_id = req.user.user_id;

        // 1) Find ONE active (non-cancelled) row for this item to decrement/cancel
        const [items] = await connection.query(
            `SELECT oi.*, m.name as item_name 
             FROM order_items oi
             JOIN menu_items m ON oi.item_id = m.item_id
             WHERE oi.order_id = ? AND oi.item_id = ? AND oi.status != 'cancelled'
             ORDER BY oi.order_item_id DESC LIMIT 1`,
            [order_id, item_id]
        );

        if (items.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Active item not found in order' });
        }

        const item = items[0];

        // Calculate the single unit price values
        const singleItemPrice = item.price;
        const singleCgst = item.cgst_amount / item.quantity;
        const singleSgst = item.sgst_amount / item.quantity;
        const singleVat = item.vat_amount / item.quantity;
        const singleLineTotal = item.line_total / item.quantity;

        // 2) Deduct 1 quantity from this specific row using its Primary Key
        if (item.quantity > 1) {
            await connection.query(
                `UPDATE order_items 
                 SET quantity = quantity - 1, 
                     cgst_amount = cgst_amount - ?, 
                     sgst_amount = sgst_amount - ?, 
                     vat_amount = vat_amount - ?, 
                     line_total = line_total - ? 
                 WHERE order_item_id = ?`,
                [singleCgst, singleSgst, singleVat, singleLineTotal, item.order_item_id]
            );

            // Create a dedicated cancelled row for the KDS
            await connection.query(
                `INSERT INTO order_items (order_id, item_id, quantity, price, cgst_amount, sgst_amount, vat_amount, line_total, status)
                 VALUES (?, ?, 1, ?, ?, ?, ?, ?, 'cancelled')`,
                [order_id, item_id, singleItemPrice, singleCgst, singleSgst, singleVat, singleLineTotal]
            );
        } else {
            // It only has 1 quantity left, so we just flip its status to cancelled
            await connection.query(
                `UPDATE order_items SET status = 'cancelled' WHERE order_item_id = ?`,
                [item.order_item_id]
            );
        }

        // 3) Deduct the totals from the master order
        await connection.query(
            `UPDATE orders 
             SET subtotal = subtotal - ?, 
                 cgst_total = cgst_total - ?, 
                 sgst_total = sgst_total - ?, 
                 vat_total = vat_total - ?, 
                 grand_total = grand_total - ? 
             WHERE order_id = ?`,
            [singleItemPrice, singleCgst, singleSgst, singleVat, singleLineTotal, order_id]
        );

        // 4) Check if the cart is entirely empty now to release the Table
        const [activeItemsCheck] = await connection.query(
            `SELECT COUNT(*) as active_count FROM order_items WHERE order_id = ? AND status != 'cancelled'`,
            [order_id]
        );

        if (activeItemsCheck[0].active_count === 0) {
            await connection.query(`UPDATE orders SET order_status = 'cancelled' WHERE order_id = ?`, [order_id]);

            const [orderCheck] = await connection.query(`SELECT table_id FROM orders WHERE order_id = ?`, [order_id]);
            if (orderCheck.length > 0 && orderCheck[0].table_id) {
                await connection.query(
                    `UPDATE dining_tables SET status = 'available', current_order_id = NULL WHERE table_id = ?`,
                    [orderCheck[0].table_id]
                );
                io.emit('table_updated');
            }
        }

        // 5) Log the activity
        const actionText = `- Removed 1x ${item.item_name || 'Item'}`;
        await connection.query(
            `INSERT INTO order_logs (order_id, user_id, action_text) VALUES (?, ?, ?)`,
            [order_id, user_id, actionText]
        );

        await connection.commit();
        res.json({ message: '1x Item quantity removed successfully' });
        io.emit('order_updated');
    } catch (error) {
        await connection.rollback();
        console.error('Remove order item error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
};

export const getActiveOrders = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const [orders] = await db.query(
            `SELECT o.*, t.table_number, u.full_name as waiter_name 
             FROM orders o 
             LEFT JOIN dining_tables t ON o.table_id = t.table_id 
             LEFT JOIN users u ON o.waiter_id = u.user_id 
             WHERE o.branch_id = ? AND o.order_status NOT IN ('completed', 'cancelled')
             ORDER BY o.created_at DESC`,
            [branch_id]
        );
        res.json(orders);
    } catch (error) {
        console.error('Error fetching active orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getOrderById = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const { order_id } = req.params;

        const [orders] = await db.query(
            `SELECT o.*, t.table_number, u.full_name as waiter_name 
             FROM orders o 
             LEFT JOIN dining_tables t ON o.table_id = t.table_id 
             LEFT JOIN users u ON o.waiter_id = u.user_id 
             WHERE o.order_id = ? AND o.branch_id = ?`,
            [order_id, branch_id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const [items] = await db.query(
            `SELECT oi.*, m.name, m.category_id, m.dietary_flag, m.cgst_rate, m.sgst_rate, m.vat_rate 
             FROM order_items oi 
             JOIN menu_items m ON oi.item_id = m.item_id 
             WHERE oi.order_id = ? AND oi.status != 'cancelled'`,
            [order_id]
        );

        res.json({ ...orders[0], items });
    } catch (error) {
        console.error('Error fetching order by ID:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const { order_id } = req.params;
        const { status } = req.body; // preparing, ready, served, completed

        await db.query('UPDATE orders SET order_status = ? WHERE order_id = ? AND branch_id = ?', [status, order_id, branch_id]);

        if (status === 'completed') {
            await db.query('UPDATE orders SET closed_at = CURRENT_TIMESTAMP WHERE order_id = ?', [order_id]);
            // Table cleanup should happen on payment or explicit table management
        } else if (status === 'cancelled') {
            // Propagate the cancellation to all child items so the KDS board updates
            await db.query(`UPDATE order_items SET status = 'cancelled' WHERE order_id = ? AND status != 'served'`, [order_id]);
        }

        res.json({ message: `Order status updated to ${status}` });
        io.emit('order_updated');
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const cancelOrder = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const waiter_name = req.user.full_name || req.user.username;
        const { table_number, items, cancel_reason, total_amount } = req.body;

        await db.query(
            `INSERT INTO cancelled_orders (branch_id, table_number, waiter_name, items, cancel_reason, total_amount) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [branch_id, table_number, waiter_name, JSON.stringify(items), cancel_reason || 'Cleared by user', total_amount || 0]
        );

        res.status(201).json({ message: 'Cancelled order logged successfully' });
        io.emit('order_updated');
    } catch (error) {
        console.error('Error logging cancelled order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getCancelledOrders = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const [orders] = await db.query(
            `SELECT * FROM cancelled_orders WHERE branch_id = ? ORDER BY cancelled_at DESC`,
            [branch_id]
        );
        res.json(orders);
    } catch (error) {
        console.error('Error fetching cancelled orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getCompletedOrders = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;
        const [orders] = await db.query(
            `SELECT o.*, t.table_number, u.full_name as waiter_name 
             FROM orders o 
             LEFT JOIN dining_tables t ON o.table_id = t.table_id 
             LEFT JOIN users u ON o.waiter_id = u.user_id 
             WHERE o.branch_id = ? AND (o.order_status = 'completed' OR (o.order_status = 'processing' AND o.order_type = 'takeaway'))
             ORDER BY COALESCE(o.closed_at, o.created_at) DESC`,
            [branch_id]
        );
        res.json(orders);
    } catch (error) {
        console.error('Error fetching completed orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateOrderItemStatus = async (req, res) => {
    try {
        const { order_id } = req.params;
        const { item_ids, new_status } = req.body; // e.g. [1, 5, 8], 'processing'

        if (!item_ids || !item_ids.length || !new_status) {
            return res.status(400).json({ error: 'Missing items or status' });
        }

        await db.query(
            `UPDATE order_items 
             SET status = ? 
             WHERE order_id = ? AND item_id IN (?)`,
            [new_status, order_id, item_ids]
        );

        res.json({ message: 'Items status updated successfully' });
        io.emit('order_updated');
    } catch (error) {
        console.error('Error updating items status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getActiveKDSItems = async (req, res) => {
    try {
        const branch_id = req.user.branch_id;

        // Fetch all non-served items from active orders
        const [items] = await db.query(
            `SELECT oi.order_id, oi.item_id, oi.quantity, oi.status, 
                    m.name as item_name, m.category_id,
                    o.created_at, o.order_type, t.table_number, u.full_name as waiter_name
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.order_id
             JOIN menu_items m ON oi.item_id = m.item_id
             LEFT JOIN dining_tables t ON o.table_id = t.table_id
             LEFT JOIN users u ON o.waiter_id = u.user_id
             WHERE o.branch_id = ? 
               AND o.order_status NOT IN ('completed')
               AND oi.status != 'served'
             ORDER BY o.created_at ASC`,
            [branch_id]
        );

        // Group the raw items into logical "Tickets" based on Order ID + Item Status pairing
        const tickets = [];
        const ticketMap = {};

        items.forEach(item => {
            const ticketKey = `${item.order_id}_${item.status}`;
            if (!ticketMap[ticketKey]) {
                ticketMap[ticketKey] = {
                    ticket_id: ticketKey,
                    order_id: item.order_id,
                    status: item.status,
                    table_number: item.table_number || 'Takeaway',
                    order_type: item.order_type,
                    waiter_name: item.waiter_name,
                    created_at: item.created_at,
                    items: []
                };
                tickets.push(ticketMap[ticketKey]);
            }

            // Further aggregate matching items in the same ticket
            const existingItem = ticketMap[ticketKey].items.find(i => i.item_id === item.item_id);
            if (existingItem) {
                existingItem.quantity += item.quantity;
            } else {
                ticketMap[ticketKey].items.push({
                    item_id: item.item_id,
                    name: item.item_name,
                    quantity: item.quantity
                });
            }
        });

        res.json(tickets);
    } catch (error) {
        console.error('Error fetching KDS items:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getOrderLogs = async (req, res) => {
    try {
        const { order_id } = req.params;

        const [logs] = await db.query(
            `SELECT l.log_id, l.action_text, l.created_at, u.full_name as user_name, u.role
             FROM order_logs l
             JOIN users u ON l.user_id = u.user_id
             WHERE l.order_id = ?
             ORDER BY l.created_at DESC`,
            [order_id]
        );

        res.json(logs);
    } catch (error) {
        console.error('Fetch order logs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
