/**
 * Recognition service — receives raw card images from RPi or mobile app,
 * computes a perceptual hash, and matches against the cards catalog.
 */

import { computePhash, hammingDistance } from '../utils/pHash.js';
import { supabaseAdmin } from './supabase.js';

const PHASH_MATCH_THRESHOLD = 10; // bits — lower = stricter match

/**
 * Identify a card from a raw image buffer.
 * Returns the best-matching card row or null if no match found.
 *
 * @param {Buffer} imageBuffer — raw image data (JPEG, PNG, etc.)
 * @returns {{ card: object, distance: number } | null}
 */
export async function identifyCard(imageBuffer) {
  const queryHash = await computePhash(imageBuffer);

  // Fetch all cards that have a stored phash
  const { data: candidates, error } = await supabaseAdmin
    .from('cards')
    .select('id, name, tcg, set_name, set_code, phash')
    .not('phash', 'is', null);

  if (error) throw new Error(`Failed to fetch card hashes: ${error.message}`);

  let best = null;
  let bestDistance = Infinity;

  for (const card of candidates) {
    const dist = hammingDistance(queryHash, card.phash);
    if (dist < bestDistance) {
      bestDistance = dist;
      best = card;
    }
  }

  if (bestDistance > PHASH_MATCH_THRESHOLD) return null;

  // Fetch full card details
  const { data: fullCard } = await supabaseAdmin
    .from('cards')
    .select('*')
    .eq('id', best.id)
    .single();

  return { card: fullCard, distance: bestDistance };
}
