// Speak — shared language pill + translation engine for sub-pages
(function () {
  var PILL_CSS =
    '.lang-pill-nav{display:flex;background:var(--surface,#1a1a1e);border:1.5px solid var(--border,#2e2e34);border-radius:20px;overflow:hidden;flex-shrink:0;}' +
    '.lp-btn{padding:5px 12px;border:none;background:transparent;color:var(--text-dim,#666672);font-size:.72rem;font-weight:800;letter-spacing:.06em;cursor:pointer;transition:background .15s,color .15s;}' +
    '.lp-btn.lp-active{background:var(--gold,#2563c4);color:#fff;border-radius:18px;}';
  var s = document.createElement('style');
  s.textContent = PILL_CSS;
  document.head.appendChild(s);

  var saved = localStorage.getItem('aac_lang') || 'en';

  // Inject pill into nav-right if not already present (index.html has its own)
  var navRight = document.querySelector('.nav-right');
  if (navRight && !document.querySelector('.lang-pill-nav')) {
    var pill = document.createElement('div');
    pill.className = 'lang-pill-nav';
    pill.innerHTML =
      '<button class="lp-btn' + (saved === 'en' ? ' lp-active' : '') + '" data-lang="en">EN</button>' +
      '<button class="lp-btn' + (saved === 'es' ? ' lp-active' : '') + '" data-lang="es">ES</button>';
    var openBtn = navRight.querySelector('.btn-nav');
    if (openBtn) navRight.insertBefore(pill, openBtn);
    else navRight.appendChild(pill);
    pill.querySelectorAll('.lp-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        localStorage.setItem('aac_lang', btn.dataset.lang);
        window.location.reload();
      });
    });
  }

  if (saved !== 'es') return;

  document.documentElement.lang = 'es';

  // Nav link translations — same across all sub-pages
  var navLabels = ['Características', 'Precios', 'Seguridad', 'Misión', 'Guía', 'Para Clínicas'];
  document.querySelectorAll('nav .nav-link').forEach(function (a, i) {
    if (navLabels[i]) a.textContent = navLabels[i];
  });
  var cta = document.querySelector('nav .btn-nav');
  if (cta) cta.textContent = 'Abrir App →';
  var mlinks = document.querySelectorAll('#nav-mobile a:not(.nav-cta-mobile)');
  var mlabels = ['Inicio', 'Características', 'Precios', 'Seguridad', 'Misión', 'Guía', 'Para Clínicas'];
  mlinks.forEach(function (a, i) { if (mlabels[i]) a.textContent = mlabels[i]; });
  var mcta = document.querySelector('#nav-mobile .nav-cta-mobile');
  if (mcta) mcta.textContent = 'Abrir App →';

  // Footer link map
  var FM = {
    'Home': 'Inicio', 'Open App': 'Abrir App', 'Install Guide': 'Guía de Instalación',
    'User Guide': 'Guía de Usuario', 'For Clinics': 'Para Clínicas', 'Mission': 'Misión',
    'Guide': 'Guía', 'Privacy': 'Privacidad', 'Terms': 'Términos',
    'Dashboard Demo': 'Demo del Panel', 'GoFundMe': 'GoFundMe',
  };
  document.querySelectorAll('footer .footer-link').forEach(function (a) {
    var mapped = FM[a.textContent.trim()]; if (mapped) a.textContent = mapped;
  });

  // Cookie bar
  var cbar = document.getElementById('cookie-bar');
  if (cbar) {
    var cspan = cbar.querySelector('span');
    if (cspan) cspan.innerHTML = 'Usamos análisis para entender cómo las personas encuentran Speak y mejorar la experiencia. No se venden datos personales. <a href="privacy.html" style="color:var(--gold);">Política de privacidad</a>';
    var cbtns = cbar.querySelectorAll('button');
    if (cbtns[0]) cbtns[0].textContent = 'Aceptar';
    if (cbtns[1]) cbtns[1].textContent = 'Rechazar';
  }

  // Apply per-page translations from window.SPEAK_ES_PAGE
  var T = window.SPEAK_ES_PAGE;
  if (!T) return;

  if (T.title) document.title = T.title;
  var ew = document.querySelector('.eyebrow');
  if (ew && T.eyebrow) ew.textContent = T.eyebrow;
  var h1 = document.querySelector('h1');
  if (h1 && T.h1) h1.innerHTML = T.h1;
  var lead = document.querySelector('.lead');
  if (lead && T.lead) lead.innerHTML = T.lead;

  if (T.sections) {
    Object.keys(T.sections).forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el) el.innerHTML = T.sections[sel];
    });
  }
}());
