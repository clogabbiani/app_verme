# TCG Collector — Prompt iniziali per Claude Code

Copia-incolla questi prompt all'inizio di ogni prima sessione nella repo corrispondente.
Nelle sessioni successive basterà essere più specifici ("aggiungi l'endpoint X", "fixa il bug Y").

---

## 🗄️ BACKEND — Prompt iniziale

```
Leggi il CLAUDE.md di questo progetto.

Sei il backend engineer di TCG Collector. Inizia costruendo le fondamenta complete:

STEP 1 — Setup progetto:
- Inizializza package.json con Node.js ESM ("type": "module")
- Installa dipendenze: express, @supabase/supabase-js, @anthropic-ai/sdk, zod, dotenv, cors, helmet, morgan
- Crea struttura cartelle come da CLAUDE.md
- Setup express app base con middleware (cors, helmet, morgan, json parser)
- Crea .env.example con tutte le variabili richieste
- Crea un server.js che fa partire tutto

STEP 2 — Schema database:
- Crea /migrations/001_initial_schema.sql con TUTTE le tabelle descritte nel CLAUDE.md
- Abilita PostGIS e crea l'indice spaziale sulla colonna location di users
- Aggiungi Row Level Security (RLS) su user_cards, wishlists, trade_offers, price_alerts
- Le policy RLS devono permettere agli utenti di leggere/scrivere solo i propri dati

STEP 3 — Seed data:
- Crea /seeds/cards.js che popola la tabella cards con 15 carte Magic (usando Scryfall API reale) e 15 carte Pokémon (usando PokémonTCG API reale)
- Lo script deve essere idempotente (non duplica se eseguito più volte)

STEP 4 — Auth middleware:
- Crea /src/middleware/auth.js che verifica il JWT di Supabase
- Crea /src/routes/auth.js con POST /auth/register e POST /auth/login

Alla fine dimmi cosa devo fare su Supabase Dashboard per attivare PostGIS e applicare le migration.
```

---

## 📱 APP — Prompt iniziale

```
Leggi il CLAUDE.md di questo progetto.

Sei il mobile developer di TCG Collector. Costruisci l'app React Native con Expo dall'inizio:

STEP 1 — Setup:
- Inizializza progetto Expo con template blank TypeScript
- Installa: expo-router, nativewind, zustand, @tanstack/react-query, expo-camera, react-native-maps, expo-secure-store, @supabase/supabase-js, expo-location, expo-notifications
- Configura NativeWind (tailwind.config.js + babel.config.js)
- Crea .env.example con le variabili richieste

STEP 2 — Navigation e layout base:
- Crea la struttura Expo Router come da CLAUDE.md (tabs + auth + card + trade)
- Implementa il layout con tab bar (icone per: Home, Collezione, Scan, Mappa, Profilo)
- Crea il flusso auth: se non loggato → redirect a /(auth)/login

STEP 3 — Auth store e service:
- Crea /store/authStore.ts con Zustand (user, token, login, logout)
- Crea /services/auth.ts (register, login, logout via Supabase)
- Implementa le schermate login e register

STEP 4 — Collection screen (la più importante):
- Crea la schermata collezione con grid di carte
- Ogni carta mostra: thumbnail, nome, set, condizione badge, badge TCG (Magic/Pokémon)
- Filtri in alto: TCG selector, condizione, solo for_trade
- Stato vuoto con CTA "Scansiona la tua prima carta"
- Skeleton loader durante il fetch

STEP 5 — Componenti riutilizzabili:
- CardThumbnail, ConditionBadge, TCGBadge, EmptyState

Usa TypeScript strict. Ogni componente deve avere i tipi corretti.
```

---

## 🔧 HARDWARE — Prompt iniziale

