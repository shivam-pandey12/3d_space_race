# Online Ranked And Anti-Cheat

Phase 8 Part 1 upgrades ranked to server-created online ranked rooms without changing quick match/private room flows.

## Queue Flow

1. Client syncs identity with Firebase token or dev fallback.
2. Client emits `ranked:queue`.
3. Server checks premium entitlement in production.
4. Server stores a ranked queue entry with rating/tier.
5. Matchmaking prefers nearby rating and widens the search over wait time.
6. Server creates a ranked room and starts a server-authored countdown.
7. Queue cancel, timeout, and disconnect remove the player from ranked queue.

## Race Rules

- Ranked race config is server authored.
- Ship stats are normalized.
- Offline upgrades are ignored.
- Cosmetics do not affect stats.
- Rating changes happen only in server finalization.

## Anti-Cheat Basics

Clients submit lightweight progress snapshots during the race. The server clamps or flags suspicious movement instead of over-punishing normal lag:
- distance regression is clamped
- impossible distance jumps are clamped
- lap regression is clamped
- impossible lap spikes are clamped

Finish classification uses server time, minimum plausible track duration, and verified progress. Duplicate finish submissions do not duplicate rating updates because the room finalizes once.

## Rating

Server computes Elo-style placement changes after final standings:
- higher finish gains rating
- lower finish loses or gains less rating
- beating higher-rated players is worth more
- updates are clamped and saved once per finalized room

Rank tiers remain Bronze, Silver, Gold, Elite, and Legend.

## Limitations

This is not full authoritative physics. It is practical browser-game validation around snapshots, server-authored race config, and server-finalized ratings.
