import { api } from './api';
import { TraderNearby } from '../types';

export async function fetchNearbyTraders(
  lat: number,
  lng: number,
  radiusKm = 20,
  tcg?: string
): Promise<TraderNearby[]> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    radius_km: radiusKm.toString(),
    ...(tcg ? { tcg } : {}),
  });
  return api.get<TraderNearby[]>(`/map/traders?${params}`);
}

export async function fetchTraderCollection(userId: string) {
  return api.get(`/users/${userId}/collection`);
}
