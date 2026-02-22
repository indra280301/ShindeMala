import express from 'express';
import { getCategories, getMenuItems, addMenuItem, updateMenuItem, addCategory } from '../controllers/menuController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/categories', getCategories);
router.post('/categories', requireRole(['admin']), addCategory);
router.get('/items', getMenuItems);
router.post('/items', requireRole(['admin']), addMenuItem);
router.put('/items/:id', requireRole(['admin']), updateMenuItem);

export default router;
