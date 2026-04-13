import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { listCards, getCard } from '../controllers/cardsController.js';

const router = Router();

// GET /api/cards?tcg=magic|pokemon&q=name&set=&page=&limit=
router.get('/', optionalAuth, listCards);

// GET /api/cards/:id
router.get('/:id', optionalAuth, getCard);

export default router;
