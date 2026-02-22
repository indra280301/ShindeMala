import express from 'express';
import { getDashboardMetrics } from '../controllers/dashboardController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/metrics', requireRole(['admin']), getDashboardMetrics);

export default router;
