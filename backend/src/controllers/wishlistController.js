import { z } from 'zod';
import { supabase } from '../services/supabase.js';

const addSchema = z.object({
  card_id: z.string().uuid(),
  max_price_eur: z.number().positive().optional(),
  priority: z.number().int().min(1).max(5).default(3),
});

const updateSchema = z.object({
  max_price_eur: z.number().positive().nullable().optional(),
  priority: z.number().int().min(1).max(5).optional(),
});

export async function listWishlist(req, res) {
  const { data, error } = await supabase
    .from('wishlists')
    .select('*, card:cards(*)')
    .eq('user_id', req.user.id)
    .order('priority', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

export async function addToWishlist(req, res) {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase
    .from('wishlists')
    .insert({ ...parsed.data, user_id: req.user.id })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
}

export async function updateWishlistItem(req, res) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data: existing } = await supabase
    .from('wishlists')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { data, error } = await supabase
    .from('wishlists')
    .update(parsed.data)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

export async function removeFromWishlist(req, res) {
  const { data: existing } = await supabase
    .from('wishlists')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { error } = await supabase.from('wishlists').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
}
