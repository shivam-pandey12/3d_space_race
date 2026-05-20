# 3D Spaceship Race

Vite + Three.js racing game with a Node/Express + Socket.IO backend for multiplayer, payments, backend entitlements, live events, and leaderboards.

## Local Setup

```bash
npm install
npm run dev
```

For the backend:

```bash
npm run start:server
```

Frontend dev server defaults to Vite. Backend defaults to `http://localhost:3001`.

## Production Build

```bash
npm run check:prod
npm run build
npm start
```

`npm start` runs the production Node backend. The built client is in `dist/`.

## Hosting Shape

Use two deploy targets:

- Static frontend host for `dist/` such as Vercel, Netlify, Firebase Hosting, Cloudflare Pages, or a CDN.
- Node backend host for `server/multiplayerServer.js` such as Render, Railway, Fly.io, Google Cloud Run, or a VM.

Set these frontend env vars to the public backend URL:

```bash
VITE_API_BASE_URL=https://your-backend.example.com
VITE_MULTIPLAYER_URL=https://your-backend.example.com
```

Set backend CORS/origin env vars to the frontend URL:

```bash
GAMEHUB_ALLOWED_ORIGINS=https://your-game.example.com
MULTIPLAYER_ALLOWED_ORIGINS=https://your-game.example.com
```

## Production Safety

- Do not commit `.env`, Firebase service account JSON, Razorpay secrets, or runtime state files.
- Use Firebase Admin credentials only on the backend host.
- In production, paid entitlement must come from backend verification.
- Demo entitlement should stay disabled unless you are deploying an explicit QA build.
- Online/ranked/private tournament modes use normalized stats; offline upgrades are not online advantages.

See [PRODUCTION.md](./PRODUCTION.md) and [docs/launch-checklist.md](./docs/launch-checklist.md) before launch.
