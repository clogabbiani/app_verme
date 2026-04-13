import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { getMe, updateMe, getPublicProfile } from '../controllers/usersController.js';

const router = Router();

router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, updateMe);
router.get('/:id', optionalAuth, getPublicProfile);

export default router;
