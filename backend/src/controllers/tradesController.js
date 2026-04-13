import { z } from 'zod';
import { supabase } from '../services/supabase.js';

const createTradeSchema = z.object({
  receiver_id: z.string().uuid(),
  message: z.string().max(1000).optional(),
  sender_cards: z.array(z.string().uuid()).min(1),
  receiver_cards: z.array(z.string().uuid()).min(1),
});

const statusValues = ['accepted', 'rejected', 'cancelled'];

export async function listTrades(req, res) {
  const { data, error } = await supabase
    .from('trade_offers')
    .select(`
      *,
      sender:users!trade_offers_sender_id_fkey(id, username, avatar_url),
      receiver:users!trade_offers_receiver_id_fkey(id, username, avatar_url)
    `)
    .or(`sender_id.eq.${req.user.id},receiver_id.eq.${req.user.id}`)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

export async function getTrade(req, res) {
  const { data, error } = await supabase
    .from('trade_offers')
    .select(`
      *,
      sender:users!trade_offers_sender_id_fkey(id, username, avatar_url),
      receiver:users!trade_offers_receiver_id_fkey(id, username, avatar_url)
    `)
    .eq('id', req.params.id)
    .or(`sender_id.eq.${req.user.id},receiver_id.eq.${req.user.id}`)
    .single();

  if (error) return res.status(404).json({ error: 'Trade not found' });
  res.json(data);
}

export async function createTrade(req, res) {
  const parsed = createTradeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { receiver_id, message, sender_cards, receiver_cards } = parsed.data;

  if (receiver_id === req.user.id) {
    return res.status(400).json({ error: 'Cannot trade with yourself' });
  }

  const { data, error } = await supabase
    .from('trade_offers')
    .insert({
      sender_id: req.user.id,
      receiver_id,
      message,
      sender_cards,
      receiver_cards,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
}

export async function updateTradeStatus(req, res) {
  const { status } = req.body;
  if (!statusValues.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${statusValues.join(', ')}` });
  }

  const { data: trade } = await supabase
    .from('trade_offers')
    .select('*')
    .eq('id', req.params.id)
    .or(`sender_id.eq.${req.user.id},receiver_id.eq.${req.user.id}`)
    .single();

  if (!trade) return res.status(404).json({ error: 'Trade not found' });
  if (trade.status !== 'pending') return res.status(400).json({ error: 'Trade is no longer pending' });

  if ((status === 'accepted' || status === 'rejected') && trade.receiver_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the receiver can accept or reject' });
  }
  if (status === 'cancelled' && trade.sender_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the sender can cancel' });
  }

  const { data, error } = await supabase
    .from('trade_offers')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}
