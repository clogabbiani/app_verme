export type TCG = 'magic' | 'pokemon';

export type Condition = 'M' | 'NM' | 'LP' | 'MP' | 'HP' | 'D';

export type Rarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'mythic'
  | 'special'
  | 'legendary'
  | 'holo rare'
  | 'ultra rare'
  | 'secret rare';

export interface Card {
  id: string;
  tcg: TCG;
  external_id: string;
  name: string;
  set_name: string;
  set_code: string;
  collector_number: string;
  rarity: string;
  image_url: string;
  image_thumbnail_url: string;
  market_price_eur: number | null;
  price_updated_at: string | null;
}

export interface UserCard {
  id: string;
  user_id: string;
  card_id: string;
  quantity: number;
  condition: Condition;
  foil: boolean;
  for_trade: boolean;
  personal_price_eur: number | null;
  notes: string | null;
  added_at: string;
  card: Card;
}

export interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  is_trading: boolean;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface TraderNearby {
  user_id: string;
  username: string;
  avatar_url: string | null;
  distance_km: number;
  card_count: number;
  preview_cards: UserCard[];
}

export interface TradeOffer {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  sender_cards: string[];
  receiver_cards: string[];
  message: string | null;
  created_at: string;
  updated_at: string;
  sender?: User;
  receiver?: User;
}

export interface ScanResult {
  recognized: boolean;
  card?: Card;
  user_card?: UserCard;
  message?: string;
}
