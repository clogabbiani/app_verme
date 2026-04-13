import { runPriceAgent } from '../agents/priceAgent.js';
import { runScalperAgent } from '../agents/scalperAgent.js';
import { supabase } from '../services/supabase.js';

export async function triggerPriceAgent(req, res) {
  const { card_ids } = req.body;

  try {
    const result = await runPriceAgent(card_ids);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAlerts(req, res) {
  const { unread_only = 'true' } = req.query;

  let query = supabase
    .from('price_alerts')
    .select('*, card:cards(id, name, tcg, set_name, image_thumbnail_url)')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (unread_only === 'true') query = query.eq('is_read', false);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Also trigger scalper agent in background for fresh alerts
  runScalperAgent(req.user.id).catch(err => console.error('Scalper agent error:', err));

  res.json(data);
}

export async function markAlertRead(req, res) {
  const { data: existing } = await supabase
    .from('price_alerts')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (!existing) return res.status(404).json({ error: 'Alert not found' });

  const { data, error } = await supabase
    .from('price_alerts')
    .update({ is_read: true })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}
