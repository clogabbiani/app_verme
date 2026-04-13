/**
 * PokémonTCG API wrapper.
 * Docs: https://docs.pokemontcg.io
 * API key is optional but increases rate limits.
 */

const BASE = 'https://api.pokemontcg.io/v2';

function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (process.env.POKEMON_TCG_API_KEY) h['X-Api-Key'] = process.env.POKEMON_TCG_API_KEY;
  return h;
}

/**
 * Search Pokémon cards.
 * @param {string} query — e.g. 'name:Charizard set.id:base1'
 */
export async function searchCards(query, { page = 1, pageSize = 20 } = {}) {
  const url = `${BASE}/cards?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`PokémonTCG search failed: ${res.status}`);
  return res.json();
}

/**
 * Fetch a single Pokémon card by its ID (e.g. 'base1-4').
 */
export async function getCardById(cardId) {
  const res = await fetch(`${BASE}/cards/${cardId}`, { headers: headers() });
  if (!res.ok) throw new Error(`PokémonTCG card not found: ${cardId}`);
  const json = await res.json();
  return json.data;
}

/**
 * Map a PokémonTCG API card object to our DB schema shape.
 */
export function mapPokemonCard(card) {
  return {
    tcg: 'pokemon',
    external_id: card.id,
    name: card.name,
    set_name: card.set?.name ?? '',
    set_code: card.set?.id ?? '',
    collector_number: card.number ?? null,
    rarity: card.rarity ?? null,
    image_url: card.images?.large ?? null,
    image_thumbnail_url: card.images?.small ?? null,
    hp: card.hp ? parseInt(card.hp, 10) : null,
    stage: card.subtypes?.find(s => s.startsWith('Stage') || s === 'Basic') ?? null,
    colors: card.types ?? [],
  };
}
