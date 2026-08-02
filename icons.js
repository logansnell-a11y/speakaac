// icons.js — Speak AAC inline SVG icon set
// ─────────────────────────────────────────────────────────────────────
// Replaces the emoji previously used as decorative icons on the
// marketing, clinic and provider pages. Emoji render differently on
// every platform, carry a tone that reads badly to a school or clinic
// buyer, and are announced literally by screen readers.
//
// NOT used for the AAC symbol grid. Those emoji in symbols.js and
// mulberry.js are communication content — the fallback glyph a
// non-reading user taps to speak — and must stay.
//
// Usage:  <span class="icon" data-icon="shield"></span>
// Sizing: inherits font-size via width/height 1em; colour via currentColor.
// ─────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  const S = 'stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"';

  const ICONS = {
    // ── product / feature ────────────────────────────────────────────
    zap:        `<path ${S} d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>`,
    monitor:    `<rect ${S} x="2" y="3" width="20" height="14" rx="2"/><path ${S} d="M8 21h8M12 17v4"/>`,
    chart:      `<path ${S} d="M3 3v18h18"/><path ${S} d="M7 15v-4M12 15V7M17 15v-6"/>`,
    trending:   `<path ${S} d="M3 17l6-6 4 4 8-8"/><path ${S} d="M17 7h4v4"/>`,
    lock:       `<rect ${S} x="4" y="10" width="16" height="11" rx="2"/><path ${S} d="M8 10V7a4 4 0 0 1 8 0v3"/>`,
    cpu:        `<rect ${S} x="5" y="5" width="14" height="14" rx="2"/><rect ${S} x="9" y="9" width="6" height="6"/><path ${S} d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>`,
    clipboard:  `<rect ${S} x="5" y="4" width="14" height="17" rx="2"/><path ${S} d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path ${S} d="M9 11h6M9 15h4"/>`,
    file:       `<path ${S} d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5Z"/><path ${S} d="M14 2v5h5"/>`,
    folder:     `<path ${S} d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>`,
    sparkle:    `<path ${S} d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/><path ${S} d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z"/>`,
    printer:    `<path ${S} d="M6 9V3h12v6"/><rect ${S} x="3" y="9" width="18" height="8" rx="2"/><path ${S} d="M6 15h12v6H6z"/>`,
    download:   `<path ${S} d="M12 3v12"/><path ${S} d="M7 11l5 5 5-5"/><path ${S} d="M4 20h16"/>`,

    // ── devices ──────────────────────────────────────────────────────
    tablet:     `<rect ${S} x="5" y="2" width="14" height="20" rx="2"/><path ${S} d="M11 18h2"/>`,
    phone:      `<rect ${S} x="7" y="2" width="10" height="20" rx="2"/><path ${S} d="M11 18h2"/>`,
    laptop:     `<rect ${S} x="4" y="4" width="16" height="11" rx="2"/><path ${S} d="M2 19h20"/>`,
    wifi:       `<path ${S} d="M2 8a16 16 0 0 1 20 0"/><path ${S} d="M5 12a11 11 0 0 1 14 0"/><path ${S} d="M8.5 15.5a6 6 0 0 1 7 0"/><path ${S} d="M12 19h.01"/>`,
    'wifi-off': `<path ${S} d="M2 8a16 16 0 0 1 6-3.8"/><path ${S} d="M12.5 4.1A16 16 0 0 1 22 8"/><path ${S} d="M8.5 15.5a6 6 0 0 1 7 0"/><path ${S} d="M12 19h.01"/><path ${S} d="M2 2l20 20"/>`,
    camera:     `<path ${S} d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z"/><circle ${S} cx="12" cy="13" r="3.5"/>`,
    volume:     `<path ${S} d="M5 9v6h4l5 4V5L9 9H5Z"/><path ${S} d="M17 9a4 4 0 0 1 0 6"/>`,

    // ── people / places ──────────────────────────────────────────────
    user:       `<circle ${S} cx="12" cy="8" r="4"/><path ${S} d="M4 21a8 8 0 0 1 16 0"/>`,
    users:      `<circle ${S} cx="9" cy="8" r="3.5"/><path ${S} d="M2 21a7 7 0 0 1 14 0"/><path ${S} d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path ${S} d="M18 21a7 7 0 0 0-3-5.7"/>`,
    school:     `<path ${S} d="M3 21V10l9-6 9 6v11"/><path ${S} d="M9 21v-6h6v6"/>`,
    hospital:   `<rect ${S} x="4" y="3" width="16" height="18" rx="2"/><path ${S} d="M12 8v6M9 11h6"/>`,
    stethoscope:`<path ${S} d="M6 3v5a4 4 0 0 0 8 0V3"/><path ${S} d="M10 12v3a5 5 0 0 0 10 0v-2"/><circle ${S} cx="20" cy="11" r="2"/>`,
    home:       `<path ${S} d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z"/>`,

    // ── communication / status ───────────────────────────────────────
    message:    `<path ${S} d="M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1Z"/>`,
    speech:     `<path ${S} d="M4 4h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1Z"/><path ${S} d="M8 8h8M8 11h5"/>`,
    calendar:   `<rect ${S} x="3" y="5" width="18" height="16" rx="2"/><path ${S} d="M3 10h18M8 3v4M16 3v4"/>`,
    bell:       `<path ${S} d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7"/><path ${S} d="M10.5 21a2 2 0 0 0 3 0"/>`,
    alert:      `<path ${S} d="M12 3 2.5 20h19L12 3Z"/><path ${S} d="M12 9v5M12 17h.01"/>`,
    siren:      `<path ${S} d="M6 18v-5a6 6 0 0 1 12 0v5"/><path ${S} d="M3 21h18"/><path ${S} d="M12 3V1M4 6 2.5 4.5M20 6l1.5-1.5"/>`,
    shield:     `<path ${S} d="M12 2.5 4 6v6c0 5 3.4 8.6 8 9.5 4.6-.9 8-4.5 8-9.5V6l-8-3.5Z"/>`,
    lifebuoy:   `<circle ${S} cx="12" cy="12" r="9"/><circle ${S} cx="12" cy="12" r="3.5"/><path ${S} d="m5.6 5.6 3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9"/>`,
    heart:      `<path ${S} d="M12 20s-7-4.4-7-9.3A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 7 2.7C19 15.6 12 20 12 20Z"/>`,
    handshake:  `<path ${S} d="M8 12 5 9l4-4 3 2 3-2 4 4-3 3"/><path ${S} d="m12 14 2 2 2-2 2 2"/><path ${S} d="M4 12v4l5 4 3-3"/>`,
    hand:       `<path ${S} d="M9 11V4.5a1.5 1.5 0 0 1 3 0V11"/><path ${S} d="M12 11V3.5a1.5 1.5 0 0 1 3 0V11"/><path ${S} d="M15 11V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a6 6 0 0 1-6-6v-3a1.5 1.5 0 0 1 3 0"/>`,
    'phone-call':`<path ${S} d="M5 3h3.5l1.8 4.4-2.2 1.3a12 12 0 0 0 5.2 5.2l1.3-2.2L19 13.5V17a2 2 0 0 1-2.2 2A16 16 0 0 1 3 5.2 2 2 0 0 1 5 3Z"/>`,
    check:      `<circle ${S} cx="12" cy="12" r="9"/><path ${S} d="m8 12 3 3 5-6"/>`,
    'eye-off':  `<path ${S} d="M3 12s3.6-6 9-6c1.5 0 2.8.4 4 1"/><path ${S} d="M20.5 9.5A13 13 0 0 1 21 12s-3.6 6-9 6c-1.9 0-3.5-.6-4.8-1.5"/><path ${S} d="M2 2l20 20"/><path ${S} d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>`,
    flame:      `<path ${S} d="M12 22a6 6 0 0 0 6-6c0-4-3-5-3-9 0 0-3 2-3 5 0-2-2-3-2-3s-4 3-4 7a6 6 0 0 0 6 6Z"/>`,
    tool:       `<path ${S} d="M15 7a4 4 0 0 1 5 5l-8.5 8.5a2.1 2.1 0 0 1-3-3L17 9"/><path ${S} d="M9 4 4 9l3 3 5-5-3-3Z"/>`,
    settings:   `<circle ${S} cx="12" cy="12" r="3"/><path ${S} d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1 2 2 0 1 1-4 0 1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15a2 2 0 1 1 0-4 1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 5.6a2 2 0 1 1 4 0 1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 19.4 12a2 2 0 1 1 0 4Z"/>`,
    book:       `<path ${S} d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22V4.5Z"/><path ${S} d="M4 17.5h16"/>`,
  };

  // Solid status dots — used where the emoji was a coloured circle.
  const DOTS = {
    'dot-red':    '#e05555', 'dot-green': '#3aa86b', 'dot-amber': '#d99a2b',
    'dot-grey':   '#8b8b96', 'dot-blue':  '#3b7dd8', 'dot-purple': '#8257d9',
    'dot-orange': '#d97a2b',
  };

  function svg(body, extra) {
    return `<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false"${extra || ''}>${body}</svg>`;
  }

  function markup(name) {
    if (ICONS[name]) return svg(ICONS[name]);
    if (DOTS[name])  return svg(`<circle cx="12" cy="12" r="7" fill="${DOTS[name]}"/>`);
    return '';
  }

  function hydrate(root) {
    (root || document).querySelectorAll('[data-icon]:not([data-icon-done])').forEach(el => {
      const html = markup(el.getAttribute('data-icon'));
      if (!html) return;
      el.innerHTML = html;
      el.setAttribute('data-icon-done', '');
      // Decorative by default. Pages that need a label set data-icon-label.
      if (!el.hasAttribute('data-icon-label')) el.setAttribute('aria-hidden', 'true');
      else el.setAttribute('aria-label', el.getAttribute('data-icon-label'));
    });
  }

  // Minimal alignment CSS, injected here so pages need no style changes.
  // The SVG is 1em square, so existing font-size rules on the old emoji
  // slots (.benefit-icon, .stat-icon, …) keep controlling the size.
  const css = document.createElement('style');
  css.textContent =
    '[data-icon]{display:inline-flex;align-items:center;justify-content:center;' +
    'line-height:1;vertical-align:-0.125em}' +
    '[data-icon] svg{display:block}';
  (document.head || document.documentElement).appendChild(css);

  window.SpeakIcons = { hydrate, markup, names: Object.keys(ICONS) };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => hydrate());
  } else {
    hydrate();
  }

  // The i18n layer swaps innerHTML on language change, which drops the
  // hydrated SVG. Re-hydrate whatever gets inserted.
  new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1) {
          if (n.hasAttribute && n.hasAttribute('data-icon')) hydrate(n.parentNode || document);
          else if (n.querySelector && n.querySelector('[data-icon]')) hydrate(n);
        }
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
