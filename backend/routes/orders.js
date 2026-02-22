import express from 'express';
import { createOrder, getActiveOrderForTable, getActiveTakeawayOrder, removeOrderItem, getActiveOrders, updateOrderStatus, getOrderById, cancelOrder, getCancelledOrders, getCompletedOrders, getActiveKDSItems, updateOrderItemStatus, getOrderLogs } from '../controllers/ordersController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', requireRole(['admin', 'waiter']), createOrder);
router.post('/cancel', requireRole(['admin', 'waiter']), cancelOrder);
router.get('/cancelled', requireRole(['admin']), getCancelledOrders);
router.get('/history', requireRole(['admin']), getCompletedOrders);
router.get('/kds', getActiveKDSItems);
router.get('/active', getActiveOrders);
router.get('/active/takeaway', getActiveTakeawayOrder);
router.get('/active/table/:table_id', getActiveOrderForTable);
router.get('/:order_id', getOrderById);
router.get('/:order_id/logs', getOrderLogs);
router.delete('/:order_id/items/:item_id', requireRole(['admin']), removeOrderItem);
router.put('/:order_id/items/status', requireRole(['admin', 'kitchen', 'waiter']), updateOrderItemStatus);
router.put('/:order_id/status', requireRole(['admin', 'kitchen', 'waiter']), updateOrderStatus);

export default router;
