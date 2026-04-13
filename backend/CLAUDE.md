# TCG Collector — Backend

## Cos'è questo progetto
App per collezionisti di carte TCG (Magic: The Gathering, Pokémon) che permette di:
- Scansionare fisicamente grandi quantità di carte tramite un dispositivo hardware (RPi + camera)
- Caricare singole carte da app mobile tramite camera
- Gestire la propria collezione personale con condizioni e prezzi
- Vedere su una mappa gli utenti vicini e le loro collezioni per favorire scambi
- Gestire una wishlist personale
- Ricevere suggerimenti di prezzo automatici tramite AI agent
- Ricevere alert su acquisti vantaggiosi tramite AI scalper agent

## Stack tecnico
- Runtime: Node.js 20+
- Framework: Express.js
- Database: Supabase (PostgreSQL 15 + PostGIS + Auth + Storage + Realtime)
- Deploy: Railway
- Auth: JWT via Supabase Auth
- Language: JavaScript (ESM)

## TCG supportati
- **Magic: The Gathering** → Scryfall API (https://scryfall.com/docs/api) — gratuita, no key
- **Pokémon TCG** → PokémonTCG API (https://pokemontcg.io) — gratuita, key opzionale

## Architettura delle cartelle
```
/src
  /routes         → definizione endpoint Express (auth, cards, collection, wishlist, trades, map, agents)
  /controllers    → logica business per ogni route
  /services
    supabase.js   → client Supabase singleton
    scryfall.js   → wrapper Scryfall API
    pokemon.js    → wrapper PokémonTCG API
    recognition.js → riceve risultati scan da RPi e da app mobile
  /agents
    priceAgent.js → Claude AI agent per suggerimento prezzi
    scalperAgent.js → Claude AI agent per alert acquisti vantaggiosi
  /middleware
    auth.js       → verifica JWT Supabase
    validate.js   → validazione input con Zod
  /utils
    pHash.js      → perceptual hashing per match immagini carte
/migrations       → file SQL da eseguire su Supabase in ordine
/seeds            → dati di esempio (carte Magic e Pokémon)
/docs
  schema.md       → documentazione schema DB
  api.md          → documentazione endpoint
```

## Schema database (tabelle principali)

### users
Estende auth.users di Supabase. Campi extra: `username`, `avatar_url`, `location geography(Point,4326)`, `location_updated_at`, `is_trading` (bool).

### cards (catalogo globale — NON modificabile dagli utenti)
`id`, `tcg` (enum: 'magic'|'pokemon'), `external_id` (id Scryfall o PokémonTCG), `name`, `set_name`, `set_code`, `collector_number`, `rarity`, `image_url`, `image_thumbnail_url`, `phash` (perceptual hash per matching), `market_price_eur` (aggiornato dall'agent), `price_updated_at`

### user_cards (la collezione di ogni utente)
`id`, `user_id` FK, `card_id` FK, `quantity`, `condition` (enum: M/NM/LP/MP/HP/D), `foil` (bool), `for_trade` (bool), `personal_price_eur`, `notes`, `added_at`

### wishlists
`id`, `user_id` FK, `card_id` FK, `max_price_eur`, `priority` (1-5), `added_at`

### trade_offers
`id`, `sender_id` FK, `receiver_id` FK, `status` (enum: pending/accepted/rejected/cancelled), `sender_cards` (jsonb array di user_card ids), `receiver_cards` (jsonb array), `message`, `created_at`, `updated_at`

### price_alerts (output scalper agent)
`id`, `user_id` FK, `card_id` FK, `alert_type` (enum: buy/sell), `market_price_eur`, `suggested_price_eur`, `source_url`, `reason`, `created_at`, `is_read`

## Endpoint principali da implementare
- POST /auth/register, POST /auth/login, POST /auth/logout
- GET/POST/DELETE /collection (user_cards)
- POST /collection/scan — riceve immagine, fa matching, aggiunge carta
- GET/POST/DELETE /wishlist
- GET /map/traders?lat=&lng=&radius_km= → utenti vicini con for_trade=true
- GET /cards/search?q=&tcg= → cerca nel catalogo
- POST /agents/price — lancia price agent su una carta o sull'intera collezione
- GET /agents/alerts — recupera alert scalper non letti
- GET/POST /trades, PATCH /trades/:id/accept|reject

## Variabili d'ambiente richieste (.env)
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_ANON_KEY=
POKEMON_TCG_API_KEY=
ANTHROPIC_API_KEY=
PORT=3000
```

## Regole importanti
- La recognition pipeline (pHash matching) gira qui sul backend — l'RPi e l'app mobile mandano solo l'immagine grezza
- Usare Row Level Security (RLS) di Supabase per tutte le tabelle utente
- Gli agenti AI usano Claude claude-sonnet-4-20250514 via Anthropic SDK con tool use
- Market price viene aggiornato in batch dall'agent, non ad ogni richiesta
- Per la mappa usare ST_DWithin di PostGIS con distanza in gradi convertita da km
- Non committare mai .env — usare .env.example come riferimento
