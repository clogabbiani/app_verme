import { supabase } from '../services/supabase.js';

export async function listCards(req, res) {
  const { tcg, q, set, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = supabase
    .from('cards')
    .select('*', { count: 'exact' })
    .order('name')
    .range(offset, offset + Number(limit) - 1);

  if (tcg) query = query.eq('tcg', tcg);
  if (q) query = query.ilike('name', `%${q}%`);
  if (set) query = query.ilike('set_code', set);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ data, total: count, page: Number(page), limit: Number(limit) });
}

export async function getCard(req, res) {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Card not found' });
  res.json(data);
}
