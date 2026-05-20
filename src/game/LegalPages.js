import { LEGAL_CONTACT, LEGAL_LINKS, getLegalPage } from './legalContent.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderLegalNav(activeRoute) {
  return `
    <nav class="meta-ui__legal-nav" aria-label="Legal pages">
      ${LEGAL_LINKS.map((link) => `
        <a class="meta-ui__legal-link ${link.route === activeRoute ? 'is-selected' : ''}" href="${escapeHtml(link.route)}">
          ${escapeHtml(link.label)}
        </a>
      `).join('')}
    </nav>
  `;
}

function renderLegalSections(sections) {
  return sections.map((section) => `
    <section class="meta-ui__legal-section">
      <h2>${escapeHtml(section.heading)}</h2>
      <ul>
        ${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    </section>
  `).join('');
}

export function renderLegalRoute(container, pathname = window.location.pathname) {
  const page = getLegalPage(pathname);
  if (!page || !container) {
    return false;
  }

  const route = LEGAL_LINKS.find((link) => getLegalPage(link.route) === page)?.route ?? pathname;
  document.title = `${page.title} | ${LEGAL_CONTACT.productName}`;

  container.innerHTML = `
    <div class="meta-ui meta-ui--legal">
      <div class="meta-ui__panel meta-ui__panel--legal">
        <header class="meta-ui__header meta-ui__header--legal">
          <div>
            <div class="meta-ui__eyebrow">${escapeHtml(page.eyebrow)}</div>
            <h1 class="meta-ui__title">${escapeHtml(page.title)}</h1>
            <p class="meta-ui__copy">${escapeHtml(page.summary)}</p>
            <div class="meta-ui__header-pilot">
              <strong>${escapeHtml(LEGAL_CONTACT.brandName)}</strong>
              <span>Last updated: ${escapeHtml(LEGAL_CONTACT.lastUpdated)}</span>
            </div>
          </div>
          <div class="meta-ui__profile meta-ui__profile--legal">
            <div class="meta-ui__profile-card">
              <span>Product</span>
              <strong>${escapeHtml(LEGAL_CONTACT.productName)}</strong>
              <small>Digital access passes only</small>
            </div>
            <div class="meta-ui__profile-card">
              <span>Support</span>
              <strong>${escapeHtml(LEGAL_CONTACT.supportEmail)}</strong>
              <small>${escapeHtml(LEGAL_CONTACT.businessName)} | ${escapeHtml(LEGAL_CONTACT.country)}</small>
            </div>
            <a class="meta-ui__secondary meta-ui__legal-home" href="/">Back To Game</a>
          </div>
        </header>

        ${renderLegalNav(route)}

        <main class="meta-ui__legal-document">
          ${renderLegalSections(page.sections)}
          <section class="meta-ui__legal-section meta-ui__legal-section--contact">
            <h2>Need Help?</h2>
            <p>Email <a href="mailto:${escapeHtml(LEGAL_CONTACT.supportEmail)}">${escapeHtml(LEGAL_CONTACT.supportEmail)}</a> for payment, account, refund, premium pass, or game support.</p>
          </section>
        </main>
      </div>
    </div>
  `;

  return true;
}
