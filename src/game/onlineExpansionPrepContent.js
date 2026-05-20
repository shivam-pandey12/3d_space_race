export const PRIVATE_TOURNAMENT_PREP = Object.freeze({
  title: 'Private Online Tournament Rooms',
  status: 'implemented',
  summary: 'Server-backed private tournament rooms are available when backend and frontend flags are enabled.',
  cards: [
    {
      id: 'host-room',
      title: 'Host Creates Bracket Room',
      detail: 'Private code, invite link, format selection, bot fill, and bracket seed are handled by the tournament room flow.'
    },
    {
      id: 'slots-ready',
      title: 'Slots And Ready State',
      detail: 'Player slots, optional bot fill, ready checks, host transfer, and reconnect windows stay server-authoritative.'
    },
    {
      id: 'rounds-results',
      title: 'Round Progression',
      detail: 'Rounds finalize once on the server before advancing the bracket, with eliminated players kept as spectators.'
    }
  ],
  reservedEvents: [
    'tournament:create-private',
    'tournament:join-private',
    'tournament:toggle-ready',
    'tournament:start',
    'tournament:start-next-round',
    'tournament:update'
  ]
});

export const EVENT_LEADERBOARD_PREP = Object.freeze({
  title: 'Event Leaderboards',
  status: 'backend-ready',
  summary: 'Backend event leaderboards are available when the scheduler, Firestore storage, and leaderboard flags are enabled.',
  rows: [
    {
      id: 'local-event-score',
      label: 'Local Event Score',
      description: 'Profile-safe fallback display for local/offline development only.'
    },
    {
      id: 'room-event-score',
      label: 'Room Event Score',
      description: 'Room-scoped standings can reuse server-authored room result snapshots where applicable.'
    },
    {
      id: 'global-leaderboard',
      label: 'Global Leaderboard',
      description: 'Uses backend validation, config hashes, best-score replacement, and suspicious-score handling.'
    }
  ],
  futureEndpoints: [
    'GET /api/events/:eventId/leaderboard',
    'POST /api/events/:eventId/submit-score',
    'GET /api/events/current'
  ]
});

export const PAYMENT_PREP_NOTES = Object.freeze({
  title: 'Payment Status',
  summary: 'Razorpay India checkout is backend verified. Global Stripe remains a future placeholder.',
  providers: [
    {
      id: 'stripe',
      label: 'Stripe Global',
      note: 'Use backend Checkout Sessions and webhook-verified entitlement grants for global plans.'
    },
    {
      id: 'razorpay',
      label: 'Razorpay India',
      note: 'Uses backend order creation, signature verification, and 120-day pass pricing from config.'
    }
  ],
  rules: [
    'Client-side entitlement can preview UI, but cannot be the production source of truth.',
    'Demo entitlement remains local/dev-only and must never become purchase proof.',
    'Firebase profile progress can sync gameplay state, not unverified purchase authority.'
  ]
});

export function getOnlineExpansionPrep() {
  return {
    privateTournament: PRIVATE_TOURNAMENT_PREP,
    eventLeaderboard: EVENT_LEADERBOARD_PREP,
    payment: PAYMENT_PREP_NOTES
  };
}
