# Premium Launch Checklist

Use this before shipping a standalone premium build.

## Build And Runtime

- Run `npm.cmd run check:prod`.
- Run `npm.cmd run build`.
- Run `node --check server/multiplayerServer.js`.
- Confirm there are no console crashes on first load.
- Confirm old profiles normalize without data loss.
- Confirm `.env`, Firebase Admin credentials, Razorpay secrets, logs, and `server/data/*.json` are not included in the GitHub commit.
- Confirm frontend host env includes `VITE_API_BASE_URL`, `VITE_MULTIPLAYER_URL`, and `VITE_FIREBASE_*` values before expecting Google sign-in/cloud sync in production.

## GameHub Lite Protection

- Career race launches.
- Time trial launches and keeps ghost/base-stat comparability.
- Basic garage, hull color, glow color, and trail color still work.
- Multiplayer quick match and private rooms still work.
- Goals, achievements, profile/theme, Firebase optional sync, local fallback, and result screens still work.
- Premium sections show locked previews without blocking free features.

## Premium Modes

- Early Access Pass shows INR 49 / USD 3.99 and 120-day access.
- Full Premium Pass shows INR 149 / USD 6.99 and 120-day access.
- Active passes show `expiresAt`, active-until copy, and days remaining.
- Expired passes fall back to Lite and show renew copy without deleting progress.
- Early Access campaign cups and 4-player AI tournament work.
- Full Premium campaign cups and 8-player AI tournament work.
- Advanced garage cosmetics are visual-only.
- Offline upgrades apply only to approved offline contexts.
- Replay/photo mode handles missing replay data safely.
- Custom Race Lab validates values and launches offline-only races.
- Ranked seasons use normalized stats.
- Live events use the backend scheduler when enabled, with local date-seeded fallback only for dev/offline builds.
- Boss races use lightweight modifiers and do not rewrite the track system.
- Rewards and trophies are idempotent.

## Phase 7 Polish

- Lore/intel cards render in Premium, Campaign, Garage, and selected track/ship/cup surfaces.
- Final championship and final boss contexts show lightweight intro/result polish.
- Result highlight cards appear without slowing the continue flow.
- Ship showcase orbit, zoom, reset, favorite marker, lore, cosmetics summary, and upgrade summary work.
- Custom Race Lab preset export/import rejects malformed data and shows a summary before import.
- Private tournament room UI/actions remain gated by backend/frontend flags and active pass checks.
- Event leaderboard UI clearly labels Global Leaderboard, Local Dev Leaderboard, or Unavailable.

## Phase 8 Part 2 Online Systems

- Enable `ENABLE_PRIVATE_TOURNAMENT_ROOMS` and `VITE_ENABLE_PRIVATE_TOURNAMENTS` only after the multiplayer server is reachable.
- Verify 4-player private tournament create, join, ready, start, next round, bot fill, rematch, and leave.
- Verify 8-player private tournament stays Full Premium gated.
- Confirm quick match, normal private rooms, and ranked online still work after private tournament testing.
- Enable `ENABLE_BACKEND_EVENT_SCHEDULER` and `VITE_ENABLE_BACKEND_EVENTS` only after `/api/events/current` and `/api/events/upcoming` return safe data.
- Enable `ENABLE_GLOBAL_EVENT_LEADERBOARDS` and `VITE_ENABLE_GLOBAL_EVENT_LEADERBOARDS` only when Firestore leaderboard storage is configured for production.
- Confirm local JSON leaderboard fallback is development-only and is never labeled global in production.
- Submit a valid event score and confirm only the best score per user is kept.
- Submit an impossible score and confirm it is rejected or flagged.
- Confirm private tournaments and event leaderboards do not add betting, prize pools, real-money rewards, or online stat advantages.

## Fairness

- Multiplayer, ranked, and time trial ignore offline upgrades.
- Cosmetics do not affect stats.
- Paid ships or premium cosmetics do not create online advantage.
- Custom Race Lab, events, and boss races do not change ranked or online rating unless a future server-authorized design explicitly adds it.

## Storage Safety

- Demo entitlement is not saved as real purchase state.
- Replay frames are not stored in profile, localStorage, or Firebase.
- Preset codes do not include auth, profile, entitlement, credits, rewards, or personal data.
- Credits cannot go negative from upgrades.
- Reset/refund behavior cannot duplicate credits.
- Firebase remains optional and local fallback works.

## Payment Launch Gate

Do not launch real paid access until:

- Razorpay India is connected through the trusted backend with INR 49 / INR 149 120-day pass amounts.
- Webhooks verify payment before entitlement is granted and duplicate webhooks cannot extend a pass twice.
- Entitlement refresh reads server-verified state and returns Lite effective access when a pass is expired.
- Demo entitlement is disabled in production or restricted to explicit QA builds.
- Refund/support workflows are documented.
- Old lifetime/one-time entitlement records have been reviewed or explicitly migrated with `ENABLE_LEGACY_PASS_MIGRATION=true`.
- Global Stripe remains disabled until a separate implementation is completed.
