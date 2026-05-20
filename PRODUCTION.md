# Production Checklist

This repo is ready to upload to GitHub when generated files, secrets, and local runtime state stay ignored.

## Required Checks

Run before every production push:

```bash
npm ci
npm run check:prod
npm run build
npm run check:server
```

The GitHub Actions workflow in `.github/workflows/ci.yml` runs the server syntax checks and production build on pushes and pull requests.

## Hosting Shape

Deploy as two parts:

1. Static frontend: build with `npm run build` and host the `dist/` folder.
2. Node backend: run `npm start` or `npm run start:server` on a Node host.

Recommended frontend hosts: Vercel, Netlify, Firebase Hosting, Cloudflare Pages, or any CDN/static host.

Recommended backend hosts: Render, Railway, Fly.io, Google Cloud Run, or a VM with Node 20.19+.

## Frontend Environment

Set these on the frontend build host:

```bash
VITE_API_BASE_URL=https://your-backend.example.com
VITE_MULTIPLAYER_URL=https://your-backend.example.com
VITE_SPACESHIP_EDITION=GAMEHUB_LITE
VITE_ENABLE_DEMO_ENTITLEMENT=false
VITE_ENABLE_PAYMENTS=true
VITE_RAZORPAY_KEY_ID=rzp_live_public_key_id
VITE_ENABLE_PRIVATE_TOURNAMENTS=true
VITE_ENABLE_BACKEND_EVENTS=true
VITE_ENABLE_GLOBAL_EVENT_LEADERBOARDS=true
```

Firebase web config is public app config, but keep it in host env vars so the repo is portable:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

If these Firebase web vars are not set, the game falls back to local guest mode and Google sign-in/cloud sync will not work.

## Backend Environment

Set these on the backend host:

```bash
NODE_ENV=production
PORT=3001
ALLOW_INSECURE_LOCAL_AUTH=false
GAMEHUB_ALLOWED_ORIGINS=https://your-game.example.com
MULTIPLAYER_ALLOWED_ORIGINS=https://your-game.example.com
```

Payments and entitlement:

```bash
ENABLE_PAYMENTS=true
ENABLE_BACKEND_ENTITLEMENTS=true
PAYMENT_ENV=live
RAZORPAY_KEY_ID=rzp_live_public_key_id
RAZORPAY_KEY_SECRET=replace_with_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=replace_with_razorpay_webhook_secret
ENABLE_LEGACY_PASS_MIGRATION=false
```

Firebase Admin:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project-id","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com"}'
FIREBASE_PROJECT_ID=your-project-id
GOOGLE_CLOUD_PROJECT=your-project-id
GCLOUD_PROJECT=your-project-id
```

Alternatively use `GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json` on hosts that support mounted secret files. Do not use base64 service-account env for this project.

Feature flags:

```bash
ENABLE_PRIVATE_TOURNAMENT_ROOMS=true
ENABLE_BACKEND_EVENT_SCHEDULER=true
ENABLE_GLOBAL_EVENT_LEADERBOARDS=true
```

## Firebase Requirements

- Enable Firebase Authentication.
- Enable Google sign-in.
- Enable Anonymous Auth if you want guest cloud identity; otherwise local guest fallback is used.
- Enable Firestore.
- Keep Firestore rules aligned with the profile/progression model.
- Backend Admin credentials must never be exposed to the browser.

## Razorpay Requirements

- Create live Razorpay keys.
- Configure webhook URL:
  `https://your-backend.example.com/api/payments/razorpay/webhook`
- Set the same webhook secret on the backend.
- Test failed, canceled, duplicate, and captured payments before launch.

## Safety Rules

- Do not commit `.env`, service account JSON, Razorpay secrets, local logs, or `server/data/*.json`.
- Demo entitlement must be disabled in production unless this is a private QA build.
- Production premium access must come from backend-verified entitlement.
- Expired/refunded/revoked passes must resolve to GameHub Lite on backend gates.
- Online/ranked/private tournament races use normalized stats.
- Offline upgrades never affect online, ranked, or time trial.

## Final GitHub Upload

```bash
git status --short
git add .
git commit -m "Prepare production hosting"
git branch -M main
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

Before pushing, confirm `git status --short` does not include `.env`, logs, Firebase service account files, or `server/data/*.json`.
