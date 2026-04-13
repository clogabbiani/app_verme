import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listTrades,
  getTrade,
  createTrade,
  updateTradeStatus,
} from '../controllers/tradesController.js';

const router = Router();

router.get('/', requireAuth, listTrades);
router.get('/:id', requireAuth, getTrade);
router.post('/', requireAuth, createTrade);
router.patch('/:id/accept', requireAuth, (req, res, next) => {
  req.body = { status: 'accepted' };
  next();
}, updateTradeStatus);
router.patch('/:id/reject', requireAuth, (req, res, next) => {
  req.body = { status: 'rejected' };
  next();
}, updateTradeStatus);
router.patch('/:id/cancel', requireAuth, (req, res, next) => {
  req.body = { status: 'cancelled' };
  next();
}, updateTradeStatus);

export default router;
