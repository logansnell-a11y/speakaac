// ── dashboard.js ───────────────────────────────────────────────────
// Provider dashboard — event logging, analytics, communication history

// ── Event log storage ──────────────────────────────────────────────
// Must match HISTORY_KEY in app.js so the provider dashboard reads real event data
const EVENTS_KEY = 'aac_history_v1';

function getEvents() {
  try { return JSON.parse(localStorage.getItem(EVENTS_KEY)) || []; }
  catch { return []; }
}

// ── Helpers ────────────────────────────────────────────────────────
// app.js stores dateStr as toLocaleDateString() — match that format here
function todayStr() {
  return new Date().toLocaleDateString();
}

function yesterdayStr() {
  return new Date(Date.now() - 86400000).toLocaleDateString();
}

// app.js stores ts as ISO string — convert for numeric comparisons
function tsToMs(ts) {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  return new Date(ts).getTime();
}

function formatDate(dateStr) {
  if (dateStr === todayStr())     return 'Today';
  if (dateStr === yesterdayStr()) return 'Yesterday';
  // dateStr is a locale string like "3/10/2026" — parse it and reformat nicely
  const d = new Date(dateStr);
  if (!isNaN(d)) return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return dateStr;
}

// Category glyphs for the chart legend. These mirror the .cat-emoji symbols
// the user actually sees in the grid, so they stay as emoji deliberately —
// they are wayfinding for a non-reading user, not decoration.
const CAT_EMOJI = {
  needs: '🙌', feelings: '💛', people: '👤',
  places: '🏠', actions: '🚶', food: '🍎', social: '👋',
};

const DB_REASON_TEXT = {
  scared:         'Someone is making me feel scared',
  hurting:        'Someone is hurting me',
  talk:           'I want to talk to someone I trust',
  unsafe:         'Something bad is happening',
  unsure:         "I'm not sure — I just need help",
  hidden_trigger: 'Hidden symbol sequence (distress + help)',
};

// ── Open dashboard ─────────────────────────────────────────────────
function openDashboard() {
  const settings  = loadSettings();
  const events    = getEvents();
  const today     = todayStr();
  const weekAgo   = Date.now() - 7 * 24 * 60 * 60 * 1000;

  document.getElementById('db-user-name').textContent =
    (settings.userName || 'User') + "'s Dashboard";

  // ── Stat: today's interactions
  const todayCount = events.filter(e =>
    e.dateStr === today && (e.type === 'symbol' || e.type === 'sentence_spoken' || e.type === 'ai_sentence')
  ).length;
  document.getElementById('db-today-count').textContent = todayCount;

  // ── Stat: alerts this week (ts is ISO string from app.js)
  const weekAlerts = events.filter(e => e.type === 'help_alert' && tsToMs(e.ts) > weekAgo);
  const alertValEl = document.getElementById('db-week-alerts');
  alertValEl.textContent = weekAlerts.length;
  alertValEl.closest('.db-stat-card').classList.toggle('db-stat-alert', weekAlerts.length > 0);

  // ── Stat: top symbol
  const symCounts = {};
  events.filter(e => e.type === 'symbol').forEach(e => {
    const lbl = e.payload?.label;
    if (lbl) symCounts[lbl] = (symCounts[lbl] || 0) + 1;
  });
  const topSym = Object.entries(symCounts).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('db-top-symbol').textContent = topSym ? topSym[0] : '—';

  // ── Stat: active day streak — sort events by ts descending, count consecutive days
  const daySet = new Map();
  events.forEach(e => {
    const key = new Date(tsToMs(e.ts)).toLocaleDateString();
    if (!daySet.has(key)) daySet.set(key, tsToMs(e.ts));
  });
  const sortedDays = [...daySet.entries()].sort((a, b) => b[1] - a[1]);
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(23, 59, 59, 999);
  for (const [dayLabel] of sortedDays) {
    const dayStart = new Date(cursor); dayStart.setHours(0, 0, 0, 0);
    const dayMs = new Date(daySet.get(dayLabel));
    if (dayMs >= dayStart && dayMs <= cursor) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
      cursor.setHours(23, 59, 59, 999);
    } else if (dayMs < dayStart) {
      break;
    }
  }
  document.getElementById('db-streak').textContent = streak + (streak === 1 ? ' day' : ' days');

  // ── Sections
  renderAlerts(events.filter(e => e.type === 'help_alert').reverse().slice(0, 10));
  renderRecentComms(
    events.filter(e => e.type === 'ai_sentence' || e.type === 'sentence_spoken')
      .reverse().slice(0, 12)
  );
  renderBarChart('db-symbols-chart',    symCounts, 8, false);
  const catCounts = {};
  events.filter(e => e.type === 'symbol').forEach(e => {
    catCounts[e.payload.category] = (catCounts[e.payload.category] || 0) + 1;
  });
  renderBarChart('db-categories-chart', catCounts, 7, true);

  document.getElementById('dashboard-modal').classList.remove('hidden');
}

// ── Incident report formatter ───────────────────────────────────────
let _alertReportCache = [];

