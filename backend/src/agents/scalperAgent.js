/**
 * Scalper Agent — uses Claude claude-sonnet-4-20250514 with tool use to identify
 * buy/sell opportunities for a user's wishlist and collection.
 *
 * Tools:
 *   get_user_wishlist(user_id)         → cards the user wants
 *   get_user_collection(user_id)       → cards the user owns
 *   get_card_price(card_id)            → current market price from DB
 *   create_price_alert(...)            → insert into price_alerts table
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../services/supabase.js';

const client = new Anthropic();
const MODEL = 'claude-sonnet-4-20250514';

// A card is a good buy if market price is ≤ max_price_eur × this factor
const BUY_THRESHOLD = 0.85;
// A card is worth selling if market price is ≥ personal_price_eur × this factor
const SELL_THRESHOLD = 1.20;

const tools = [
  {
    name: 'get_user_wishlist',
    description: "Fetch the user's wishlist with card details and their max price targets.",
    input_schema: {
      type: 'object',
      properties: { user_id: { type: 'string' } },
      required: ['user_id'],
    },
  },
  {
    name: 'get_user_collection',
    description: "Fetch the user's card collection including personal_price_eur and current market prices.",
    input_schema: {
      type: 'object',
      properties: { user_id: { type: 'string' } },
      required: ['user_id'],
    },
  },
  {
    name: 'get_card_price',
    description: 'Get the latest market_price_eur for a card from the database.',
    input_schema: {
      type: 'object',
      properties: { card_id: { type: 'string' } },
      required: ['card_id'],
    },
  },
  {
    name: 'create_price_alert',
    description: 'Create a buy or sell price alert for a user.',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        card_id: { type: 'string' },
        alert_type: { type: 'string', enum: ['buy', 'sell'] },
        market_price_eur: { type: 'number' },
        suggested_price_eur: { type: 'number' },
        reason: { type: 'string' },
      },
      required: ['user_id', 'card_id', 'alert_type', 'market_price_eur', 'suggested_price_eur', 'reason'],
    },
  },
];

async function executeTool(name, input) {
  if (name === 'get_user_wishlist') {
    const { data, error } = await supabaseAdmin
      .from('wishlists')
      .select('*, card:cards(id, name, tcg, set_name, market_price_eur)')
      .eq('user_id', input.user_id);
    if (error) return { error: error.message };
    return { wishlist: data };
  }

  if (name === 'get_user_collection') {
    const { data, error } = await supabaseAdmin
      .from('user_cards')
      .select('*, card:cards(id, name, tcg, set_name, market_price_eur)')
      .eq('user_id', input.user_id);
    if (error) return { error: error.message };
    return { collection: data };
  }

  if (name === 'get_card_price') {
    const { data, error } = await supabaseAdmin
      .from('cards')
      .select('market_price_eur, price_updated_at')
      .eq('id', input.card_id)
      .single();
    if (error) return { error: error.message };
    return data;
  }

  if (name === 'create_price_alert') {
    const { error } = await supabaseAdmin.from('price_alerts').insert(input);
    if (error) return { error: error.message };
    return { created: true };
  }

  return { error: `Unknown tool: ${name}` };
}

/**
 * Run the scalper agent for a specific user.
 * @param {string} userId
 */
export async function runScalperAgent(userId) {
  const messages = [
    {
      role: 'user',
      content: `You are a TCG card market analysis agent for user ${userId}.

Your job:
1. Fetch the user's wishlist and collection.
2. For each wishlist card: if market_price_eur ≤ (max_price_eur × ${BUY_THRESHOLD}), create a BUY alert.
3. For each collection card where for_trade=true or personal_price_eur is set:
   if market_price_eur ≥ (personal_price_eur × ${SELL_THRESHOLD}), create a SELL alert.
4. Only create alerts for cards with a valid, recent market price.
5. Write a clear, concise reason for each alert explaining the opportunity.

Use the provided tools. Be thorough but avoid duplicate alerts.`,
    },
  ];

  let alertsCreated = 0;

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
      if (block.name === 'create_price_alert' && result.created) alertsCreated++;
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  return { alerts_created: alertsCreated };
}
