import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listWishlist,
  addToWishlist,
  updateWishlistItem,
  removeFromWishlist,
} from '../controllers/wishlistController.js';

const router = Router();

router.get('/', requireAuth, listWishlist);
router.post('/', requireAuth, addToWishlist);
router.patch('/:id', requireAuth, updateWishlistItem);
router.delete('/:id', requireAuth, removeFromWishlist);

export default router;
