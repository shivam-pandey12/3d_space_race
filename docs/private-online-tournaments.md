# Private Online Tournaments

Phase 8 Part 2 adds private online tournament rooms as a separate Socket.IO room type: `private-tournament`.

## Flow

- Host creates a 4-player or 8-player private tournament room.
- 4-player rooms require Early Access or Full Premium.
- 8-player rooms require Full Premium.
- Players join by room code or invite link.
- Host may enable bot fill for missing slots.
- Human players toggle ready before each tournament race.
- Host starts the tournament, then starts each next round after server results are finalized.
- Eliminated players remain in the room as spectators.
- The room feed records joins, ready state, round starts, disconnects, and finalization.

## Bracket Rules

- 4-player format: all entrants race, top 2 advance, final race top 1 wins.
- 8-player format: all entrants race, top 4 advance, then top 2, then final top 1 wins.
- Bot entrants are server-generated and server-scored. Client bot visuals are only presentation.
- Each race has a server race ID and is finalized once only.

## Server Authority

- The existing `race:snapshot` and `race:finish` path is reused.
- The server validates progress and classifies results.
- Duplicate finish submissions cannot advance a bracket twice.
- Disconnected entrants get a reconnect grace period.
- If they do not return before timeout, they are classified as DNF/forfeit.

## Fairness

- Private tournament races use normalized online stats.
- Offline ship upgrades are ignored.
- Paid ships and cosmetics do not grant stat advantage online.
- No entry fees, betting, gambling, prize pools, or real-money rewards exist.

## Environment

Backend:

```env
ENABLE_PRIVATE_TOURNAMENT_ROOMS=true
```

Frontend:

```env
VITE_ENABLE_PRIVATE_TOURNAMENTS=true
```

## Known Limits

- Private tournaments are not ranked.
- They do not create real-money rewards.
- Bot simulation is lightweight and server-scored, not full authoritative bot physics.
