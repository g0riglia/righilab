## RighiLab

Applicazione Next.js per generare lezioni e mini-giochi didattici a partire da appunti, video YouTube o argomenti inseriti manualmente.

## Requisiti

- Node.js 20 o superiore
- npm
- Una chiave Gemini per le funzioni AI

## Setup

1. Installa le dipendenze:

```bash
npm install
```

2. Crea il file `.env.local` partendo da `.env.example`.

3. Inserisci la tua chiave Gemini:

```env
GEMINI_API_KEY=la_tua_chiave_gemini
```

4. Avvia il server di sviluppo:

```bash
npm run dev
```

5. Apri `http://localhost:3000` nel browser.

## Variabili ambiente

- `GEMINI_API_KEY`: obbligatoria per generare lezioni e giochi con AI.

Se questa variabile manca o non è valida, le route API AI rispondono con un errore di configurazione.

## Funzionalita AI

- `POST /api/generate-lesson`: genera una lezione dai contenuti caricati
- `POST /api/generate-game`: genera i dati del mini-gioco a partire dalla lezione

Entrambe le route usano Gemini lato server, quindi dopo aver modificato `.env.local` serve riavviare `npm run dev`.

## Script

```bash
npm run dev
npm run build
npm run start
npm run lint
```
