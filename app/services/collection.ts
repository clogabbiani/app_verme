import { api } from './api';
import { UserCard, ScanResult } from '../types';

export async function fetchCollection(): Promise<UserCard[]> {
  return api.get<UserCard[]>('/collection');
}

export async function addCard(data: {
  card_id: string;
  quantity: number;
  condition: string;
  foil?: boolean;
  for_trade?: boolean;
  personal_price_eur?: number;
  notes?: string;
}): Promise<UserCard> {
  return api.post<UserCard>('/collection', data);
}

export async function updateCard(
  id: string,
  data: Partial<{
    quantity: number;
    condition: string;
    foil: boolean;
    for_trade: boolean;
    personal_price_eur: number;
    notes: string;
  }>
): Promise<UserCard> {
  return api.patch<UserCard>(`/collection/${id}`, data);
}

export async function removeCard(id: string): Promise<void> {
  return api.delete(`/collection/${id}`);
}

export async function scanCard(imageUri: string, tcgHint?: string): Promise<ScanResult> {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    name: 'scan.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);
  if (tcgHint) formData.append('tcg_hint', tcgHint);
  return api.postForm<ScanResult>('/collection/scan', formData);
}
