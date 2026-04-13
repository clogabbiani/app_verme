import { supabase } from '../services/supabase.js';

/**
 * Verifies Supabase JWT from Authorization: Bearer <token>.
 * Attaches req.user on success.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const { data, error } = await supabase.auth.getUser(header.slice(7));
  if (error || !data.user) return res.status(401).json({ error: 'Invalid or expired token' });

  req.user = data.user;
  next();
}

/**
 * Same as requireAuth but does not block if no token is present.
 */
export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();

  const { data } = await supabase.auth.getUser(header.slice(7));
  if (data?.user) req.user = data.user;
  next();
}
