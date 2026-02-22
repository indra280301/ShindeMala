import express from 'express';
import { getTables, updateTableStatus, createTable, updateTable, deleteTable } from '../controllers/tablesController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getTables);
router.post('/', requireRole(['admin']), createTable);
router.put('/:id', requireRole(['admin']), updateTable);
router.delete('/:id', requireRole(['admin']), deleteTable);
router.put('/:id/status', requireRole(['admin', 'waiter']), updateTableStatus);

export default router;
