import { z } from 'zod';
import { supabase } from '../services/supabase.js';

const updateMeSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
  city: z.string().max(100).optional(),
  is_trading: z.boolean().optional(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
});

export async function getMe(req, res) {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, avatar_url, bio, city, is_trading, created_at')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(404).json({ error: 'Profile not found' });
  res.json(data);
}

export async function updateMe(req, res) {
  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { location, ...rest } = parsed.data;
  const payload = { ...rest };

  if (location) {
    payload.location = `SRID=4326;POINT(${location.lng} ${location.lat})`;
    payload.location_updated_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('users')
    .update(payload)
    .eq('id', req.user.id)
    .select('id, username, avatar_url, bio, city, is_trading, created_at')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

export async function getPublicProfile(req, res) {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, avatar_url, bio, city, is_trading, created_at')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'User not found' });
  res.json(data);
}