function formatIncidentReport(a) {
  const p = a.payload || {};
  const reasonText = p.reason_label || DB_REASON_TEXT[p.reason] || p.reason || 'Help requested';
  const method = (p.method === 'symbol_sequence' || p.reason === 'hidden_trigger') ? 'hidden trigger' : 'help button';
  return [
    'SPEAK SAFETY INCIDENT REPORT',
    '─────────────────────────────',
    `Date/Time:  ${a.timeStr || ''} on ${a.dateStr || ''}`,
    `User:       ${p.user_name || 'Unknown'}`,
    `Reason:     ${reasonText}`,
    `Message:    ${p.message_at_time || '(none)'}`,
    `Alert sent: ${p.alert_sent_to || '(no contact configured)'}`,
    `Triggered:  via ${method}`,
    '─────────────────────────────',
    'Generated by Speak AAC · speakaac.org',
  ].join('\n');
}

function copyIncidentReport(idx) {
  const text = _alertReportCache[idx];
  if (!text) return;
  navigator.clipboard.writeText(text)
    .then(() => showToast('Report copied', 'success', 2000))
    .catch(() => showToast('Copy failed — paste manually', 'error', 3000));
}

// ── Render: alerts ─────────────────────────────────────────────────
function renderAlerts(alerts) {
  const el = document.getElementById('db-alerts-list');

  // The private safety channel is not reportable here, by design. This
  // dashboard runs on the device, under the caretaker's account — if the
  // caretaker is the person being reported, listing alerts here hands them
  // the report. Alerts go to the trusted contact; the incident record is
  // readable institution-side only.
  el.innerHTML =
    '<p class="db-empty">Private safety alerts are delivered directly to the ' +
    'designated trusted contact and are not shown on this device. Contact your ' +
    'school or clinic administrator for incident records.</p>';
}

// ── Render: recent communications ──────────────────────────────────
function renderRecentComms(comms) {
  const el = document.getElementById('db-recent-list');
  if (!comms.length) {
    el.innerHTML = '<p class="db-empty">No communications logged yet. Start using the app to see history here.</p>';
    return;
  }
  el.innerHTML = comms.map(c => {
    const isAI = c.type === 'ai_sentence';
    const text = isAI ? (c.payload?.output || '') : (c.payload?.text || '');
    const safeText = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    return `
      <div class="db-comm-row">
        <div class="db-comm-left">${isAI ? '<span class="db-ai-tag icon" data-icon="sparkle"></span>' : '<span class="db-sym-tag">▶</span>'}</div>
        <div class="db-comm-body">
          <div class="db-comm-text">"${safeText}"</div>
          <div class="db-comm-meta">${c.timeStr || ''} · ${formatDate(c.dateStr || '')}</div>
        </div>
      </div>`;
  }).join('');
}

// ── Render: bar chart (symbols or categories) ──────────────────────
function renderBarChart(containerId, counts, maxItems, isCat) {
  const el     = document.getElementById(containerId);
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, maxItems);
  if (!sorted.length) {
    el.innerHTML = '<p class="db-empty">No data yet.</p>';
    return;
  }
  const max   = sorted[0][1];
  const total = sorted.reduce((s, [, v]) => s + v, 0);
  el.innerHTML = sorted.map(([key, count]) => {
    const label = isCat ? `${CAT_EMOJI[key] || ''} ${key}` : key;
    const pct   = Math.round(count / max * 100);
    const share = Math.round(count / total * 100);
    return `
      <div class="db-bar-row">
        <div class="db-bar-label">${label}</div>
        <div class="db-bar-track">
          <div class="db-bar-fill ${isCat ? 'db-bar-cat' : ''}" style="width:${pct}%"></div>
        </div>
        <div class="db-bar-count">${isCat ? share + '%' : count}</div>
      </div>`;
  }).join('');
}

