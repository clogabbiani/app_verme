/**
 * Recognition service — uses Claude Vision to identify cards from photos.
 * Replaces the pHash approach which required pre-computed hashes in the DB
 * and was fragile with real-world camera photos (perspective, glare, rotation).
 *
 * Flow:
 *  1. Claude Vision reads the card name / set / TCG from the photo
 *  2. Scryfall (magic) or PokémonTCG API (pokemon) fetches the full card data
 *  3. Card is upserted into our `cards` table so future lookups are instant
 *  4. Full card row is returned
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from './supabase.js';
import { mapScryfallCard } from './scryfall.js';
import { mapPokemonCard } from './pokemon.js';

const client = new Anthropic();

const SCRYFALL_BASE = 'https://api.scryfall.com';
const POKEMON_BASE = 'https://api.pokemontcg.io/v2';

/**
 * Identify a card from a raw image buffer.
 *
 * @param {Buffer} imageBuffer
 * @param {'magic'|'pokemon'|undefined} tcgHint
 * @returns {Promise<{ card: object } | null>}
 */
export async function identifyCard(imageBuffer, tcgHint) {
  const base64Image = imageBuffer.toString('base64');

  const identified = await askClaudeToIdentifyCard(base64Image, tcgHint);
  console.log('[recognition] Claude result:', JSON.stringify(identified));
  if (!identified) return null;

  let cardData;
  if (identified.tcg === 'magic') {
    cardData = await fetchMagicCard(identified.name, identified.set_name);
  } else {
    cardData = await fetchPokemonCard(identified.name, identified.set_name);
  }
  console.log('[recognition] API lookup result:', cardData ? cardData.name : 'NOT FOUND');
  if (!cardData) return null;

  // Upsert into our catalog so the card is available for future requests
  const { data: card, error } = await supabaseAdmin
    .from('cards')
    .upsert(cardData, { onConflict: 'tcg,external_id' })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to upsert card: ${error.message}`);
  return { card };
}

// ---------------------------------------------------------------------------
// Claude Vision
// ---------------------------------------------------------------------------

async function askClaudeToIdentifyCard(base64Image, tcgHint) {
  const hintText = tcgHint === 'magic'
    ? 'This is a Magic: The Gathering card.'
    : tcgHint === 'pokemon'
      ? 'This is a Pokémon TCG card.'
      : 'This could be a Magic: The Gathering or a Pokémon TCG card.';

  let response;
  try {
    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
          },
          {
            type: 'text',
            text: `Identify this trading card. ${hintText}

Read the card carefully and return ONLY a JSON object (no other text):
{
  "recognized": true,
  "tcg": "magic" or "pokemon",
  "name": "exact card name as printed on the card",
  "set_name": "set name if visible, otherwise null"
}

If you cannot identify the card clearly, return: {"recognized": false}`,
          },
        ],
      }],
    });
  } catch (err) {
    console.error('[recognition] Claude API error:', err.message, err.status ?? '');
    return null;
  }

  try {
    const text = response.content[0].text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const json = JSON.parse(match[0]);
    if (!json.recognized || !json.name || !json.tcg) return null;
    return json;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Scryfall lookup (Magic)
// ---------------------------------------------------------------------------

async function fetchMagicCard(name, setName) {
  // Try exact name first, optionally scoped to the set
  try {
    let url = `${SCRYFALL_BASE}/cards/named?exact=${encodeURIComponent(name)}`;
    if (setName) url += `&set=${encodeURIComponent(setName)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'TCGCollector/1.0' } });
    if (res.ok) return mapScryfallCard(await res.json());
  } catch { /* fall through */ }

  // Fallback: fuzzy name search (ignores set)
  try {
    const url = `${SCRYFALL_BASE}/cards/named?fuzzy=${encodeURIComponent(name)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'TCGCollector/1.0' } });
    if (res.ok) return mapScryfallCard(await res.json());
  } catch { /* fall through */ }

  return null;
}

// ---------------------------------------------------------------------------
// PokémonTCG lookup
// ---------------------------------------------------------------------------

async function fetchPokemonCard(name, setName) {
  const headers = {};
  if (process.env.POKEMON_TCG_API_KEY) headers['X-Api-Key'] = process.env.POKEMON_TCG_API_KEY;

  try {
    let query = `name:"${name}"`;
    if (setName) query += ` set.name:"${setName}"`;
    const url = `${POKEMON_BASE}/cards?q=${encodeURIComponent(query)}&pageSize=1`;
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.data?.length) return null;
    return mapPokemonCard(json.data[0]);
  } catch {
    return null;
  }
}
