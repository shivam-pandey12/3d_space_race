# Live Events And Event Leaderboards

Phase 8 Part 2 adds backend scheduled events and backend-backed event leaderboard submission.

## Scheduler Model

Events are exposed through:

- `GET /api/events/current`
- `GET /api/events/upcoming`
- `GET /api/events/:eventId`

Event fields:

- `eventId`
- `type`
- `title`
- `description`
- `startAt`
- `endAt`
- `requiredEdition`
- `trackId`
- `lapCount`
- `aiCount`
- `difficulty`
- `modifiers`
- `goal`
- `reward`
- `leaderboardEnabled`
- `configHash`
- `status`

## Data Sources

The backend loads events in this order:

- Firestore `liveEvents` collection when Firebase Admin is configured.
- `server/live-events-schedule.json` static schedule.
- Local deterministic fallback only in development/offline mode.

Production does not pretend local fallback events are official global events.

## Leaderboards

Leaderboards use:

- `GET /api/events/:eventId/leaderboard`
- `POST /api/events/:eventId/submit-score`

Score submissions include finish time, position, clean race state, hazard hits, overtakes, drift releases, config hash, and client/build metadata.

The server validates:

- Event exists and is active.
- User is authenticated in production.
- Required entitlement is active for premium official events.
- Event config hash matches.
- Finish time, position, and stats are plausible.
- One best score per user per event.

Impossible scores are rejected. Suspicious but plausible scores are flagged.

## Storage

- Firestore is the production global leaderboard store.
- Local JSON fallback is development-only and must be labeled as local/dev.
- No replay frames or large race data are stored.

## Environment

Backend:

```env
ENABLE_BACKEND_EVENT_SCHEDULER=true
ENABLE_GLOBAL_EVENT_LEADERBOARDS=true
```

Frontend:

```env
VITE_ENABLE_BACKEND_EVENTS=true
VITE_ENABLE_GLOBAL_EVENT_LEADERBOARDS=true
```

## Safety

Events do not affect ranked rating unless a future backend explicitly creates a ranked event type. No gambling, betting, prize pools, or real-money rewards are implemented.