// ── Demo seed data ─────────────────────────────────────────────────
function seedDemoData() {
  const base = Date.now();
  const day  = 86400000;

  function ev(type, payload, msAgo) {
    const d = new Date(base - msAgo);
    return {
      type, payload,
      ts:      d.toISOString(),
      dateStr: d.toLocaleDateString(),
      timeStr: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }
  const sym     = (id, label, cat, speech, ago) => ev('symbol',          { id, label, category: cat, speech },     ago);
  const spoken  = (text, ago)                    => ev('sentence_spoken', { text },                                ago);
  const ai      = (input, output, ago)           => ev('ai_sentence',     { input, output },                      ago);
  const alert   = (reason, method, ago, extra) =>
    ev('help_alert', { reason, method, ...extra }, ago);

  const h = (n) => n * 60 * 60 * 1000;
  const m = (n) => n * 60 * 1000;

  const events = [
    // ── Today ──────────────────────────────────────────────────────
    sym('eat',      'Eat',       'needs',    'eat',               h(2)),
    sym('apple',    'Apple',     'food',     'apple',             h(2) - m(1)),
    spoken('eat apple',                                           h(2) - m(2)),
    sym('happy',    'Happy',     'feelings', 'happy',             h(1) + m(40)),
    sym('me',       'Me',        'people',   'I',                 h(1) + m(39)),
    sym('want',     'Want',      'actions',  'I want',            h(1) + m(38)),
    sym('play',     'Play',      'actions',  'play',              h(1) + m(37)),
    ai(['happy', 'I', 'I want', 'play'], "I'm feeling happy and I want to play!", h(1) + m(36)),
    sym('drink',    'Drink',     'needs',    'drink',             m(45)),
    sym('juice',    'Juice',     'food',     'juice',             m(44)),
    spoken('drink juice',                                         m(43)),

    // ── Yesterday ──────────────────────────────────────────────────
    sym('scared',   'Scared',    'feelings', 'scared',            day + h(9)),
    sym('help',     'Help Me',   'needs',    'I need help',       day + h(9) - m(1)),
    alert('hidden_trigger', 'symbol_sequence',                    day + h(9) - m(2), {
      reason_label:    'Triggered via hidden symbol sequence (distress + help symbols tapped)',
      user_name:       'Alex',
      message_at_time: 'scared help me please',
      alert_sent_to:   'parent@example.com',
    }),
    sym('sad',      'Sad',       'feelings', 'sad',               day + h(6)),
    sym('home',     'Home',      'places',   'home',              day + h(6) - m(1)),
    ai(['sad', 'home'], "I'm feeling sad and I want to go home.", day + h(6) - m(2)),
    sym('eat',      'Eat',       'needs',    'eat',               day + h(4)),
    sym('sandwich', 'Sandwich',  'food',     'sandwich',          day + h(4) - m(1)),
    spoken('eat sandwich',                                        day + h(4) - m(2)),
    sym('thankyou', 'Thank You', 'social',   'thank you',         day + h(3)),

    // ── 2 days ago ─────────────────────────────────────────────────
    sym('happy',    'Happy',     'feelings', 'happy',             2*day + h(7)),
    sym('school',   'School',    'places',   'school',            2*day + h(7) - m(1)),
    spoken('happy school',                                        2*day + h(6)),
    sym('bathroom', 'Bathroom',  'needs',    'bathroom',          2*day + h(5)),
    sym('eat',      'Eat',       'needs',    'eat',               2*day + h(4)),
    sym('pizza',    'Pizza',     'food',     'pizza',             2*day + h(4) - m(1)),
    sym('music',    'Music',     'actions',  'listen to music',   2*day + h(2)),
    spoken('listen to music',                                     2*day + h(2) - m(1)),

    // ── 3 days ago ─────────────────────────────────────────────────
    sym('tired',    'Tired',     'feelings', 'tired',             3*day + h(8)),
    sym('rest',     'Rest',      'needs',    'rest',              3*day + h(8) - m(1)),
    ai(['tired', 'home'], "I'm really tired and I want to go home.",  3*day + h(7)),
    sym('mom',      'Mom',       'people',   'mom',               3*day + h(6)),
    sym('hug',      'Hug',       'actions',  'a hug',             3*day + h(6) - m(1)),
    ai(['mom', 'I want', 'a hug'], "I want a hug from mom.",     3*day + h(5)),
    sym('drink',    'Drink',     'needs',    'drink',             3*day + h(4)),
    sym('water',    'Water',     'needs',    'water',             3*day + h(4) - m(1)),

    // ── 4 days ago ─────────────────────────────────────────────────
    sym('excited',  'Excited',   'feelings', 'excited',           4*day + h(7)),
    sym('park',     'Park',      'places',   'the park',          4*day + h(7) - m(1)),
    ai(['excited', 'I want', 'the park'], "I'm excited — I want to go to the park!", 4*day + h(6)),
    sym('play',     'Play',      'actions',  'play',              4*day + h(5)),
    sym('outside',  'Outside',   'places',   'outside',           4*day + h(5) - m(1)),
    sym('eat',      'Eat',       'needs',    'eat',               4*day + h(3)),
    sym('cookie',   'Cookie',    'food',     'cookie',            4*day + h(3) - m(1)),
    spoken('eat cookie',                                          4*day + h(3) - m(2)),

    // ── 5 days ago ─────────────────────────────────────────────────
    sym('confused', 'Confused',  'feelings', 'confused',          5*day + h(8)),
    sym('help',     'Help Me',   'needs',    'I need help',       5*day + h(7)),
    alert('unsure', 'private_channel',                            5*day + h(7) - m(1), {
      reason_label:    "I'm not sure — I just need help",
      user_name:       'Alex',
      message_at_time: '(no message typed)',
      alert_sent_to:   'parent@example.com',
    }),
    sym('hello',    'Hello',     'social',   'hello',             5*day + h(5)),
    sym('teacher',  'Teacher',   'people',   'teacher',           5*day + h(5) - m(1)),
    spoken('hello teacher',                                       5*day + h(4)),

    // ── 6 days ago ─────────────────────────────────────────────────
    sym('happy',    'Happy',     'feelings', 'happy',             6*day + h(6)),
    sym('eat',      'Eat',       'needs',    'eat',               6*day + h(5)),
    sym('banana',   'Banana',    'food',     'banana',            6*day + h(5) - m(1)),
    sym('drink',    'Drink',     'needs',    'drink',             6*day + h(4)),
    sym('milk',     'Milk',      'food',     'milk',              6*day + h(4) - m(1)),
    spoken('drink milk',                                          6*day + h(3)),
    sym('read',     'Read',      'actions',  'read',              6*day + h(2)),
    spoken('read',                                                6*day + h(2) - m(1)),
  ];

  try { localStorage.setItem(EVENTS_KEY, JSON.stringify(events)); } catch {}
  openDashboard();
}

// ── Event listeners ────────────────────────────────────────────────
document.getElementById('db-close').addEventListener('click', () => {
  document.getElementById('dashboard-modal').classList.add('hidden');
});

document.getElementById('db-seed').addEventListener('click', () => {
  if (confirm('Load demo data? This replaces any existing history.')) seedDemoData();
});

// ── Progress Report ────────────────────────────────────────────────
// Turns the logged event history into a clinician-facing outcomes report
// for IEP meetings, Medicaid documentation, and district/SLP trials.

const RANGE_LABELS = { '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days', '0': 'All time' };
const COMM_TYPES   = ['symbol', 'vocab_word', 'keyboard', 'sentence_spoken', 'ai_sentence'];

function rEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function patientNameById(id) {
  if (!id) return 'All communicators';
  if (typeof getClinicPatients === 'function') {
    const p = getClinicPatients().find(x => x.id === id);
    if (p) return p.name || 'Communicator';
  }
  return 'Communicator';
}

function computeReport(rangeDays, patientId) {
  const now    = Date.now();
  const cutoff = rangeDays > 0 ? now - rangeDays * 86400000 : 0;
  const events = getEvents().filter(e => {
    if (tsToMs(e.ts) < cutoff) return false;
    if (patientId && (e.payload && e.payload.patient_id) !== patientId) return false;
    return true;
  });

  const r = {
    rangeLabel: RANGE_LABELS[String(rangeDays)] || 'Custom',
    patientName: patientNameById(patientId),
    generated: new Date().toLocaleString(),
    messagesSpoken: 0, aiSentences: 0, wordSelections: 0, typedMessages: 0, safetyEvents: 0,
    uniqueVocab: 0, activeDays: 0, topWords: [], topCats: [], daily: [], hasData: false,
  };

  const vocab = new Set(), wordFreq = {}, catFreq = {}, dayFreq = {}, activeDaySet = new Set();

  events.forEach(e => {
    const p = e.payload || {};
    switch (e.type) {
      case 'sentence_spoken': r.messagesSpoken++; break;
      case 'ai_sentence':     r.aiSentences++;    break;
      case 'keyboard':        r.typedMessages++;  break;
      case 'help_general':
      case 'help_alert':      r.safetyEvents++;   break;
      case 'symbol': {
        r.wordSelections++;
        const w = (p.label || '').trim();
        if (w) { vocab.add(w.toLowerCase()); wordFreq[w] = (wordFreq[w] || 0) + 1; }
        if (p.category) catFreq[p.category] = (catFreq[p.category] || 0) + 1;
        break;
      }
      case 'vocab_word': {
        r.wordSelections++;
        const w = (p.word || '').trim();
        if (w) { vocab.add(w.toLowerCase()); wordFreq[w] = (wordFreq[w] || 0) + 1; }
        break;
      }
    }
    if (COMM_TYPES.includes(e.type)) {
      const d = e.dateStr || new Date(tsToMs(e.ts)).toLocaleDateString();
      dayFreq[d] = (dayFreq[d] || 0) + 1;
      activeDaySet.add(d);
    }
  });

  r.uniqueVocab = vocab.size;
  r.activeDays  = activeDaySet.size;
  r.topWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 10);
  r.topCats  = Object.entries(catFreq).sort((a, b) => b[1] - a[1]).slice(0, 6);
  r.daily = Object.keys(dayFreq)
    .sort((a, b) => new Date(a) - new Date(b))
    .slice(-42)
    .map(d => ({ date: d, count: dayFreq[d] }));
  r.hasData = events.some(e => COMM_TYPES.includes(e.type));
  return r;
}

