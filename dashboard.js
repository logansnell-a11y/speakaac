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

// ── Render: alerts ─────────────────────────────────────────────────
function renderAlerts(alerts) {
  const el = document.getElementById('db-alerts-list');
  if (!alerts.length) {
    el.innerHTML = '<p class="db-empty">No safety alerts recorded.</p>';
    return;
  }
  el.innerHTML = alerts.map(a => {
    const method = (a.payload?.method === 'symbol_sequence' || a.payload?.reason === 'hidden_trigger')
      ? 'hidden trigger' : 'help button';
    const reason = a.payload?.reason || '';
    return `
      <div class="db-alert-row">
        <div class="db-alert-icon">🛡️</div>
        <div class="db-alert-body">
          <div class="db-alert-reason">${DB_REASON_TEXT[reason] || reason || 'Help requested'}</div>
          <div class="db-alert-meta">${a.timeStr || ''} · ${formatDate(a.dateStr || '')} · via ${method}</div>
        </div>
      </div>`;
  }).join('');
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
        <div class="db-comm-left">${isAI ? '<span class="db-ai-tag">✨</span>' : '<span class="db-sym-tag">▶</span>'}</div>
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
  const alert   = (reason, method, ago)          => ev('help_alert',      { reason, method },                     ago);

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
    alert('hidden_trigger', 'symbol_sequence',                    day + h(9) - m(2)),
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
    alert('unsure', 'private_channel',                            5*day + h(7) - m(1)),
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
