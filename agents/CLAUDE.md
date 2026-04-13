# TCG Collector — AI Agents

## Cos'è questo progetto
Due agenti AI basati su Claude (Anthropic) che girano come moduli del backend
per aiutare i collezionisti TCG con pricing e opportunità di acquisto.

Gli agenti sono chiamati dal backend Node.js (repo `/backend`) via Anthropic SDK.
Questa repo contiene la logica degli agenti in modo isolato e testabile.

## Stack tecnico
- Runtime: Node.js 20+
- AI: Anthropic SDK (`@anthropic-ai/sdk`) — modello claude-sonnet-4-20250514
- HTTP: axios (per scraping/fetch prezzi)
- Parser HTML: cheerio (per TCGPlayer, Cardmarket)
- Job scheduler: node-cron (per aggiornamenti periodici prezzi)
- Cache: Supabase (i risultati vengono persistiti nel DB)

## I due agenti

---

### 1. Price Agent (`/src/priceAgent.js`)

**Scopo:** Dato un insieme di carte dell'utente, suggerisce il prezzo di vendita ottimale
basandosi sui prezzi di mercato correnti.

**Fonti dati:**
- Cardmarket (https://www.cardmarket.com) — principale per EU/Italia
- TCGPlayer (https://www.tcgplayer.com) — principale per US
- Scryfall prezzi (per Magic) — endpoint `/cards/:id` include `prices`
- PokémonTCG API (per Pokémon) — include `tcgplayer` prices

**Tool use di Claude:**
```javascript
tools: [
  {
    name: "fetch_cardmarket_price",
    description: "Cerca il prezzo attuale di una carta su Cardmarket",
    input_schema: {
      type: "object",
      properties: {
        card_name: { type: "string" },
        set_code: { type: "string" },
        condition: { type: "string", enum: ["MT","NM","EX","GD","LP","PL","PO"] },
        foil: { type: "boolean" }
      }
    }
  },
  {
    name: "fetch_scryfall_price",
    description: "Recupera il prezzo EUR da Scryfall per una carta Magic",
    input_schema: {
      type: "object",
      properties: { scryfall_id: { type: "string" } }
    }
  },
  {
    name: "fetch_pokemon_price",
    description: "Recupera il prezzo da PokémonTCG API",
    input_schema: {
      type: "object",
      properties: { pokemon_card_id: { type: "string" } }
    }
  },
  {
    name: "save_price_suggestion",
    description: "Salva il suggerimento di prezzo nel database",
    input_schema: {
      type: "object",
      properties: {
        user_card_id: { type: "string" },
        suggested_price_eur: { type: "number" },
        market_low: { type: "number" },
        market_mid: { type: "number" },
        market_high: { type: "number" },
        reasoning: { type: "string" }
      }
    }
  }
]
```

**System prompt dell'agente:**
```
Sei un esperto di mercato delle carte TCG collezionabili (Magic: The Gathering e Pokémon).
Il tuo compito è suggerire prezzi di vendita ottimali per le carte di un collezionista,
basandoti sui prezzi di mercato reali che recuperi tramite i tool disponibili.

Considera sempre:
- La condizione della carta (NM vale molto di più di LP)
- Se è foil o prima edizione
- Il trend recente (se la carta è salita o scesa)
- Il mercato europeo (Cardmarket) come riferimento primario per utenti italiani

Fornisci sempre un range (low/mid/high) con una spiegazione chiara del ragionamento.
Sii preciso e pratico: il collezionista deve poter usare il tuo suggerimento direttamente.
```

---

### 2. Scalper Agent (`/src/scalperAgent.js`)

**Scopo:** Monitora i marketplace e segnala le carte in vendita a prezzo significativamente
sotto la media di mercato — opportunità di acquisto per rivendita o completamento collezione.

**Fonti monitorate:**
- Cardmarket — listing recenti per set/carte popolari
- Subito.it (opzionale, scraping) — annunci privati italiani
- eBay API (opzionale) — listing completati per valutare trend

**Tool use di Claude:**
```javascript
tools: [
  {
    name: "scan_cardmarket_deals",
    description: "Scansiona Cardmarket per carte vendute sotto il prezzo medio",
    input_schema: {
      type: "object",
      properties: {
        tcg: { type: "string", enum: ["magic", "pokemon"] },
        max_price_eur: { type: "number" },
        min_discount_pct: { type: "number", description: "Sconto minimo rispetto al mid price, es. 20 per 20%" },
        set_codes: { type: "array", items: { type: "string" }, description: "Set da monitorare, vuoto = tutti" }
      }
    }
  },
  {
    name: "check_user_wishlist",
    description: "Recupera la wishlist dell'utente per prioritizzare gli alert",
    input_schema: {
      type: "object",
      properties: { user_id: { type: "string" } }
    }
  },
  {
    name: "save_deal_alert",
    description: "Salva un alert di opportunità acquisto nel DB e triggera push notification",
    input_schema: {
      type: "object",
      properties: {
        user_id: { type: "string" },
        card_id: { type: "string" },
        listing_price_eur: { type: "number" },
        market_mid_eur: { type: "number" },
        discount_pct: { type: "number" },
        source_url: { type: "string" },
        seller_name: { type: "string" },
        reasoning: { type: "string" },
        alert_type: { type: "string", enum: ["wishlist_match", "general_deal", "set_deal"] }
      }
    }
  }
]
```

**System prompt dell'agente:**
```
Sei un agente specializzato nel trovare occasioni nel mercato delle carte TCG collezionabili.
Il tuo obiettivo è identificare carte vendute a prezzo significativamente inferiore al valore
di mercato, valutando se l'affare è genuino o se c'è un motivo nascosto (carta danneggiata,
venditore inaffidabile, prezzo di mercato gonfiato artificialmente).

Priorità degli alert (in ordine):
1. Carte presenti nella wishlist dell'utente sotto il suo prezzo massimo
2. Carte rare/popolari con sconto > 25% sul mid price Cardmarket
3. Deal su set interi o lotti interessanti

Non segnalare:
- Carte comuni sotto i 0.10€ (non vale il tempo)
- Venditori con rating < 95% su Cardmarket
- Carte con prezzo di mercato instabile (volatilità > 30% nell'ultimo mese)
```

---

## Struttura cartelle
```
/src
  priceAgent.js          → logica agent prezzi
  scalperAgent.js        → logica agent scalper
  /tools
    cardmarket.js        → fetch prezzi Cardmarket (scraping/API)
    scryfall.js          → fetch prezzi Scryfall
    pokemon.js           → fetch prezzi PokémonTCG
    supabase.js          → read/write DB (wishlist, alerts, price history)
    notifications.js     → push notification via Expo
  /jobs
    priceUpdateJob.js    → cron: aggiorna prezzi di mercato ogni 6h
    dealScanJob.js       → cron: scansiona deal ogni 2h
/tests
  priceAgent.test.js
  scalperAgent.test.js
```

## Schedule cron
```
Price update:  ogni 6 ore  → aggiorna market_price_eur su tutte le carte nel DB
Deal scan:     ogni 2 ore  → cerca nuovi deal, salva alert non letti
```

## Variabili d'ambiente (.env)
```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
CARDMARKET_APP_TOKEN=    # opzionale, aumenta rate limit
EBAY_APP_ID=             # opzionale
```

## Regole importanti
- Ogni chiamata Claude deve avere max_tokens=2000 per gli agent (le risposte sono concise)
- Implementare rate limiting per non spammare Cardmarket (max 1 req/sec)
- Tutti i prezzi nel DB sono in EUR con 2 decimali
- Gli alert vengono inviati max 1 volta per carta per utente ogni 24h (no spam)
- Loggare sempre input/output degli agenti per debugging
- In caso di errore fetch prezzi: usare il prezzo cached nel DB, non crashare
