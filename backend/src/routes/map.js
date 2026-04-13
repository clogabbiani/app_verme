import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { getNearbyTraders } from '../controllers/mapController.js';

const router = Router();

// GET /api/map/traders?lat=&lng=&radius_km=
router.get('/traders', optionalAuth, getNearbyTraders);

export default router;
