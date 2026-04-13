import { supabase } from '../services/supabase.js';

export async function getNearbyTraders(req, res) {
  const { lat, lng, radius_km = 50 } = req.query;

  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const parsedRadius = parseFloat(radius_km);

  if (isNaN(parsedLat) || isNaN(parsedLng) || isNaN(parsedRadius)) {
    return res.status(400).json({ error: 'lat, lng, and radius_km must be numbers' });
  }

  const { data, error } = await supabase.rpc('get_nearby_traders', {
    lat: parsedLat,
    lng: parsedLng,
    radius_km: parsedRadius,
  });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}
