export const LEGAL_CONTACT = Object.freeze({
  businessName: 'MH HORIZON',
  brandName: 'MH HORIZON / GameHub',
  productName: '3D Spaceship Race',
  country: 'India',
  supportEmail: 'support@mhhorizons.com',
  lastUpdated: '[date]',
  responseTime: '[expected response time]'
});

export const LEGAL_LINKS = Object.freeze([
  { route: '/privacy-policy', label: 'Privacy Policy' },
  { route: '/terms-and-conditions', label: 'Terms & Conditions' },
  { route: '/refund-and-cancellation-policy', label: 'Refund Policy' },
  { route: '/contact', label: 'Contact' },
  { route: '/shipping-policy', label: 'Shipping Policy' }
]);

export const LEGAL_PAGES = Object.freeze({
  '/privacy-policy': {
    title: 'Privacy Policy',
    eyebrow: 'Player Data & Account Safety',
    summary: `${LEGAL_CONTACT.brandName} uses account, gameplay, payment-status, and online-race data to operate ${LEGAL_CONTACT.productName}, premium access passes, multiplayer, ranked modes, events, support, and anti-cheat protections.`,
    sections: [
      {
        heading: 'Data We Collect',
        items: [
          'Account and profile information such as player name, account email, profile ID, settings, progress, achievements, rewards, and saved gameplay state.',
          'Google login information when you choose Google/Firebase sign-in, such as your authenticated user ID, email address, and display name.',
          'Gameplay progress such as career, campaign, tournament, ranked, event, leaderboard, garage, replay metadata, reward, trophy, badge, and custom race lab progress.',
          'Payment status information such as Razorpay order IDs, payment IDs, plan IDs, entitlement status, pass start date, pass expiry date, and verification status. We do not collect or store card, UPI PIN, CVV, or full payment instrument details.',
          'Online play data such as multiplayer rooms, ranked results, private tournament room status, event leaderboard submissions, anti-cheat snapshots, race timing, finish order, and disconnect/DNF state.',
          'Device, browser, and basic analytics information if enabled, such as client version, browser type, error logs, performance mode, and approximate region needed for support, security, and service quality.'
        ]
      },
      {
        heading: 'How We Use Data',
        items: [
          'To provide login, profile sync, local fallback, and account recovery support.',
          'To verify and maintain Early Access Pass and Full Premium Pass entitlement through backend-verified payment records.',
          'To run multiplayer, ranked matchmaking, private tournaments, leaderboards, live events, rewards, and anti-cheat checks.',
          'To respond to support, refund, premium pass, account, and bug report requests.',
          'To detect fraud, cheating, exploit abuse, duplicate payment claims, and suspicious leaderboard or ranked submissions.'
        ]
      },
      {
        heading: 'Firebase, Firestore, And Local Fallback',
        items: [
          'Firebase Authentication may be used for Google login and account identity.',
          'Firestore may store profile progress, premium entitlement records, ranked/event/tournament data, leaderboards, and support-safe gameplay records.',
          'If Firebase is unavailable, the game may use local browser storage for free progress and development fallback. Production paid entitlement should come from backend verification, not local storage alone.'
        ]
      },
      {
        heading: 'Razorpay Payments',
        items: [
          'Razorpay processes India payments for fixed-duration digital access passes.',
          'Sensitive payment information is handled by Razorpay. We store only payment verification records needed to grant, refresh, refund, revoke, or audit premium access.',
          'Payment success in the browser does not grant premium access by itself. Premium access is granted only after backend verification.'
        ]
      },
      {
        heading: 'Security, Rights, And Contact',
        items: [
          'We use reasonable technical and organizational measures to protect account, entitlement, and gameplay data.',
          'You may contact us to request help with account access, data questions, payment verification, refund status, or correction of inaccurate account information.',
          `Contact: ${LEGAL_CONTACT.supportEmail}. Business placeholder: ${LEGAL_CONTACT.businessName}, ${LEGAL_CONTACT.country}.`
        ]
      },
      {
        heading: 'Children And Teen Safety',
        items: [
          'The game is designed as a racing game and does not include gambling, betting, entry-fee prize pools, or real-money prizes.',
          'Players should use online features responsibly and follow the fair play rules in the Terms & Conditions.',
          'Parents or guardians can contact support about account, privacy, or online safety concerns.'
        ]
      }
    ]
  },
  '/terms-and-conditions': {
    title: 'Terms And Conditions',
    eyebrow: 'Game Rules & Premium Pass Terms',
    summary: `These terms explain how you may use ${LEGAL_CONTACT.productName}, GameHub Lite, premium 120-day access passes, online racing, ranked seasons, tournaments, leaderboards, and events.`,
    sections: [
      {
        heading: 'Use Of The Game',
        items: [
          'GameHub Lite is free to use and remains available without requiring a premium pass.',
          'You agree to use the game, online systems, account features, and premium systems only for lawful and fair gameplay purposes.',
          'Online features may require a working internet connection, compatible browser, and server availability.'
        ]
      },
      {
        heading: 'Account Responsibility',
        items: [
          'You are responsible for activity on your account and for keeping your Google/Firebase account secure.',
          'Use accurate account information when contacting support about payments, refunds, premium access, or account issues.',
          'Do not share accounts to bypass entitlement, ranked, anti-cheat, or payment protections.'
        ]
      },
      {
        heading: 'Fair Play Rules',
        items: [
          'Cheating, exploiting bugs, tampering with clients, submitting false race results, abusing leaderboards, or disrupting multiplayer rooms is not allowed.',
          'Ranked, online multiplayer, and private tournament rooms use normalized stats for fairness. Offline upgrades and cosmetics must not create online stat advantages.',
          'We may flag, remove, revoke, or restrict suspicious scores, ranked results, leaderboard entries, rooms, or accounts when abuse is detected.'
        ]
      },
      {
        heading: 'Premium Pass Terms',
        items: [
          'Early Access Pass costs ₹49 in India or $3.99 globally and provides 120 days of Early Access premium content after backend payment verification.',
          'Full Premium Pass costs ₹149 in India or $6.99 globally and provides 120 days of Full Premium content after backend payment verification.',
          'Premium passes are fixed-duration digital access passes. They are not auto-renewing subscriptions.',
          'There is no automatic renewal. When a pass expires, premium features lock again and you may choose whether to renew.',
          'Pass expiry does not delete your profile, free progress, trophies, badges, rewards, or history.'
        ]
      },
      {
        heading: 'Digital Product Access',
        items: [
          'Premium access is delivered digitally after successful backend verification of payment.',
          'Premium content, online events, ranked seasons, leaderboards, tournament rooms, content packs, and game balance may change over time for maintenance, fairness, security, or product improvement.',
          'No physical product is shipped.'
        ]
      },
      {
        heading: 'No Gambling Or Real-Money Prizes',
        items: [
          'The game does not offer betting, wagering, gambling, entry-fee prize pools, or real-money prizes.',
          'Leaderboard, tournament, ranked, event, trophy, and badge rewards are gameplay or cosmetic rewards only.'
        ]
      },
      {
        heading: 'Limitations And Termination',
        items: [
          'Service availability may be affected by maintenance, hosting issues, third-party provider outages, browser compatibility, or network conditions.',
          'We may suspend or terminate access for abuse, cheating, fraud, payment misuse, or violation of these terms.',
          `For questions, contact ${LEGAL_CONTACT.supportEmail}. Business placeholder: ${LEGAL_CONTACT.businessName}, ${LEGAL_CONTACT.country}.`
        ]
      }
    ]
  },
  '/refund-and-cancellation-policy': {
    title: 'Refund And Cancellation Policy',
    eyebrow: 'Digital Access Pass Support',
    summary: 'Premium passes are fixed-duration digital access products. There is no auto-renewal, so cancellation means choosing not to renew after the current pass duration ends.',
    sections: [
      {
        heading: 'Digital Access Pass Policy',
        items: [
          'Early Access Pass and Full Premium Pass are digital 120-day access passes.',
          'Premium access is granted only after backend payment verification.',
          'No physical product is shipped and no subscription cancellation is required because passes do not auto-renew.'
        ]
      },
      {
        heading: 'Refund Conditions',
        items: [
          'Duplicate payment for the same account and pass.',
          'Payment was charged but entitlement was not granted after verification and support cannot resolve it.',
          'A technical failure prevents access to purchased premium content and support cannot provide a reasonable fix or workaround.',
          'Other refund cases may be reviewed manually using the placeholder policy decision process before launch.'
        ]
      },
      {
        heading: 'Non-Refundable Cases',
        items: [
          'Change of mind after using premium access, unless required by applicable law or approved manually.',
          'Account restriction, suspension, or termination due to cheating, exploit abuse, fraud, payment misuse, or violation of the Terms & Conditions.',
          'Issues caused by unsupported devices, browser settings, network restrictions, or third-party outages where premium entitlement was correctly granted.'
        ]
      },
      {
        heading: 'Refund Request Process',
        items: [
          `Email ${LEGAL_CONTACT.supportEmail} with your account email, Razorpay order ID, Razorpay payment ID if available, plan name, and a short description of the issue.`,
          `Expected response time placeholder: ${LEGAL_CONTACT.responseTime}.`,
          'Refunds, if approved, may be processed through Razorpay or the original payment method according to payment provider rules and processing timelines.'
        ]
      },
      {
        heading: 'Razorpay Reference',
        items: [
          'Razorpay payment IDs and order IDs help us verify payment status.',
          'Do not send card numbers, UPI PINs, CVV, passwords, or other sensitive payment credentials in support messages.'
        ]
      }
    ]
  },
  '/contact': {
    title: 'Contact',
    eyebrow: 'Support & Business Contact',
    summary: `Use this page for support requests related to ${LEGAL_CONTACT.productName}, premium passes, payments, refunds, account access, bugs, ranked/live event issues, and online multiplayer.`,
    sections: [
      {
        heading: 'Support Contact',
        items: [
          `Support email: ${LEGAL_CONTACT.supportEmail}`,
          `Business name placeholder: ${LEGAL_CONTACT.businessName}`,
          `Country placeholder: ${LEGAL_CONTACT.country}`,
          `Expected response time placeholder: ${LEGAL_CONTACT.responseTime}`
        ]
      },
      {
        heading: 'What To Include',
        items: [
          'Payment issue: account email, Razorpay order ID, Razorpay payment ID, pass name, and screenshot if useful.',
          'Premium pass issue: account email, current pass status, entitlement refresh result, and the feature that stayed locked.',
          'Bug report: browser, device, steps to reproduce, screenshot or console error if available.',
          'Account issue: Google/Firebase account email and a clear description of the login or sync problem.',
          'Refund request: order/payment ID, account email, plan name, and reason for the request.'
        ]
      },
      {
        heading: 'Email Link',
        items: [
          `You can email support at mailto:${LEGAL_CONTACT.supportEmail}. Replace this placeholder email before launch if needed.`
        ]
      }
    ]
  },
  '/shipping-policy': {
    title: 'Shipping Policy',
    eyebrow: 'Digital Delivery Only',
    summary: `${LEGAL_CONTACT.productName} is a digital game product. Premium access passes are delivered digitally after successful payment verification and entitlement refresh.`,
    sections: [
      {
        heading: 'No Physical Shipping',
        items: [
          'No physical goods, boxes, discs, devices, merchandise, or printed items are shipped for GameHub Lite, Early Access Pass, or Full Premium Pass.',
          'There are no shipping charges, delivery partners, or physical delivery timelines for premium access.'
        ]
      },
      {
        heading: 'Digital Delivery',
        items: [
          'Premium access should appear after Razorpay payment is captured and backend verification grants entitlement.',
          'If your pass does not appear, use the Refresh Entitlement button in the game and confirm you are signed in with the same Google account used during purchase.',
          'Digital access is tied to backend-verified entitlement and may require internet access to refresh.'
        ]
      },
      {
        heading: 'Delivery Support',
        items: [
          `If access does not appear after successful payment verification, contact ${LEGAL_CONTACT.supportEmail}.`,
          'Include your account email, Razorpay order ID, Razorpay payment ID if available, and the pass you purchased.'
        ]
      }
    ]
  }
});

export function normalizeLegalPath(pathname = '/') {
  const cleanPath = String(pathname || '/').split('?')[0].split('#')[0];
  if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
    return cleanPath.slice(0, -1);
  }
  return cleanPath;
}

export function getLegalPage(pathname = '/') {
  return LEGAL_PAGES[normalizeLegalPath(pathname)] ?? null;
}

export function isLegalRoute(pathname = '/') {
  return Boolean(getLegalPage(pathname));
}
