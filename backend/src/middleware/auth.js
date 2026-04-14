import { createClient } from '@supabase/supabase-js';
import { supabase } from '../services/supabase.js';

/**
 * Verifies Supabase JWT from Authorization: Bearer <token>.
 * Attaches req.user and req.supabase (per-request client with user JWT)
 * so that RLS policies resolve auth.uid() correctly.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Invalid or expired token' });

  req.user = data.user;
  req.supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  next();
}

/**
 * Same as requireAuth but does not block if no token is present.
 */
export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();

  const token = header.slice(7);
  const { data } = await supabase.auth.getUser(token);
  if (data?.user) {
    req.user = data.user;
    req.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
  }
  next();
}