function reportBodyHTML(r) {
  if (!r.hasData) {
    return '<p class="report-empty">No communication was recorded in this period. Once the communicator uses Speak, their progress will appear here.</p>';
  }
  const stat = (v, l) => `<div class="report-stat"><div class="report-stat-v">${v}</div><div class="report-stat-l">${l}</div></div>`;
  const maxDay = Math.max(1, ...r.daily.map(d => d.count));
  const bars = r.daily.map(d =>
    `<div class="report-bar" title="${rEsc(d.date)}: ${d.count}">
       <div class="report-bar-fill" style="height:${Math.round((d.count / maxDay) * 100)}%"></div>
     </div>`).join('');
  const wordRows = r.topWords.map(([w, c]) =>
    `<tr><td>${rEsc(w)}</td><td>${c}</td></tr>`).join('') || '<tr><td>—</td><td></td></tr>';
  const catRows = r.topCats.map(([c, n]) =>
    `<tr><td>${rEsc(c)}</td><td>${n}</td></tr>`).join('') || '<tr><td>—</td><td></td></tr>';

  return `
    <div class="report-stats">
      ${stat(r.messagesSpoken, 'Messages spoken')}
      ${stat(r.wordSelections, 'Words &amp; symbols selected')}
      ${stat(r.uniqueVocab, 'Unique vocabulary')}
      ${stat(r.aiSentences, 'AI sentences built')}
      ${stat(r.typedMessages, 'Typed messages')}
      ${stat(r.activeDays, 'Active days')}
    </div>
    ${r.safetyEvents ? `<p class="report-note">Safety channel used <strong>${r.safetyEvents}</strong> time(s) this period. Details are not available on this device — contact your school or clinic administrator for the incident record.</p>` : ''}
    <h3 class="report-h3">Daily communication activity</h3>
    <div class="report-chart">${bars}</div>
    <div class="report-tables">
      <div><h3 class="report-h3">Most-used words</h3><table class="report-table"><tr><th>Word</th><th>Uses</th></tr>${wordRows}</table></div>
      <div><h3 class="report-h3">Category focus</h3><table class="report-table"><tr><th>Category</th><th>Uses</th></tr>${catRows}</table></div>
    </div>`;
}

