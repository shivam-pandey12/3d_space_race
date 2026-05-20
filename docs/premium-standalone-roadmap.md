# Premium Standalone Roadmap

This document tracks what is real today, what is preview-only, and what must stay protected for the GameHub Lite build.

## Editions

- `GAMEHUB_LITE`: default GameHub/free experience. Existing career, time trial, garage, multiplayer, goals, achievements, profile sync, and results remain playable.
- `STANDALONE_EARLY_ACCESS`: active Early Access Pass unlocks early premium campaign cups, 4-player AI tournament, selected advanced garage options, basic replay/photo, basic custom Race Lab, daily events, basic local ranked, and the first boss event for 120 days.
- `STANDALONE_FULL_PREMIUM`: active Full Premium Pass unlocks full premium campaign/tournament access, expanded advanced garage, full custom/replay controls, full local ranked/events/bosses, and full reward/gallery surfaces for 120 days.

Pricing stays config-driven in `src/game/editionConfig.js`:

- Early Access Pass global: USD 3.99 for 120 days
- Full Premium Pass global: USD 6.99 for 120 days
- India Early Access Pass: INR 49 for 120 days
- India Full Premium Pass: INR 149 for 120 days

Passes are fixed-duration access products. They are not subscriptions and do not auto-renew.

## Completed Premium Phases

- Phase 1: edition config, pricing, centralized entitlement helper, safe demo override, upgrade UI foundation.
- Phase 2: premium UI polish, locked preview cards, edition badges, preview hub, roadmap, demo controls.
- Phase 3: premium campaign and local AI tournament mode.
- Phase 4: advanced garage cosmetics and offline-only ship upgrades.
- Phase 5: runtime replay/photo mode, Custom Race Lab, reward unlock wiring, trophy/badge gallery.
- Phase 6: local AI ranked seasons, date-seeded live events, offline boss race events.
- Phase 7: lore/intel polish, result/championship highlights, ship showcase, shareable Race Lab preset codes, online/payment launch polish, and hardening.
- Phase 8 Part 1: Razorpay India checkout, backend-verified pass entitlement, online ranked matchmaking, anti-cheat basics, and premium content packs.
- Phase 8 Part 2: private online tournament rooms, backend event scheduler, and backend event leaderboards.

## Implemented Online Systems And Remaining Placeholders

- Private online tournament rooms are implemented behind backend/frontend flags and require active pass entitlement where enabled.
- Event leaderboards are implemented behind backend/frontend flags and require active pass entitlement for premium official events where enabled.
- Global Stripe checkout is not implemented.
- Backend live-event scheduling is implemented; production still needs a configured Firestore/static schedule source and operations process.
- No real-money prizes, betting, loot boxes, or gambling mechanics exist.

## Fairness Rules

- Online multiplayer and ranked contexts use normalized/base stats.
- Offline ship upgrades are ignored in multiplayer, ranked, and time trial.
- Cosmetics never affect stats.
- Paid content must not create online advantage.
- Custom Race Lab results do not affect ranked rating, online rating, multiplayer stats, or time-trial ghosts.

## Storage Rules

- Demo entitlement stays in demo-only local storage and must not become real purchase state.
- Paid entitlement comes from backend verification and expires according to `expiresAt`.
- Profile progress can sync through the existing Firebase/local fallback path.
- Replay frames are runtime-only and are not written to profile, localStorage, or Firebase.
- Custom Race Lab preset codes contain only sanitized setup data.
