import express from 'express';
import { generateReport } from '../controllers/reportsController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Only Admins and potentially Managers should run heavy aggregate reports
router.post('/', requireRole(['admin']), generateReport);

export default router;