function renderReportPreview() {
  const range     = parseInt(document.getElementById('report-range').value, 10);
  const patientId = document.getElementById('report-patient').value || null;
  const r = computeReport(range, patientId);
  const mLine = matrixLine(patientId);
  document.getElementById('report-preview').innerHTML = `
    <div class="report-doc-head">
      <div><strong>${rEsc(r.patientName)}</strong> · ${rEsc(r.rangeLabel)}</div>
      <div class="report-generated">Generated ${rEsc(r.generated)}</div>
    </div>
    ${mLine ? `<p class="report-note">${rEsc(mLine)}</p>` : ''}
    ${reportBodyHTML(r)}`;
  document.getElementById('report-modal')._current = r;
}

function openReport() {
  const sel = document.getElementById('report-patient');
  const patients = (typeof getClinicPatients === 'function') ? getClinicPatients() : [];
  const activeId = (typeof getActivePatient === 'function' && getActivePatient()) ? getActivePatient().id : '';
  sel.innerHTML = '<option value="">All communicators</option>' +
    patients.map(p => `<option value="${rEsc(p.id)}"${p.id === activeId ? ' selected' : ''}>${rEsc(p.name || 'Communicator')}</option>`).join('');
  renderReportPreview();
  document.getElementById('report-modal').classList.remove('hidden');
}

