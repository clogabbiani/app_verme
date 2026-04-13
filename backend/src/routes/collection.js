import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listCollection,
  addCard,
  updateCard,
  removeCard,
  scanCard,
} from '../controllers/collectionController.js';

const router = Router();

// GET    /api/collection
router.get('/', requireAuth, listCollection);

// POST   /api/collection
router.post('/', requireAuth, addCard);

// POST   /api/collection/scan — image recognition endpoint (RPi + mobile)
router.post('/scan', requireAuth, scanCard);

// PATCH  /api/collection/:id
router.patch('/:id', requireAuth, updateCard);

// DELETE /api/collection/:id
router.delete('/:id', requireAuth, removeCard);

export default router;
