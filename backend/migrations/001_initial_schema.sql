-- =============================================================
-- TCG Collector — Initial Schema
-- Run this entire file in the Supabase SQL editor.
-- Requires PostGIS enabled (Dashboard → Extensions → PostGIS).
-- =============================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE tcg_type AS ENUM ('magic', 'pokemon');

-- Standard TCG grading abbreviations
CREATE TYPE card_condition AS ENUM ('M', 'NM', 'LP', 'MP', 'HP', 'D');

CREATE TYPE trade_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

CREATE TYPE alert_type AS ENUM ('buy', 'sell');

-- =============================================================
-- USERS (extends Supabase auth.users)
-- =============================================================

CREATE TABLE public.users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username            TEXT NOT NULL UNIQUE,
  avatar_url          TEXT,
  bio                 TEXT CHECK (char_length(bio) <= 500),
  city                TEXT,
  location            GEOGRAPHY(POINT, 4326),   -- lng, lat — GeoJSON convention
  location_updated_at TIMESTAMPTZ,
  is_trading          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create user profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- CARDS (global catalog — not editable by users)
-- =============================================================

CREATE TABLE public.cards (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tcg                 tcg_type NOT NULL,
  external_id         TEXT NOT NULL,         -- Scryfall UUID or PokémonTCG card ID
  name                TEXT NOT NULL,
  set_name            TEXT NOT NULL,
  set_code            TEXT NOT NULL,
  collector_number    TEXT,
  rarity              TEXT,
  image_url           TEXT,
  image_thumbnail_url TEXT,
  phash               TEXT,                  -- perceptual hash for image matching
  -- Magic-specific
  mana_cost           TEXT,
  cmc                 NUMERIC,
  oracle_text         TEXT,
  power               TEXT,
  toughness           TEXT,
  colors              TEXT[],
  -- Pokémon-specific
  hp                  INTEGER,
  stage               TEXT,
  -- Pricing (updated by price agent in batch, stored in EUR)
  market_price_eur    NUMERIC(10, 2),
  price_updated_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tcg, external_id)
);

CREATE INDEX cards_tcg_idx      ON public.cards (tcg);
CREATE INDEX cards_set_code_idx ON public.cards (set_code);
CREATE INDEX cards_name_fts_idx ON public.cards USING gin (to_tsvector('simple', name));
CREATE INDEX cards_phash_idx    ON public.cards (phash) WHERE phash IS NOT NULL;

-- =============================================================
-- USER_CARDS (each user's physical collection)
-- =============================================================

CREATE TABLE public.user_cards (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  card_id           UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  quantity          INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  condition         card_condition NOT NULL DEFAULT 'NM',
  foil              BOOLEAN NOT NULL DEFAULT FALSE,
  for_trade         BOOLEAN NOT NULL DEFAULT FALSE,
  personal_price_eur NUMERIC(10, 2),          -- user's asking price, NULL = use market price
  notes             TEXT CHECK (char_length(notes) <= 500),
  added_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX user_cards_user_idx     ON public.user_cards (user_id);
CREATE INDEX user_cards_card_idx     ON public.user_cards (card_id);
CREATE INDEX user_cards_for_trade_idx ON public.user_cards (user_id, for_trade) WHERE for_trade = TRUE;

-- =============================================================
-- WISHLISTS
-- =============================================================

CREATE TABLE public.wishlists (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  card_id       UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  max_price_eur NUMERIC(10, 2) CHECK (max_price_eur > 0),
  priority      SMALLINT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, card_id)
);

CREATE INDEX wishlists_user_idx ON public.wishlists (user_id);
CREATE INDEX wishlists_card_idx ON public.wishlists (card_id);

-- =============================================================
-- TRADE_OFFERS
-- Items are stored as JSONB arrays of user_card UUIDs for simplicity.
-- =============================================================

CREATE TABLE public.trade_offers (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status         trade_status NOT NULL DEFAULT 'pending',
  sender_cards   JSONB NOT NULL DEFAULT '[]'::JSONB,   -- array of user_card ids offered by sender
  receiver_cards JSONB NOT NULL DEFAULT '[]'::JSONB,   -- array of user_card ids requested from receiver
  message        TEXT CHECK (char_length(message) <= 1000),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (sender_id <> receiver_id)
);

CREATE INDEX trade_offers_sender_idx   ON public.trade_offers (sender_id);
CREATE INDEX trade_offers_receiver_idx ON public.trade_offers (receiver_id);
CREATE INDEX trade_offers_status_idx   ON public.trade_offers (status);

-- =============================================================
-- PRICE_ALERTS (output of scalper agent)
-- =============================================================

CREATE TABLE public.price_alerts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  card_id           UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  alert_type        alert_type NOT NULL,
  market_price_eur  NUMERIC(10, 2) NOT NULL,
  suggested_price_eur NUMERIC(10, 2) NOT NULL,
  source_url        TEXT,
  reason            TEXT,
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX price_alerts_user_idx    ON public.price_alerts (user_id, is_read);
CREATE INDEX price_alerts_card_idx    ON public.price_alerts (card_id);

-- =============================================================
-- PostGIS — nearby traders
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_nearby_traders(
  lat        DOUBLE PRECISION,
  lng        DOUBLE PRECISION,
  radius_km  DOUBLE PRECISION DEFAULT 50
)
RETURNS TABLE (
  id          UUID,
  username    TEXT,
  avatar_url  TEXT,
  city        TEXT,
  is_trading  BOOLEAN,
  distance_km NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.avatar_url,
    u.city,
    u.is_trading,
    ROUND(
      (ST_Distance(
        u.location::geography,
        ST_MakePoint(lng, lat)::geography
      ) / 1000)::NUMERIC, 2
    ) AS distance_km
  FROM public.users u
  WHERE
    u.location IS NOT NULL
    AND ST_DWithin(
      u.location::geography,
      ST_MakePoint(lng, lat)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cards     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_offers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts   ENABLE ROW LEVEL SECURITY;

-- users: public read, owner update
CREATE POLICY "users_select_all"  ON public.users FOR SELECT USING (true);
CREATE POLICY "users_update_own"  ON public.users FOR UPDATE USING (auth.uid() = id);

-- cards: public read only (writes done by service role via agents)
CREATE POLICY "cards_select_all"  ON public.cards FOR SELECT USING (true);

-- user_cards: owner only; but FOR TRADE cards are readable by others
CREATE POLICY "uc_select_own"     ON public.user_cards FOR SELECT
  USING (auth.uid() = user_id OR for_trade = TRUE);
CREATE POLICY "uc_insert_own"     ON public.user_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "uc_update_own"     ON public.user_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "uc_delete_own"     ON public.user_cards FOR DELETE USING (auth.uid() = user_id);

-- wishlists: owner only
CREATE POLICY "wl_select_own"     ON public.wishlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wl_insert_own"     ON public.wishlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wl_update_own"     ON public.wishlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "wl_delete_own"     ON public.wishlists FOR DELETE USING (auth.uid() = user_id);

-- trade_offers: sender and receiver
CREATE POLICY "to_select_parties" ON public.trade_offers FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "to_insert_sender"  ON public.trade_offers FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "to_update_parties" ON public.trade_offers FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- price_alerts: owner only
CREATE POLICY "pa_select_own"     ON public.price_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pa_update_own"     ON public.price_alerts FOR UPDATE USING (auth.uid() = user_id);
