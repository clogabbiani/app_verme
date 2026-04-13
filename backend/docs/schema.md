# TCG Collector — Database Schema

## Extensions
- `postgis` — ST_DWithin, ST_MakePoint, geography type
- `uuid-ossp` — uuid_generate_v4()

## Enums

| Enum | Values |
|------|--------|
| `tcg_type` | `magic`, `pokemon` |
| `card_condition` | `M` (Mint), `NM` (Near Mint), `LP` (Lightly Played), `MP` (Moderately Played), `HP` (Heavily Played), `D` (Damaged) |
| `trade_status` | `pending`, `accepted`, `rejected`, `cancelled` |
| `alert_type` | `buy`, `sell` |

## Tables

### `users`
Auto-created via trigger when a Supabase Auth user signs up.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | FK → auth.users |
| `username` | TEXT UNIQUE | auto-filled from email prefix |
| `avatar_url` | TEXT | |
| `bio` | TEXT | max 500 chars |
| `city` | TEXT | human-readable location label |
| `location` | GEOGRAPHY(POINT, 4326) | lng,lat — used by get_nearby_traders() |
| `location_updated_at` | TIMESTAMPTZ | |
| `is_trading` | BOOLEAN | true = user wants to trade |
| `created_at` | TIMESTAMPTZ | |

### `cards`
Global catalog. Populated by price agent and sync scripts. Not writable by end users (RLS: select only).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tcg` | tcg_type | |
| `external_id` | TEXT | Scryfall UUID or PokémonTCG ID (e.g. `base1-4`) |
| `name` | TEXT | |
| `set_name` | TEXT | |
| `set_code` | TEXT | e.g. `lea`, `base1` |
| `collector_number` | TEXT | |
| `rarity` | TEXT | |
| `image_url` | TEXT | high-res |
| `image_thumbnail_url` | TEXT | small/thumbnail |
| `phash` | TEXT | perceptual hash for image recognition matching |
| `mana_cost` | TEXT | Magic only |
| `cmc` | NUMERIC | Magic only |
| `oracle_text` | TEXT | Magic only |
| `power` / `toughness` | TEXT | Magic creatures |
| `colors` | TEXT[] | Magic color identifiers or Pokémon types |
| `hp` | INTEGER | Pokémon only |
| `stage` | TEXT | Pokémon only (Basic / Stage 1 / Stage 2) |
| `market_price_eur` | NUMERIC(10,2) | updated in batch by price agent |
| `price_updated_at` | TIMESTAMPTZ | |

Unique: `(tcg, external_id)`.

### `user_cards`
A user's physical collection.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK | → users |
| `card_id` | UUID FK | → cards |
| `quantity` | INTEGER | ≥ 1 |
| `condition` | card_condition | default NM |
| `foil` | BOOLEAN | |
| `for_trade` | BOOLEAN | marks card as available for trade |
| `personal_price_eur` | NUMERIC(10,2) | user asking price; NULL = use market price |
| `notes` | TEXT | max 500 chars |
| `added_at` | TIMESTAMPTZ | |

### `wishlists`
One row per (user, card) pair.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK | → users |
| `card_id` | UUID FK | → cards |
| `max_price_eur` | NUMERIC(10,2) | max the user will pay |
| `priority` | SMALLINT | 1 (highest) – 5 (lowest) |
| `added_at` | TIMESTAMPTZ | |

Unique: `(user_id, card_id)`.

### `trade_offers`
Trade proposal between two users. Card lists stored as JSONB arrays of `user_card` UUIDs.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `sender_id` | UUID FK | → users |
| `receiver_id` | UUID FK | → users |
| `status` | trade_status | default pending |
| `sender_cards` | JSONB | `["uuid", ...]` — cards offered by sender |
| `receiver_cards` | JSONB | `["uuid", ...]` — cards requested from receiver |
| `message` | TEXT | max 1000 chars |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `price_alerts`
Output of the scalper agent.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK | → users |
| `card_id` | UUID FK | → cards |
| `alert_type` | alert_type | `buy` or `sell` |
| `market_price_eur` | NUMERIC(10,2) | price at time of alert |
| `suggested_price_eur` | NUMERIC(10,2) | agent's recommended action price |
| `source_url` | TEXT | optional listing URL |
| `reason` | TEXT | agent explanation |
| `is_read` | BOOLEAN | default false |
| `created_at` | TIMESTAMPTZ | |

## Functions

### `get_nearby_traders(lat, lng, radius_km)`
Returns users with a non-null `location` within `radius_km` km, ordered by distance ascending.
Uses `ST_DWithin` on the `geography` column.

## RLS Summary

| Table | Read | Write |
|-------|------|-------|
| `users` | public | owner only |
| `cards` | public | service role only (agents) |
| `user_cards` | owner + public if for_trade=true | owner only |
| `wishlists` | owner only | owner only |
| `trade_offers` | sender + receiver | sender (insert), both (update) |
| `price_alerts` | owner only | owner (update is_read), service role (insert) |
