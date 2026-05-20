function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatLabel(value) {
  return String(value ?? '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

const ACTION_FEEDBACK_LABELS = {
  'hangar-page': 'Opened',
  'preview-ship': 'Previewed',
  track: 'Selected',
  ship: 'Selected',
  'buy-ship': 'Purchased',
  hull: 'Applied',
  glow: 'Applied',
  trail: 'Applied',
  'start-race': 'Launching',
  'start-time-trial': 'Launching',
  'race-again': 'Launching',
  'back-hangar': 'Opening',
  'result-action': 'Opening',
  theme: 'Applied',
  'google-login': 'Opening',
  logout: 'Switching',
  'copy-id': 'Copied',
  'copy-link': 'Copied',
  'copy-code': 'Copied',
  'quick-match': 'Queued',
  'private-create': 'Creating',
  'room-ready': 'Updated',
  'room-start': 'Starting',
  'room-host': 'Transferred',
  'room-rematch': 'Queued',
  'room-kick': 'Removed',
  'room-discard': 'Closing',
  'room-leave': 'Leaving',
  emote: 'Sent',
  'resume-race': 'Resuming',
  'restart-race': 'Restarting',
  tutorial: 'Updated',
  rebind: 'Listening',
  'premium-purchase': 'Preview',
  'premium-refresh': 'Refresh',
  'premium-preview': 'Preview',
  'campaign-select': 'Selected',
  'campaign-start': 'Launching',
  'tournament-select': 'Selected',
  'tournament-start': 'Launching',
  'tournament-continue': 'Launching',
  'custom-race-start': 'Launching',
  'custom-race-randomize': 'Randomized',
  'custom-race-save': 'Saved',
  'custom-race-load': 'Loaded',
  'custom-race-delete': 'Deleted',
  'custom-race-export-code': 'Exported',
  'custom-race-copy-code': 'Copied',
  'custom-race-validate-code': 'Validated',
  'custom-race-import-code': 'Imported',
  'custom-race-save-imported': 'Saved',
  'ranked-start': 'Queueing',
  'ranked-cancel': 'Cancel',
  'live-event-start': 'Launching',
  'boss-select': 'Selected',
  'boss-start': 'Launching',
  'showcase-control': 'Adjusted',
  'favorite-ship': 'Favorite',
  'copy-result': 'Copied',
  'replay-control': 'Updated',
  'replay-capture': 'Captured',
  'reward-equip': 'Equipped',
  'advanced-category': 'Opened',
  'advanced-filter': 'Filtered',
  'advanced-rarity': 'Filtered',
  'advanced-preview': 'Preview',
  'advanced-apply': 'Applied',
  'advanced-reset-preview': 'Reset',
  'upgrade-module': 'Upgraded',
  'reset-upgrades': 'Reset',
  'demo-edition': 'Demo',
  'demo-edition-clear': 'Default'
};

const FORM_FEEDBACK_LABELS = {
  'save-name': 'Saved',
  'join-room': 'Joining'
};

const BUTTON_FEEDBACK_DURATION = 1500;
const BUTTON_FEEDBACK_FADE_DURATION = 320;
const SINGLE_ACTIVE_FEEDBACK_ACTIONS = new Set(['hangar-page', 'track', 'ship', 'theme', 'hull', 'glow', 'trail', 'advanced-category', 'advanced-filter', 'advanced-rarity']);

export class MetaUI {
  constructor(container, handlers) {
    this.handlers = handlers;
    this.root = document.createElement('div');
    this.root.className = 'meta-ui';
    this.hangarPage = 'career';
    this.hangarScrollTops = {};
    this.lastHangarModel = null;
    this.buttonFeedbacks = new Map();
    this.buttonFeedbackTimers = new Map();
    container.appendChild(this.root);
  }

  hide() {
    this.root.innerHTML = '';
    this.root.classList.add('meta-ui--hidden');
  }

  showHangar(model) {
    const previousPanel = this.root.querySelector('.meta-ui__panel--hangar');
    if (previousPanel) {
      this.hangarScrollTops[this.hangarPage] = previousPanel.scrollTop;
    }

    this.lastHangarModel = model;
    const pages = this.getHangarPages(model);

    if (!pages.some((page) => page.id === this.hangarPage)) {
      this.hangarPage = pages[0]?.id ?? 'career';
    }

    this.root.classList.remove('meta-ui--hidden');
    this.root.innerHTML = `
      <div class="meta-ui__panel meta-ui__panel--hangar">
        <div class="meta-ui__header meta-ui__header--hangar">
          <div>
            <div class="meta-ui__eyebrow">Pilot Career</div>
            <h1 class="meta-ui__title">Star Hangar</h1>
            <p class="meta-ui__copy">Tune your ship, manage your career, and launch the next race from cleaner hangar pages.</p>
            <div class="meta-ui__header-pilot">
              <strong>${escapeHtml(model.profile.playerName)}</strong>
              <span>${escapeHtml(model.nextUnlock)}</span>
            </div>
          </div>
          <div class="meta-ui__profile">
            <div class="meta-ui__profile-card">
              <span>Level ${model.profile.level}</span>
              <div class="meta-ui__profile-meter"><div style="width:${model.profile.xpProgress * 100}%"></div></div>
              <small>${model.profile.xpLabel}</small>
            </div>
            <div class="meta-ui__profile-card"><span>Credits</span><strong>${model.profile.currency}</strong></div>
            <div class="meta-ui__profile-card"><span>Points</span><strong>${model.profile.totalPoints}</strong></div>
            <div class="meta-ui__profile-card meta-ui__profile-card--edition">
              <span>Plan</span>
              ${this.renderEditionBadge(model.premium.currentEdition.badgeView ?? model.premium.entitlement.badge, 'compact')}
              <small>${escapeHtml(model.premium.entitlement.demo.active ? 'Demo override' : model.premium.entitlement.account?.active ? 'Test account unlock' : model.premium.currentEdition.deck)}</small>
            </div>
          </div>
        </div>

        ${this.renderHangarNav(pages)}
        <div class="meta-ui__page-shell">
          ${this.renderHangarPage(model)}
        </div>
      </div>
    `;

    this.bindActions();
    this.restoreButtonFeedbacks();
    const nextPanel = this.root.querySelector('.meta-ui__panel--hangar');

    if (nextPanel) {
      nextPanel.scrollTop = this.hangarScrollTops[this.hangarPage] ?? 0;
    }
  }

  getHangarPages(model) {
    const multiplayerBadge = model.multiplayer.room ? model.multiplayer.room.players.length : 0;

    return [
      { id: 'career', label: 'Career', badge: '' },
      { id: 'garage', label: 'Garage', badge: '' },
      { id: 'multiplayer', label: 'Multiplayer', badge: multiplayerBadge > 0 ? String(multiplayerBadge) : '' },
      { id: 'premium', label: 'Premium', badge: model.premium?.currentEdition?.badge ?? '' },
      { id: 'campaign', label: 'Campaign', badge: model.campaign?.navBadge ?? '' },
      { id: 'tournament', label: 'Tournament', badge: model.tournament?.navBadge ?? '' },
      { id: 'race-lab', label: 'Race Lab', badge: model.customRaceLab?.navBadge ?? '' },
      { id: 'ranked', label: 'Ranked', badge: model.rankedSeason?.navBadge ?? '' },
      { id: 'events', label: 'Events', badge: model.liveEvents?.navBadge ?? '' },
      { id: 'boss', label: 'Boss', badge: model.bossEvents?.navBadge ?? '' },
      { id: 'rewards', label: 'Rewards', badge: model.rewards?.navBadge ?? '' },
      { id: 'systems', label: 'Systems', badge: '' },
      { id: 'goals', label: 'Goals', badge: '' }
    ];
  }

  renderHangarNav(pages) {
    return `
      <div class="meta-ui__nav">
        ${pages.map((page) => `
          <button class="meta-ui__nav-chip ${page.id === this.hangarPage ? 'is-selected' : ''}" type="button" data-action="hangar-page" data-id="${page.id}">
            <span>${escapeHtml(page.label)}</span>
            ${page.badge ? `<small class="meta-ui__nav-badge">${escapeHtml(page.badge)}</small>` : ''}
          </button>
        `).join('')}
      </div>
    `;
  }

  renderHangarPage(model) {
    if (this.hangarPage === 'garage') {
      return this.renderGaragePage(model);
    }

    if (this.hangarPage === 'multiplayer') {
      return this.renderMultiplayerPage(model);
    }

    if (this.hangarPage === 'premium') {
      return this.renderPremiumPage(model);
    }

    if (this.hangarPage === 'campaign') {
      return this.renderCampaignPage(model);
    }

    if (this.hangarPage === 'tournament') {
      return this.renderTournamentPage(model);
    }

    if (this.hangarPage === 'race-lab') {
      return this.renderCustomRaceLabPage(model);
    }

    if (this.hangarPage === 'rewards') {
      return this.renderRewardsPage(model);
    }

    if (this.hangarPage === 'ranked') {
      return this.renderRankedPage(model);
    }

    if (this.hangarPage === 'events') {
      return this.renderLiveEventsPage(model);
    }

    if (this.hangarPage === 'boss') {
      return this.renderBossEventsPage(model);
    }

    if (this.hangarPage === 'systems') {
      return this.renderSystemsPage(model);
    }

    if (this.hangarPage === 'goals') {
      return this.renderGoalsPage(model);
    }

    return this.renderCareerPage(model);
  }

  renderCareerPage(model) {
    return `
      <div class="meta-ui__grid meta-ui__grid--hangar-page">
        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Pilot Identity</h2>
            <span>${escapeHtml(model.identity.provider)}</span>
          </div>
          <form class="meta-ui__name-form" data-action="save-name">
            <label class="meta-ui__name-label" for="pilot-name">Pilot Name</label>
            <div class="meta-ui__name-row">
              <input id="pilot-name" class="meta-ui__name-input" type="text" maxlength="20" value="${escapeHtml(model.profile.playerName)}" placeholder="Enter pilot name" />
              <button class="meta-ui__action" type="submit" data-feedback-key="save-name">Save Name</button>
            </div>
          </form>
          <div class="meta-ui__theme">
            <span class="meta-ui__theme-label">Theme</span>
            <div class="meta-ui__theme-row">
              <button class="meta-ui__theme-chip ${model.profile.theme === 'dark' ? 'is-selected' : ''}" type="button" data-action="theme" data-id="dark">Dark</button>
              <button class="meta-ui__theme-chip ${model.profile.theme === 'light' ? 'is-selected' : ''}" type="button" data-action="theme" data-id="light">Light</button>
            </div>
          </div>
          <div class="meta-ui__identity">
            <div class="meta-ui__identity-head">
              <strong>Account</strong>
              <span>${escapeHtml(model.identity.provider)}</span>
            </div>
            <div class="meta-ui__identity-grid">
              <div class="meta-ui__identity-item">
                <span>ID</span>
                <strong>${escapeHtml(model.identity.uidLabel)}</strong>
              </div>
              <div class="meta-ui__identity-item">
                <span>Joined</span>
                <strong>${escapeHtml(model.identity.createdLabel)}</strong>
              </div>
              <div class="meta-ui__identity-item meta-ui__identity-item--wide">
                <span>Sync</span>
                <strong>${escapeHtml(model.identity.statusLabel)}</strong>
              </div>
              ${model.identity.email
                ? `
                  <div class="meta-ui__identity-item meta-ui__identity-item--wide">
                    <span>Email</span>
                    <strong>${escapeHtml(model.identity.email)}</strong>
                  </div>
                `
                : ''
              }
            </div>
            <div class="meta-ui__multiplayer-actions">
              <button class="meta-ui__action" type="button" data-action="copy-id" data-id="${escapeHtml(model.identity.uid)}" ${model.identity.uid ? '' : 'disabled'}>
                Copy Full ID
              </button>
              <button class="meta-ui__action" type="button" data-action="google-login" ${model.identity.canUseGoogle ? '' : 'disabled'}>
                ${escapeHtml(model.identity.googleLabel)}
              </button>
              <button class="meta-ui__action" type="button" data-action="logout" ${model.identity.canLogout ? '' : 'disabled'}>
                ${escapeHtml(model.identity.logoutLabel)}
              </button>
            </div>
          </div>
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Track Select</h2>
            <span>${escapeHtml(model.nextUnlock)}</span>
          </div>
          <div class="meta-ui__cards">
            ${model.tracks.map((track) => `
              <button class="meta-ui__card ${track.selected ? 'is-selected' : ''}" type="button" data-action="track" data-id="${track.id}" ${track.unlocked ? '' : 'disabled'}>
                <div class="meta-ui__card-headline">
                  <span class="meta-ui__badge">${track.difficulty}</span>
                  ${this.renderRarityChip(track.rarity)}
                </div>
                <strong>${track.name}</strong>
                <span class="meta-ui__card-kicker">${track.themeName}</span>
                <span>${track.description}</span>
                ${track.lore?.location ? `<small>${escapeHtml(track.lore.location)} | ${escapeHtml(track.lore.identity)}</small>` : ''}
                <small>${track.unlocked ? `${track.identity} | ${track.bestLapLabel}` : `Unlocks at Level ${track.unlockLevel}`}</small>
              </button>
            `).join('')}
          </div>
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Next Race Challenges</h2>
            <span>Bonus rewards for focused runs.</span>
          </div>
          <div class="meta-ui__challenge-list">
            ${model.challenges.map((challenge) => `
              <div class="meta-ui__challenge">
                <strong>${challenge.label}</strong>
                <span>+${challenge.rewardCurrency} CR / +${challenge.rewardXp} XP</span>
              </div>
            `).join('')}
          </div>
          <div class="meta-ui__actions">
            <button class="meta-ui__launch" type="button" data-action="start-race">Launch Race</button>
            <button class="meta-ui__secondary" type="button" data-action="start-time-trial">Start Time Trial</button>
            <button class="meta-ui__secondary" type="button" data-action="hangar-page" data-id="garage">Tune Ship</button>
          </div>
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Quick Snapshot</h2>
            <span>One clean look at the next run.</span>
          </div>
          <div class="meta-ui__reward-list">
            <div class="meta-ui__reward">
              <span>Selected Ship</span>
              <strong>${escapeHtml(model.ships.find((ship) => ship.selected)?.name ?? 'Unknown')}</strong>
            </div>
            <div class="meta-ui__reward">
              <span>Selected Track</span>
              <strong>${escapeHtml(model.tracks.find((track) => track.selected)?.name ?? 'Unknown')}</strong>
            </div>
            <div class="meta-ui__reward">
              <span>Best Lap</span>
              <strong>${escapeHtml(model.timeTrial.selectedTrackBestLap)}</strong>
            </div>
            <div class="meta-ui__reward">
              <span>Account Sync</span>
              <strong>${escapeHtml(model.identity.statusLabel)}</strong>
            </div>
            <div class="meta-ui__reward">
              <span>Live Room</span>
              <strong>${escapeHtml(model.multiplayer.room ? `Code ${model.multiplayer.room.code}` : 'No active room')}</strong>
            </div>
            <div class="meta-ui__reward">
              <span>Ghost Replay</span>
              <strong>${escapeHtml(model.timeTrial.ghostReady ? 'Ready' : 'Not Recorded')}</strong>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  renderGaragePage(model) {
    return `
      <div class="meta-ui__grid meta-ui__grid--hangar-page">
        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Ship Bay</h2>
            <span>Choose a frame that matches your style.</span>
          </div>
          <div class="meta-ui__cards">
            ${model.ships.map((ship) => `
              <div class="meta-ui__card ${ship.selected ? 'is-selected' : ''} ${ship.previewed ? 'is-previewed' : ''}">
                <div class="meta-ui__card-headline">
                  <span class="meta-ui__badge">${ship.unlockLabel}</span>
                  ${this.renderRarityChip(ship.rarity)}
                </div>
                <strong>${ship.name}</strong>
                <span class="meta-ui__card-kicker">${escapeHtml(ship.manufacturer)}</span>
                <span>${ship.tagline}</span>
                ${ship.lore?.identity ? `<small>${escapeHtml(ship.lore.identity)}</small>` : ''}
                <small>${ship.statLine}</small>
                <div class="meta-ui__card-actions">
                  <button class="meta-ui__secondary" type="button" data-action="preview-ship" data-id="${ship.id}">${ship.previewed ? 'Previewing' : 'Preview Ship'}</button>
                  ${ship.unlocked
                    ? `<button class="meta-ui__action" type="button" data-action="ship" data-id="${ship.id}">${ship.selected ? 'Selected' : 'Select Ship'}</button>`
                    : ship.purchaseable
                      ? `<button class="meta-ui__action" type="button" data-action="buy-ship" data-id="${ship.id}">Buy ${ship.cost}</button>`
                      : `<button class="meta-ui__action" type="button" disabled>${ship.unlockReason}</button>`
                  }
                </div>
              </div>
            `).join('')}
          </div>
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Cosmetics</h2>
            <span>Pure style. No stat changes.</span>
          </div>
          <div class="meta-ui__swatches">
            ${this.renderSwatches('Hull', model.cosmetics.hulls, model.cosmetics.selectedHullId, 'hull')}
            ${this.renderSwatches('Glow', model.cosmetics.glows, model.cosmetics.selectedGlowId, 'glow')}
            ${this.renderSwatches('Trail', model.cosmetics.trails, model.cosmetics.selectedTrailId, 'trail')}
          </div>
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Live Preview</h2>
            <span>Preview any ship with your current finish before launch.</span>
          </div>
          ${this.renderGaragePreview(model)}
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Advanced Customization</h2>
            <span>${escapeHtml(model.advancedGarage.access.premiumCosmetics.accessLabel)}</span>
          </div>
          ${this.renderAdvancedGarage(model.advancedGarage)}
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Offline Ship Upgrades</h2>
            <span>${escapeHtml(model.shipUpgrades.fairnessNote)}</span>
          </div>
          ${this.renderShipUpgrades(model.shipUpgrades)}
        </section>
      </div>
    `;
  }

  getSelectedOption(options, selectedId) {
    return options.find((item) => item.id === selectedId) ?? options[0] ?? null;
  }

  renderGaragePreview(model) {
    const selectedShip = model.ships.find((ship) => ship.previewed) ?? model.ships.find((ship) => ship.selected) ?? model.ships[0];
    const selectedHull = this.getSelectedOption(model.cosmetics.hulls, model.cosmetics.selectedHullId);
    const selectedGlow = this.getSelectedOption(model.cosmetics.glows, model.cosmetics.selectedGlowId);
    const selectedTrail = this.getSelectedOption(model.cosmetics.trails, model.cosmetics.selectedTrailId);
    const showcase = model.shipShowcase;
    const hullColor = `#${selectedHull?.hex ?? '7fdfff'}`;
    const glowColor = `#${selectedGlow?.hex ?? '92f5ff'}`;
    const trailColor = `#${selectedTrail?.hex ?? '69d8ff'}`;

    return `
      <div class="meta-ui__garage-preview">
        <div class="meta-ui__garage-stage">
          <div class="meta-ui__garage-preview-host" data-garage-preview-host></div>
          <div class="meta-ui__garage-hint">Drag to rotate</div>
        </div>

        <div class="meta-ui__garage-preview-meta">
          <div class="meta-ui__garage-preview-title">
            <strong>${escapeHtml(selectedShip?.name ?? 'Starling')}</strong>
            <span>${escapeHtml(selectedShip?.tagline ?? 'Race-ready visual preview')}</span>
          </div>
          <div class="meta-ui__garage-preview-chips">
            ${this.renderRarityChip(selectedShip?.rarity ?? 'common')}
            <span class="meta-ui__manufacturer-chip">${escapeHtml(selectedShip?.manufacturer ?? 'Manufacturer')}</span>
            ${showcase?.favorite ? '<span class="meta-ui__badge">Favorite</span>' : ''}
          </div>
          <div class="meta-ui__garage-preview-stats">
            <small>${escapeHtml(selectedShip?.statLine ?? '')}</small>
          </div>
          <div class="meta-ui__garage-preview-list">
            <div class="meta-ui__garage-preview-row">
              <span class="meta-ui__garage-preview-dot" style="--preview-color:${hullColor};"></span>
              <strong>Hull</strong>
              <small>${escapeHtml(selectedHull?.name ?? 'Default')}</small>
            </div>
            <div class="meta-ui__garage-preview-row">
              <span class="meta-ui__garage-preview-dot" style="--preview-color:${glowColor};"></span>
              <strong>Glow</strong>
              <small>${escapeHtml(selectedGlow?.name ?? 'Default')}</small>
            </div>
            <div class="meta-ui__garage-preview-row">
              <span class="meta-ui__garage-preview-dot" style="--preview-color:${trailColor};"></span>
              <strong>Trail</strong>
              <small>${escapeHtml(selectedTrail?.name ?? 'Default')}</small>
            </div>
            ${(model.advancedGarage?.previewActive)
              ? '<div class="meta-ui__garage-preview-row"><strong>Preview Mode</strong><small>Advanced cosmetic preview is not applied yet.</small></div>'
              : ''
            }
          </div>
          ${showcase ? `
            <div class="meta-ui__highlight-list">
              <div class="meta-ui__highlight">${escapeHtml(showcase.lore.identity)}</div>
              <div class="meta-ui__highlight">${escapeHtml(showcase.lore.manufacturer.philosophy)}</div>
            </div>
            <div class="meta-ui__actions">
              ${showcase.controls.map((control) => `<button class="meta-ui__secondary" type="button" data-action="showcase-control" data-id="${escapeHtml(control.id)}">${escapeHtml(control.label)}</button>`).join('')}
              <button class="meta-ui__action" type="button" data-action="favorite-ship" data-id="${escapeHtml(showcase.shipId)}">${escapeHtml(showcase.favoriteLabel)}</button>
            </div>
            <div class="meta-ui__reward-list">
              ${showcase.cosmetics.map((item) => `<div class="meta-ui__reward"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join('')}
              ${showcase.upgrades.map((item) => `<div class="meta-ui__reward"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join('')}
            </div>
            <small>${escapeHtml(showcase.fairnessNote)}</small>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderAdvancedGarage(advancedGarage) {
    return `
      <div class="meta-ui__advanced-garage">
        <div class="meta-ui__chip-row">
          ${advancedGarage.categories.map((category) => `
            <button class="meta-ui__theme-chip ${category.selected ? 'is-selected' : ''}" type="button" data-action="advanced-category" data-id="${escapeHtml(category.id)}">${escapeHtml(category.shortLabel)}</button>
          `).join('')}
        </div>
        <div class="meta-ui__chip-row">
          ${advancedGarage.filters.map((filter) => `
            <button class="meta-ui__theme-chip ${advancedGarage.filter === filter.id ? 'is-selected' : ''}" type="button" data-action="advanced-filter" data-id="${escapeHtml(filter.id)}">${escapeHtml(filter.label)}</button>
          `).join('')}
          ${advancedGarage.rarityFilters.map((filter) => `
            <button class="meta-ui__theme-chip ${advancedGarage.rarityFilter === filter.id ? 'is-selected' : ''}" type="button" data-action="advanced-rarity" data-id="${escapeHtml(filter.id)}">${escapeHtml(filter.label)}</button>
          `).join('')}
        </div>

        ${advancedGarage.selectedCategory.id === 'numberPlate' ? this.renderNumberPlateEditor(advancedGarage.numberPlate) : ''}

        <div class="meta-ui__cards meta-ui__cards--advanced-garage">
          ${advancedGarage.items.map((item) => this.renderAdvancedCosmeticCard(item)).join('') || '<div class="meta-ui__highlight">No cosmetics match this filter.</div>'}
        </div>
        <div class="meta-ui__actions">
          <button class="meta-ui__secondary" type="button" data-action="advanced-reset-preview" ${advancedGarage.previewActive ? '' : 'disabled'}>Reset Preview</button>
          <button class="meta-ui__secondary" type="button" disabled>${escapeHtml(advancedGarage.fairnessNote)}</button>
        </div>
      </div>
    `;
  }

  renderNumberPlateEditor(numberPlate) {
    return `
      <form class="meta-ui__inline-form" data-action-form="number-plate">
        <input class="meta-ui__name-input" name="digits" type="text" inputmode="numeric" maxlength="3" value="${escapeHtml(numberPlate.digits)}" placeholder="07" />
        <input class="meta-ui__name-input" name="tag" type="text" maxlength="4" value="${escapeHtml(numberPlate.tag)}" placeholder="ACE" />
        <button class="meta-ui__action" type="submit">Apply Plate</button>
      </form>
    `;
  }

  renderAdvancedCosmeticCard(item) {
    return `
      <article class="meta-ui__card meta-ui__advanced-card ${item.applied ? 'is-selected' : ''} ${item.previewed ? 'is-previewed' : ''}">
        <div class="meta-ui__card-headline">
          <span class="meta-ui__badge">${escapeHtml(item.statusLabel)}</span>
          ${this.renderRarityChip(item.rarity)}
        </div>
        <strong>${escapeHtml(item.name)}</strong>
        <span class="meta-ui__card-kicker">${escapeHtml(formatLabel(item.category))}</span>
        <span>${escapeHtml(item.unlockText)}</span>
        <div class="meta-ui__card-headline">
          ${this.renderEditionBadge(item.requiredEditionBadge, 'compact')}
          <small>${escapeHtml(item.unlockType === 'reward-placeholder' ? 'Reward placeholder' : 'Cosmetic only')}</small>
        </div>
        <div class="meta-ui__card-actions">
          <button class="meta-ui__secondary" type="button" data-action="advanced-preview" data-id="${escapeHtml(item.id)}">${item.previewed ? 'Previewing' : 'Preview'}</button>
          ${item.accessible
            ? `<button class="meta-ui__action" type="button" data-action="advanced-apply" data-id="${escapeHtml(item.id)}" ${item.applied ? 'disabled' : ''}>${escapeHtml(item.actionLabel)}</button>`
            : item.lockedByReward
              ? '<button class="meta-ui__action" type="button" data-action="hangar-page" data-id="rewards">View Rewards</button>'
            : `<button class="meta-ui__action" type="button" data-action="premium-preview" data-id="premiumCosmetics">Upgrade</button>`
          }
        </div>
      </article>
    `;
  }

  renderShipUpgrades(shipUpgrades) {
    return `
      <div class="meta-ui__upgrade-dock">
        <div class="meta-ui__mode-detail">
          <div class="meta-ui__card-headline">
            <strong>${escapeHtml(shipUpgrades.selectedShipName)}</strong>
            ${this.renderEditionBadge(shipUpgrades.access.requiredEditionBadge, 'compact')}
          </div>
          <span>${escapeHtml(shipUpgrades.appliedOnlyTo)}</span>
          <small>Credits: ${escapeHtml(shipUpgrades.credits)}</small>
        </div>
        <div class="meta-ui__reward-list">
          ${shipUpgrades.summary.map((item) => `<div class="meta-ui__reward"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join('')}
        </div>
        <div class="meta-ui__cards meta-ui__cards--advanced-garage">
          ${shipUpgrades.modules.map((module) => this.renderUpgradeModuleCard(module)).join('')}
        </div>
        <div class="meta-ui__actions">
          <button class="meta-ui__secondary" type="button" data-action="reset-upgrades">Reset Selected Ship Upgrades</button>
          <button class="meta-ui__secondary" type="button" disabled>No refund on reset</button>
        </div>
      </div>
    `;
  }

  renderUpgradeModuleCard(module) {
    const button = module.locked
      ? '<button class="meta-ui__action" type="button" data-action="premium-preview" data-id="offlineShipUpgrades">Locked Preview</button>'
      : module.capped
        ? '<button class="meta-ui__action" type="button" disabled>Max Level</button>'
        : `<button class="meta-ui__action" type="button" data-action="upgrade-module" data-id="${escapeHtml(module.id)}" ${module.canAfford ? '' : 'disabled'}>Upgrade ${escapeHtml(module.nextCost ?? '')} CR</button>`;

    return `
      <article class="meta-ui__card meta-ui__upgrade-card ${module.locked ? 'is-locked' : ''}">
        <div class="meta-ui__card-headline">
          <span class="meta-ui__badge">${escapeHtml(module.statusLabel)}</span>
          ${this.renderEditionBadge(module.requiredEditionBadge, 'compact')}
        </div>
        <strong>${escapeHtml(module.name)}</strong>
        <span>${escapeHtml(module.description)}</span>
        <small>${escapeHtml(module.shortUi)}</small>
        <div class="meta-ui__profile-meter"><div style="width:${module.maxLevel > 0 ? (module.level / module.maxLevel) * 100 : 0}%"></div></div>
        <div class="meta-ui__card-actions">${button}</div>
      </article>
    `;
  }

  renderMultiplayerPage(model) {
    return `
      <div class="meta-ui__grid meta-ui__grid--hangar-page">
        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Multiplayer Arena</h2>
            <span>${model.multiplayer.connected ? 'Server linked' : model.multiplayer.reconnecting ? 'Reconnecting to your live room...' : escapeHtml(model.multiplayer.connectionError || 'Connect when you queue')}</span>
          </div>
          <div class="meta-ui__multiplayer-actions">
            <button class="meta-ui__action" type="button" data-action="quick-match">Quick Match</button>
            <button class="meta-ui__action" type="button" data-action="private-create">Create Private Room</button>
          </div>
          <form class="meta-ui__inline-form" data-action-form="join-room">
            <input id="private-room-code" class="meta-ui__name-input" type="text" maxlength="120" value="" placeholder="Paste a private room code or invite link" />
            <button class="meta-ui__action" type="submit" data-feedback-key="join-room">Join Room</button>
          </form>
          ${this.renderRoomState(model.multiplayer)}
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Competitive Rank</h2>
            <span>${escapeHtml(model.multiplayer.rank.nextLabel)}</span>
          </div>
          <div class="meta-ui__rank-card">
            <strong>${escapeHtml(model.multiplayer.rank.name)}</strong>
            <span>${model.multiplayer.rank.rating} rating</span>
            <div class="meta-ui__profile-meter"><div style="width:${model.multiplayer.rank.progress * 100}%"></div></div>
            <small>${model.multiplayer.connected ? 'Live ladder synced' : 'Local profile cached'}</small>
          </div>
          <div class="meta-ui__leaderboards">
            <div>
              <strong class="meta-ui__mini-title">Global Top Pilots</strong>
              ${this.renderLeaderboard(model.multiplayer.leaderboard.global)}
            </div>
            <div>
              <strong class="meta-ui__mini-title">Room Board</strong>
              ${this.renderLeaderboard(model.multiplayer.lastRoomLeaderboard)}
            </div>
          </div>
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Highlights</h2>
            <span>Close finishes, clutch wins, and room chaos saved here.</span>
          </div>
          <div class="meta-ui__highlight-list">
            ${(model.multiplayer.recentHighlights.length > 0
              ? model.multiplayer.recentHighlights
              : ['Your next online race can create the first headline moment.']
            ).map((highlight) => `<div class="meta-ui__highlight">${escapeHtml(highlight)}</div>`).join('')}
          </div>
        </section>
      </div>
    `;
  }

  renderPremiumPage(model) {
    const premium = model.premium;
    const currentLabel = premium.currentEdition.label;
    const upgradeLabel = premium.upgradeTarget?.label ?? 'Top plan reached';
    const passStatus = premium.entitlement.backend?.pass ?? {};
    const buildState = premium.entitlement.demo.active
      ? 'Demo override active'
      : premium.entitlement.account?.active
        ? 'Test account unlock active'
        : premium.entitlement.backend?.active
          ? 'Backend verified pass'
          : passStatus.expired
            ? 'Pass expired'
          : 'Configured build';
    const passDisplayLabel = premium.entitlement.demo.active
      ? `${currentLabel} demo`
      : passStatus.active || passStatus.expired
        ? passStatus.planLabel
        : currentLabel;
    const passDisplayStatus = premium.entitlement.demo.active
      ? 'Demo only, not a purchase'
      : passStatus.statusLabel ?? buildState;
    const purchaseAccess = premium.entitlement.purchase?.access ?? { canPurchase: false, reason: '' };

    return `
      <div class="meta-ui__grid meta-ui__grid--hangar-page">
        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Standalone Edition</h2>
            <span>${escapeHtml(currentLabel)} | ${escapeHtml(buildState)}</span>
          </div>
          <div class="meta-ui__premium-command">
            <div class="meta-ui__premium-command-copy">
              ${this.renderEditionBadge(premium.entitlement.badge)}
              <strong>Standalone Upgrade Dock</strong>
              <span>${escapeHtml(premium.currentEdition.description)}</span>
              <small>Razorpay checkout starts a fixed 120-day pass only after backend verification. Renewal is manual when you choose it.</small>
            </div>
            <div class="meta-ui__premium-command-status">
              <div class="meta-ui__reward">
                <span>Current Pass</span>
                <strong>${escapeHtml(passDisplayLabel)}</strong>
              </div>
              <div class="meta-ui__reward">
                <span>Pass Status</span>
                <strong>${escapeHtml(passDisplayStatus)}</strong>
              </div>
              <div class="meta-ui__reward">
                <span>${passStatus.expired ? 'Expired On' : 'Active Until'}</span>
                <strong>${escapeHtml(passStatus.expiresAtLabel || 'Lite fallback')}</strong>
              </div>
              <div class="meta-ui__reward">
                <span>Days Remaining</span>
                <strong>${escapeHtml(passStatus.daysRemainingLabel || (passStatus.expired ? 'Renew pass' : 'Free forever'))}</strong>
              </div>
              <div class="meta-ui__reward">
                <span>Next Action</span>
                <strong>${escapeHtml(passStatus.expired ? 'Renew Pass' : upgradeLabel)}</strong>
              </div>
              <button class="meta-ui__secondary" type="button" data-action="premium-refresh">Refresh Entitlement</button>
            </div>
          </div>
          ${purchaseAccess.canPurchase ? '' : `<div class="meta-ui__highlight">${escapeHtml(purchaseAccess.reason)}</div>`}
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Premium Intel</h2>
            <span>Compact lore layer. Optional, skimmable, and inside Star Hangar.</span>
          </div>
          ${this.renderPremiumLore(premium.lore)}
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Edition Plans</h2>
            <span>Seasonal passes last 120 days. Checkout opens only for signed-in Google accounts.</span>
          </div>
          <div class="meta-ui__cards meta-ui__cards--plans">
            ${this.renderLitePlanCard(premium)}
            ${premium.plans.map((plan) => this.renderPlanCard(plan)).join('')}
          </div>
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Premium Preview Hub</h2>
            <span>Safe previews only. No unfinished gameplay screens.</span>
          </div>
          <div class="meta-ui__cards meta-ui__cards--preview-hub">
            ${premium.previewHub.map((feature) => this.renderPreviewHubCard(feature, premium.selectedPreview, purchaseAccess)).join('')}
          </div>
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Premium Content Packs</h2>
            <span>Ships, tracks, and cosmetics available through verified active pass entitlement.</span>
          </div>
          ${this.renderContentPacks(premium.contentPacks)}
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Selected Preview</h2>
            <span>${escapeHtml(premium.selectedPreview.phaseLabel)}</span>
          </div>
          ${this.renderSelectedPremiumPreview(premium.selectedPreview, purchaseAccess)}
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Premium Roadmap</h2>
            <span>Launch status for active premium systems.</span>
          </div>
          ${this.renderPremiumRoadmap(premium.roadmap)}
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Comparison</h2>
            <span>Current game access stays open in Lite.</span>
          </div>
          ${this.renderEditionComparison(premium)}
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Premium Feature Status</h2>
            <span>Completed systems show as playable. Locked content stays gated by active pass.</span>
          </div>
          <div class="meta-ui__cards meta-ui__cards--locked">
            ${premium.lockedFeatures.map((feature) => this.renderLockedFeatureCard(feature, feature.key === premium.selectedPreview.key, purchaseAccess)).join('')}
          </div>
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Online Fairness</h2>
            <span>No pay-to-win foundation.</span>
          </div>
          ${this.renderFairnessPolicy(premium.fairnessPolicy)}
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Online And Payment Status</h2>
            <span>Implemented online systems stay behind backend flags and active pass checks.</span>
          </div>
          ${this.renderOnlineExpansionPrep(premium.onlinePrep)}
        </section>
      </div>
    `;
  }

  renderPremiumLore(lore) {
    if (!lore?.world) {
      return '<div class="meta-ui__highlight">Premium intel is unavailable.</div>';
    }

    return `
      <div class="meta-ui__premium-command">
        <div class="meta-ui__premium-command-copy">
          <span class="meta-ui__badge">${escapeHtml(lore.world.kicker)}</span>
          <strong>${escapeHtml(lore.world.title)}</strong>
          <span>${escapeHtml(lore.world.summary)}</span>
        </div>
        <div class="meta-ui__premium-command-status">
          ${lore.world.notes.map((note) => `<div class="meta-ui__highlight">${escapeHtml(note)}</div>`).join('')}
        </div>
      </div>
      <div class="meta-ui__cards meta-ui__cards--preview-hub">
        <article class="meta-ui__card meta-ui__mini-card">
          <strong>${escapeHtml(lore.selectedShip.title)}</strong>
          <span>${escapeHtml(lore.selectedShip.identity)}</span>
          <small>${escapeHtml(lore.selectedShip.manufacturer.designStyle)}</small>
        </article>
        <article class="meta-ui__card meta-ui__mini-card">
          <strong>${escapeHtml(lore.selectedTrack.title)}</strong>
          <span>${escapeHtml(lore.selectedTrack.location)}</span>
          <small>${escapeHtml(lore.selectedTrack.signature)}</small>
        </article>
      </div>
    `;
  }

  renderOnlineExpansionPrep(prep) {
    if (!prep) {
      return '<div class="meta-ui__highlight">Online/payment status data unavailable.</div>';
    }

    return `
      <div class="meta-ui__cards meta-ui__cards--preview-hub">
        <article class="meta-ui__card">
          <div class="meta-ui__card-headline">
            <span class="meta-ui__badge">Online</span>
            <span class="meta-ui__rarity meta-ui__rarity--rare">Flag Gated</span>
          </div>
          <strong>${escapeHtml(prep.privateTournament.title)}</strong>
          <span>${escapeHtml(prep.privateTournament.summary)}</span>
          ${prep.privateTournament.cards.map((card) => `<small>${escapeHtml(card.title)}: ${escapeHtml(card.detail)}</small>`).join('')}
          <button class="meta-ui__secondary" type="button" disabled>Enable With Tournament Flags</button>
        </article>
        <article class="meta-ui__card">
          <div class="meta-ui__card-headline">
            <span class="meta-ui__badge">Leaderboards</span>
            <span class="meta-ui__rarity meta-ui__rarity--common">Backend Flag</span>
          </div>
          <strong>${escapeHtml(prep.eventLeaderboard.title)}</strong>
          <span>${escapeHtml(prep.eventLeaderboard.summary)}</span>
          ${prep.eventLeaderboard.rows.map((row) => `<small>${escapeHtml(row.label)}: ${escapeHtml(row.description)}</small>`).join('')}
          <button class="meta-ui__secondary" type="button" disabled>Use Backend Leaderboard Flags</button>
        </article>
        <article class="meta-ui__card">
          <div class="meta-ui__card-headline">
            <span class="meta-ui__badge">Pay</span>
            <span class="meta-ui__rarity meta-ui__rarity--epic">Backend Verified</span>
          </div>
          <strong>${escapeHtml(prep.payment.title)}</strong>
          <span>${escapeHtml(prep.payment.summary)}</span>
          ${prep.payment.providers.map((provider) => `<small>${escapeHtml(provider.label)}: ${escapeHtml(provider.note)}</small>`).join('')}
          <button class="meta-ui__secondary" type="button" disabled>Stripe Global Placeholder</button>
        </article>
      </div>
    `;
  }

  renderContentPacks(packs = []) {
    if (!packs.length) {
      return '<div class="meta-ui__highlight">No premium content packs are configured.</div>';
    }

    return `
      <div class="meta-ui__cards meta-ui__cards--preview-hub">
        ${packs.map((pack) => `
          <article class="meta-ui__card ${pack.accessible ? 'is-selected' : ''}">
            <div class="meta-ui__card-headline">
              <span class="meta-ui__badge">${escapeHtml(pack.statusLabel)}</span>
              ${this.renderEditionBadge(pack.requiredEditionBadge, 'compact')}
            </div>
            <strong>${escapeHtml(pack.title)}</strong>
            <span>${escapeHtml(pack.summary)}</span>
            <div class="meta-ui__reward-list">
              <div class="meta-ui__reward"><span>Ships</span><strong>${escapeHtml(pack.ships.map((ship) => ship.name).join(', '))}</strong></div>
              <div class="meta-ui__reward"><span>Tracks</span><strong>${escapeHtml(pack.tracks.map((track) => `${track.name}${track.playable ? '' : ' preview'}`).join(', '))}</strong></div>
              <div class="meta-ui__reward"><span>Cosmetics</span><strong>${escapeHtml(pack.cosmetics.map((item) => item.name).join(', '))}</strong></div>
            </div>
            <small>Online ranked and multiplayer use normalized stats, including premium ships.</small>
            <div class="meta-ui__card-actions">
              <button class="meta-ui__secondary" type="button" data-action="hangar-page" data-id="garage">Preview Ships</button>
              <button class="meta-ui__secondary" type="button" data-action="hangar-page" data-id="career">Tracks</button>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }

  renderLitePlanCard(premium) {
    const active = premium.currentEdition.id === 'GAMEHUB_LITE';
    const liteEdition = premium.editions.find((edition) => edition.id === 'GAMEHUB_LITE') ?? {
      label: 'GameHub Lite',
      deck: 'Free GameHub experience',
      comparisonFeatures: []
    };

    return `
      <article class="meta-ui__card meta-ui__plan-card ${active ? 'is-selected' : ''}">
        <div class="meta-ui__card-headline">
          <span class="meta-ui__badge">Free</span>
          ${this.renderEditionBadge(liteEdition.badgeView, 'compact')}
        </div>
        <strong>${escapeHtml(liteEdition.label)}</strong>
        <span class="meta-ui__card-kicker">${escapeHtml(liteEdition.deck)}</span>
        <span>The current GameHub version stays open and fully playable.</span>
        <div class="meta-ui__price-list">
          <div><span>Price</span><strong>Free forever</strong></div>
        </div>
        <div class="meta-ui__plan-feature-list">
          ${liteEdition.comparisonFeatures.map((feature) => `<span>${escapeHtml(feature)}</span>`).join('')}
        </div>
        <div class="meta-ui__card-actions">
          <button class="meta-ui__secondary" type="button" data-action="premium-preview" data-id="GAMEHUB_LITE">Preview</button>
          <button class="meta-ui__action" type="button" disabled>${active ? 'Current Plan' : 'Included Baseline'}</button>
        </div>
      </article>
    `;
  }

  renderPlanCard(plan) {
    const lowerTierIncluded = plan.accessible && !plan.active;
    const cta = lowerTierIncluded
        ? '<button class="meta-ui__action" type="button" disabled>Included</button>'
        : plan.purchaseDisabled
          ? `<button class="meta-ui__action" type="button" disabled>${escapeHtml(plan.purchaseBlockedReason || 'Sign in to purchase')}</button>`
          : `<button class="meta-ui__action" type="button" data-action="premium-purchase" data-id="${escapeHtml(plan.id)}">${escapeHtml(plan.purchaseLabel ?? plan.upgradeLabel)}</button>`;

    return `
      <article class="meta-ui__card meta-ui__plan-card ${plan.active ? 'is-selected' : ''}">
        <div class="meta-ui__card-headline">
          <span class="meta-ui__badge">${escapeHtml(plan.globalPrice?.display ?? 'TBD')}</span>
          ${this.renderEditionBadge(plan.editionBadge, 'compact')}
        </div>
        <strong>${escapeHtml(plan.label)}</strong>
        <span class="meta-ui__card-kicker">${escapeHtml(plan.edition.deck)}</span>
        <span>${escapeHtml(plan.description)}</span>
        <div class="meta-ui__price-list">
          <div><span>Duration</span><strong>${escapeHtml(plan.durationLabel ?? '120 days access')}</strong></div>
        </div>
        ${this.renderPriceRows(plan.priceRows)}
        <div class="meta-ui__plan-feature-list">
          ${plan.edition.comparisonFeatures.map((feature) => `<span>${escapeHtml(feature)}</span>`).join('')}
        </div>
        <small>${escapeHtml(plan.purchaseDisabled ? plan.purchaseBlockedReason : 'Fixed-duration pass. Closing checkout or failed verification grants nothing.')}</small>
        <div class="meta-ui__card-actions">
          <button class="meta-ui__secondary" type="button" data-action="premium-preview" data-id="${escapeHtml(plan.id)}">Preview</button>
          ${cta}
        </div>
      </article>
    `;
  }

  renderEditionComparison(premium) {
    return `
      <div class="meta-ui__comparison">
        ${premium.editions.map((edition) => `
          <article class="meta-ui__comparison-column ${edition.active ? 'is-selected' : ''}">
            <div class="meta-ui__card-headline">
              <strong>${escapeHtml(edition.label)}</strong>
              ${this.renderEditionBadge(edition.badgeView, 'compact')}
            </div>
            <span>${escapeHtml(edition.deck)}</span>
            <div class="meta-ui__comparison-list">
              ${edition.comparisonFeatures.map((feature) => `<div>${escapeHtml(feature)}</div>`).join('')}
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }

  renderPreviewHubCard(feature, selectedPreview, purchaseAccess = { canPurchase: true, reason: '' }) {
    const openLabel = feature.hasFeature ? 'Open' : 'Preview';
    const statusControl = feature.includedInCurrentTier
      ? `<span class="meta-ui__badge">${escapeHtml(feature.phaseLabel)}</span>`
      : purchaseAccess.canPurchase
        ? `<button class="meta-ui__action" type="button" data-action="premium-purchase" data-id="${escapeHtml(feature.upgradePlanId)}">${escapeHtml(feature.upgradeLabel)}</button>`
        : `<button class="meta-ui__action" type="button" disabled>${escapeHtml(purchaseAccess.reason || 'Sign in to purchase')}</button>`;

    return `
      <article class="meta-ui__card meta-ui__preview-card ${feature.key === selectedPreview.key ? 'is-previewed' : ''}">
        <div class="meta-ui__card-headline">
          <span class="meta-ui__feature-glyph">${escapeHtml(feature.iconLabel)}</span>
          ${this.renderEditionBadge(feature.requiredEditionBadge, 'compact')}
        </div>
        <strong>${escapeHtml(feature.displayTitle)}</strong>
        <span>${escapeHtml(feature.displaySummary)}</span>
        <small>${escapeHtml(feature.accessLabel)}</small>
        <div class="meta-ui__card-actions">
          <button class="meta-ui__secondary" type="button" data-action="premium-preview" data-id="${escapeHtml(feature.key)}">${openLabel}</button>
          ${statusControl}
        </div>
      </article>
    `;
  }

  renderSelectedPremiumPreview(preview, purchaseAccess = { canPurchase: true, reason: '' }) {
    const upgradeButton = preview.upgradePlanId && ['locked', 'unavailable'].includes(preview.accessState)
      ? purchaseAccess.canPurchase
        ? `<button class="meta-ui__action" type="button" data-action="premium-purchase" data-id="${escapeHtml(preview.upgradePlanId)}">${escapeHtml(preview.upgradeLabel)}</button>`
        : `<button class="meta-ui__action" type="button" disabled>${escapeHtml(purchaseAccess.reason || 'Sign in to purchase')}</button>`
      : '';

    return `
      <div class="meta-ui__selected-preview meta-ui__selected-preview--${escapeHtml(preview.accessState)}">
        <div class="meta-ui__selected-preview-mark">
          <span class="meta-ui__feature-glyph meta-ui__feature-glyph--large">${escapeHtml(preview.iconLabel)}</span>
        </div>
        <div class="meta-ui__selected-preview-copy">
          <div class="meta-ui__card-headline">
            <strong>${escapeHtml(preview.title)}</strong>
            ${this.renderEditionBadge(preview.requiredEditionBadge, 'compact')}
          </div>
          <span>${escapeHtml(preview.description)}</span>
          <small>${escapeHtml(preview.detail)}</small>
          <div class="meta-ui__selected-preview-list">
            ${preview.bullets.map((item) => `<div>${escapeHtml(item)}</div>`).join('')}
          </div>
          ${preview.priceRows.length > 0 ? this.renderPriceRows(preview.priceRows) : ''}
          <div class="meta-ui__card-actions">
            <button class="meta-ui__secondary" type="button" disabled>${escapeHtml(preview.accessLabel)}</button>
            ${preview.phaseLabel ? `<span class="meta-ui__badge">${escapeHtml(preview.phaseLabel)}</span>` : ''}
            ${upgradeButton}
          </div>
        </div>
      </div>
    `;
  }

  renderPremiumRoadmap(roadmap) {
    return `
      <div class="meta-ui__roadmap">
        ${roadmap.map((entry) => `
          <article class="meta-ui__roadmap-column ${entry.active ? 'is-selected' : ''}">
            <div class="meta-ui__card-headline">
              <strong>${escapeHtml(entry.title)}</strong>
              ${this.renderEditionBadge(entry.badge, 'compact')}
            </div>
            <span>${escapeHtml(entry.edition.deck)}</span>
            <div class="meta-ui__comparison-list">
              ${entry.items.map((item) => `<div>${escapeHtml(item)}</div>`).join('')}
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }

  renderLockedFeatureCard(feature, selected = false, purchaseAccess = { canPurchase: true, reason: '' }) {
    const upgradeButton = feature.hasFeature || feature.includedInCurrentTier || !feature.upgradePlanId
      ? `<span class="meta-ui__badge">${escapeHtml(feature.phaseLabel)}</span>`
      : purchaseAccess.canPurchase
        ? `<button class="meta-ui__action" type="button" data-action="premium-purchase" data-id="${escapeHtml(feature.upgradePlanId)}">${escapeHtml(feature.upgradeLabel)}</button>`
        : `<button class="meta-ui__action" type="button" disabled>${escapeHtml(purchaseAccess.reason || 'Sign in to purchase')}</button>`;

    return `
      <article class="meta-ui__card meta-ui__locked-card ${selected ? 'is-previewed' : ''} meta-ui__locked-card--${escapeHtml(feature.accessState)}">
        <div class="meta-ui__card-headline">
          <span class="meta-ui__feature-glyph">${escapeHtml(feature.iconLabel)}</span>
          ${this.renderEditionBadge(feature.requiredEditionBadge, 'compact')}
        </div>
        <strong>${escapeHtml(feature.title)}</strong>
        <span>${escapeHtml(feature.description)}</span>
        <div class="meta-ui__locked-meta">
          <span class="meta-ui__badge">${escapeHtml(feature.phaseLabel)}</span>
          <small>${escapeHtml(feature.accessLabel)}</small>
        </div>
        <div class="meta-ui__card-actions">
          <button class="meta-ui__secondary" type="button" data-action="premium-preview" data-id="${escapeHtml(feature.key)}">Preview</button>
          ${upgradeButton}
        </div>
      </article>
    `;
  }

  renderPriceRows(priceRows) {
    return `
      <div class="meta-ui__price-list">
        ${priceRows.map((price) => `<div><span>${escapeHtml(price.regionLabel)}</span><strong>${escapeHtml(price.display)}</strong></div>`).join('')}
      </div>
    `;
  }

  renderFairnessPolicy(policy) {
    return `
      <div class="meta-ui__fairness-list">
        ${policy.map((item) => `<div class="meta-ui__highlight">${escapeHtml(item)}</div>`).join('')}
      </div>
    `;
  }

  renderPremiumModeLock(title, featureState, purchaseAccess = { canPurchase: true, reason: '' }) {
    const upgradeButton = featureState.upgradePlanId
      ? purchaseAccess.canPurchase
        ? `<button class="meta-ui__action" type="button" data-action="premium-purchase" data-id="${escapeHtml(featureState.upgradePlanId)}">${escapeHtml(featureState.upgradeLabel)}</button>`
        : `<button class="meta-ui__action" type="button" disabled>${escapeHtml(purchaseAccess.reason || 'Sign in to purchase')}</button>`
      : `<button class="meta-ui__action" type="button" disabled>${escapeHtml(featureState.accessLabel)}</button>`;

    return `
      <section class="meta-ui__section meta-ui__section--wide">
        <div class="meta-ui__section-head">
          <h2>${escapeHtml(title)}</h2>
          <span>${escapeHtml(featureState.accessLabel)}</span>
        </div>
        <div class="meta-ui__selected-preview meta-ui__selected-preview--locked">
          <div class="meta-ui__selected-preview-mark">
            <span class="meta-ui__feature-glyph meta-ui__feature-glyph--large">${escapeHtml(featureState.iconLabel ?? 'LOCK')}</span>
          </div>
          <div class="meta-ui__selected-preview-copy">
            <div class="meta-ui__card-headline">
              <strong>${escapeHtml(featureState.title ?? title)}</strong>
              ${this.renderEditionBadge(featureState.requiredEditionBadge, 'compact')}
            </div>
            <span>${escapeHtml(featureState.description ?? 'This premium mode is locked for the current edition.')}</span>
            <small>GameHub Lite racing, time trial, garage, multiplayer, profile sync, and goals remain fully playable.</small>
            <div class="meta-ui__card-actions">
              <button class="meta-ui__secondary" type="button" data-action="premium-preview" data-id="${escapeHtml(featureState.key ?? '')}">Preview</button>
              ${upgradeButton}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  renderCampaignPage(model) {
    const campaign = model.campaign;
    const selectedCup = campaign.selectedCup ?? campaign.cups[0];
    const selectedRival = campaign.selectedRival;
    const selectedRace = campaign.selectedRace;

    return `
      <div class="meta-ui__grid meta-ui__grid--hangar-page">
        ${campaign.featureState.canPlay ? '' : this.renderPremiumModeLock('Premium Campaign', campaign.featureState, model.premium.entitlement.purchase?.access)}

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Premium Campaign</h2>
            <span>${escapeHtml(campaign.featureState.canPlay ? 'Cup progression is playable for your edition.' : 'Locked preview only in Lite.')}</span>
          </div>
          <div class="meta-ui__cards meta-ui__cards--premium-mode">
            ${campaign.cups.map((cup) => this.renderCampaignCupCard(cup)).join('')}
          </div>
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>${escapeHtml(selectedCup?.title ?? 'Campaign Cup')}</h2>
            <span>${escapeHtml(selectedCup?.statusLabel ?? 'Select a cup')}</span>
          </div>
          <div class="meta-ui__mode-detail">
            ${this.renderEditionBadge(selectedCup?.requiredEditionBadge, 'compact')}
            <strong>${escapeHtml(selectedCup?.recommendedDifficulty ?? 'Standard')} Recommended</strong>
            <span>${escapeHtml(selectedCup?.description ?? '')}</span>
            ${campaign.lore ? `<span>${escapeHtml(campaign.lore.hook)}</span>` : ''}
            <div class="meta-ui__profile-meter"><div style="width:${Number(selectedCup?.progressPercent ?? 0) * 100}%"></div></div>
            <small>${escapeHtml(selectedCup?.progressLabel ?? '0/0 complete')} | ${escapeHtml(selectedCup?.rewardPreview ?? '')}</small>
            ${campaign.lore ? `<small>${escapeHtml(campaign.lore.stakes)} ${escapeHtml(campaign.lore.rivalAngle)}</small>` : ''}
          </div>
          <div class="meta-ui__actions">
            ${selectedCup?.accessible
              ? `<button class="meta-ui__launch" type="button" data-action="campaign-start" data-id="${escapeHtml(selectedCup.id)}" data-race-id="${escapeHtml(selectedRace?.id ?? '')}">${selectedCup.completed ? 'Replay Cup' : selectedRace?.completed ? 'Replay Race' : 'Start Race'}</button>`
              : `<button class="meta-ui__action" type="button" data-action="premium-preview" data-id="${escapeHtml(campaign.featureState.key ?? 'premiumCampaign')}">Locked Preview</button>`
            }
          </div>
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Race Ladder</h2>
            <span>Progress unlocks the next race in this cup.</span>
          </div>
          <div class="meta-ui__ladder">
            ${(selectedCup?.races ?? []).map((race) => `
              <div class="meta-ui__ladder-row ${race.current ? 'is-selected' : ''}">
                <div>
                  <strong>${escapeHtml(race.title)}</strong>
                  <span>${escapeHtml(race.trackName)} | ${escapeHtml(race.trackTheme)} | ${race.laps} laps</span>
                  <small>${escapeHtml(race.rivalName)} (${escapeHtml(race.rivalCallSign)}) | ${escapeHtml(race.rewardPreview)}</small>
                </div>
                <span class="meta-ui__badge">${escapeHtml(race.statusLabel)}</span>
              </div>
            `).join('')}
          </div>
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Rival Briefing</h2>
            <span>${escapeHtml(selectedRival?.callSign ?? 'Campaign rival')}</span>
          </div>
          <div class="meta-ui__mode-detail meta-ui__mode-detail--wide">
            <div class="meta-ui__card-headline">
              <strong>${escapeHtml(selectedRival?.name ?? 'Rival Pilot')}</strong>
              <span class="meta-ui__badge">${escapeHtml(selectedRival?.personality ?? 'Racer')}</span>
            </div>
            <span>${escapeHtml(selectedRival?.bio ?? 'Select a campaign race to inspect the rival briefing.')}</span>
            <div class="meta-ui__highlight-list">
              <div class="meta-ui__highlight">${escapeHtml(selectedRival?.hint ?? 'Race clean and use the existing power-up rules.')}</div>
              <div class="meta-ui__highlight">${escapeHtml(selectedRival?.preRaceLine ?? 'Ready on the grid.')}</div>
              ${selectedRival?.lore ? `<div class="meta-ui__highlight">Faction: ${escapeHtml(selectedRival.lore.faction)} | Signature: ${escapeHtml(selectedRival.lore.signatureShip)} on ${escapeHtml(selectedRival.lore.signatureTrack)}</div>` : ''}
            </div>
          </div>
        </section>
      </div>
    `;
  }

  renderCampaignCupCard(cup) {
    return `
      <button class="meta-ui__card meta-ui__mode-card ${cup.selected ? 'is-selected' : ''}" type="button" data-action="campaign-select" data-id="${escapeHtml(cup.id)}">
        <div class="meta-ui__card-headline">
          <span class="meta-ui__badge">${escapeHtml(cup.completed ? 'Completed' : cup.accessible ? 'Playable' : 'Locked')}</span>
          ${this.renderEditionBadge(cup.requiredEditionBadge, 'compact')}
        </div>
        <strong>${escapeHtml(cup.title)}</strong>
        <span>${escapeHtml(cup.description)}</span>
        <div class="meta-ui__profile-meter"><div style="width:${Number(cup.progressPercent ?? 0) * 100}%"></div></div>
        <small>${escapeHtml(cup.progressLabel)} | ${escapeHtml(cup.rewardPreview)}</small>
      </button>
    `;
  }

  renderTournamentPage(model) {
    const tournament = model.tournament;
    const selectedType = tournament.selectedType ?? tournament.types[0];

    return `
      <div class="meta-ui__grid meta-ui__grid--hangar-page">
        ${tournament.featureState.canPlay ? '' : this.renderPremiumModeLock('Tournament Mode', tournament.featureState, model.premium.entitlement.purchase?.access)}

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Tournament Mode</h2>
            <span>${escapeHtml(tournament.featureState.canPlay ? 'Local AI brackets are playable for your edition.' : 'Locked preview only in Lite.')}</span>
          </div>
          <div class="meta-ui__cards meta-ui__cards--premium-mode">
            ${tournament.types.map((type) => this.renderTournamentTypeCard(type)).join('')}
          </div>
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>${escapeHtml(selectedType?.title ?? 'Tournament')}</h2>
            <span>${escapeHtml(selectedType?.statusLabel ?? 'Select a type')}</span>
          </div>
          <div class="meta-ui__mode-detail">
            ${this.renderEditionBadge(selectedType?.requiredEditionBadge, 'compact')}
            <strong>${escapeHtml(selectedType?.participantCount ? `${selectedType.participantCount} pilots` : 'Preview only')}</strong>
            <span>${escapeHtml(selectedType?.description ?? '')}</span>
            <small>${escapeHtml(selectedType?.rewardPreview ?? '')}</small>
          </div>
          <div class="meta-ui__actions">
            ${tournament.activeBracket?.canContinue
              ? '<button class="meta-ui__launch" type="button" data-action="tournament-continue">Continue Tournament</button>'
              : selectedType?.accessible
                ? `<button class="meta-ui__launch" type="button" data-action="tournament-start" data-id="${escapeHtml(selectedType.id)}">Start Tournament</button>`
                : `<button class="meta-ui__action" type="button" data-action="premium-preview" data-id="${escapeHtml(tournament.featureState.key ?? 'tournamentMode')}">Locked Preview</button>`
            }
          </div>
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Active Bracket</h2>
            <span>${escapeHtml(tournament.activeBracket?.status ?? 'No active bracket')}</span>
          </div>
          ${this.renderTournamentBracket(tournament.activeBracket)}
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Tournament History</h2>
            <span>${tournament.stats.wins} wins | ${tournament.stats.completed} finished</span>
          </div>
          <div class="meta-ui__highlight-list">
            ${tournament.history.length > 0
              ? tournament.history.map((entry) => `<div class="meta-ui__highlight"><strong>${escapeHtml(entry.typeTitle)}</strong> | ${escapeHtml(entry.status)} | Champion: ${escapeHtml(entry.championName)} | ${escapeHtml(entry.completedAt)}</div>`).join('')
              : '<div class="meta-ui__highlight">No tournament history yet. Start a playable AI bracket to create one.</div>'
            }
          </div>
        </section>

        ${this.renderPrivateTournamentOnline(tournament.onlinePrivate, tournament.onlinePrep)}
      </div>
    `;
  }

  renderPrivateTournamentOnline(online, prep) {
    if (!online?.enabled) {
      return `
        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>${escapeHtml(prep?.title ?? 'Online Tournament Preview')}</h2>
            <span>${escapeHtml(prep?.statusLabel ?? 'Disabled by build flag')}</span>
          </div>
          <div class="meta-ui__highlight-list">
            <div class="meta-ui__highlight">${escapeHtml(prep?.summary ?? 'Private online tournaments are disabled until VITE_ENABLE_PRIVATE_TOURNAMENTS is enabled.')}</div>
            <div class="meta-ui__highlight">Quick Match, normal private rooms, and ranked online are unchanged.</div>
          </div>
        </section>
      `;
    }

    const room = online.room;

    return `
      <section class="meta-ui__section meta-ui__section--wide">
        <div class="meta-ui__section-head">
          <h2>Private Online Tournament</h2>
          <span>${escapeHtml(online.statusLabel)}</span>
        </div>
        <div class="meta-ui__premium-command">
          <div class="meta-ui__premium-command-copy">
            <strong>Server-Authored Bracket Rooms</strong>
            <span>${escapeHtml(online.fairPlayNote)}</span>
            <small>4-player is Early Access. 8-player is Full Premium. Bot fill is host-controlled and scored by the server.</small>
          </div>
          <div class="meta-ui__premium-command-status">
            <button class="meta-ui__action" type="button" data-action="private-tournament-create" data-id="4" ${online.canCreate4 ? '' : 'disabled'}>Create 4P</button>
            <button class="meta-ui__action" type="button" data-action="private-tournament-create" data-id="8" ${online.canCreate8 ? '' : 'disabled'}>Create 8P</button>
          </div>
        </div>
        <form class="meta-ui__inline-form" data-action-form="join-private-tournament">
          <input id="private-tournament-code" class="meta-ui__name-input" type="text" maxlength="120" value="" placeholder="Paste a private tournament code or invite link" />
          <button class="meta-ui__action" type="submit">Join Tournament</button>
        </form>
        ${room ? this.renderPrivateTournamentRoom(room) : '<div class="meta-ui__highlight">No private tournament room open yet.</div>'}
      </section>
    `;
  }

  renderPrivateTournamentRoom(room) {
    const tournament = room.tournament ?? {};
    const rounds = tournament.rounds ?? [];
    const champion = room.players.find((player) => player.playerId === tournament.championId);

    return `
      <div class="meta-ui__room-state">
        <div class="meta-ui__room-head">
          <strong>${escapeHtml(room.typeLabel ?? 'Private Tournament')}</strong>
          <span>Code ${escapeHtml(room.code)} | ${escapeHtml(String(tournament.format ?? room.maxPlayers))}P</span>
        </div>
        <small>${escapeHtml(room.statusLabel)} | ${escapeHtml(room.slotsLabel)} | ${escapeHtml(champion ? `Champion: ${champion.name}` : 'Server bracket active')}</small>
        <div class="meta-ui__leaderboards">
          <div>
            <strong class="meta-ui__mini-title">Bracket</strong>
            <div class="meta-ui__ladder">
              ${rounds.length ? rounds.map((round, index) => `
                <div class="meta-ui__ladder-row ${index === tournament.currentRoundIndex ? 'is-selected' : ''}">
                  <div>
                    <strong>${escapeHtml(round.label ?? `Round ${index + 1}`)}</strong>
                    <span>${escapeHtml(round.completed ? 'Complete' : index === tournament.currentRoundIndex ? 'Current' : 'Pending')}</span>
                    <small>${escapeHtml((round.advancingIds ?? []).length ? `${round.advancingIds.length} advanced` : `${round.advanceCount ?? 1} advance`)}</small>
                  </div>
                  <span class="meta-ui__badge">${escapeHtml(round.completed ? 'Done' : 'Open')}</span>
                </div>
              `).join('') : '<div class="meta-ui__highlight">Bracket seeds when the host starts.</div>'}
            </div>
          </div>
          <div>
            <strong class="meta-ui__mini-title">Participants</strong>
            ${this.renderRoomPlayers(room.players)}
          </div>
        </div>
        <div class="meta-ui__multiplayer-actions">
          ${room.canToggleReady ? '<button class="meta-ui__action" type="button" data-action="private-tournament-ready">Toggle Ready</button>' : ''}
          ${room.canStartTournament ? '<button class="meta-ui__action" type="button" data-action="private-tournament-start">Start Tournament</button>' : ''}
          ${room.canStartNextTournament ? '<button class="meta-ui__action" type="button" data-action="private-tournament-next">Start Next Round</button>' : ''}
          ${room.canRematch ? '<button class="meta-ui__action" type="button" data-action="private-tournament-rematch">New Tournament</button>' : ''}
          <button class="meta-ui__secondary" type="button" data-action="room-leave">Leave Room</button>
        </div>
      </div>
    `;
  }

  renderTournamentTypeCard(type) {
    return `
      <button class="meta-ui__card meta-ui__mode-card ${type.selected ? 'is-selected' : ''}" type="button" data-action="tournament-select" data-id="${escapeHtml(type.id)}">
        <div class="meta-ui__card-headline">
          <span class="meta-ui__badge">${escapeHtml(type.statusLabel)}</span>
          ${this.renderEditionBadge(type.requiredEditionBadge, 'compact')}
        </div>
        <strong>${escapeHtml(type.title)}</strong>
        <span>${escapeHtml(type.description)}</span>
        <small>${escapeHtml(type.rewardPreview)}</small>
      </button>
    `;
  }

  renderTournamentBracket(bracket) {
    if (!bracket) {
      return '<div class="meta-ui__highlight">No active bracket. Choose a playable tournament type to start.</div>';
    }

    return `
      <div class="meta-ui__bracket">
        <div class="meta-ui__mode-detail">
          <strong>${escapeHtml(bracket.typeTitle)}</strong>
          <span>${escapeHtml(bracket.currentRoundLabel)} | Race ${bracket.currentRace} | ${escapeHtml(bracket.status)}</span>
          ${bracket.championName ? `<small>Champion: ${escapeHtml(bracket.championName)}</small>` : ''}
        </div>
        <div class="meta-ui__ladder">
          ${bracket.rounds.map((round, index) => `
            <div class="meta-ui__ladder-row ${index === bracket.currentRace - 1 ? 'is-selected' : ''}">
              <div>
                <strong>${escapeHtml(round.label)}</strong>
                <span>${escapeHtml(round.completed ? 'Completed' : index === bracket.currentRace - 1 ? 'Current round' : 'Pending')}</span>
                <small>${escapeHtml((round.advancingIds ?? []).length ? `${round.advancingIds.length} advanced` : `${round.advanceCount} advance`)}</small>
              </div>
              <span class="meta-ui__badge">${escapeHtml(round.completed ? 'Done' : 'Open')}</span>
            </div>
          `).join('')}
        </div>
        <div class="meta-ui__cards meta-ui__cards--preview-hub">
          ${bracket.participants.map((participant) => `
            <div class="meta-ui__card meta-ui__mini-card ${participant.eliminated ? 'is-locked' : ''}">
              <strong>${escapeHtml(participant.name)}</strong>
              <span>${escapeHtml(participant.isPlayer ? 'You' : participant.callSign ?? 'AI Pilot')}</span>
              <small>${escapeHtml(participant.eliminated ? 'Eliminated' : 'Active')}</small>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderRankedPage(model) {
    const ranked = model.rankedSeason;

    return `
      <div class="meta-ui__grid meta-ui__grid--hangar-page">
        ${ranked.access.basic ? '' : this.renderPremiumModeLock('Ranked Seasons', ranked.access.rankedSeasons, model.premium.entitlement.purchase?.access)}

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Ranked Seasons</h2>
            <span>${escapeHtml(ranked.access.basic ? ranked.fairPlayNote : 'Locked preview only in Lite.')}</span>
          </div>
          <div class="meta-ui__premium-command">
            <div class="meta-ui__premium-command-copy">
              ${this.renderEditionBadge(ranked.access.rankedSeasons.requiredEditionBadge, 'compact')}
              <strong>${escapeHtml(ranked.season.seasonName)}</strong>
              <span>${escapeHtml(ranked.season.timeRemainingLabel)} | ${escapeHtml(ranked.season.status)} | ${escapeHtml(ranked.online.modeLabel)}</span>
              <small>${escapeHtml(ranked.season.rewardPreview)}</small>
            </div>
            <div class="meta-ui__premium-command-status">
              <div class="meta-ui__reward"><span>Rating</span><strong>${escapeHtml(ranked.rating)}</strong></div>
              <div class="meta-ui__reward"><span>Tier</span><strong>${escapeHtml(ranked.tier.label)}</strong></div>
              <div class="meta-ui__reward"><span>Queue</span><strong>${escapeHtml(ranked.online.queue?.status ?? 'idle')}</strong></div>
            </div>
          </div>
          <div class="meta-ui__profile-meter"><div style="width:${Number(ranked.tierProgress ?? 0)}%"></div></div>
          <div class="meta-ui__actions">
            ${ranked.online.queue?.status === 'queued'
              ? '<button class="meta-ui__secondary" type="button" data-action="ranked-cancel">Cancel Ranked Queue</button>'
              : ranked.canStart
              ? '<button class="meta-ui__launch" type="button" data-action="ranked-start">Start Ranked Online</button>'
              : `<button class="meta-ui__action" type="button" data-action="premium-preview" data-id="${escapeHtml(ranked.access.rankedSeasons.key ?? 'rankedSeasons')}">Locked Preview</button>`
            }
          </div>
          <div class="meta-ui__highlight">${escapeHtml(ranked.online.queue?.message || ranked.online.antiCheatNote)}</div>
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Season Stats</h2>
            <span>Separate from multiplayer rating.</span>
          </div>
          <div class="meta-ui__reward-list">
            <div class="meta-ui__reward"><span>Races</span><strong>${escapeHtml(ranked.stats.races)}</strong></div>
            <div class="meta-ui__reward"><span>Wins</span><strong>${escapeHtml(ranked.stats.wins)}</strong></div>
            <div class="meta-ui__reward"><span>Podiums</span><strong>${escapeHtml(ranked.stats.podiums)}</strong></div>
            <div class="meta-ui__reward"><span>Best Streak</span><strong>${escapeHtml(ranked.stats.bestStreak)}</strong></div>
          </div>
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Fair-Play Rules</h2>
            <span>No paid advantage.</span>
          </div>
          <div class="meta-ui__highlight-list">
            ${ranked.season.rules.map((rule) => `<div class="meta-ui__highlight">${escapeHtml(rule)}</div>`).join('')}
          </div>
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Tier Rewards</h2>
            <span>Early Access starts the ladder. Full Premium expands higher tier rewards.</span>
          </div>
          <div class="meta-ui__cards meta-ui__cards--preview-hub">
            ${ranked.tiers.map((tier) => `
              <div class="meta-ui__card meta-ui__mini-card ${tier.active ? 'is-selected' : ''}">
                <div class="meta-ui__card-headline">
                  <span class="meta-ui__badge">${escapeHtml(tier.iconLabel)}</span>
                  ${this.renderEditionBadge(tier.requiredEditionBadge, 'compact')}
                </div>
                <strong>${escapeHtml(tier.label)}</strong>
                <span>${escapeHtml(tier.minRating)}-${escapeHtml(tier.maxRating)} rating</span>
                <small>${escapeHtml(tier.rewardPreview)} | ${escapeHtml(tier.earned ? 'Reached' : 'Locked by rating')}</small>
              </div>
            `).join('')}
          </div>
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Ranked Leaderboard</h2>
            <span>Backend-backed season standings where the multiplayer server is available.</span>
          </div>
          <div class="meta-ui__highlight-list">
            ${(ranked.online.leaderboard.global ?? []).length
              ? ranked.online.leaderboard.global.map((entry) => `<div class="meta-ui__highlight"><strong>#${escapeHtml(entry.position)} ${escapeHtml(entry.name)}</strong> | ${escapeHtml(entry.rating)} | ${escapeHtml(entry.tier)} | ${escapeHtml(entry.wins)} wins</div>`).join('')
              : '<div class="meta-ui__highlight">No online ranked standings yet.</div>'
            }
          </div>
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Season History</h2>
            <span>Profile-safe history.</span>
          </div>
          <div class="meta-ui__highlight-list">
            ${ranked.history.length
              ? ranked.history.map((entry) => `<div class="meta-ui__highlight"><strong>${escapeHtml(entry.seasonName)}</strong> | ${escapeHtml(entry.tier)} | ${escapeHtml(entry.rating)} rating | ${escapeHtml(entry.races)} races</div>`).join('')
              : '<div class="meta-ui__highlight">No archived ranked season yet. Current ladder is local/AI-first.</div>'
            }
          </div>
        </section>
      </div>
    `;
  }

  renderLiveEventsPage(model) {
    const eventsModel = model.liveEvents;

    return `
      <div class="meta-ui__grid meta-ui__grid--hangar-page">
        ${eventsModel.access.basic ? '' : this.renderPremiumModeLock('Live Events', eventsModel.access.liveEvents, model.premium.entitlement.purchase?.access)}

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Live Events</h2>
            <span>${escapeHtml(eventsModel.fairPlayNote)}</span>
          </div>
          <div class="meta-ui__cards meta-ui__cards--premium-mode">
            ${eventsModel.events.map((event) => this.renderLiveEventCard(event, eventsModel.access)).join('')}
          </div>
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Recent Event Completions</h2>
            <span>${escapeHtml(`${eventsModel.completedCount} completed event IDs`)}</span>
          </div>
          <div class="meta-ui__highlight-list">
            ${eventsModel.recentCompletions.length
              ? eventsModel.recentCompletions.map((entry) => `<div class="meta-ui__highlight"><strong>${escapeHtml(entry.title)}</strong> | ${escapeHtml(entry.goalLabel)} | ${escapeHtml(entry.completedAt ? new Date(entry.completedAt).toLocaleString() : 'Recent')}</div>`).join('')
              : '<div class="meta-ui__highlight">No event completions yet. Daily challenge is the Early Access entry point.</div>'
            }
          </div>
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Event Source</h2>
            <span>${escapeHtml(eventsModel.backend?.sourceLabel ?? 'Local Offline Fallback')}</span>
          </div>
          <div class="meta-ui__highlight-list">
            <div class="meta-ui__highlight">${escapeHtml(eventsModel.backend?.message || 'Events are safe local challenges when backend scheduling is unavailable.')}</div>
            <div class="meta-ui__highlight">${escapeHtml(eventsModel.backend?.leaderboardsEnabled ? 'Official leaderboard scores are validated by the backend.' : 'Global event leaderboards are disabled in this build.')}</div>
            <div class="meta-ui__highlight">Event rewards use the existing idempotent reward gallery system.</div>
          </div>
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Event Leaderboards</h2>
            <span>${escapeHtml(eventsModel.backend?.leaderboardsEnabled ? 'Official if backend storage is configured' : 'Unavailable')}</span>
          </div>
          <div class="meta-ui__highlight-list">
            ${eventsModel.events.filter((event) => event.leaderboardEnabled).length
              ? eventsModel.events.filter((event) => event.leaderboardEnabled).map((event) => `
                <div class="meta-ui__highlight">
                  <strong>${escapeHtml(event.title)}</strong> | ${escapeHtml(event.leaderboardLabel)}
                  ${event.leaderboard?.rows?.length
                    ? `<br>${event.leaderboard.rows.slice(0, 3).map((row) => `#${escapeHtml(row.position)} ${escapeHtml(row.displayName)} ${escapeHtml(row.score)}`).join(' | ')}`
                    : ''}
                </div>
              `).join('')
              : '<div class="meta-ui__highlight">No official leaderboard-enabled events are active.</div>'
            }
          </div>
        </section>
      </div>
    `;
  }

  renderLiveEventCard(event, access) {
    const locked = !event.accessible;
    const action = event.canStart
      ? `<button class="meta-ui__action" type="button" data-action="live-event-start" data-id="${escapeHtml(event.id)}">${event.completed ? 'Run Again' : 'Start Event'}</button>`
      : `<button class="meta-ui__secondary" type="button" data-action="premium-preview" data-id="${escapeHtml(access.liveEvents.key ?? 'liveEvents')}">Locked Preview</button>`;

    return `
      <article class="meta-ui__card meta-ui__mode-card ${event.completed ? 'is-selected' : ''} ${locked ? 'is-locked' : ''}">
        <div class="meta-ui__card-headline">
          <span class="meta-ui__badge">${escapeHtml(event.stateLabel)}</span>
          ${this.renderEditionBadge(event.requiredEditionBadge, 'compact')}
        </div>
        <strong>${escapeHtml(event.title)}</strong>
        <span>${escapeHtml(event.description)}</span>
        <small>${escapeHtml(event.trackName)} | ${escapeHtml(event.shipName)} | ${escapeHtml(event.laps)} laps | ${escapeHtml(event.endLabel)}</small>
        <div class="meta-ui__highlight-list">
          <div class="meta-ui__highlight">${escapeHtml(event.goal.label)}: ${escapeHtml(event.goal.description)}</div>
          <div class="meta-ui__highlight">${escapeHtml(event.rewardPreview)}</div>
          <div class="meta-ui__highlight">${escapeHtml(event.backendScheduled ? 'Backend scheduled official event' : 'Local fallback event')} | ${escapeHtml(event.leaderboardLabel)}</div>
        </div>
        <div class="meta-ui__card-actions">${action}</div>
      </article>
    `;
  }

  renderBossEventsPage(model) {
    const boss = model.bossEvents;
    const selected = boss.selectedEvent ?? boss.events[0];

    return `
      <div class="meta-ui__grid meta-ui__grid--hangar-page">
        ${boss.access.basic ? '' : this.renderPremiumModeLock('Boss Race Events', boss.access.bossRaceEvents, model.premium.entitlement.purchase?.access)}

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Boss Race Events</h2>
            <span>${escapeHtml(boss.fairPlayNote)}</span>
          </div>
          <div class="meta-ui__cards meta-ui__cards--premium-mode">
            ${boss.events.map((event) => this.renderBossEventCard(event, boss.access)).join('')}
          </div>
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>${escapeHtml(selected?.title ?? 'Boss Event')}</h2>
            <span>${escapeHtml(selected?.bossName ?? 'Boss rival')}</span>
          </div>
          <div class="meta-ui__mode-detail">
            ${this.renderEditionBadge(selected?.requiredEditionBadge, 'compact')}
            <strong>${escapeHtml(selected?.objective ?? 'Select a boss event.')}</strong>
            <span>${escapeHtml(selected?.introCopy ?? '')}</span>
            <small>${escapeHtml(selected?.rewardPreview ?? '')}</small>
          </div>
          <div class="meta-ui__actions">
            ${selected?.canStart
              ? `<button class="meta-ui__launch" type="button" data-action="boss-start" data-id="${escapeHtml(selected.id)}">${selected.completed ? 'Rematch Boss' : 'Start Boss Race'}</button>`
              : `<button class="meta-ui__action" type="button" data-action="premium-preview" data-id="${escapeHtml(boss.access.bossRaceEvents.key ?? 'bossRaceEvents')}">Locked Preview</button>`
            }
          </div>
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Script Notes</h2>
            <span>Lightweight boss modifiers.</span>
          </div>
          <div class="meta-ui__highlight-list">
            <div class="meta-ui__highlight">${escapeHtml(selected?.hazardScript ?? 'Existing hazards and track modifiers only.')}</div>
            <div class="meta-ui__highlight">${escapeHtml(selected?.vfxScript ?? 'Existing VFX and theme hooks only.')}</div>
            <div class="meta-ui__highlight">Cleared ${escapeHtml(boss.completedCount)} / ${escapeHtml(boss.events.length)} | Trophies ${escapeHtml(boss.trophyCount)}</div>
          </div>
        </section>
      </div>
    `;
  }

  renderBossEventCard(event, access) {
    const action = event.accessible
      ? `<button class="meta-ui__secondary" type="button" data-action="boss-start" data-id="${escapeHtml(event.id)}">${event.completed ? 'Rematch' : 'Start'}</button>`
      : `<button class="meta-ui__secondary" type="button" data-action="premium-preview" data-id="${escapeHtml(access.bossRaceEvents.key ?? 'bossRaceEvents')}">Locked</button>`;

    return `
      <article class="meta-ui__card meta-ui__mode-card ${event.selected ? 'is-selected' : ''} ${event.accessible ? '' : 'is-locked'}">
        <div class="meta-ui__card-headline">
          <span class="meta-ui__badge">${escapeHtml(event.stateLabel)}</span>
          ${this.renderEditionBadge(event.requiredEditionBadge, 'compact')}
        </div>
        <strong>${escapeHtml(event.title)}</strong>
        <span>${escapeHtml(event.description)}</span>
        <small>${escapeHtml(event.bossName)} | ${escapeHtml(formatLabel(event.difficulty))} | ${escapeHtml(event.rewardPreview)}</small>
        <span class="meta-ui__card-actions">
          <button class="meta-ui__secondary" type="button" data-action="boss-select" data-id="${escapeHtml(event.id)}">Inspect</button>
          ${action}
        </span>
      </article>
    `;
  }

  renderCustomRaceLabPage(model) {
    const lab = model.customRaceLab;
    const config = lab.config;
    const full = lab.access.full;

    return `
      <div class="meta-ui__grid meta-ui__grid--hangar-page">
        ${lab.access.basic ? '' : this.renderPremiumModeLock('Custom Race Lab', lab.access.customRaceLab, model.premium.entitlement.purchase?.access)}

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Custom Race Lab</h2>
            <span>${escapeHtml(lab.access.basic ? lab.fairnessNote : 'Locked preview only in Lite.')}</span>
          </div>
          <div class="meta-ui__premium-command">
            <div class="meta-ui__premium-command-copy">
              ${this.renderEditionBadge(lab.access.customRaceLab.requiredEditionBadge, 'compact')}
              <strong>${escapeHtml(config.name)}</strong>
              <span>${escapeHtml(lab.selectedTrackName)} | ${escapeHtml(lab.selectedShipName)} | ${config.aiCount} AI | ${config.lapCount} laps</span>
              <small>${escapeHtml(full ? 'Full Premium modifiers enabled.' : 'Early Access basic lab controls enabled.')}</small>
            </div>
            <div class="meta-ui__premium-command-status">
              <div class="meta-ui__reward"><span>Presets</span><strong>${escapeHtml(lab.presetCountLabel)}</strong></div>
              <div class="meta-ui__reward"><span>Race Lab Runs</span><strong>${escapeHtml(lab.stats.races)}</strong></div>
            </div>
          </div>
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Race Setup</h2>
            <span>Validated offline configuration.</span>
          </div>
          <div class="meta-ui__settings-grid">
            <label class="meta-ui__field">
              <span>Race Name</span>
              <input type="text" maxlength="28" value="${escapeHtml(config.name)}" data-custom-race-field="name" ${lab.access.basic ? '' : 'disabled'} />
            </label>
            <label class="meta-ui__field">
              <span>Track</span>
              <select data-custom-race-field="trackId" ${lab.access.basic ? '' : 'disabled'}>
                ${lab.tracks.map((track) => `<option value="${escapeHtml(track.id)}" ${track.selected ? 'selected' : ''} ${track.unlocked ? '' : 'disabled'}>${escapeHtml(track.name)}${track.unlocked ? '' : ' (locked)'}</option>`).join('')}
              </select>
            </label>
            <label class="meta-ui__field">
              <span>Ship</span>
              <select data-custom-race-field="selectedShipId" ${lab.access.basic ? '' : 'disabled'}>
                ${lab.ships.map((ship) => `<option value="${escapeHtml(ship.id)}" ${ship.selected ? 'selected' : ''} ${ship.unlocked ? '' : 'disabled'}>${escapeHtml(ship.name)}${ship.unlocked ? '' : ' (locked)'}</option>`).join('')}
              </select>
            </label>
            <label class="meta-ui__field">
              <span>Laps</span>
              <input type="number" min="1" max="${lab.limits.maxLaps}" value="${escapeHtml(config.lapCount)}" data-custom-race-field="lapCount" ${lab.access.basic ? '' : 'disabled'} />
              <small>Limit: ${lab.limits.maxLaps}</small>
            </label>
            <label class="meta-ui__field">
              <span>AI Count</span>
              <input type="number" min="1" max="${lab.limits.maxAiCount}" value="${escapeHtml(config.aiCount)}" data-custom-race-field="aiCount" ${lab.access.basic ? '' : 'disabled'} />
              <small>Limit: ${lab.limits.maxAiCount}</small>
            </label>
            <label class="meta-ui__field">
              <span>AI Difficulty</span>
              <select data-custom-race-field="aiDifficulty" ${lab.access.basic ? '' : 'disabled'}>
                ${lab.difficulties.map((item) => `<option value="${escapeHtml(item)}" ${config.aiDifficulty === item ? 'selected' : ''}>${escapeHtml(formatLabel(item))}</option>`).join('')}
              </select>
            </label>
          </div>
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Race Rules</h2>
            <span>${escapeHtml(full ? 'Advanced modifiers are live.' : 'Full controls are previewed until Full Premium.')}</span>
          </div>
          <div class="meta-ui__settings-grid">
            ${this.renderCustomToggle('hazardsEnabled', 'Hazards', config.hazardsEnabled, lab.access.basic)}
            ${this.renderCustomToggle('pickupsEnabled', 'Pickups', config.pickupsEnabled, lab.access.basic)}
            ${this.renderCustomToggle('powerupsEnabled', 'Power-Ups', config.powerupsEnabled, full)}
            ${this.renderCustomSelect('boostPadDensity', 'Boost Pad Density', config.boostPadDensity, lab.densities, full)}
            ${this.renderCustomSelect('shortcutDifficulty', 'Shortcut Difficulty', config.shortcutDifficulty, lab.shortcuts, full)}
            ${this.renderCustomSelect('visualEffect', 'Visual Effect', config.visualEffect, lab.visualEffects, full)}
            ${this.renderCustomSelect('statMode', 'Ship Stats', config.statMode, lab.statModes, full)}
          </div>
          <div class="meta-ui__highlight-list">
            <div class="meta-ui__highlight">${escapeHtml(lab.fairnessNote)}</div>
            <div class="meta-ui__highlight">Time Trial ghosts stay base-stat only. Multiplayer stays normalized.</div>
          </div>
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Launch And Presets</h2>
            <span>Presets are local/profile-safe and capped by edition.</span>
          </div>
          <div class="meta-ui__actions">
            ${lab.access.basic
              ? '<button class="meta-ui__launch" type="button" data-action="custom-race-start">Launch Custom Race</button>'
              : '<button class="meta-ui__action" type="button" data-action="premium-preview" data-id="customRaceLab">Locked Preview</button>'
            }
            <button class="meta-ui__secondary" type="button" data-action="custom-race-save" ${lab.access.basic ? '' : 'disabled'}>Save Preset</button>
            <button class="meta-ui__secondary" type="button" data-action="custom-race-randomize" ${full ? '' : 'disabled'}>Randomize</button>
          </div>
          <div class="meta-ui__cards meta-ui__cards--preview-hub">
            ${lab.presets.length
              ? lab.presets.map((preset) => `
                <article class="meta-ui__card meta-ui__mini-card">
                  <strong>${escapeHtml(preset.name)}</strong>
                  <span>${escapeHtml(preset.trackId)} | ${escapeHtml(preset.aiDifficulty)} | ${escapeHtml(preset.lapCount)} laps</span>
                  <small>${preset.savedAt ? new Date(preset.savedAt).toLocaleDateString() : 'Saved preset'}</small>
                  <div class="meta-ui__card-actions">
                    <button class="meta-ui__secondary" type="button" data-action="custom-race-load" data-id="${escapeHtml(preset.id)}">Load</button>
                    <button class="meta-ui__secondary" type="button" data-action="custom-race-delete" data-id="${escapeHtml(preset.id)}">Delete</button>
                  </div>
                </article>
              `).join('')
              : '<div class="meta-ui__highlight">No saved Race Lab presets yet.</div>'
            }
          </div>
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Share Preset Code</h2>
            <span>Versioned safe config only. No auth, profile, credits, rewards, or entitlement data.</span>
          </div>
          <div class="meta-ui__settings-grid">
            <label class="meta-ui__field meta-ui__field--wide">
              <span>Exported Code</span>
              <textarea rows="3" readonly>${escapeHtml(lab.presetCode.exportCode)}</textarea>
            </label>
            <label class="meta-ui__field meta-ui__field--wide">
              <span>Import Code</span>
              <textarea rows="3" data-custom-race-code>${escapeHtml(lab.presetCode.importCode)}</textarea>
            </label>
          </div>
          <div class="meta-ui__actions">
            <button class="meta-ui__secondary" type="button" data-action="custom-race-export-code" ${lab.access.basic ? '' : 'disabled'}>Export Active Setup</button>
            <button class="meta-ui__secondary" type="button" data-action="custom-race-copy-code" ${lab.presetCode.exportCode ? '' : 'disabled'}>Copy Code</button>
            <button class="meta-ui__secondary" type="button" data-action="custom-race-validate-code" ${lab.access.basic ? '' : 'disabled'}>Validate Import</button>
            <button class="meta-ui__action" type="button" data-action="custom-race-import-code" ${lab.presetCode.importResult?.ok ? '' : 'disabled'}>Import To Active</button>
            <button class="meta-ui__action" type="button" data-action="custom-race-save-imported" ${lab.presetCode.importResult?.ok ? '' : 'disabled'}>Import And Save Preset</button>
          </div>
          ${lab.presetCode.importResult
            ? lab.presetCode.importResult.ok
              ? `<div class="meta-ui__highlight-list">
                  <div class="meta-ui__highlight">Ready: ${escapeHtml(lab.presetCode.importSummary.title)} | ${escapeHtml(lab.presetCode.importSummary.trackName)} | ${escapeHtml(lab.presetCode.importSummary.shipName)}</div>
                  <div class="meta-ui__highlight">${escapeHtml(lab.presetCode.importSummary.rules)} | ${escapeHtml(lab.presetCode.importSummary.modifiers)}</div>
                </div>`
              : `<div class="meta-ui__highlight-list"><div class="meta-ui__highlight">${escapeHtml(lab.presetCode.importResult.reason)}</div></div>`
            : '<div class="meta-ui__highlight-list"><div class="meta-ui__highlight">Paste a code, validate it, then import after reviewing the summary.</div></div>'
          }
        </section>
      </div>
    `;
  }

  renderCustomToggle(field, label, checked, enabled) {
    return `
      <label class="meta-ui__toggle">
        <input type="checkbox" data-custom-race-field="${escapeHtml(field)}" ${checked ? 'checked' : ''} ${enabled ? '' : 'disabled'} />
        <span>${escapeHtml(label)}</span>
      </label>
    `;
  }

  renderCustomSelect(field, label, value, options, enabled) {
    return `
      <label class="meta-ui__field">
        <span>${escapeHtml(label)}</span>
        <select data-custom-race-field="${escapeHtml(field)}" ${enabled ? '' : 'disabled'}>
          ${options.map((option) => `<option value="${escapeHtml(option)}" ${value === option ? 'selected' : ''}>${escapeHtml(formatLabel(option))}</option>`).join('')}
        </select>
        ${enabled ? '' : '<small>Full Premium control</small>'}
      </label>
    `;
  }

  renderRewardsPage(model) {
    const rewards = model.rewards;

    return `
      <div class="meta-ui__grid meta-ui__grid--hangar-page">
        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Trophy / Badge Gallery</h2>
            <span>${rewards.unlockedCount}/${rewards.totalCount} premium rewards unlocked.</span>
          </div>
          <div class="meta-ui__premium-command">
            <div class="meta-ui__premium-command-copy">
              ${this.renderEditionBadge(rewards.access.premiumCosmetics.requiredEditionBadge, 'compact')}
              <strong>Reward Gallery</strong>
              <span>Campaign, tournament, Race Lab, trophy, badge, title, and linked cosmetic unlocks.</span>
              <small>Replay frames are not stored here. Entitlement state is not written as a purchase.</small>
            </div>
            <div class="meta-ui__premium-command-status">
              <div class="meta-ui__reward"><span>Equipped Badge</span><strong>${escapeHtml(rewards.equippedBadgeLabel)}</strong></div>
              <div class="meta-ui__reward"><span>Gallery Access</span><strong>${escapeHtml(rewards.access.premiumCosmetics.accessLabel)}</strong></div>
            </div>
          </div>
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Unlocks</h2>
            <span>Reward grants are idempotent.</span>
          </div>
          <div class="meta-ui__cards meta-ui__cards--locked">
            ${rewards.rewards.map((reward) => this.renderRewardGalleryCard(reward)).join('')}
          </div>
        </section>
      </div>
    `;
  }

  renderRewardGalleryCard(reward) {
    return `
      <article class="meta-ui__card meta-ui__locked-card ${reward.unlocked ? 'is-selected' : 'is-locked'}">
        <div class="meta-ui__card-headline">
          <span class="meta-ui__feature-glyph">${escapeHtml(reward.iconLabel)}</span>
          ${this.renderEditionBadge(reward.requiredEditionBadge, 'compact')}
        </div>
        <strong>${escapeHtml(reward.title)}</strong>
        <span>${escapeHtml(reward.description)}</span>
        <div class="meta-ui__locked-meta">
          <span class="meta-ui__badge">${escapeHtml(reward.stateLabel)}</span>
          <small>${escapeHtml(reward.unlockSource)} | ${escapeHtml(reward.unlockedAtLabel)}</small>
        </div>
        ${reward.linkedCosmeticId ? `<small>Linked cosmetic: ${escapeHtml(reward.linkedCosmeticId)}</small>` : ''}
        <div class="meta-ui__card-actions">
          ${reward.canEquip
            ? `<button class="meta-ui__action" type="button" data-action="reward-equip" data-id="${escapeHtml(reward.rewardId)}" ${reward.equipped ? 'disabled' : ''}>${reward.equipped ? 'Equipped' : 'Equip'}</button>`
            : `<button class="meta-ui__secondary" type="button" disabled>${escapeHtml(reward.unlocked ? 'Unlocked' : 'Locked')}</button>`
          }
        </div>
      </article>
    `;
  }

  renderSystemsPage(model) {
    return `
      <div class="meta-ui__grid meta-ui__grid--hangar-page">
        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Audio Mix</h2>
            <span>Balance the race feel without leaving the hangar.</span>
          </div>
          <div class="meta-ui__settings-grid">
            ${this.renderRangeSetting('master', 'Master', model.settings.audio.master)}
            ${this.renderRangeSetting('effects', 'Effects', model.settings.audio.effects)}
            ${this.renderRangeSetting('voice', 'Commentary Voice', model.settings.audio.voice)}
            <label class="meta-ui__toggle">
              <input type="checkbox" data-audio-toggle="voiceEnabled" ${model.settings.audio.voiceEnabled ? 'checked' : ''} />
              <span>Voice commentary enabled</span>
            </label>
          </div>
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Graphics</h2>
            <span>Trade spectacle for performance when you need it.</span>
          </div>
          <div class="meta-ui__settings-grid">
            <label class="meta-ui__field">
              <span>Quality</span>
              <select data-graphics-select="quality">
                ${['performance', 'balanced', 'high'].map((item) => `<option value="${item}" ${model.settings.graphics.quality === item ? 'selected' : ''}>${formatLabel(item)}</option>`).join('')}
              </select>
            </label>
            ${this.renderGraphicsToggle('particles', 'Particles', model.settings.graphics.particles)}
            ${this.renderGraphicsToggle('speedLines', 'Speed Lines', model.settings.graphics.speedLines)}
            ${this.renderGraphicsToggle('cameraShake', 'Camera Shake', model.settings.graphics.cameraShake)}
            ${this.renderGraphicsToggle('animatedTrack', 'Animated Track', model.settings.graphics.animatedTrack)}
          </div>
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Controls And Difficulty</h2>
            <span>Dial the race feel in and rebind the important keys.</span>
          </div>
          <div class="meta-ui__settings-grid">
            <label class="meta-ui__field">
              <span>AI Difficulty</span>
              <select data-gameplay-select="difficulty">
                ${['casual', 'standard', 'elite'].map((item) => `<option value="${item}" ${model.settings.gameplay.difficulty === item ? 'selected' : ''}>${formatLabel(item)}</option>`).join('')}
              </select>
            </label>
            <label class="meta-ui__toggle">
              <input type="checkbox" data-gameplay-toggle="tutorial" ${model.settings.gameplay.onboardingSeen ? '' : 'checked'} />
              <span>Show tutorial prompts during races</span>
            </label>
          </div>
          <div class="meta-ui__control-list">
            ${model.settings.controls.map((control) => `
              <div class="meta-ui__control-row">
                <div>
                  <strong>${escapeHtml(control.label)}</strong>
                  <span>${escapeHtml(control.value)}</span>
                </div>
                <button class="meta-ui__secondary" type="button" data-action="rebind" data-id="${control.id}" data-feedback-key="rebind:${control.id}">Rebind</button>
              </div>
            `).join('')}
          </div>
        </section>

        ${model.premium.demo.enabled ? `
          <section class="meta-ui__section">
            <div class="meta-ui__section-head">
              <h2>Demo Entitlement</h2>
              <span>Dev/demo only. Not a purchase or payment state.</span>
            </div>
            <div class="meta-ui__demo-status">
              <div>
                <span>Visible Edition</span>
                ${this.renderEditionBadge(model.premium.entitlement.badge, 'compact')}
              </div>
              <div>
                <span>Build Default</span>
                <strong>${escapeHtml(model.premium.demo.buildEditionLabel)}</strong>
              </div>
            </div>
            <div class="meta-ui__settings-grid">
              <label class="meta-ui__field meta-ui__field--demo">
                <span>Local Demo Edition</span>
                <select data-demo-edition-select>
                  ${model.premium.demo.options.map((option) => `<option value="${escapeHtml(option.id)}" ${model.premium.demo.currentEdition === option.id ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
                </select>
                <small>Stored only in ${escapeHtml(model.premium.demo.storageKey)}. Firebase, profile saves, and checkout state are not changed.</small>
              </label>
              <div class="meta-ui__field meta-ui__field--demo">
                <span>Demo Safety</span>
                <small>This control appears only in Vite dev or when VITE_ENABLE_DEMO_ENTITLEMENT=true.</small>
                <button class="meta-ui__secondary" type="button" data-action="demo-edition-clear" ${model.premium.demo.canClear ? '' : 'disabled'}>Use Build Default</button>
              </div>
            </div>
          </section>
        ` : ''}

        ${model.premium.entitlement.account?.active ? `
          <section class="meta-ui__section">
            <div class="meta-ui__section-head">
              <h2>Test Account Unlock</h2>
              <span>QA access for the signed-in Google account. Not a purchase.</span>
            </div>
            <div class="meta-ui__system-plan">
              ${this.renderEditionBadge(model.premium.entitlement.badge, 'compact')}
              <span>${escapeHtml(model.premium.entitlement.account.email)} has full premium access and base garage content unlocked for testing.</span>
            </div>
          </section>
        ` : ''}

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Online Fairness</h2>
            <span>Premium cannot buy online advantage.</span>
          </div>
          <div class="meta-ui__system-plan">
            ${this.renderEditionBadge(model.premium.entitlement.badge, 'compact')}
            <span>${escapeHtml(model.premium.currentEdition.description)}</span>
          </div>
          ${this.renderFairnessPolicy(model.premium.fairnessPolicy)}
        </section>

        <section class="meta-ui__section meta-ui__section--wide">
          <div class="meta-ui__section-head">
            <h2>Onboarding</h2>
            <span>Quick reminders for drift, boost, and power-up timing.</span>
          </div>
          <div class="meta-ui__highlight-list">
            ${model.settings.tutorialTips.map((tip) => `<div class="meta-ui__highlight">${escapeHtml(tip)}</div>`).join('')}
          </div>
        </section>
      </div>
    `;
  }

  renderRangeSetting(id, label, value) {
    return `
      <label class="meta-ui__field">
        <span>${escapeHtml(label)}</span>
        <input type="range" min="0" max="1" step="0.01" value="${Number(value ?? 1)}" data-audio-range="${id}" />
        <small>${Math.round(Number(value ?? 1) * 100)}%</small>
      </label>
    `;
  }

  renderGraphicsToggle(id, label, checked) {
    return `
      <label class="meta-ui__toggle">
        <input type="checkbox" data-graphics-toggle="${id}" ${checked ? 'checked' : ''} />
        <span>${escapeHtml(label)}</span>
      </label>
    `;
  }

  renderGoalsPage(model) {
    return `
      <div class="meta-ui__grid meta-ui__grid--hangar-page">
        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Daily Goals</h2>
            <span>Come back, climb faster, and stack unlocks.</span>
          </div>
          ${this.renderGoalList(model.multiplayer.dailyGoals)}
        </section>

        <section class="meta-ui__section">
          <div class="meta-ui__section-head">
            <h2>Weekly Goals</h2>
            <span>Longer targets for the bigger payout.</span>
          </div>
          ${this.renderGoalList(model.multiplayer.weeklyGoals)}
        </section>
      </div>
    `;
  }

  showResults(model) {
    this.root.classList.remove('meta-ui--hidden');
    this.root.innerHTML = `
      <div class="meta-ui__panel meta-ui__panel--results">
        <div class="meta-ui__header">
          <div>
            <div class="meta-ui__eyebrow">Race Complete</div>
            <h1 class="meta-ui__title">${model.positionLabel}</h1>
            <p class="meta-ui__copy">${model.summaryLine}</p>
            <div class="meta-ui__results-theme-row">
              ${this.renderRarityChip(model.podium?.[0]?.rarity ?? 'common', 'Podium')}
              <span class="meta-ui__manufacturer-chip">${escapeHtml(model.trackTheme)}</span>
            </div>
          </div>
          <div class="meta-ui__profile">
            <div class="meta-ui__profile-card">
              <span>Level ${model.profile.level}</span>
              <div class="meta-ui__profile-meter"><div style="width:${model.profile.xpProgress * 100}%"></div></div>
              <small>${model.profile.xpLabel}</small>
            </div>
            <div class="meta-ui__profile-card"><span>Credits</span><strong>${model.profile.currency}</strong></div>
            <div class="meta-ui__profile-card"><span>Points</span><strong>${model.profile.totalPoints}</strong></div>
          </div>
        </div>

        <div class="meta-ui__grid meta-ui__grid--results">
          ${model.podium?.length
            ? `
              <section class="meta-ui__section meta-ui__section--wide meta-ui__section--podium">
                <div class="meta-ui__section-head">
                  <h2>Podium Fly-In</h2>
                  <span>Top finishers, final order, and the standout ships from the flag.</span>
                </div>
                ${this.renderPodium(model.podium)}
              </section>
            `
            : ''
          }

          <section class="meta-ui__section">
            <div class="meta-ui__section-head">
              <h2>${model.timeTrial ? 'Session Breakdown' : 'Reward Breakdown'}</h2>
              <span>${model.timeTrial ? 'Your pace, ghost, and sector work from this run.' : 'Every race moves your career forward.'}</span>
            </div>
            <div class="meta-ui__reward-list">
              ${model.rewards.map((reward, index) => `
                <div class="meta-ui__reward" style="--reveal-index:${index};">
                  <span>${reward.label}</span>
                  <strong>${reward.value}</strong>
                </div>
              `).join('')}
            </div>
          </section>

          <section class="meta-ui__section">
            <div class="meta-ui__section-head">
              <h2>${model.timeTrial ? 'Run Notes' : 'Challenge Results'}</h2>
              <span>${model.timeTrial ? 'Clean sectors and ghost gains matter most here.' : model.levelUp ? 'Level up earned.' : 'Keep pushing for the next unlock.'}</span>
            </div>
            <div class="meta-ui__challenge-list">
              ${(model.challengeResults.length > 0
                ? model.challengeResults.map((challenge) => `
                <div class="meta-ui__challenge ${challenge.completed ? 'is-complete' : ''}">
                  <strong>${challenge.label}</strong>
                  <span>${challenge.completed ? `Completed: +${challenge.rewardCurrency} CR / +${challenge.rewardXp} XP` : `Progress: ${challenge.progressText}`}</span>
                </div>
              `).join('')
                : '<div class="meta-ui__challenge"><strong>No challenge rewards</strong><span>This run was focused entirely on pace, sectors, and ghost improvement.</span></div>'
              )}
            </div>
          </section>

          <section class="meta-ui__section">
            <div class="meta-ui__section-head">
              <h2>Unlock Progress</h2>
              <span>${model.nextUnlock}</span>
            </div>
            <div class="meta-ui__unlock-list">
              ${model.unlocks.length > 0
                ? model.unlocks.map((unlock, index) => `<div class="meta-ui__unlock" style="--reveal-index:${index};"><strong>${unlock.type}</strong><span>${unlock.label}</span></div>`).join('')
                : '<div class="meta-ui__unlock"><strong>No New Unlocks</strong><span>Your next unlock is getting closer.</span></div>'
              }
              ${model.achievements.map((achievement) => `
                <div class="meta-ui__unlock">
                  <strong>Achievement</strong>
                  <span>${achievement.name}</span>
                </div>
              `).join('')}
            </div>
          </section>

          <section class="meta-ui__section">
            <div class="meta-ui__section-head">
              <h2>Final Standings</h2>
              <span>The race is over. Here is the order at the flag.</span>
            </div>
            ${this.renderLeaderboard(model.standings, true)}
          </section>

          ${model.timing ? `
            <section class="meta-ui__section">
              <div class="meta-ui__section-head">
                <h2>Timing Breakdown</h2>
                <span>${model.timeTrial?.ghostSaved ? 'New ghost replay saved.' : 'Where the lap was made or lost.'}</span>
              </div>
              <div class="meta-ui__reward-list">
                <div class="meta-ui__reward">
                  <span>Total Time</span>
                  <strong>${escapeHtml(model.timing.totalTimeLabel)}</strong>
                </div>
                <div class="meta-ui__reward">
                  <span>Best Lap</span>
                  <strong>${escapeHtml(model.timing.bestLapLabel)}</strong>
                </div>
                <div class="meta-ui__reward">
                  <span>Last Lap</span>
                  <strong>${escapeHtml(model.timing.lastLapLabel)}</strong>
                </div>
              </div>
              <div class="meta-ui__challenge-list">
                ${model.timing.lapTimes.map((lap) => `
                  <div class="meta-ui__challenge">
                    <strong>${escapeHtml(lap.label)}</strong>
                    <span>${escapeHtml(lap.value)}</span>
                  </div>
                `).join('')}
                ${model.timing.sectors.map((sector) => `
                  <div class="meta-ui__challenge">
                    <strong>${escapeHtml(sector.label)}</strong>
                    <span>${escapeHtml(sector.value)} | Best ${escapeHtml(sector.best)}</span>
                  </div>
                `).join('')}
              </div>
            </section>
          ` : ''}

          ${this.renderCampaignResult(model.campaign)}
          ${this.renderTournamentResult(model.tournament)}
          ${this.renderCustomRaceResult(model.customRace)}
          ${this.renderRankedResult(model.rankedSeason)}
          ${this.renderLiveEventResult(model.liveEvent)}
          ${this.renderBossEventResult(model.bossEvent)}
          ${this.renderResultHighlights(model.resultHighlights, model.shareText)}
          ${this.renderPremiumUnlocks(model.premiumUnlocks)}

          <section class="meta-ui__section">
            <div class="meta-ui__section-head">
              <h2>Next Move</h2>
              <span>${model.nextActions?.length ? 'Continue this premium flow or return to the hangar.' : 'Improve, buy gear, or queue another run.'}</span>
            </div>
            <div class="meta-ui__actions">
              ${model.nextActions?.length
                ? model.nextActions.map((action) => `
                  <button class="${action.primary ? 'meta-ui__launch' : 'meta-ui__secondary'}" data-action="result-action" data-id="${escapeHtml(action.id)}">${escapeHtml(action.label)}</button>
                `).join('')
                : `
                  <button class="meta-ui__launch" data-action="race-again">Race Again</button>
                  <button class="meta-ui__secondary" data-action="back-hangar">Back To Hangar</button>
                `
              }
            </div>
          </section>

          ${model.multiplayer ? `
            <section class="meta-ui__section">
              <div class="meta-ui__section-head">
                <h2>Competitive Result</h2>
                <span>${escapeHtml(model.multiplayer.roomTypeLabel)}</span>
              </div>
              <div class="meta-ui__rank-card">
                <strong>${escapeHtml(model.multiplayer.rankName)}</strong>
                <span>${model.multiplayer.ratingAfter} rating</span>
                <small>${model.multiplayer.ratingDeltaLabel}</small>
              </div>
              <div class="meta-ui__reward-list">
                ${model.multiplayer.completedGoals.map((goal) => `
                  <div class="meta-ui__reward">
                    <span>${escapeHtml(goal.label)}</span>
                    <strong>+${goal.rewardCurrency} CR / +${goal.rewardXp} XP</strong>
                  </div>
                `).join('') || '<div class="meta-ui__reward"><span>No extra multiplayer goals cleared</span><strong>Keep climbing</strong></div>'}
              </div>
            </section>

            <section class="meta-ui__section">
              <div class="meta-ui__section-head">
                <h2>Shareable Highlights</h2>
                <span>These are ready-made brag lines.</span>
              </div>
              <div class="meta-ui__highlight-list">
                ${model.multiplayer.highlights.map((highlight) => `<div class="meta-ui__highlight">${escapeHtml(highlight)}</div>`).join('') || '<div class="meta-ui__highlight">No headline moment this time. Queue another run.</div>'}
              </div>
            </section>
          ` : ''}
        </div>
      </div>
    `;

    this.bindActions();
    this.restoreButtonFeedbacks();
  }

  showPause(model) {
    this.root.classList.remove('meta-ui--hidden');
    this.root.innerHTML = `
      <div class="meta-ui__overlay">
        <div class="meta-ui__panel meta-ui__panel--pause">
          <div class="meta-ui__eyebrow">Race Control</div>
          <h2 class="meta-ui__title">${escapeHtml(model.title)}</h2>
          <p class="meta-ui__copy">${escapeHtml(model.subtitle)}</p>
          <div class="meta-ui__actions">
            <button class="meta-ui__launch" type="button" data-action="resume-race">Resume Race</button>
            ${model.canRestart ? '<button class="meta-ui__secondary" type="button" data-action="restart-race">Restart Race</button>' : ''}
          </div>
        </div>
      </div>
    `;

    this.bindActions();
    this.restoreButtonFeedbacks();
  }

  hidePause() {
    const overlay = this.root.querySelector('.meta-ui__overlay');

    if (overlay) {
      this.hide();
    }
  }

  getGaragePreviewHost() {
    return this.root.querySelector('[data-garage-preview-host]');
  }

  renderRarityChip(rarity, label = null) {
    const safeRarity = String(rarity ?? 'common').toLowerCase();
    return `<span class="meta-ui__rarity meta-ui__rarity--${escapeHtml(safeRarity)}">${escapeHtml(label ?? formatLabel(safeRarity))}</span>`;
  }

  renderEditionBadge(badge, size = 'default') {
    const safeBadge = badge ?? {
      id: 'GAMEHUB_LITE',
      label: 'Lite',
      fullLabel: 'GameHub Lite',
      tone: 'common',
      iconLabel: 'L'
    };
    const safeTone = String(safeBadge.tone ?? 'common').toLowerCase();
    const safeSize = size === 'compact' ? ' meta-ui__edition-badge--compact' : '';

    return `
      <span class="meta-ui__edition-badge meta-ui__edition-badge--${escapeHtml(safeTone)}${safeSize}" title="${escapeHtml(safeBadge.fullLabel ?? safeBadge.label)}">
        <span>${escapeHtml(safeBadge.iconLabel ?? safeBadge.label)}</span>
        <strong>${escapeHtml(safeBadge.label ?? safeBadge.shortLabel ?? 'Lite')}</strong>
      </span>
    `;
  }

  renderPodium(entries) {
    const ordered = [...entries].sort((entryA, entryB) => (entryA.position ?? 99) - (entryB.position ?? 99));
    const podiumOrder = [ordered.find((entry) => entry.position === 2), ordered.find((entry) => entry.position === 1), ordered.find((entry) => entry.position === 3)].filter(Boolean);

    return `
      <div class="meta-ui__podium">
        ${podiumOrder.map((entry, index) => `
          <article class="meta-ui__podium-card meta-ui__podium-card--p${entry.position}" style="--podium-accent:${escapeHtml(entry.accentColor ?? '#7fdfff')}; --podium-delay:${index * 0.08}s;">
            <div class="meta-ui__podium-ship"></div>
            <div class="meta-ui__podium-rank">P${entry.position}</div>
            <strong>${escapeHtml(entry.name)}</strong>
            <span>${escapeHtml(entry.shipName)}</span>
            <small>${escapeHtml(entry.manufacturer)}</small>
            <em>${escapeHtml(entry.finishTimeLabel)}</em>
          </article>
        `).join('')}
      </div>
    `;
  }

  renderSwatches(label, options, selectedId, action) {
    return `
      <div class="meta-ui__swatch-group">
        <strong>${label}</strong>
        <div class="meta-ui__swatch-row">
          ${options.map((option) => `
            <button
              class="meta-ui__swatch meta-ui__swatch--${escapeHtml(option.rarity ?? 'common')} ${option.id === selectedId ? 'is-selected' : ''}"
              type="button"
              data-action="${action}"
              data-id="${option.id}"
              ${option.unlocked ? '' : 'disabled'}
              title="${option.unlocked ? `${option.name} • ${formatLabel(option.rarity ?? 'common')}` : `Unlocks at Level ${option.unlockLevel}`}"
              style="--swatch-color:#${option.hex};"
            ></button>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderRoomState(multiplayer) {
    if (!multiplayer.room) {
      return `
        <div class="meta-ui__room-state">
          <strong>No active room</strong>
          <span>Quick Match drops you into live competition fast. Private rooms now support invite links, host control, and realtime lobby management.</span>
        </div>
      `;
    }

    return `
      <div class="meta-ui__room-state">
        <div class="meta-ui__room-head">
          <strong>${escapeHtml(multiplayer.room.typeLabel)}</strong>
          <span>Code ${escapeHtml(multiplayer.room.code)}</span>
        </div>
        <small>${escapeHtml(multiplayer.room.statusLabel)} | ${escapeHtml(multiplayer.room.trackName)} | ${escapeHtml(multiplayer.room.slotsLabel)}</small>
        <div class="meta-ui__social-card">
          <div>
            <strong>Invite Link</strong>
            <span>${escapeHtml(multiplayer.room.joinLink)}</span>
          </div>
          <div class="meta-ui__social-actions">
            <button class="meta-ui__secondary" type="button" data-action="copy-link" data-id="${escapeHtml(multiplayer.room.joinLink)}">Copy Link</button>
            <button class="meta-ui__secondary" type="button" data-action="copy-code" data-id="${escapeHtml(multiplayer.room.code)}">Copy Code</button>
          </div>
        </div>
        <div class="meta-ui__leaderboards">
          <div>
            <strong class="meta-ui__mini-title">Pilots</strong>
            ${this.renderRoomPlayers(multiplayer.room.players)}
          </div>
          <div>
            <strong class="meta-ui__mini-title">Room Feed</strong>
            <div class="meta-ui__highlight-list">
              ${(multiplayer.room.feed.length > 0
                ? multiplayer.room.feed
                : [{ text: 'Room feed is quiet. Throw an emote before the launch.' }]
              ).map((entry) => `<div class="meta-ui__highlight">${escapeHtml(entry.text)}</div>`).join('')}
            </div>
          </div>
        </div>
        <div class="meta-ui__multiplayer-actions">
          ${multiplayer.room.canToggleReady ? '<button class="meta-ui__action" type="button" data-action="room-ready">Toggle Ready</button>' : ''}
          ${multiplayer.room.canStart ? '<button class="meta-ui__action" type="button" data-action="room-start">Start Room</button>' : ''}
          ${multiplayer.room.canStartTournament ? '<button class="meta-ui__action" type="button" data-action="room-start">Start Tournament</button>' : ''}
          ${multiplayer.room.canStartNextTournament ? '<button class="meta-ui__action" type="button" data-action="room-start">Start Next Round</button>' : ''}
          ${multiplayer.room.canRematch ? '<button class="meta-ui__action" type="button" data-action="room-rematch">Rematch</button>' : ''}
          ${multiplayer.room.canDiscard ? '<button class="meta-ui__secondary" type="button" data-action="room-discard">Discard Room</button>' : ''}
          <button class="meta-ui__action" type="button" data-action="room-leave">Leave Room</button>
        </div>
        <div class="meta-ui__friend-list">
          <button class="meta-ui__friend-chip" type="button" data-action="emote" data-id="Good luck">Good luck</button>
          <button class="meta-ui__friend-chip" type="button" data-action="emote" data-id="Bring it">Bring it</button>
          <button class="meta-ui__friend-chip" type="button" data-action="emote" data-id="No mistakes">No mistakes</button>
        </div>
      </div>
    `;
  }

  renderRoomPlayers(players) {
    if (!players || players.length === 0) {
      return '<div class="meta-ui__highlight">No pilots in this lobby yet.</div>';
    }

    return `
      <div class="meta-ui__social-list">
        ${players.map((player, index) => `
          <div class="meta-ui__social-card">
            <div>
              <strong>${escapeHtml(player.name ?? 'Pilot')}</strong>
              <span>${escapeHtml(player.isHost ? `Host | P${index + 1}` : `Grid ${index + 1}`)} | ${escapeHtml(player.bot ? 'Server Bot' : player.ready ? 'Ready' : 'Not Ready')} | ${escapeHtml(player.eliminated ? 'Eliminated' : player.activeEntrant === false ? 'Spectator' : player.connected === false ? 'Reconnecting' : 'Online')} | ${escapeHtml(player.tier ? `${player.tier} | ${player.rating}` : `${player.rating ?? ''}`)}</span>
            </div>
            <div class="meta-ui__social-actions">
              ${player.canTransferHost ? `<button class="meta-ui__secondary" type="button" data-action="room-host" data-id="${escapeHtml(player.playerId)}">Make Host</button>` : ''}
              ${player.canKick ? `<button class="meta-ui__secondary" type="button" data-action="room-kick" data-id="${escapeHtml(player.playerId)}">Remove</button>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderLeaderboard(entries, compact = false) {
    if (!entries || entries.length === 0) {
      return '<div class="meta-ui__highlight">No standings yet.</div>';
    }

    return `
      <div class="meta-ui__board-list ${compact ? 'is-compact' : ''}">
        ${entries.map((entry, index) => `
          <div class="meta-ui__board-row">
            <strong>${escapeHtml(entry.position ? `P${entry.position}` : entry.place ? `P${entry.place}` : `#${index + 1}`)}</strong>
            <span>${escapeHtml(entry.name ?? entry.playerName ?? 'Pilot')}</span>
            <small>${escapeHtml(entry.tier ? `${entry.tier}${entry.rating ? ` | ${entry.rating}` : ''}` : entry.finishTime ? `${(entry.finishTime / 1000).toFixed(2)}s` : entry.rating ? `${entry.rating}` : '')}</small>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderGoalList(goals) {
    return `
      <div class="meta-ui__goal-list">
        ${goals.map((goal) => `
          <div class="meta-ui__goal ${goal.completed ? 'is-complete' : ''}">
            <strong>${escapeHtml(goal.label)}</strong>
            <span>${escapeHtml(goal.progress)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderCampaignResult(campaign) {
    if (!campaign) {
      return '';
    }

    return `
      <section class="meta-ui__section">
        <div class="meta-ui__section-head">
          <h2>Campaign Progress</h2>
          <span>${escapeHtml(campaign.cupTitle)}</span>
        </div>
        <div class="meta-ui__reward-list">
          <div class="meta-ui__reward">
            <span>Race</span>
            <strong>${escapeHtml(campaign.raceTitle)}</strong>
          </div>
          <div class="meta-ui__reward">
            <span>Cup Progress</span>
            <strong>${escapeHtml(campaign.progressLabel)}</strong>
          </div>
          <div class="meta-ui__reward">
            <span>Trophy</span>
            <strong>${escapeHtml(campaign.trophyEarned ? 'Earned' : campaign.completed ? 'Complete' : 'In Progress')}</strong>
          </div>
        </div>
        <div class="meta-ui__highlight-list">
          <div class="meta-ui__highlight">${escapeHtml(campaign.rivalName)}: ${escapeHtml(campaign.rivalLine)}</div>
          <div class="meta-ui__highlight">${escapeHtml(campaign.nextRaceTitle ? `Next race: ${campaign.nextRaceTitle}` : campaign.trophyLabel)}</div>
        </div>
      </section>
    `;
  }

  renderTournamentResult(tournament) {
    if (!tournament) {
      return '';
    }

    return `
      <section class="meta-ui__section">
        <div class="meta-ui__section-head">
          <h2>Tournament Result</h2>
          <span>${escapeHtml(tournament.roundLabel)}</span>
        </div>
        <div class="meta-ui__reward-list">
          <div class="meta-ui__reward">
            <span>Bracket</span>
            <strong>${escapeHtml(tournament.typeTitle)}</strong>
          </div>
          <div class="meta-ui__reward">
            <span>Advanced</span>
            <strong>${escapeHtml(String(tournament.advancingCount ?? 0))}</strong>
          </div>
          <div class="meta-ui__reward">
            <span>Status</span>
            <strong>${escapeHtml(tournament.completed ? 'Champion' : tournament.eliminated ? 'Eliminated' : 'Alive')}</strong>
          </div>
        </div>
        <div class="meta-ui__highlight-list">
          <div class="meta-ui__highlight">${escapeHtml(tournament.resultLabel)}</div>
          <div class="meta-ui__highlight">${escapeHtml(tournament.championName ? `Champion: ${tournament.championName}` : tournament.trophyLabel)}</div>
        </div>
      </section>
    `;
  }

  renderCustomRaceResult(customRace) {
    if (!customRace) {
      return '';
    }

    return `
      <section class="meta-ui__section">
        <div class="meta-ui__section-head">
          <h2>Custom Race Lab</h2>
          <span>${escapeHtml(customRace.name)}</span>
        </div>
        <div class="meta-ui__reward-list">
          <div class="meta-ui__reward">
            <span>Modifiers</span>
            <strong>${escapeHtml(customRace.modifiersLabel)}</strong>
          </div>
          <div class="meta-ui__reward">
            <span>Stats Mode</span>
            <strong>${escapeHtml(formatLabel(customRace.statMode))}</strong>
          </div>
        </div>
        <div class="meta-ui__highlight-list">
          <div class="meta-ui__highlight">${escapeHtml(customRace.leaderboardSafe)}</div>
        </div>
      </section>
    `;
  }

  renderRankedResult(ranked) {
    if (!ranked) {
      return '';
    }

    return `
      <section class="meta-ui__section">
        <div class="meta-ui__section-head">
          <h2>Ranked Season</h2>
          <span>${escapeHtml(ranked.seasonName)}</span>
        </div>
        <div class="meta-ui__reward-list">
          <div class="meta-ui__reward">
            <span>Rating</span>
            <strong>${escapeHtml(ranked.ratingBefore)} -> ${escapeHtml(ranked.ratingAfter)}</strong>
          </div>
          <div class="meta-ui__reward">
            <span>Delta</span>
            <strong>${escapeHtml(ranked.ratingDelta >= 0 ? `+${ranked.ratingDelta}` : ranked.ratingDelta)}</strong>
          </div>
          <div class="meta-ui__reward">
            <span>Tier</span>
            <strong>${escapeHtml(ranked.tier)}</strong>
          </div>
        </div>
        <div class="meta-ui__highlight-list">
          <div class="meta-ui__highlight">${escapeHtml(ranked.normalizedNote)}</div>
          <div class="meta-ui__highlight">${escapeHtml(ranked.tierChanged ? `Tier changed from ${ranked.previousTier} to ${ranked.tier}.` : ranked.fairPlayNote)}</div>
        </div>
      </section>
    `;
  }

  renderLiveEventResult(event) {
    if (!event) {
      return '';
    }

    return `
      <section class="meta-ui__section">
        <div class="meta-ui__section-head">
          <h2>Live Event Result</h2>
          <span>${escapeHtml(event.title)}</span>
        </div>
        <div class="meta-ui__reward-list">
          <div class="meta-ui__reward">
            <span>Goal</span>
            <strong>${escapeHtml(event.goalLabel)}</strong>
          </div>
          <div class="meta-ui__reward">
            <span>Status</span>
            <strong>${escapeHtml(event.completed ? 'Complete' : 'Incomplete')}</strong>
          </div>
        </div>
        <div class="meta-ui__highlight-list">
          <div class="meta-ui__highlight">${escapeHtml(event.goalDescription)}</div>
          <div class="meta-ui__highlight">${escapeHtml(event.resultLabel)}</div>
          <div class="meta-ui__highlight">${escapeHtml(event.fairnessNote)}</div>
        </div>
      </section>
    `;
  }

  renderBossEventResult(event) {
    if (!event) {
      return '';
    }

    return `
      <section class="meta-ui__section">
        <div class="meta-ui__section-head">
          <h2>Boss Race Result</h2>
          <span>${escapeHtml(event.bossName)}</span>
        </div>
        <div class="meta-ui__reward-list">
          <div class="meta-ui__reward">
            <span>Event</span>
            <strong>${escapeHtml(event.title)}</strong>
          </div>
          <div class="meta-ui__reward">
            <span>Objective</span>
            <strong>${escapeHtml(event.completed ? 'Cleared' : 'Missed')}</strong>
          </div>
        </div>
        <div class="meta-ui__highlight-list">
          <div class="meta-ui__highlight">${escapeHtml(event.objective)}</div>
          <div class="meta-ui__highlight">${escapeHtml(event.resultLabel)}</div>
          <div class="meta-ui__highlight">${escapeHtml(event.fairnessNote)}</div>
        </div>
      </section>
    `;
  }

  renderPremiumUnlocks(unlocks = []) {
    if (!unlocks.length) {
      return '';
    }

    return `
      <section class="meta-ui__section">
        <div class="meta-ui__section-head">
          <h2>Premium Unlocks</h2>
          <span>New reward grants from this run.</span>
        </div>
        <div class="meta-ui__unlock-list">
          ${unlocks.map((reward) => `
            <div class="meta-ui__unlock">
              <strong>${escapeHtml(reward.title)}</strong>
              <span>${escapeHtml(reward.description)} | ${escapeHtml(reward.unlockSource)}</span>
            </div>
          `).join('')}
        </div>
        <div class="meta-ui__actions">
          <button class="meta-ui__secondary" type="button" data-action="result-action" data-id="rewards-page">Open Rewards</button>
        </div>
      </section>
    `;
  }

  renderResultHighlights(highlights = [], shareText = '') {
    const safeHighlights = Array.isArray(highlights) ? highlights : [];
    const safeShareText = String(shareText ?? '').trim();

    if (!safeHighlights.length && !safeShareText) {
      return '';
    }

    return `
      <section class="meta-ui__section">
        <div class="meta-ui__section-head">
          <h2>Premium Result Moment</h2>
          <span>Launch-polish highlights from this race.</span>
        </div>
        <div class="meta-ui__highlight-list">
          ${safeHighlights.length
            ? safeHighlights.map((highlight) => `
              <div class="meta-ui__highlight">
                <strong>${escapeHtml(highlight.title)}</strong>
                <span>${escapeHtml(highlight.description)}</span>
              </div>
            `).join('')
            : '<div class="meta-ui__highlight"><strong>Clean Finish</strong><span>No premium milestone fired on this run.</span></div>'
          }
        </div>
        ${safeShareText ? `
          <div class="meta-ui__actions">
            <button class="meta-ui__secondary" type="button" data-action="copy-result" data-id="${escapeHtml(safeShareText)}">Copy Result Text</button>
          </div>
        ` : ''}
      </section>
    `;
  }

  showReplay(model) {
    this.root.classList.remove('meta-ui--hidden');

    if (model.hudHidden) {
      this.root.innerHTML = `
        <div class="meta-ui__replay-minibar">
          <button class="meta-ui__secondary" type="button" data-action="replay-control" data-id="hud">Show Replay UI</button>
        </div>
      `;
      this.bindActions();
      return;
    }

    this.root.innerHTML = `
      <div class="meta-ui__panel meta-ui__panel--results meta-ui__panel--replay">
        <div class="meta-ui__header">
          <div>
            <div class="meta-ui__eyebrow">Replay / Photo Mode</div>
            <h1 class="meta-ui__title">${escapeHtml(model.title)}</h1>
            <p class="meta-ui__copy">${escapeHtml(model.subtitle)}</p>
          </div>
          <div class="meta-ui__profile">
            <div class="meta-ui__profile-card"><span>Time</span><strong>${escapeHtml(model.currentLabel)}</strong><small>${escapeHtml(model.durationLabel)}</small></div>
            <div class="meta-ui__profile-card"><span>Mode</span><strong>${escapeHtml(model.photoMode ? 'Photo' : model.playing ? 'Playing' : 'Paused')}</strong></div>
            <div class="meta-ui__profile-card"><span>Access</span><strong>${escapeHtml(model.access.replayPhotoMode.accessLabel)}</strong></div>
          </div>
        </div>

        ${model.hasReplay ? `
          <div class="meta-ui__grid meta-ui__grid--results">
            <section class="meta-ui__section meta-ui__section--wide">
              <div class="meta-ui__section-head">
                <h2>Playback</h2>
                <span>Runtime-only highlight replay. Not saved to profile or Firebase.</span>
              </div>
              <div class="meta-ui__actions">
                <button class="meta-ui__launch" type="button" data-action="replay-control" data-id="toggle-play">${model.playing ? 'Pause' : 'Play'}</button>
                <button class="meta-ui__secondary" type="button" data-action="replay-control" data-id="restart">Restart</button>
                <button class="meta-ui__secondary" type="button" data-action="replay-control" data-id="photo">${model.photoMode ? 'Exit Photo Mode' : 'Photo Mode'}</button>
                <button class="meta-ui__secondary" type="button" data-action="replay-control" data-id="hud">Hide UI</button>
                <button class="meta-ui__secondary" type="button" data-action="replay-capture">Capture Screenshot</button>
                <button class="meta-ui__secondary" type="button" data-action="replay-control" data-id="back-hangar">Back To Hangar</button>
              </div>
              <label class="meta-ui__field">
                <span>Timeline</span>
                <input type="range" min="0" max="${escapeHtml(model.durationMs)}" step="80" value="${escapeHtml(model.timeMs)}" data-replay-range="scrub" />
                <small>${escapeHtml(model.currentLabel)} / ${escapeHtml(model.durationLabel)}</small>
              </label>
            </section>

            <section class="meta-ui__section">
              <div class="meta-ui__section-head">
                <h2>Speed</h2>
                <span>${model.access.full ? 'Full replay speed controls.' : 'Early Access uses 1x playback.'}</span>
              </div>
              <div class="meta-ui__chip-row">
                ${model.speedOptions.map((option) => `
                  <button class="meta-ui__theme-chip ${String(model.speed) === option.id ? 'is-selected' : ''}" type="button" data-action="replay-control" data-id="speed" data-value="${escapeHtml(option.id)}" ${option.locked ? 'disabled' : ''}>${escapeHtml(option.label)}</button>
                `).join('')}
              </div>
            </section>

            <section class="meta-ui__section">
              <div class="meta-ui__section-head">
                <h2>Camera</h2>
                <span>${model.access.full ? 'All camera rigs available.' : 'Chase and orbit camera only.'}</span>
              </div>
              <div class="meta-ui__chip-row">
                ${model.cameraOptions.map((option) => `
                  <button class="meta-ui__theme-chip ${model.cameraMode === option.id ? 'is-selected' : ''}" type="button" data-action="replay-control" data-id="camera" data-value="${escapeHtml(option.id)}" ${option.locked ? 'disabled' : ''}>${escapeHtml(option.label)}</button>
                `).join('')}
              </div>
            </section>

            <section class="meta-ui__section">
              <div class="meta-ui__section-head">
                <h2>Photo Controls</h2>
                <span>Pause, frame, hide UI, then use canvas capture or a device screenshot.</span>
              </div>
              <div class="meta-ui__settings-grid">
                <label class="meta-ui__field"><span>Zoom</span><input type="range" min="0.65" max="1.45" step="0.01" value="${escapeHtml(model.zoom)}" data-replay-range="zoom" /></label>
                <label class="meta-ui__field"><span>Height</span><input type="range" min="-0.5" max="1" step="0.01" value="${escapeHtml(model.height)}" data-replay-range="height" /></label>
                <label class="meta-ui__field"><span>Angle</span><input type="range" min="-3.14" max="3.14" step="0.01" value="${escapeHtml(model.angle)}" data-replay-range="angle" /></label>
                <label class="meta-ui__toggle"><input type="checkbox" data-action="replay-control" data-id="name" ${model.showName ? 'checked' : ''} /><span>Show Pilot Name</span></label>
                <label class="meta-ui__toggle"><input type="checkbox" data-action="replay-control" data-id="overlay" ${model.showOverlay ? 'checked' : ''} /><span>Show Speed/Position Overlay</span></label>
              </div>
            </section>

            ${(model.showName || model.showOverlay) ? `
              <section class="meta-ui__section">
                <div class="meta-ui__section-head">
                  <h2>Replay Overlay</h2>
                  <span>${escapeHtml(model.showName ? 'Names visible' : 'Names hidden')} | ${escapeHtml(model.showOverlay ? 'Telemetry visible' : 'Telemetry hidden')}</span>
                </div>
                <div class="meta-ui__reward-list">
                  ${model.participants.map((participant) => `
                    <div class="meta-ui__reward">
                      <span>${escapeHtml(model.showName ? participant.name : `Pilot ${participant.position || ''}`)}</span>
                      <strong>${escapeHtml(model.showOverlay ? `P${participant.position || '-'} | ${participant.speed} U/S | L${participant.lap}` : 'Hidden')}</strong>
                    </div>
                  `).join('')}
                </div>
              </section>
            ` : ''}

            <section class="meta-ui__section">
              <div class="meta-ui__section-head">
                <h2>Event Markers</h2>
                <span>${model.events.length} captured moments.</span>
              </div>
              <div class="meta-ui__highlight-list">
                ${model.events.length
                  ? model.events.map((event) => `<button class="meta-ui__highlight" type="button" data-action="replay-control" data-id="scrub" data-value="${escapeHtml(event.timeMs)}"><strong>${escapeHtml(event.timeLabel)}</strong> ${escapeHtml(event.label)}</button>`).join('')
                  : '<div class="meta-ui__highlight">No event markers were captured for this run.</div>'
                }
              </div>
            </section>
          </div>
        ` : `
          <section class="meta-ui__section">
            <div class="meta-ui__section-head">
              <h2>No Replay Data</h2>
              <span>Replay frames are runtime-only.</span>
            </div>
            <div class="meta-ui__highlight-list">
              <div class="meta-ui__highlight">Finish an offline race to create the latest replay. Multiplayer replay capture is intentionally not connected.</div>
            </div>
            <div class="meta-ui__actions">
              <button class="meta-ui__secondary" type="button" data-action="replay-control" data-id="back-hangar">Back To Hangar</button>
            </div>
          </section>
        `}
      </div>
    `;

    this.bindActions();
    this.restoreButtonFeedbacks();
  }

  getActionFeedbackLabel(action) {
    return ACTION_FEEDBACK_LABELS[action] ?? '';
  }

  getFormFeedbackLabel(formAction) {
    return FORM_FEEDBACK_LABELS[formAction] ?? '';
  }

  getButtonFeedbackKey(element) {
    if (!element) {
      return '';
    }

    const explicit = element.getAttribute('data-feedback-key');

    if (explicit) {
      return explicit;
    }

    const action = element.getAttribute('data-action') ?? 'button';
    const id = element.getAttribute('data-id') ?? '';
    return `${action}:${id}`;
  }

  clearButtonFeedbackState(element) {
    if (!element) {
      return;
    }

    delete element.dataset.feedback;
    element.classList.remove('is-feedback', 'is-feedback-fading');
  }

  applyButtonFeedbackState(element, feedback, now = Date.now()) {
    if (!element) {
      return;
    }

    if (!feedback || feedback.expiresAt <= now) {
      this.clearButtonFeedbackState(element);
      return;
    }

    element.dataset.feedback = feedback.label;
    element.classList.add('is-feedback');
    element.classList.toggle('is-feedback-fading', feedback.expiresAt - now <= BUTTON_FEEDBACK_FADE_DURATION);
  }

  getButtonsByFeedbackKey(key) {
    if (!key) {
      return [];
    }

    return [...this.root.querySelectorAll('button')]
      .filter((button) => this.getButtonFeedbackKey(button) === key);
  }

  syncButtonFeedback(key) {
    if (!key) {
      return;
    }

    const now = Date.now();
    const feedback = this.buttonFeedbacks.get(key);

    if (feedback && feedback.expiresAt <= now) {
      this.buttonFeedbacks.delete(key);
    }

    const activeFeedback = this.buttonFeedbacks.get(key) ?? null;
    this.getButtonsByFeedbackKey(key).forEach((button) => {
      this.applyButtonFeedbackState(button, activeFeedback, now);
    });
  }

  clearFeedbackGroup(action, activeKey) {
    if (!SINGLE_ACTIVE_FEEDBACK_ACTIONS.has(action)) {
      return;
    }

    for (const key of this.buttonFeedbacks.keys()) {
      if (key === activeKey || !key.startsWith(`${action}:`)) {
        continue;
      }

      const activeTimers = this.buttonFeedbackTimers.get(key);

      if (activeTimers) {
        window.clearTimeout(activeTimers.fadeTimer);
        window.clearTimeout(activeTimers.clearTimer);
        this.buttonFeedbackTimers.delete(key);
      }

      this.buttonFeedbacks.delete(key);
      this.syncButtonFeedback(key);
    }
  }

  scheduleButtonFeedback(key) {
    if (!key) {
      return;
    }

    const activeTimers = this.buttonFeedbackTimers.get(key);

    if (activeTimers) {
      window.clearTimeout(activeTimers.fadeTimer);
      window.clearTimeout(activeTimers.clearTimer);
    }

    const feedback = this.buttonFeedbacks.get(key);

    if (!feedback) {
      this.buttonFeedbackTimers.delete(key);
      return;
    }

    const now = Date.now();
    const fadeDelay = Math.max(0, feedback.expiresAt - now - BUTTON_FEEDBACK_FADE_DURATION);
    const clearDelay = Math.max(0, feedback.expiresAt - now) + 24;
    const fadeTimer = window.setTimeout(() => {
      this.syncButtonFeedback(key);
    }, fadeDelay);
    const clearTimer = window.setTimeout(() => {
      this.buttonFeedbacks.delete(key);
      this.syncButtonFeedback(key);
      this.buttonFeedbackTimers.delete(key);
    }, clearDelay);

    this.buttonFeedbackTimers.set(key, { fadeTimer, clearTimer });
  }

  flashButtonFeedback(element, label) {
    if (!element || !label) {
      return;
    }

    const key = this.getButtonFeedbackKey(element);

    if (!key) {
      return;
    }

    const action = element.getAttribute('data-action') ?? '';
    this.clearFeedbackGroup(action, key);

    const expiresAt = Date.now() + BUTTON_FEEDBACK_DURATION;
    this.buttonFeedbacks.set(key, { label, expiresAt });
    this.syncButtonFeedback(key);
    this.scheduleButtonFeedback(key);
  }

  restoreButtonFeedbacks() {
    const now = Date.now();

    for (const [key, feedback] of this.buttonFeedbacks.entries()) {
      if (feedback.expiresAt <= now) {
        this.buttonFeedbacks.delete(key);
      }
    }

    this.root.querySelectorAll('button').forEach((button) => {
      const key = this.getButtonFeedbackKey(button);
      const feedback = key ? this.buttonFeedbacks.get(key) : null;
      this.applyButtonFeedbackState(button, feedback, now);
    });
  }

  bindActions() {
    this.root.querySelectorAll('[data-action]').forEach((element) => {
      element.addEventListener('click', () => {
        const action = element.getAttribute('data-action');
        const id = element.getAttribute('data-id');
        const feedbackLabel = this.getActionFeedbackLabel(action);

        if (action === 'hangar-page') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.hangarPage = id || 'career';
          if (this.lastHangarModel) {
            this.showHangar(this.lastHangarModel);
          }
          this.handlers.onHangarPageChange?.(this.hangarPage);
        } else if (action === 'preview-ship') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onShipPreview?.(id);
        } else if (action === 'track') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onTrackSelect(id);
        } else if (action === 'ship') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onShipSelect(id);
        } else if (action === 'buy-ship') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onShipPurchase(id);
        } else if (action === 'hull' || action === 'glow' || action === 'trail') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onCosmeticSelect(action, id);
        } else if (action === 'start-race') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onStartRace();
        } else if (action === 'start-time-trial') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onStartTimeTrial();
        } else if (action === 'race-again') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onRaceAgain();
        } else if (action === 'back-hangar') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onBackToHangar();
        } else if (action === 'result-action') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onResultAction?.(id);
        } else if (action === 'theme') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onThemeChange(id);
        } else if (action === 'google-login') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onGoogleLogin();
        } else if (action === 'logout') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onLogout?.();
        } else if (action === 'copy-id') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onCopyIdentity(id, 'ID');
        } else if (action === 'copy-link') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onCopyIdentity(id, 'Invite link');
        } else if (action === 'copy-code') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onCopyIdentity(id, 'Room code');
        } else if (action === 'copy-result') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onCopyIdentity(id, 'Result text');
        } else if (action === 'quick-match') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onQuickMatch();
        } else if (action === 'private-create') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onCreatePrivateRoom();
        } else if (action === 'room-ready') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onToggleReady?.();
        } else if (action === 'room-start') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onStartPrivateRoom();
        } else if (action === 'room-host') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onTransferHost?.(id);
        } else if (action === 'room-rematch') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onRoomRematch?.();
        } else if (action === 'room-kick') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onKickRoomPlayer(id);
        } else if (action === 'room-discard') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onDiscardRoom();
        } else if (action === 'room-leave') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onLeaveRoom();
        } else if (action === 'emote') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onSendEmote(id);
        } else if (action === 'resume-race') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onResumeRace?.();
        } else if (action === 'restart-race') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onRestartRace?.();
        } else if (action === 'premium-purchase') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onPremiumPurchase?.(id);
        } else if (action === 'premium-refresh') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onRefreshEntitlement?.();
        } else if (action === 'premium-preview') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onPremiumPreview?.(id);
        } else if (action === 'campaign-select') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onCampaignSelect?.(id);
        } else if (action === 'campaign-start') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onCampaignStart?.(id, element.getAttribute('data-race-id') ?? '');
        } else if (action === 'tournament-select') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onTournamentSelect?.(id);
        } else if (action === 'tournament-start') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onTournamentStart?.(id);
        } else if (action === 'tournament-continue') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onTournamentContinue?.();
        } else if (action === 'private-tournament-create') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onCreatePrivateTournament?.(Number(id), true);
        } else if (action === 'private-tournament-ready') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onPrivateTournamentReady?.();
        } else if (action === 'private-tournament-start') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onStartPrivateTournament?.();
        } else if (action === 'private-tournament-next') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onStartNextPrivateTournament?.();
        } else if (action === 'private-tournament-rematch') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onPrivateTournamentRematch?.();
        } else if (action === 'custom-race-start') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onCustomRaceStart?.();
        } else if (action === 'custom-race-randomize') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onCustomRaceRandomize?.();
        } else if (action === 'custom-race-save') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onCustomRaceSavePreset?.();
        } else if (action === 'custom-race-load') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onCustomRaceLoadPreset?.(id);
        } else if (action === 'custom-race-delete') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onCustomRaceDeletePreset?.(id);
        } else if (action === 'custom-race-export-code') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onCustomRaceExportCode?.();
        } else if (action === 'custom-race-copy-code') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onCustomRaceCopyCode?.();
        } else if (action === 'custom-race-validate-code') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onCustomRaceValidateCode?.();
        } else if (action === 'custom-race-import-code') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onCustomRaceImportCode?.(false);
        } else if (action === 'custom-race-save-imported') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onCustomRaceImportCode?.(true);
        } else if (action === 'ranked-start') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onRankedStart?.();
        } else if (action === 'ranked-cancel') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onRankedCancel?.();
        } else if (action === 'live-event-start') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onLiveEventStart?.(id);
        } else if (action === 'boss-select') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onBossSelect?.(id);
        } else if (action === 'boss-start') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onBossStart?.(id);
        } else if (action === 'showcase-control') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onShowcaseControl?.(id);
        } else if (action === 'favorite-ship') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onFavoriteShip?.(id);
        } else if (action === 'replay-control') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onReplayControl?.(id, element.getAttribute('data-value') ?? '');
        } else if (action === 'replay-capture') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onReplayCapture?.();
        } else if (action === 'reward-equip') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onEquipRewardBadge?.(id);
        } else if (action === 'advanced-category') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onAdvancedGarageCategory?.(id);
        } else if (action === 'advanced-filter') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onAdvancedGarageFilter?.(id);
        } else if (action === 'advanced-rarity') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onAdvancedGarageRarity?.(id);
        } else if (action === 'advanced-preview') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onAdvancedCosmeticPreview?.(id);
        } else if (action === 'advanced-apply') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onAdvancedCosmeticApply?.(id);
        } else if (action === 'advanced-reset-preview') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onAdvancedCosmeticResetPreview?.();
        } else if (action === 'upgrade-module') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onUpgradeModule?.(id);
        } else if (action === 'reset-upgrades') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onResetShipUpgrades?.();
        } else if (action === 'demo-edition-clear') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onDemoEditionClear?.();
        } else if (action === 'rebind') {
          this.flashButtonFeedback(element, feedbackLabel);
          this.handlers.onStartRebind?.(id);
        }
      });
    });

    const nameForm = this.root.querySelector('[data-action="save-name"]');

    if (nameForm) {
      nameForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const input = this.root.querySelector('#pilot-name');
        const submitButton = nameForm.querySelector('button[type="submit"]');
        this.flashButtonFeedback(submitButton, this.getFormFeedbackLabel('save-name'));
        this.handlers.onPlayerNameChange(input?.value ?? '');
      });
    }

    const joinRoomForm = this.root.querySelector('[data-action-form="join-room"]');

    if (joinRoomForm) {
      joinRoomForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const input = this.root.querySelector('#private-room-code');
        const submitButton = joinRoomForm.querySelector('button[type="submit"]');
        this.flashButtonFeedback(submitButton, this.getFormFeedbackLabel('join-room'));
        this.handlers.onJoinPrivateRoom(input?.value ?? '');
      });
    }

    const joinTournamentForm = this.root.querySelector('[data-action-form="join-private-tournament"]');

    if (joinTournamentForm) {
      joinTournamentForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const input = this.root.querySelector('#private-tournament-code');
        const submitButton = joinTournamentForm.querySelector('button[type="submit"]');
        this.flashButtonFeedback(submitButton, 'Joining');
        this.handlers.onJoinPrivateTournament?.(input?.value ?? '');
      });
    }

    const numberPlateForm = this.root.querySelector('[data-action-form="number-plate"]');

    if (numberPlateForm) {
      numberPlateForm.addEventListener('submit', (event) => {
        event.preventDefault();
        this.handlers.onNumberPlateChange?.({
          digits: numberPlateForm.querySelector('[name="digits"]')?.value ?? '',
          tag: numberPlateForm.querySelector('[name="tag"]')?.value ?? ''
        });
      });
    }

    this.root.querySelectorAll('[data-audio-range]').forEach((input) => {
      input.addEventListener('change', () => {
        this.handlers.onAudioSettingsChange?.({
          [input.getAttribute('data-audio-range')]: Number(input.value)
        });
      });
    });

    this.root.querySelectorAll('[data-audio-toggle]').forEach((input) => {
      input.addEventListener('change', () => {
        this.handlers.onAudioSettingsChange?.({
          [input.getAttribute('data-audio-toggle')]: Boolean(input.checked)
        });
      });
    });

    this.root.querySelectorAll('[data-graphics-toggle]').forEach((input) => {
      input.addEventListener('change', () => {
        this.handlers.onGraphicsSettingsChange?.({
          [input.getAttribute('data-graphics-toggle')]: Boolean(input.checked)
        });
      });
    });

    this.root.querySelectorAll('[data-graphics-select]').forEach((input) => {
      input.addEventListener('change', () => {
        this.handlers.onGraphicsSettingsChange?.({
          [input.getAttribute('data-graphics-select')]: input.value
        });
      });
    });

    this.root.querySelectorAll('[data-gameplay-select]').forEach((input) => {
      input.addEventListener('change', () => {
        this.handlers.onDifficultyChange?.(input.value);
      });
    });

    this.root.querySelectorAll('[data-gameplay-toggle="tutorial"]').forEach((input) => {
      input.addEventListener('change', () => {
        this.handlers.onToggleTutorialSeen?.();
      });
    });

    this.root.querySelectorAll('[data-demo-edition-select]').forEach((input) => {
      input.addEventListener('change', () => {
        this.handlers.onDemoEditionChange?.(input.value);
      });
    });

    this.root.querySelectorAll('[data-custom-race-field]').forEach((input) => {
      input.addEventListener('change', () => {
        const field = input.getAttribute('data-custom-race-field');
        const value = input.type === 'checkbox' ? input.checked : input.value;
        this.handlers.onCustomRaceUpdate?.(field, value);
      });
    });

    this.root.querySelectorAll('[data-custom-race-code]').forEach((input) => {
      input.addEventListener('input', () => {
        this.handlers.onCustomRaceImportCodeChange?.(input.value);
      });
      input.addEventListener('change', () => {
        this.handlers.onCustomRaceImportCodeChange?.(input.value);
      });
    });

    this.root.querySelectorAll('[data-replay-range]').forEach((input) => {
      input.addEventListener('input', () => {
        this.handlers.onReplayControl?.(input.getAttribute('data-replay-range'), input.value);
      });
      input.addEventListener('change', () => {
        this.handlers.onReplayControl?.(input.getAttribute('data-replay-range'), input.value);
      });
    });
  }
}
