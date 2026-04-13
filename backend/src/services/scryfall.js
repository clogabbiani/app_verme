/**
 * Scryfall API wrapper — no API key required.
 * Docs: https://scryfall.com/docs/api
 */

const BASE = 'https://api.scryfall.com';

// Polite rate limiting: Scryfall asks for 50-100ms between requests
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Search cards by name / set / query string.
 * Returns Scryfall card objects (raw).
 */
export async function searchCards(query, { page = 1 } = {}) {
  const url = `${BASE}/cards/search?q=${encodeURIComponent(query)}&page=${page}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'TCGCollector/1.0' } });
  if (!res.ok) throw new Error(`Scryfall search failed: ${res.status}`);
  return res.json();
}

/**
 * Fetch a single card by Scryfall UUID.
 */
export async function getCardById(scryfallId) {
  await delay(100);
  const res = await fetch(`${BASE}/cards/${scryfallId}`, {
    headers: { 'User-Agent': 'TCGCollector/1.0' },
  });
  if (!res.ok) throw new Error(`Scryfall card not found: ${scryfallId}`);
  return res.json();
}

/**
 * Fuzzy card name lookup — returns best match.
 */
export async function fuzzySearch(name) {
  await delay(100);
  const url = `${BASE}/cards/named?fuzzy=${encodeURIComponent(name)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'TCGCollector/1.0' } });
  if (!res.ok) throw new Error(`Scryfall fuzzy search failed for: ${name}`);
  return res.json();
}

/**
 * Map a Scryfall card object to our DB schema shape.
 */
export function mapScryfallCard(card) {
  return {
    tcg: 'magic',
    external_id: card.id,
    name: card.name,
    set_name: card.set_name,
    set_code: card.set,
    collector_number: card.collector_number,
    rarity: card.rarity,
    image_url: card.image_uris?.large ?? card.card_faces?.[0]?.image_uris?.large ?? null,
    image_thumbnail_url: card.image_uris?.small ?? card.card_faces?.[0]?.image_uris?.small ?? null,
    mana_cost: card.mana_cost ?? card.card_faces?.[0]?.mana_cost ?? null,
    cmc: card.cmc ?? null,
    oracle_text: card.oracle_text ?? card.card_faces?.[0]?.oracle_text ?? null,
    power: card.power ?? null,
    toughness: card.toughness ?? null,
    colors: card.colors ?? [],
  };
}
