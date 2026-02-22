import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
    getStaff,
    createStaff,
    updateStaff,
    updateStaffPassword,
    toggleStaffActive,
    getAssignedTables,
    assignTables,
    updateMyProfile
} from '../controllers/staffController.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Self Profile
router.put('/profile', authenticateToken, updateMyProfile);

// Admin Routes for Staff Management
const adminRoles = requireRole(['admin']);

router.get('/', authenticateToken, adminRoles, getStaff);
router.post('/', authenticateToken, adminRoles, upload.single('profile_photo'), createStaff);
router.put('/:id', authenticateToken, adminRoles, upload.single('profile_photo'), updateStaff);
router.put('/:id/password', authenticateToken, adminRoles, updateStaffPassword);
router.put('/:id/toggle-active', authenticateToken, adminRoles, toggleStaffActive);

// Table Assignments
router.get('/:id/tables', authenticateToken, adminRoles, getAssignedTables);
router.post('/:id/tables', authenticateToken, adminRoles, assignTables);

export default router;
