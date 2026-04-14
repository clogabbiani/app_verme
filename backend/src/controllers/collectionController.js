import { z } from 'zod';
import { identifyCard } from '../services/recognition.js';

const CONDITIONS = ['M', 'NM', 'LP', 'MP', 'HP', 'D'];

const addCardSchema = z.object({
  card_id: z.string().uuid(),
  condition: z.enum(CONDITIONS).default('NM'),
  quantity: z.number().int().min(1).default(1),
  foil: z.boolean().default(false),
  for_trade: z.boolean().default(false),
  personal_price_eur: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
});

const updateCardSchema = z.object({
  condition: z.enum(CONDITIONS).optional(),
  quantity: z.number().int().min(1).optional(),
  foil: z.boolean().optional(),
  for_trade: z.boolean().optional(),
  personal_price_eur: z.number().positive().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function listCollection(req, res) {
  const { tcg, for_trade, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = req.supabase
    .from('user_cards')
    .select('*, card:cards(*)', { count: 'exact' })
    .eq('user_id', req.user.id)
    .order('added_at', { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  if (for_trade === 'true') query = query.eq('for_trade', true);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const filtered = tcg ? data.filter(uc => uc.card?.tcg === tcg) : data;
  res.json({ data: filtered, total: count, page: Number(page), limit: Number(limit) });
}

export async function addCard(req, res) {
  const parsed = addCardSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await req.supabase
    .from('user_cards')
    .insert({ ...parsed.data, user_id: req.user.id })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
}

/**
 * POST /api/collection/scan
 * Body: { image: "<base64 string>", tcg_hint?: "magic"|"pokemon" }
 * Identifies the card via Claude Vision, returns { recognized, card?, message? }.
 * Always responds 200 — the client checks `recognized` to distinguish outcomes.
 */
export async function scanCard(req, res) {
  const { image, tcg_hint } = req.body;
  if (!image) return res.status(400).json({ error: 'image field is required (base64)' });

  let imageBuffer;
  try {
    imageBuffer = Buffer.from(image, 'base64');
  } catch {
    return res.status(400).json({ error: 'Invalid base64 image' });
  }

  try {
    const match = await identifyCard(imageBuffer, tcg_hint);
    if (!match) {
      return res.json({
        recognized: false,
        message: "Carta non riconosciuta. Prova a migliorare l'illuminazione o specifica il tipo di TCG.",
      });
    }
    res.json({ recognized: true, card: match.card });
  } catch (err) {
    console.error('[scanCard]', err);
    res.status(500).json({ error: err.message ?? 'Errore durante il riconoscimento' });
  }
}

export async function updateCard(req, res) {
  const parsed = updateCardSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data: existing } = await req.supabase
    .from('user_cards')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { data, error } = await req.supabase
    .from('user_cards')
    .update(parsed.data)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

export async function removeCard(req, res) {
  const { data: existing } = await req.supabase
    .from('user_cards')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { error } = await req.supabase.from('user_cards').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
}
