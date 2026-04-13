# TCG Collector — App Mobile

## Cos'è questo progetto
App mobile per collezionisti di carte TCG (Magic: The Gathering, Pokémon).
Il backend è separato (repo `/backend`) — questa repo contiene solo il frontend mobile.

## Stack tecnico
- Framework: React Native con Expo (SDK 51+)
- Navigation: Expo Router (file-based routing)
- State management: Zustand
- Data fetching: TanStack Query (React Query)
- UI components: Custom + NativeWind (Tailwind per RN)
- Camera: expo-camera
- Maps: react-native-maps
- Storage locale: expo-secure-store (token), AsyncStorage (cache)
- Push notifications: Expo Notifications

## Struttura cartelle
```
/app
  /(auth)
    login.tsx
    register.tsx
  /(tabs)
    index.tsx          → Home / dashboard
    collection.tsx     → La mia collezione
    scan.tsx           → Camera per scansione carta
    map.tsx            → Mappa trader vicini
    wishlist.tsx       → La mia wishlist
    profile.tsx        → Profilo e impostazioni
  /trade
    [id].tsx           → Dettaglio offerta di scambio
  /card
    [id].tsx           → Dettaglio carta
/components
  /cards
    CardThumbnail.tsx  → Card UI riutilizzabile
    CardDetail.tsx     → Vista dettaglio carta
    ConditionBadge.tsx → Badge condizione (NM, LP, ecc.)
    TCGBadge.tsx       → Badge Magic/Pokémon
  /collection
    CollectionGrid.tsx
    FilterBar.tsx      → Filtro per TCG, condizione, for_trade
  /map
    TraderMarker.tsx
    TraderSheet.tsx    → Bottom sheet con collezione trader
  /agents
    PricePanel.tsx     → Suggerimenti prezzo dall'AI
    AlertCard.tsx      → Alert scalper
  /ui
    Button.tsx, Input.tsx, Badge.tsx, BottomSheet.tsx, EmptyState.tsx
/services
  api.ts               → client fetch verso il backend
  auth.ts              → login/register/logout
  collection.ts
  wishlist.ts
  map.ts
  agents.ts
/store
  authStore.ts         → utente loggato + token
  collectionStore.ts   → cache collezione
/hooks
  useCamera.ts
  useLocation.ts
  useNotifications.ts
/constants
  tcg.ts               → enum TCG, condizioni, rarità
  colors.ts
```

## Schermate da implementare (in ordine di priorità)

### 1. Auth (login / register)
Semplice, con Supabase Auth sotto. Email + password per ora.

### 2. Collection screen
- Grid di carte con thumbnail
- Filtri: per TCG (Magic/Pokémon), condizione, disponibile per scambio
- Swipe su carta → opzioni rapide (modifica quantità, segna for_trade, elimina)
- FAB per aggiungere carta manualmente o tramite scan

### 3. Scan screen
- Apre camera, inquadra la carta
- Mostra rettangolo guida per allineamento
- Scatta foto → invia al backend POST /collection/scan
- Mostra carta riconosciuta con conferma prima di aggiungere
- Gestisce il caso di "carta non riconosciuta"

### 4. Map screen
- Mappa centrata sulla posizione utente
- Pin per ogni trader vicino (entro 20km default, modificabile)
- Tap su pin → bottom sheet con username, numero di carte, preview collezione
- Filtro: solo Magic / solo Pokémon / entrambi

### 5. Wishlist screen
- Lista carte cercate
- Per ogni carta: prezzo massimo che si vuole pagare, priorità
- Indicator se qualche trader vicino ce l'ha for_trade

### 6. AI Agents panel (dentro Profile o tab dedicato)
- Price panel: seleziona carte → ottieni suggerimento prezzo AI
- Alert list: lista alert scalper con link alla fonte

## Variabili d'ambiente (.env)
```
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

## Regole importanti
- Usare Expo Router per la navigazione, non React Navigation standalone
- Tutti i colori e stili passano da NativeWind (non StyleSheet inline dove evitabile)
- La camera usa expo-camera v2+ (API aggiornata in SDK 51)
- La geolocalizzazione chiede permesso solo quando l'utente apre la mappa
- Skeleton loader su ogni schermata che carica dati
- Gestire sempre il caso offline con messaggi chiari
- Dark mode supportata nativamente via NativeWind
- Target: iOS 16+ e Android 12+
