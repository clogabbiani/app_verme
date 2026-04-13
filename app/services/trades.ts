import { api } from './api';
import { TradeOffer } from '../types';

export async function fetchTrades(): Promise<TradeOffer[]> {
  return api.get<TradeOffer[]>('/trades');
}

export async function fetchTrade(id: string): Promise<TradeOffer> {
  return api.get<TradeOffer>(`/trades/${id}`);
}

export async function createTrade(data: {
  receiver_id: string;
  sender_cards: string[];
  receiver_cards: string[];
  message?: string;
}): Promise<TradeOffer> {
  return api.post<TradeOffer>('/trades', data);
}

export async function acceptTrade(id: string): Promise<TradeOffer> {
  return api.patch<TradeOffer>(`/trades/${id}/accept`, {});
}

export async function rejectTrade(id: string): Promise<TradeOffer> {
  return api.patch<TradeOffer>(`/trades/${id}/reject`, {});
}

export async function cancelTrade(id: string): Promise<TradeOffer> {
  return api.patch<TradeOffer>(`/trades/${id}/cancel`, {});
}
