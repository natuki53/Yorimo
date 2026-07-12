# Yorimo frontend

React/Vite frontend for the Yorimo route-based recommendation app.

## Local setup

```bash
npm install
npm --prefix frontend install
cp frontend/.env.example frontend/.env.local
```

Set `VITE_GOOGLE_MAPS_API_KEY` in `frontend/.env.local` to use Google Maps. When it is empty or Maps fails to load, the app automatically uses the built-in interactive prototype map.

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-browser-key
```

The key must allow the Maps JavaScript API. For local testing, add `http://localhost:5173/*` and `http://127.0.0.1:5173/*` to the HTTP referrer restrictions when using a restricted browser key.

The app requests browser GPS after login and sends that location to the API. Real nearby shops and station search candidates come from the backend Google Places integration. Set `GOOGLE_MAPS_SERVER_API_KEY` in the root `.env`; that server key must allow Places API (New), and should be restricted by server/IP rather than browser referrer.

The landing page keeps the one-click shared demo as its primary action. The `ログイン` action opens the email/password dialog, where users can also switch to account registration. Both authentication paths are available while `DEMO_MODE=true`.

## Run

```bash
npm run dev
npm run frontend:dev
```

The API runs on `http://localhost:4000`; the frontend runs on `http://localhost:5173`.

## Verify

```bash
npm test
npm run build
npm run frontend:test
npm run frontend:build
npm --prefix frontend run test:e2e
```
