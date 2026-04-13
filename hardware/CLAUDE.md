# TCG Collector — Hardware (Raspberry Pi Scanner)

## Cos'è questo progetto
Script Python che gira su un Raspberry Pi 4 collegato a una camera HQ.
Il dispositivo fisico fa avanzare le carte TCG una alla volta davanti alla camera,
le fotografa, e invia le immagini al backend per il riconoscimento.

Obiettivo: scansionare oltre 200 carte in modo massivo senza intervento umano.

## Hardware target
- Raspberry Pi 4 (4GB RAM consigliata)
- Raspberry Pi Camera Module 3 (o HQ Camera)
- Stepper motor 28BYJ-48 + driver ULN2003 (per conveyor belt)
- Rail/guida carta in legno o stampa 3D (design da definire)
- LED ring light da 5V per illuminazione uniforme
- Pulsante fisico per start/stop

## Stack software
- Python 3.11+
- picamera2 (libreria ufficiale RPi per camera)
- RPi.GPIO o gpiozero (controllo motore stepper)
- OpenCV (cv2) per preprocessing immagine
- requests (HTTP verso il backend)
- python-dotenv per configurazione

## Struttura cartelle
```
/src
  main.py              → loop principale: avanza carta → scatta → invia → repeat
  camera.py            → gestione picamera2, autofocus, scatto
  motor.py             → controllo stepper motor (avanza, stop, velocità)
  preprocessor.py      → crop, correzione prospettiva, resize, miglioramento contrasto
  uploader.py          → invia immagine al backend, gestisce retry e coda offline
  button_handler.py    → pulsante fisico start/stop
  display.py           → output su piccolo display OLED opzionale (statistiche scan)
/config
  settings.py          → parametri configurabili (velocità motore, ROI camera, ecc.)
/tests
  test_camera.py       → scatta foto singola e salva su disco per test
  test_motor.py        → muove motore avanti/indietro per test meccanico
  test_upload.py       → invia immagine di test al backend
/docs
  wiring.md            → schema collegamento GPIO
  calibration.md       → come calibrare la ROI e l'illuminazione
  mechanical.md        → note sul meccanismo fisico
```

## Flusso principale (main.py)

```
START
  └─ attendi pulsante fisico (o comando remoto via API)
  └─ loop:
       1. motore avanza carta nella posizione di scan
       2. attendi stabilizzazione (delay configurabile, default 0.3s)
       3. camera scatta foto
       4. preprocessor: crop ROI, raddrizza, ridimensiona a 600x840px
       5. uploader: POST /collection/scan con immagine + metadata (tcg hint se noto)
       6. backend risponde con carta riconosciuta (o "unknown")
       7. logga risultato + aggiorna contatore display
       8. motore avanza alla carta successiva
       9. se coda vuota → STOP + suono buzzer
```

## Preprocessing immagine (preprocessor.py)

Passi in ordine:
1. Crop ROI (region of interest) — area fissa dove appare la carta, configurata una volta con calibration
2. Rilevamento bordi carta con cv2.findContours per correggere lieve rotazione
3. Perspective transform (cv2.getPerspectiveTransform) per raddrizzare la carta
4. Resize a 600×840px (proporzione standard carta TCG)
5. Equalizzazione istogramma per migliorare contrasto in condizioni di luce variabile
6. Salva jpg con qualità 85 (tradeoff size/qualità)

## Gestione errori e offline
- Se il backend non risponde: salva immagine in coda locale (`/tmp/scan_queue/`)
- Al reconnect: riprova invio coda automaticamente
- Se carta non riconosciuta: salva in `/tmp/unknown/` con timestamp per revisione manuale
- Log completo in `/var/log/tcg_scanner.log`

## GPIO pinout (stepper motor 28BYJ-48)
```
IN1 → GPIO 17
IN2 → GPIO 18
IN3 → GPIO 27
IN4 → GPIO 22
Pulsante start/stop → GPIO 23 (pull-up interno)
Buzzer → GPIO 24
LED ring → 5V diretto (no GPIO — troppa corrente)
```

## Variabili d'ambiente (.env)
```
BACKEND_URL=http://192.168.1.x:3000
API_KEY=                    # chiave condivisa backend-hardware
MOTOR_SPEED=512             # steps per secondo (default conservativo)
SCAN_DELAY=0.3              # secondi di attesa dopo stop motore
TCG_HINT=                   # 'magic' o 'pokemon' se stai scansionando un singolo TCG
CAMERA_ROI=100,50,520,700   # x,y,w,h della region of interest
```

## Regole importanti
- Il codice deve girare come systemd service (avvio automatico al boot)
- Usare threading per non bloccare il loop principale durante l'upload
- Non usare ML/AI sul RPi — tutta la logica di riconoscimento è sul backend
- Velocità motore deve essere configurabile senza modificare codice
- Aggiungere modalità "dry run" che scatta e preprocessa senza inviare (per calibrazione)