```
Leggi il CLAUDE.md di questo progetto.

Sei il firmware engineer di TCG Collector per Raspberry Pi. Costruisci lo scanner:

STEP 1 — Setup progetto:
- Crea requirements.txt con tutte le dipendenze Python
- Crea /config/settings.py con tutti i parametri configurabili (legge da .env)
- Crea .env.example

STEP 2 — Modulo camera (camera.py):
- Classe CameraModule che usa picamera2
- Metodo capture_card() → scatta, applica autofocus, restituisce immagine numpy array
- Configurazione: risoluzione 4056x3040 (HQ camera), AWB auto, tempo esposizione adattivo
- Modalità preview per calibrazione live

STEP 3 — Modulo motore (motor.py):
- Classe StepperMotor per 28BYJ-48 con sequenza half-step (8 steps)
- Metodi: advance_card(), stop(), set_speed(steps_per_sec)
- Controllo via gpiozero per compatibilità RPi 4 e 5

STEP 4 — Preprocessor (preprocessor.py):
- Classe CardPreprocessor con OpenCV
- Pipeline: crop ROI → trova bordi carta → perspective transform → resize 600x840 → equalizza
- Metodo calibrate() che mostra la preview con la ROI evidenziata
- Salva result come JPEG qualità 85

STEP 5 — Uploader (uploader.py):
- Classe CardUploader con coda thread-safe
- POST verso BACKEND_URL/collection/scan con immagine + tcg_hint
- Retry automatico con backoff esponenziale
- Salva in /tmp/scan_queue/ se offline, riprova al reconnect
- Salva in /tmp/unknown/ se il backend risponde con "not_recognized"

STEP 6 — Main loop (main.py):
- Integra tutti i moduli nel flusso descritto nel CLAUDE.md
- Gestione segnale Ctrl+C per stop pulito
- Modalità --dry-run (scatta e preprocessa, non invia)
- Contatore progressivo carte scansionate / riconosciute / sconosciute

STEP 7 — Script di test:
- test_camera.py: scatta una foto e la salva su disco
- test_motor.py: avanza il motore di N steps
- test_upload.py: invia un'immagine di test al backend

Aggiungi anche il file tcg_scanner.service per systemd.
```

---

## 🤖 AGENTS — Prompt iniziale

```
Leggi il CLAUDE.md di questo progetto.

Sei l'AI engineer di TCG Collector. Costruisci i due agenti Claude:

STEP 1 — Setup progetto:
- Inizializza package.json ESM
- Installa: @anthropic-ai/sdk, @supabase/supabase-js, axios, cheerio, node-cron, dotenv
- Crea struttura cartelle come da CLAUDE.md
- Crea .env.example

STEP 2 — Tool implementations:
- /src/tools/scryfall.js → fetchScryfallPrice(scryfallId): chiama API Scryfall, restituisce { eur, eur_foil, usd }
- /src/tools/pokemon.js → fetchPokemonPrice(cardId): chiama PokémonTCG API, restituisce prezzi
- /src/tools/cardmarket.js → fetchCardmarketPrice(cardName, setCode, condition, foil): fetch prezzi (usa la API pubblica o scraping leggero)
- /src/tools/supabase.js → getWishlist(userId), saveAlert(alertData), savePriceSuggestion(data), getCardsToUpdate()

STEP 3 — Price Agent:
- Implementa priceAgent.js come descritto nel CLAUDE.md
- Input: array di user_cards con card details
- Output: array di price suggestions salvate nel DB
- Usa tool use di Claude con i tool definiti
- Implementa il tool dispatch loop (agentic loop)

STEP 4 — Scalper Agent:
- Implementa scalperAgent.js come descritto nel CLAUDE.md
- Input: user_id (o 'all' per tutti gli utenti)
- Output: alert salvati nel DB per ogni deal trovato
- Controlla sempre la wishlist dell'utente per prioritizzare

STEP 5 — Cron jobs:
- /src/jobs/priceUpdateJob.js → ogni 6h, chiama price agent su tutte le carte nel catalogo
- /src/jobs/dealScanJob.js → ogni 2h, chiama scalper agent per tutti gli utenti attivi
- Crea un index.js che avvia entrambi i job

STEP 6 — Test:
- priceAgent.test.js: testa con 3 carte reali (una Magic, una Pokémon, una foil)
- scalperAgent.test.js: simula un deal su una carta in wishlist

Aggiungi rate limiting su tutte le chiamate esterne (max 1 req/sec per Cardmarket).
```

---

## 💡 Prompt utili per sessioni successive

### Backend — aggiungere un endpoint
```
Leggi il CLAUDE.md. Aggiungi l'endpoint GET /map/traders che:
- Accetta query params: lat, lng, radius_km (default 20), tcg (opzionale)
- Usa ST_DWithin di PostGIS per trovare utenti entro il raggio
- Ritorna: user_id, username, avatar_url, distance_km, card_count, preview di 3 carte for_trade
- Richiede autenticazione (usa il middleware auth.js esistente)
- Aggiungi validazione Zod sui parametri
```

### App — aggiungere una schermata
```
Leggi il CLAUDE.md. Implementa la Map screen (/app/(tabs)/map.tsx):
- Mostra react-native-maps centrata sulla posizione utente
- Chiedi permesso geolocalizzazione se non già concesso
- Fetch dei trader da GET /map/traders con la posizione corrente
- Un pin colorato per ogni trader (blu = Magic, rosso = Pokémon, viola = entrambi)
- Tap su pin → BottomSheet con profilo trader e preview 3 carte
- Bottone "Proponi scambio" nel BottomSheet
```

### Agents — debugging
```
Leggi il CLAUDE.md. Il price agent non sta trovando i prezzi per le carte Pokémon foil.
Analizza il tool fetchPokemonPrice e la logica dell'agente, trova il problema e fixa.
Aggiungi anche un test specifico per le carte foil.
```
