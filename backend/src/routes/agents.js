import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { triggerPriceAgent, getAlerts, markAlertRead } from '../controllers/agentsController.js';

const router = Router();

// POST /api/agents/price        — trigger price update (card_ids optional in body)
router.post('/price', requireAuth, triggerPriceAgent);

// GET  /api/agents/alerts       — get unread scalper alerts for current user
router.get('/alerts', requireAuth, getAlerts);

// PATCH /api/agents/alerts/:id/read
router.patch('/alerts/:id/read', requireAuth, markAlertRead);

export default router;
