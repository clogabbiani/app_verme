/**
 * Price Agent — uses Claude claude-sonnet-4-20250514 with tool use to fetch and evaluate
 * market prices from Scryfall and PokémonTCG APIs, then updates the cards table.
 *
 * Tool loop:
 *   get_scryfall_price(card_name, set_code?) → EUR price from Scryfall
 *   get_pokemon_price(card_id)               → EUR price from PokémonTCG
 *   update_card_price(card_id, price_eur)    → writes to DB
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../services/supabase.js';
import * as scryfall from '../services/scryfall.js';
import * as pokemon from '../services/pokemon.js';

const client = new Anthropic();
const MODEL = 'claude-sonnet-4-20250514';

// ~USD→EUR conversion factor (static; replace with live FX API if needed)
const USD_TO_EUR = 0.92;

const tools = [
  {
    name: 'get_scryfall_price',
    description: 'Fetch the current EUR market price of a Magic card from Scryfall by card name and optional set code.',
    input_schema: {
      type: 'object',
      properties: {
        card_name: { type: 'string', description: 'Exact or approximate card name' },
        set_code: { type: 'string', description: 'Optional set code (e.g. lea, m21)' },
      },
      required: ['card_name'],
    },
  },
  {
    name: 'get_pokemon_price',
    description: 'Fetch the current EUR market price of a Pokémon TCG card by its external ID (e.g. base1-4).',
    input_schema: {
      type: 'object',
      properties: {
        card_id: { type: 'string', description: 'PokémonTCG card ID, e.g. base1-4' },
      },
      required: ['card_id'],
    },
  },
  {
    name: 'update_card_price',
    description: 'Update the market_price_eur and price_updated_at for a card in the database.',
    input_schema: {
      type: 'object',
      properties: {
        card_id: { type: 'string', description: 'Internal UUID of the card' },
        price_eur: { type: 'number', description: 'New market price in EUR' },
      },
      required: ['card_id', 'price_eur'],
    },
  },
];

async function executeTool(name, input) {
  if (name === 'get_scryfall_price') {
    const query = input.set_code
      ? `!"${input.card_name}" s:${input.set_code}`
      : `!"${input.card_name}"`;
    const data = await scryfall.searchCards(query);
    const card = data.data?.[0];
    if (!card) return { error: 'Card not found on Scryfall' };
    const usdPrice = parseFloat(card.prices?.usd ?? card.prices?.usd_foil ?? '0');
    return { price_eur: +(usdPrice * USD_TO_EUR).toFixed(2), source: card.scryfall_uri };
  }

  if (name === 'get_pokemon_price') {
    const card = await pokemon.getCardById(input.card_id);
    const usdPrice = card?.tcgplayer?.prices?.normal?.market
      ?? card?.tcgplayer?.prices?.holofoil?.market
      ?? 0;
    return { price_eur: +(usdPrice * USD_TO_EUR).toFixed(2) };
  }

  if (name === 'update_card_price') {
    const { error } = await supabaseAdmin
      .from('cards')
      .update({ market_price_eur: input.price_eur, price_updated_at: new Date().toISOString() })
      .eq('id', input.card_id);
    if (error) return { error: error.message };
    return { updated: true };
  }

  return { error: `Unknown tool: ${name}` };
}

/**
 * Run the price agent for a list of card IDs (or all cards if none specified).
 * @param {string[]} [cardIds] — internal UUIDs; if omitted, updates all stale cards
 */
export async function runPriceAgent(cardIds) {
  let cards;

  if (cardIds?.length) {
    const { data } = await supabaseAdmin.from('cards').select('*').in('id', cardIds);
    cards = data;
  } else {
    // Update cards not refreshed in the last 24h
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabaseAdmin
      .from('cards')
      .select('*')
      .or(`price_updated_at.is.null,price_updated_at.lt.${cutoff}`)
      .limit(50);
    cards = data;
  }

  if (!cards?.length) return { updated: 0 };

  const cardList = cards.map(c => `- ${c.name} (${c.tcg}, id: ${c.id}, external_id: ${c.external_id})`).join('\n');

  const messages = [
    {
      role: 'user',
      content: `You are a price agent for a TCG card collection app.
For each card below, fetch its current market price and update it in the database.
Use get_scryfall_price for Magic cards and get_pokemon_price for Pokémon cards, then call update_card_price.

Cards to update:
${cardList}`,
    },
  ];

  // Agentic loop
  let updatedCount = 0;
  while (true) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      tools,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') break;
    if (response.stop_reason !== 'tool_use') break;

    const toolResults = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      const result = await executeTool(block.name, block.input);
      if (block.name === 'update_card_price' && result.updated) updatedCount++;
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  return { updated: updatedCount };
}