function printReport() {
  const r = computeReport(parseInt(document.getElementById('report-range').value, 10),
                          document.getElementById('report-patient').value || null);
  const w = window.open('', '_blank');
  if (!w) { alert('Please allow pop-ups to print the report.'); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Speak — Progress Report</title>
    <style>
      body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;max-width:760px;margin:32px auto;padding:0 24px;}
      .brand{display:flex;align-items:center;gap:10px;border-bottom:3px solid #8b5cf6;padding-bottom:12px;margin-bottom:8px;}
      .brand h1{font-size:1.4rem;margin:0;} .brand .sub{color:#666;font-size:.85rem;margin-left:auto;}
      .meta{color:#444;margin:6px 0 20px;font-size:.95rem;}
      .report-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0;}
      .report-stat{border:1px solid #e3e3e8;border-radius:10px;padding:14px;text-align:center;}
      .report-stat-v{font-size:1.8rem;font-weight:800;color:#6d28d9;} .report-stat-l{font-size:.78rem;color:#555;margin-top:4px;}
      .report-note{background:#f4f0ff;border-radius:8px;padding:10px 12px;font-size:.88rem;}
      .report-h3{font-size:1rem;margin:22px 0 8px;border-bottom:1px solid #eee;padding-bottom:4px;}
      .report-chart{display:flex;align-items:flex-end;gap:3px;height:90px;border-bottom:1px solid #ddd;padding-bottom:2px;}
      .report-bar{flex:1;display:flex;align-items:flex-end;} .report-bar-fill{width:100%;background:#8b5cf6;border-radius:2px 2px 0 0;min-height:2px;}
      .report-tables{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
      .report-table{width:100%;border-collapse:collapse;font-size:.9rem;} .report-table th,.report-table td{text-align:left;padding:5px 6px;border-bottom:1px solid #eee;}
      .report-empty{color:#666;font-style:italic;padding:30px 0;}
      footer{margin-top:30px;border-top:1px solid #eee;padding-top:10px;color:#999;font-size:.78rem;}
    </style></head><body>
    <div class="brand"><h1>Speak — Communication Progress Report</h1><span class="sub">speakaac.org</span></div>
    <div class="meta"><strong>${rEsc(r.patientName)}</strong> &nbsp;·&nbsp; ${rEsc(r.rangeLabel)} &nbsp;·&nbsp; Generated ${rEsc(r.generated)}</div>
    ${matrixLine(document.getElementById('report-patient').value || null) ? `<p class="report-note">${rEsc(matrixLine(document.getElementById('report-patient').value || null))}</p>` : ''}
    ${reportBodyHTML(r)}
    <footer>Generated by Speak (speakaac.org) from in-app communication logs. For clinical and educational documentation.</footer>
    </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}

function csvReport() {
  const r = computeReport(parseInt(document.getElementById('report-range').value, 10),
                         document.getElementById('report-patient').value || null);
  const q = s => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
  const lines = [
    ['Speak — Communication Progress Report'],
    ['Communicator', r.patientName], ['Period', r.rangeLabel], ['Generated', r.generated], [],
    ['Metric', 'Value'],
    ['Messages spoken', r.messagesSpoken], ['Words & symbols selected', r.wordSelections],
    ['Unique vocabulary', r.uniqueVocab], ['AI sentences built', r.aiSentences],
    ['Typed messages', r.typedMessages], ['Active days', r.activeDays],
    ['Safety channel used', r.safetyEvents], [],
    ['Date', 'Communications'], ...r.daily.map(d => [d.date, d.count]), [],
    ['Top word', 'Uses'], ...r.topWords.map(([w, c]) => [w, c]),
  ].map(row => row.map(q).join(',')).join('\n');

  const blob = new Blob([lines], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `speak-progress-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const _dbReportBtn = document.getElementById('db-report');
if (_dbReportBtn) _dbReportBtn.addEventListener('click', openReport);
document.getElementById('report-close').addEventListener('click', () =>
  document.getElementById('report-modal').classList.add('hidden'));
document.getElementById('report-range').addEventListener('change', renderReportPreview);
document.getElementById('report-patient').addEventListener('change', renderReportPreview);
document.getElementById('report-print').addEventListener('click', printReport);
document.getElementById('report-csv').addEventListener('click', csvReport);

// ── AAC Evaluation / Funding Summary ──────────────────────────────
// Combines the clinician's narrative with auto-pulled objective usage data
// into the documentation packet insurance / Medicaid / IEP teams require.

const EVAL_FIELDS = ['name','dob','slp','date','dx','abilities','impact','trialed','recommendation','training','outcomes'];

function evalPatientId() { return document.getElementById('eval-patient').value || ''; }
function evalDraftKey(pid) { return 'aac_eval_draft_' + (pid || 'default'); }

function gatherEvalFields() {
  const o = {};
  EVAL_FIELDS.forEach(f => { o[f] = (document.getElementById('ev-' + f)?.value || ''); });
  return o;
}

function saveEvalDraft(pid) {
  try { localStorage.setItem(evalDraftKey(pid), JSON.stringify(gatherEvalFields())); } catch {}
}

function loadEvalDraft(pid) {
  let d = {};
  try { d = JSON.parse(localStorage.getItem(evalDraftKey(pid))) || {}; } catch {}
  EVAL_FIELDS.forEach(f => {
    const el = document.getElementById('ev-' + f);
    if (el) el.value = d[f] || '';
  });
  // Sensible prefill for the trialed field
  const trialedEl = document.getElementById('ev-trialed');
  if (trialedEl && !trialedEl.value) {
    trialedEl.value = 'Speak AAC (speakaac.org) — open-symbol speech-generating app — trialed over the period summarized below.';
  }
}

function renderEvalData() {
  const range = parseInt(document.getElementById('eval-range').value, 10);
  const r = computeReport(range, evalPatientId() || null);
  const from = r.daily.length ? r.daily[0].date : '—';
  const to   = r.daily.length ? r.daily[r.daily.length - 1].date : '—';
  const stat = (v, l) => `<div class="report-stat"><div class="report-stat-v">${v}</div><div class="report-stat-l">${l}</div></div>`;
  document.getElementById('eval-data-preview').innerHTML = `
    <h3 class="report-h3">Objective trial data (auto-filled from usage logs)</h3>
    <p class="eval-hint">Trial period: <strong>${rEsc(from)} – ${rEsc(to)}</strong> · ${r.activeDays} active day(s)</p>
    <div class="report-stats">
      ${stat(r.messagesSpoken, 'Messages spoken')}
      ${stat(r.uniqueVocab, 'Unique vocabulary')}
      ${stat(r.wordSelections, 'Words selected')}
      ${stat(r.aiSentences, 'AI sentences')}
    </div>`;
  document.getElementById('eval-modal')._r = r;
  document.getElementById('eval-modal')._span = { from, to };
}

function buildEvalDoc(f, r, span) {
  const para = v => v ? rEsc(v).replace(/\n/g, '<br>') : '<em>—</em>';
  const sec = (n, t, v) => `<h2>${n}. ${rEsc(t)}</h2><p>${para(v)}</p>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>AAC Evaluation Summary</title>
    <style>
      body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;max-width:760px;margin:32px auto;padding:0 24px;line-height:1.45;}
      .brand{display:flex;align-items:center;gap:10px;border-bottom:3px solid #8b5cf6;padding-bottom:12px;}
      .brand h1{font-size:1.3rem;margin:0;} .brand .sub{color:#666;font-size:.85rem;margin-left:auto;}
      .who{margin:14px 0 8px;font-size:.95rem;} .who div{margin:2px 0;}
      h2{font-size:1rem;margin:18px 0 4px;border-bottom:1px solid #eee;padding-bottom:3px;}
      p{margin:0 0 4px;font-size:.93rem;}
      .data{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:8px 0;}
      .data .c{border:1px solid #e3e3e8;border-radius:8px;padding:10px;text-align:center;}
      .data .v{font-size:1.4rem;font-weight:800;color:#6d28d9;} .data .l{font-size:.72rem;color:#555;}
      .note{font-style:italic;color:#444;font-size:.9rem;}
      .sign{margin-top:34px;display:flex;justify-content:space-between;font-size:.9rem;}
      footer{margin-top:24px;border-top:1px solid #eee;padding-top:10px;color:#999;font-size:.76rem;}
    </style></head><body>
    <div class="brand"><h1>AAC Evaluation &amp; Funding Summary</h1><span class="sub">speakaac.org</span></div>
    <div class="who">
      <div><strong>Communicator:</strong> ${para(f.name)} &nbsp; <strong>DOB:</strong> ${para(f.dob)}</div>
      <div><strong>Evaluating SLP:</strong> ${para(f.slp)} &nbsp; <strong>Date:</strong> ${para(f.date)}</div>
    </div>
    ${sec(1, 'Diagnosis (communication impairment)', f.dx)}
    ${sec(2, 'Current communication abilities & limitations', f.abilities)}
    ${sec(3, 'Functional impact on daily activities', f.impact)}
    ${sec(4, 'Assessment & devices/methods trialed', f.trialed)}
    <h2>5. Objective trial data (Speak usage logs)</h2>
    <p>Trial period: <strong>${rEsc(span.from)} – ${rEsc(span.to)}</strong> · ${r.activeDays} active day(s)</p>
    <div class="data">
      <div class="c"><div class="v">${r.messagesSpoken}</div><div class="l">Messages spoken</div></div>
      <div class="c"><div class="v">${r.uniqueVocab}</div><div class="l">Unique vocabulary</div></div>
      <div class="c"><div class="v">${r.wordSelections}</div><div class="l">Words selected</div></div>
      <div class="c"><div class="v">${r.aiSentences}</div><div class="l">AI sentences</div></div>
    </div>
    <p class="note">The objective data above demonstrates the communicator can learn and functionally use the recommended system.</p>
    ${sec(6, 'Device recommendation & justification', f.recommendation)}
    ${sec(7, 'Training plan (communicator & partners)', f.training)}
    ${sec(8, 'Expected functional outcomes', f.outcomes)}
    <div class="sign"><span>Clinician signature: __________________________</span><span>Date: ____________</span></div>
    <footer>Prepared with Speak (speakaac.org). Objective data auto-generated from in-app communication logs. For AAC funding documentation (insurance / Medicaid / IDEA-IEP).</footer>
    </body></html>`;
}

function openEval() {
  const sel = document.getElementById('eval-patient');
  const patients = (typeof getClinicPatients === 'function') ? getClinicPatients() : [];
  const activeId = (typeof getActivePatient === 'function' && getActivePatient()) ? getActivePatient().id : '';
  sel.innerHTML = '<option value="">— this device —</option>' +
    patients.map(p => `<option value="${rEsc(p.id)}"${p.id === activeId ? ' selected' : ''}>${rEsc(p.name || 'Communicator')}</option>`).join('');
  loadEvalDraft(evalPatientId());
  renderEvalData();
  document.getElementById('eval-modal').classList.remove('hidden');
}

function printEval() {
  const r = document.getElementById('eval-modal')._r || computeReport(parseInt(document.getElementById('eval-range').value, 10), evalPatientId() || null);
  const span = document.getElementById('eval-modal')._span || { from: '—', to: '—' };
  const w = window.open('', '_blank');
  if (!w) { alert('Please allow pop-ups to print the summary.'); return; }
  w.document.write(buildEvalDoc(gatherEvalFields(), r, span));
  w.document.close(); w.focus();
  setTimeout(() => w.print(), 350);
}

const _dbEvalBtn = document.getElementById('db-eval');
if (_dbEvalBtn) _dbEvalBtn.addEventListener('click', openEval);
document.getElementById('eval-close').addEventListener('click', () =>
  document.getElementById('eval-modal').classList.add('hidden'));
document.getElementById('eval-save').addEventListener('click', () => {
  saveEvalDraft(evalPatientId());
  const b = document.getElementById('eval-save'); const t = b.textContent;
  b.textContent = '✓ Saved'; setTimeout(() => b.textContent = t, 1400);
});
document.getElementById('eval-print').addEventListener('click', printEval);
document.getElementById('eval-patient').addEventListener('change', () => { loadEvalDraft(evalPatientId()); renderEvalData(); });
document.getElementById('eval-range').addEventListener('change', renderEvalData);
document.getElementById('eval-form').addEventListener('input', e => {
  if (e.target && e.target.id && e.target.id.indexOf('ev-') === 0) saveEvalDraft(evalPatientId());
});

// ── Communication Matrix (Rowland) — developmental level tracking ──
const MATRIX_LEVELS = [
  { n:1, roman:'I',   name:'Pre-Intentional Behavior',     desc:"Behavior reflects general state; not yet under the communicator's control (e.g. crying when uncomfortable)." },
  { n:2, roman:'II',  name:'Intentional Behavior',          desc:'Behavior is intentional but not yet directed at others (e.g. reaching, turning away).' },
  { n:3, roman:'III', name:'Unconventional Communication',  desc:'Directed at others by unconventional means — pulling, leading, body movements (pre-symbolic).' },
  { n:4, roman:'IV',  name:'Conventional Communication',    desc:'Conventional gestures and vocalizations — pointing, waving, head nod/shake (pre-symbolic).' },
  { n:5, roman:'V',   name:'Concrete Symbols',              desc:'Pictures, objects, or sounds that physically resemble what they represent.' },
  { n:6, roman:'VI',  name:'Abstract Symbols',              desc:'Speech, signs, or printed words — abstract symbols used one at a time.' },
  { n:7, roman:'VII', name:'Language',                      desc:'Combines two or more symbols into rule-governed phrases and sentences.' },
];

function matrixPatientId() { return document.getElementById('matrix-patient').value || ''; }

function getMatrix(pid) {
  if (pid) {
    if (typeof getClinicPatients === 'function') {
      const p = getClinicPatients().find(x => x.id === pid);
      if (p) return { level: p.matrixLevel || null, history: p.matrixHistory || [] };
    }
    return { level: null, history: [] };   // unknown patient — don't leak device data
  }
  const s = (typeof loadSettings === 'function') ? loadSettings() : {};
  return { level: s.matrixLevel || null, history: s.matrixHistory || [] };
}

function setMatrixLevel(pid, level) {
  if (typeof loadSettings !== 'function' || typeof saveSettings !== 'function') return;
  const today = new Date().toLocaleDateString();
  const s = loadSettings();
  if (pid) {
    const list = s.clinicPatients || [];          // full list (incl. archived) — don't drop any
    const p = list.find(x => x.id === pid);
    if (!p) return;                               // unknown patient — don't fall back to device
    if (p.matrixLevel !== level) { p.matrixHistory = p.matrixHistory || []; p.matrixHistory.push({ level, date: today }); }
    p.matrixLevel = level;
    s.clinicPatients = list;
    saveSettings(s);
    return;
  }
  if (s.matrixLevel !== level) { s.matrixHistory = s.matrixHistory || []; s.matrixHistory.push({ level, date: today }); }
  s.matrixLevel = level;
  saveSettings(s);
}

function levelInfo(n) { return MATRIX_LEVELS.find(l => l.n === n); }

function matrixLine(pid) {
  const m = getMatrix(pid);
  if (!m.level) return '';
  const l = levelInfo(m.level);
  return l ? `Communication Matrix: Level ${l.roman} — ${l.name}` : '';
}

function renderMatrix() {
  const pid = matrixPatientId();
  const m = getMatrix(pid);
  const levelsEl = document.getElementById('matrix-levels');
  levelsEl.innerHTML = '';
  MATRIX_LEVELS.forEach(l => {
    const row = document.createElement('button');
    row.className = 'matrix-level' + (m.level === l.n ? ' current' : '');
    row.innerHTML = `<div class="matrix-level-top"><span class="matrix-roman">${l.roman}</span><span class="matrix-name">${rEsc(l.name)}</span>${m.level === l.n ? '<span class="matrix-badge">Current</span>' : ''}</div><div class="matrix-desc">${rEsc(l.desc)}</div>`;
    row.addEventListener('click', () => { setMatrixLevel(pid, l.n); renderMatrix(); });
    levelsEl.appendChild(row);
  });

  const histEl = document.getElementById('matrix-history');
  const hist = (m.history || []).slice().reverse();
  if (!hist.length) {
    histEl.innerHTML = '<p class="eval-hint">No level set yet — tap a level above to begin tracking progression.</p>';
  } else {
    histEl.innerHTML = hist.map(h => {
      const l = levelInfo(h.level);
      return `<div class="matrix-hist-row"><span class="matrix-hist-date">${rEsc(h.date)}</span><span>Level ${l ? l.roman + ' — ' + rEsc(l.name) : h.level}</span></div>`;
    }).join('');
  }
}

function openMatrix() {
  const sel = document.getElementById('matrix-patient');
  const patients = (typeof getClinicPatients === 'function') ? getClinicPatients() : [];
  const activeId = (typeof getActivePatient === 'function' && getActivePatient()) ? getActivePatient().id : '';
  sel.innerHTML = '<option value="">— this device —</option>' +
    patients.map(p => `<option value="${rEsc(p.id)}"${p.id === activeId ? ' selected' : ''}>${rEsc(p.name || 'Communicator')}</option>`).join('');
  renderMatrix();
  document.getElementById('matrix-modal').classList.remove('hidden');
}

const _dbMatrixBtn = document.getElementById('db-matrix');
if (_dbMatrixBtn) _dbMatrixBtn.addEventListener('click', openMatrix);
document.getElementById('matrix-close').addEventListener('click', () =>
  document.getElementById('matrix-modal').classList.add('hidden'));
document.getElementById('matrix-patient').addEventListener('change', renderMatrix);
