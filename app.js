// ── Toast notifications ────────────────────────────────────────────
function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

// ── HTML escape helper ─────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Password gate ─────────────────────────────────────────────────
const ACCESS_KEY  = 'aac_access_v1';
const ACCESS_PASS = 'speak2026'; // ← change this to your access code

(function initPasswordGate() {
  const gate  = document.getElementById('password-gate');
  const input = document.getElementById('pw-input');
  const errEl = document.getElementById('pw-error');

  if (localStorage.getItem(ACCESS_KEY)) {
    gate.classList.add('hidden');
    return;
  }

  window.__awaitingAccess = true;
  setTimeout(() => input.focus(), 80);

  function attempt() {
    if (input.value.trim() === ACCESS_PASS) {
      localStorage.setItem(ACCESS_KEY, '1');
      gate.classList.add('hidden');
      window.__awaitingAccess = false;
      init();
    } else {
      errEl.classList.remove('hidden');
      input.value = '';
      setTimeout(() => errEl.classList.add('hidden'), 2000);
    }
  }

  document.getElementById('pw-submit').addEventListener('click', attempt);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
})();

// ── EmailJS config ─────────────────────────────────────────────────
// Create a free account at emailjs.com, then fill these in:
// 1. Add an Email Service (connect your Gmail or any email)
// 2. Create a Template (see template variables below)
// 3. Copy your Public Key from Account → API Keys
const EMAILJS_SERVICE_ID  = 'service_v5znqrd';
const EMAILJS_TEMPLATE_ID = 'template_u8xfyh5';
const EMAILJS_PUBLIC_KEY  = 'XwG8nU8PmuFDONFZW';
// Template variables used: {{to_email}} {{to_name}} {{user_name}}
//   {{reason}} {{last_message}} {{timestamp}}

// ── Settings ────────────────────────────────────────────────────────
const SETTINGS_KEY = 'aac_settings';

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
  catch { return {}; }
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  // Strip safety contact details before cloud sync — privacy policy says these
  // are stored only on-device and never transmitted to our servers.
  if (window.Sync) {
    const { contactName, contactEmail, ...syncable } = s;
    Sync.save(syncable).catch(() => {});
  }
}

// ── Event logging ──────────────────────────────────────────────────
const HISTORY_KEY = 'aac_history_v1';

function logEvent(type, payload) {
  const now = new Date();
  const event = {
    type,
    payload,
    ts:      now.toISOString(),
    dateStr: now.toLocaleDateString(),
    timeStr: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
  try {
    const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    hist.unshift(event);
    if (hist.length > 500) hist.length = 500;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
  } catch {}
  if (window.Sync) Sync.saveEvent(event).catch(() => {});

  // Push to session log and refresh drawer if open
  sessionLog.unshift(event);
  if (historyOpen) renderHistoryDrawer();
  updateHistoryCount();
}

// ── State ──────────────────────────────────────────────────────────
let sentence       = [];
let activeCategory = "needs";
let clearTimer     = null;
let clearStarted   = false;
let picCache       = {};
let showingMore    = false;
let sessionLog     = [];       // in-memory log for the current session
let historyOpen    = false;

// ── DOM refs ───────────────────────────────────────────────────────
const grid           = document.getElementById("symbol-grid");
const sentenceText   = document.getElementById("sentence-text");
const btnSpeakTop    = document.getElementById("btn-speak-top");
const btnAI          = document.getElementById("btn-ai");

const catBtns        = document.querySelectorAll(".cat-btn");

const barBack        = document.getElementById("bar-back");
const barClear       = document.getElementById("bar-clear");
const clearProgress  = document.getElementById("clear-progress");
const barKeyboard    = document.getElementById("bar-keyboard");
const barHelp        = document.getElementById("bar-help");

const keyboardOverlay = document.getElementById("keyboard-overlay");
const keyboardInput   = document.getElementById("keyboard-input");
const kbSpeak         = document.getElementById("kb-speak");
const kbAdd           = document.getElementById("kb-add");
const kbClose         = document.getElementById("kb-close");

const helpModal         = document.getElementById("help-modal");
const helpGeneral       = document.getElementById("help-general");
const helpPrivate       = document.getElementById("help-private");
const helpNo            = document.getElementById("help-no");
const helpSentModal     = document.getElementById("help-sent-modal");
const helpSentOk        = document.getElementById("help-sent-ok");
const privateChannel    = document.getElementById("private-channel-modal");
const pcBack            = document.getElementById("pc-back");
const privateSentModal  = document.getElementById("private-sent-modal");
const psOk              = document.getElementById("ps-ok");

const upgradeModal   = document.getElementById("upgrade-modal");
const upgradeGo      = document.getElementById("upgrade-go");
const upgradeCancel  = document.getElementById("upgrade-cancel");
const plansModal     = document.getElementById("plans-modal");
const plansClose     = document.getElementById("plans-close");

const pinModal       = document.getElementById("pin-modal");
const pinError       = document.getElementById("pin-error");
const pinDel         = document.getElementById("pin-del");
const pinCancel      = document.getElementById("pin-cancel");

const setupModal     = document.getElementById("setup-modal");
const setupClose     = document.getElementById("setup-close");
const setupSave      = document.getElementById("setup-save");
const setupSaved     = document.getElementById("setup-saved");

// ── Tier helpers ───────────────────────────────────────────────────
function getTier() {
  return loadSettings().tier || "free";
}

function tierUnlocks(feature) {
  const tier = getTier();
  const access = {
    ai:          ["family", "lifetime", "clinic", "institution"],
    history:     ["family", "lifetime", "clinic", "institution"],
    dashboard:   ["clinic", "institution"],
    institution: ["institution"],
  };
  return (access[feature] || []).includes(tier);
}

// ── Sentence display ───────────────────────────────────────────────
function updateDisplay() {
  if (sentence.length === 0) {
    sentenceText.textContent = "Tap a symbol to speak...";
    sentenceText.classList.add("placeholder");
    btnAI.classList.add("hidden");
  } else {
    sentenceText.textContent = sentence.join(" ");
    sentenceText.classList.remove("placeholder");
    // Show AI button when 2+ symbols tapped
    if (sentence.length >= 2) {
      btnAI.classList.remove("hidden");
      if (tierUnlocks("ai")) {
        btnAI.textContent = "✨";
        btnAI.title = "Build AI sentence";
        btnAI.classList.remove("locked");
      } else {
        const today = new Date().toISOString().slice(0, 10);
        const used = parseInt(localStorage.getItem("aac_ai_count_" + today) || "0", 10);
        const left = Math.max(0, 5 - used);
        btnAI.textContent = "✨";
        if (left > 0) {
          btnAI.title = `Build AI sentence (${left} of 5 free today)`;
          btnAI.classList.remove("locked");
        } else {
          btnAI.title = "Upgrade for unlimited AI sentences";
          btnAI.classList.add("locked");
        }
      }
    } else {
      btnAI.classList.add("hidden");
    }
  }
}

// ── Audio playback ─────────────────────────────────────────────────
const audioCache = {};

function textToKey(text) {
  return text.toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function speak(text) {
  if (!text) return;
  if ((loadSettings().profile || {}).soundMuted) return;
  const key  = textToKey(text);
  const path = `audio/${key}.mp3`;

  if (audioCache[key]) {
    audioCache[key].currentTime = 0;
    audioCache[key].play();
    return;
  }

  const audio = new Audio(path);
  audio.addEventListener("canplaythrough", () => {
    audioCache[key] = audio;
    audio.play().catch(() => speakViaServer(text));
  }, { once: true });

  audio.addEventListener("error", () => {
    speakViaServer(text);
  }, { once: true });

  audio.load();
}

async function speakViaServer(text) {
  try {
    // Localhost TTS server only runs in dev — skip entirely in production
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!isLocal) throw new Error('production');
    const res = await fetch("http://localhost:5050/tts", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text })
    });
    if (!res.ok) throw new Error("server error");
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    new Audio(url).play();
  } catch {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt  = new SpeechSynthesisUtterance(text);
    utt.rate   = 0.82;
    utt.pitch  = 1.08;
    const pick = window.speechSynthesis.getVoices().find(v =>
      v.name === "Samantha" || v.name === "Karen" || v.lang === "en-US"
    );
    if (pick) utt.voice = pick;
    window.speechSynthesis.speak(utt);
  }
}

// ── AI Sentence Builder ────────────────────────────────────────────
let aiLoading = false;

async function buildAISentence() {
  if (aiLoading || sentence.length < 2) return;

  if (!navigator.onLine) {
    showToast('AI sentences need an internet connection', 'warn', 3000);
    return;
  }

  const isPaid = tierUnlocks("ai");

  // Client-side gate (fast UI feedback — server enforces the real limit)
  if (!isPaid) {
    const today = new Date().toISOString().slice(0, 10);
    const countKey = "aac_ai_count_" + today;
    const used = parseInt(localStorage.getItem(countKey) || "0", 10);
    if (used >= 5) {
      upgradeModal.classList.remove("hidden");
      return;
    }
  }

  aiLoading = true;
  btnAI.classList.add("loading");
  btnAI.textContent = "…";
  const prevSentence = [...sentence];

  sentenceText.textContent = "Building sentence…";
  sentenceText.classList.add("placeholder");

  try {
    // Include Supabase JWT so the server can verify tier + log usage
    const session = window.Sync ? await Sync.getSession() : null;
    const headers = { "Content-Type": "application/json" };
    if (session?.access_token) {
      headers["Authorization"] = "Bearer " + session.access_token;
    }

    const res = await fetch("/.netlify/functions/ai-sentence", {
      method: "POST",
      headers,
      body: JSON.stringify({ words: prevSentence })
    });

    const data = await res.json();

    if (!res.ok) {
      // If server says limit reached, show upgrade modal
      if (data.limitReached) {
        // Sync client counter to reality so it stays accurate
        if (!isPaid && data.used !== undefined) {
          const today = new Date().toISOString().slice(0, 10);
          localStorage.setItem("aac_ai_count_" + today, String(data.used));
        }
        upgradeModal.classList.remove("hidden");
      }
      throw new Error(data.error || `API error ${res.status}`);
    }

    const aiText = data.sentence.trim().replace(/^["']|["']$/g, "");

    // Increment client-side counter to keep UI hint in sync
    if (!isPaid) {
      const today = new Date().toISOString().slice(0, 10);
      const countKey = "aac_ai_count_" + today;
      localStorage.setItem(countKey, String(parseInt(localStorage.getItem(countKey) || "0", 10) + 1));
    }

    sentence = [aiText];
    updateDisplay();
    speak(aiText);
    logEvent('ai_sentence', { input: prevSentence, output: aiText });
    showToast('✦ AI sentence built', 'info', 2500);
  } catch (e) {
    console.error("AI sentence error:", e);
    sentence = prevSentence;
    updateDisplay();
  } finally {
    aiLoading = false;
    btnAI.classList.remove("loading");
    btnAI.textContent = "✨";
  }
}

btnAI.addEventListener("click", buildAISentence);

// ── Symbol grid ────────────────────────────────────────────────────
function makeCard(sym, cat) {
  const card = document.createElement("div");
  card.className  = "symbol-card";
  card.dataset.id = sym.id;
  if (cat) card.dataset.cat = cat;

  const imgArea = document.createElement("div");
  imgArea.className = "symbol-emoji";

  if (sym.dataUrl) {
    // Custom uploaded photo
    const img = document.createElement("img");
    img.src = sym.dataUrl;
    img.alt = sym.label;
    imgArea.appendChild(img);
  } else {
    const pic = ARASAAC.makePicImg(sym.arasaac, picCache);
    if (pic) {
      imgArea.appendChild(pic);
    } else {
      imgArea.textContent = sym.emoji;
    }
  }

  const label = document.createElement("div");
  label.className   = "symbol-label";
  label.textContent = sym.label;

  card.appendChild(imgArea);
  card.appendChild(label);
  card.addEventListener("click", () => onSymbolTap(sym, card));
  return card;
}

function renderGrid(category) {
  grid.innerHTML = "";
  showingMore    = false;

  // Custom (user-uploaded) symbols
  if (category === 'custom') {
    renderCustomGrid();
    return;
  }

  const profile  = loadSettings().profile || {};
  const all      = SYMBOLS[category] || [];
  const core     = all.filter(s => s.core);
  const extra    = all.filter(s => !s.core);

  // Empty category — show placeholder (e.g. custom interest not yet populated)
  if (all.length === 0) {
    const ph = document.createElement("div");
    ph.className = "custom-cat-placeholder";
    const label = profile.customInterest || category;
    ph.innerHTML = `
      <div class="ccp-icon">⭐</div>
      <div class="ccp-title">${label}</div>
      <div class="ccp-body">Custom symbols for this category will be added here. Tap the Type button to communicate anything in the meantime.</div>
    `;
    grid.appendChild(ph);
    return;
  }

  core.forEach(sym => grid.appendChild(makeCard(sym, category)));

  // In coreOnly mode (young / non-readers) skip the More button entirely
  if (!profile.coreOnly && extra.length > 0) {
    const moreBtn = document.createElement("div");
    moreBtn.className = "symbol-card more-card";
    moreBtn.innerHTML = `
      <div class="symbol-emoji" style="font-size:2rem">＋</div>
      <div class="symbol-label">More</div>
    `;
    moreBtn.addEventListener("click", () => {
      moreBtn.remove();
      extra.forEach(sym => grid.appendChild(makeCard(sym, category)));
      showingMore = true;
    });
    grid.appendChild(moreBtn);
  }
}

// ── Hidden safety trigger ──────────────────────────────────────────
// If the child taps a distress symbol + a help symbol, the private
// channel fires silently — no visible button required.
const DISTRESS_SIGNALS = ["scared", "I am hurting", "I feel hurt", "overwhelmed", "angry", "lonely"];
const HELP_SIGNALS     = ["I need help", "help"];

function checkHiddenTrigger() {
  if (sentence.length < 2) return;
  const flat = sentence.join(" ").toLowerCase();
  const hasDistress = DISTRESS_SIGNALS.some(d => flat.includes(d.toLowerCase()));
  const hasHelp     = HELP_SIGNALS.some(h => flat.includes(h.toLowerCase()));
  if (hasDistress && hasHelp) {
    fireHiddenChannel();
  }
}

function fireHiddenChannel() {
  // Brief pulse on sentence bar — subtle signal to the child that it worked
  sentenceText.classList.add("trigger-pulse");
  setTimeout(() => sentenceText.classList.remove("trigger-pulse"), 900);

  // Small delay so it feels intentional, not accidental
  setTimeout(() => {
    sendPrivateAlert("hidden_trigger");
    privateSentModal.classList.remove("hidden");
  }, 700);
}

function onSymbolTap(sym, card) {
  card.classList.add("flash");
  setTimeout(() => card.classList.remove("flash"), 280);
  speak(sym.speech);
  sentence.push(sym.speech);
  logEvent('symbol', { id: sym.id, label: sym.label, category: activeCategory, speech: sym.speech });
  updateDisplay();
  checkHiddenTrigger();
}

// ── Category tabs ──────────────────────────────────────────────────
catBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    catBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeCategory = btn.dataset.cat;
    renderGrid(activeCategory);
    grid.scrollTop = 0;
  });
});

// ── App logo — home button: clear sentence + reset to Needs ───────
document.getElementById('app-logo').addEventListener('click', () => {
  sentence = [];
  updateDisplay();
  // Always reset to Needs category and scroll to top
  activeCategory = 'needs';
  catBtns.forEach(b => b.classList.toggle('active', b.dataset.cat === 'needs'));
  renderGrid('needs');
  grid.scrollTop = 0;
  if (searchInput && searchInput.value) {
    searchInput.value = '';
    searchClear.classList.add('hidden');
  }
});

// ── Symbol search ──────────────────────────────────────────────────
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');

function getAllSymbols() {
  return [...Object.values(SYMBOLS).flat(), ...loadCustomSymbols()];
}

function renderSearchResults(query) {
  const q = query.trim().toLowerCase();
  grid.innerHTML = '';
  if (!q) { renderGrid(activeCategory); return; }

  const results = getAllSymbols().filter(s =>
    s.label.toLowerCase().includes(q) || (s.speech || '').toLowerCase().includes(q)
  );

  if (results.length === 0) {
    const ph = document.createElement('div');
    ph.className = 'custom-cat-placeholder';
    ph.innerHTML = `<div class="ccp-icon">🔍</div><div class="ccp-title">No symbols found</div><div class="ccp-body">Try a different word.</div>`;
    grid.appendChild(ph);
    return;
  }

  results.forEach(sym => grid.appendChild(makeCard(sym, findSymbolCategory(sym))));
}

function findSymbolCategory(sym) {
  if (sym.category === 'custom') return 'custom';
  for (const [cat, syms] of Object.entries(SYMBOLS)) {
    if (syms.some(s => s.id === sym.id)) return cat;
  }
  return '';
}

searchInput.addEventListener('input', () => {
  const q = searchInput.value;
  searchClear.classList.toggle('hidden', !q);
  renderSearchResults(q);
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.classList.add('hidden');
  renderGrid(activeCategory);
  searchInput.focus();
});

// ── Speak button — tap to speak, hold 3s to open provider settings ─
let speakHoldTimer = null;
let speakHoldFired = false;

btnSpeakTop.addEventListener("pointerdown", () => {
  speakHoldFired = false;
  speakHoldTimer = setTimeout(() => {
    speakHoldFired = true;
    speakHoldTimer = null;
    openPinModal();
  }, 3000);
});

btnSpeakTop.addEventListener("pointerup", () => {
  if (speakHoldTimer) { clearTimeout(speakHoldTimer); speakHoldTimer = null; }
  if (!speakHoldFired && sentence.length > 0) {
    const text = sentence.join(" ");
    speak(text);
    logEvent('sentence_spoken', { text });
  }
  speakHoldFired = false;
});

btnSpeakTop.addEventListener("pointerleave", () => {
  if (speakHoldTimer) { clearTimeout(speakHoldTimer); speakHoldTimer = null; }
});

// ── Back (delete last word) ────────────────────────────────────────
barBack.addEventListener("click", () => {
  if (sentence.length > 0) {
    sentence.pop();
    updateDisplay();
  }
});

// ── Hold to clear (0.9 seconds) ───────────────────────────────────
barClear.addEventListener("pointerdown", startClear);
barClear.addEventListener("pointerup",   cancelClear);
barClear.addEventListener("pointerleave",cancelClear);

function startClear() {
  clearStarted = true;
  clearProgress.classList.add("filling");
  clearTimer = setTimeout(() => {
    if (clearStarted) {
      sentence = [];
      updateDisplay();
      clearProgress.classList.remove("filling");
      clearStarted = false;
    }
  }, 900);
}

function cancelClear() {
  clearStarted = false;
  clearProgress.classList.remove("filling");
  if (clearTimer) { clearTimeout(clearTimer); clearTimer = null; }
  void clearProgress.offsetWidth;
}

// ── Keyboard overlay ───────────────────────────────────────────────
barKeyboard.addEventListener("click", () => {
  keyboardOverlay.classList.remove("hidden");
  setTimeout(() => keyboardInput.focus(), 100);
});

kbSpeak.addEventListener("click", () => {
  const t = keyboardInput.value.trim();
  if (t) speak(t);
});

kbAdd.addEventListener("click", () => {
  const t = keyboardInput.value.trim();
  if (t) {
    sentence.push(t);
    logEvent('keyboard', { text: t });
    updateDisplay();
    keyboardInput.value = "";
    keyboardOverlay.classList.add("hidden");
  }
});

kbClose.addEventListener("click", () => {
  keyboardOverlay.classList.add("hidden");
  keyboardInput.value = "";
});

// ── Help flow ──────────────────────────────────────────────────────
barHelp.addEventListener("click", () => {
  // If safety channel fired in the last 20 minutes, skip straight back to it
  const SAFETY_WINDOW = 20 * 60 * 1000;
  if (window.__safetyFiredAt && Date.now() - window.__safetyFiredAt < SAFETY_WINDOW) {
    privateChannel.classList.remove("hidden");
    return;
  }
  helpModal.classList.remove("hidden");
});

// General help path — caretaker-visible, just needs assistance
helpGeneral.addEventListener("click", () => {
  helpModal.classList.add("hidden");
  sendGeneralHelpAlert();
  helpSentModal.classList.remove("hidden");
});

helpNo.addEventListener("click", () => {
  helpModal.classList.add("hidden");
});

helpSentOk.addEventListener("click", () => {
  helpSentModal.classList.add("hidden");
});

// Private safety channel path
helpPrivate.addEventListener("click", () => {
  helpModal.classList.add("hidden");
  privateChannel.classList.remove("hidden");
});

pcBack.addEventListener("click", () => {
  privateChannel.classList.add("hidden");
  helpModal.classList.remove("hidden");
});

document.querySelectorAll(".pc-option").forEach(btn => {
  btn.addEventListener("click", () => {
    const reason = btn.dataset.reason;
    privateChannel.classList.add("hidden");
    sendPrivateAlert(reason);
    privateSentModal.classList.remove("hidden");
  });
});

psOk.addEventListener("click", () => {
  privateSentModal.classList.add("hidden");
  // Keep safety active for 20 minutes — Help button goes straight to private channel
  window.__safetyFiredAt = Date.now();
});

// ── General help alert (caretaker-facing) ─────────────────────────
function sendGeneralHelpAlert() {
  console.info("🤝 GENERAL HELP REQUEST logged at", new Date().toLocaleString());
  logEvent('help_general', { method: 'help_button' });
}

// ── Private safety alert (bypasses caretaker) ─────────────────────
const REASON_LABELS = {
  scared:         "Someone is making me feel scared",
  hurting:        "Someone is hurting me",
  talk:           "I want to talk to someone I trust",
  unsafe:         "Something bad is happening",
  unsure:         "I'm not sure — I just need help",
  hidden_trigger: "Triggered via hidden symbol sequence (distress + help symbols tapped)",
};

const ALERT_COOLDOWN_MS = 60_000; // one alert per minute max
let   lastAlertTime     = 0;

function sendPrivateAlert(reason) {
  const now = Date.now();
  if (now - lastAlertTime < ALERT_COOLDOWN_MS) return; // silently block spam
  lastAlertTime = now;

  const settings     = loadSettings();
  const userName     = settings.userName     || "A child";
  const contactName  = settings.contactName  || "their trusted contact";
  const contactEmail = settings.contactEmail || "";
  const reasonLabel  = REASON_LABELS[reason] || "I need help";
  const currentMsg   = sentence.join(" ") || "(no message typed)";
  const timestamp    = new Date().toLocaleString();

  const subject = encodeURIComponent(`🛡️ PRIVATE ALERT: ${userName} needs help`);
  const body = encodeURIComponent(
    `Hi ${contactName},\n\n` +
    `${userName} used the private safety channel in their AAC communication app.\n\n` +
    `What they said: "${reasonLabel}"\n` +
    `Time: ${timestamp}\n` +
    `Their last message in the app: "${currentMsg}"\n\n` +
    `⚠️ This alert was sent privately — their caretaker did not see this message.\n\n` +
    `Please check on ${userName} immediately and discreetly.\n` +
    `If you believe they are in danger, contact the appropriate authorities.\n\n` +
    `— Speak AAC App (Private Safety Channel)`
  );

  // Fire silently — EmailJS sends directly from browser, no mail app opens
  if (contactEmail) {
    const ejsReady = EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY;

    if (ejsReady) {
      // Real silent send via EmailJS
      emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          to_email:     contactEmail,
          to_name:      contactName,
          user_name:    userName,
          reason:       reasonLabel,
          last_message: currentMsg,
          timestamp:    timestamp,
        },
        EMAILJS_PUBLIC_KEY
      ).catch(err => {
        // Fail silently — do not expose errors on the child's screen
        console.error("EmailJS error:", err);
      });
    } else {
      // Fallback: mailto (visible — replace with EmailJS credentials to fix)
      const link = document.createElement("a");
      link.href = `mailto:${contactEmail}?subject=${subject}&body=${encodeURIComponent(
        `Hi ${contactName},\n\n${userName} used the private safety channel.\n\nWhat they said: "${reasonLabel}"\nTime: ${timestamp}\nLast message: "${currentMsg}"\n\n⚠️ This was sent privately — the caretaker did not see this.\n\nPlease check on ${userName} immediately.\n\n— Speak AAC (Private Safety Channel)`
      )}`;
      link.target = "_blank";
      link.rel = "noopener";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // Only show 911/hotline links for serious abuse indicators — not for talk/unsure/scared
  const seriousAlert = ['hurting', 'unsafe', 'hidden_trigger'].includes(reason);
  document.getElementById('ps-crisis-box').style.display = seriousAlert ? '' : 'none';

  // Disable tappable phone links for young children (2-8) or kiosk mode — prevent accidental misdials
  const profile = (loadSettings().profile || {});
  const youngChild = ['2-4', '5-8'].includes(profile.age);
  privateSentModal.classList.toggle('safe-dial-off', youngChild || !!loadSettings().kiosk);

  logEvent('help_alert', {
    reason,
    method: reason === 'hidden_trigger' ? 'symbol_sequence' : 'private_channel',
  });

  // Full audit log
  console.warn("🛡️ PRIVATE SAFETY ALERT FIRED:", {
    to: contactEmail || "⚠️ no trusted contact configured",
    user: userName,
    reason: reasonLabel,
    lastMessage: currentMsg,
    timestamp,
  });
}

// ── PIN Modal ──────────────────────────────────────────────────────
let pinEntry = "";

function openPinModal() {
  pinEntry = "";
  pinError.classList.add("hidden");
  updatePinDots();
  pinModal.classList.remove("hidden");
}

function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`pd${i}`);
    dot.classList.toggle("filled", i < pinEntry.length);
  }
}

function submitPin() {
  const settings = loadSettings();
  const correctPin = settings.pin || "0000";
  if (pinEntry === correctPin) {
    pinModal.classList.add("hidden");
    pinEntry = "";
    openSetupModal();
  } else {
    pinError.classList.remove("hidden");
    pinEntry = "";
    updatePinDots();
    setTimeout(() => pinError.classList.add("hidden"), 2000);
  }
}

document.querySelectorAll(".pin-key[data-val]").forEach(btn => {
  btn.addEventListener("click", () => {
    if (pinEntry.length < 4) {
      pinEntry += btn.dataset.val;
      updatePinDots();
      if (pinEntry.length === 4) setTimeout(submitPin, 200);
    }
  });
});

pinDel.addEventListener("click", () => {
  pinEntry = pinEntry.slice(0, -1);
  updatePinDots();
  pinError.classList.add("hidden");
});

pinCancel.addEventListener("click", () => {
  pinModal.classList.add("hidden");
  pinEntry = "";
});

// ── Setup Modal ────────────────────────────────────────────────────
function openSetupModal() {
  const settings = loadSettings();
  document.getElementById("s-name").value         = settings.userName    || "";
  document.getElementById("s-contact-name").value = settings.contactName || "";
  document.getElementById("s-contact-email").value = settings.contactEmail  || "";
  document.getElementById("s-teacher-email").value = settings.teacherEmail  || "";
  document.getElementById("s-pin").value          = "";

  setupSaved.classList.add("hidden");
  updateAccountSection();

  // Kiosk toggle
  const kioskCheckbox = document.getElementById("s-kiosk");
  kioskCheckbox.checked = settings.kiosk || false;

  const kioskStatusEl = document.getElementById("kiosk-status");
  kioskStatusEl.textContent = settings.kiosk
    ? "✅ Kiosk mode is active — app is locked in fullscreen."
    : "Kiosk mode is off.";
  kioskStatusEl.className = `key-status ${settings.kiosk ? "ok" : "missing"}`;

  // Show current tier
  const tierNames  = { free: "Free", family: "Family", lifetime: "Lifetime", clinic: "Clinic", institution: "Institution" };
  const tierColors = { free: "missing", family: "ok", lifetime: "ok", clinic: "ok", institution: "ok" };
  const tierEl = document.getElementById("setup-tier-display");
  const currentTier = settings.tier || "free";
  tierEl.textContent = `Current plan: ${tierNames[currentTier] || "Free"}`;
  tierEl.className = `key-status ${tierColors[currentTier] || "missing"}`;

  renderCustomSetupSection();
  setupModal.classList.remove("hidden");
}

setupClose.addEventListener("click", () => {
  setupModal.classList.add("hidden");
});

document.getElementById("setup-open-plans").addEventListener("click", () => {
  setupModal.classList.add("hidden");
  openPlansModal();
});

document.getElementById("setup-redo").addEventListener("click", () => {
  setupModal.classList.add("hidden");
  const s = loadSettings();
  s.onboardingComplete = false;
  saveSettings(s);
  startOnboarding();
});

document.getElementById("setup-open-dashboard").addEventListener("click", () => {
  setupModal.classList.add("hidden");
  openDashboard();
});

setupSave.addEventListener("click", () => {
  const settings  = loadSettings();
  const newPin    = document.getElementById("s-pin").value.trim();
  settings.userName     = document.getElementById("s-name").value.trim();
  settings.contactName  = document.getElementById("s-contact-name").value.trim();
  settings.contactEmail  = document.getElementById("s-contact-email").value.trim();
  settings.teacherEmail  = document.getElementById("s-teacher-email").value.trim();

  if (newPin.length === 4 && /^\d{4}$/.test(newPin)) settings.pin = newPin;

  const wasKiosk = settings.kiosk;
  settings.kiosk = document.getElementById("s-kiosk").checked;

  saveSettings(settings);

  // Apply or exit kiosk based on new value
  if (settings.kiosk && !wasKiosk) applyKioskMode();
  else if (!settings.kiosk && wasKiosk) exitKioskMode();

  // Update kiosk status display
  const kioskStatusEl = document.getElementById("kiosk-status");
  kioskStatusEl.textContent = settings.kiosk
    ? "✅ Kiosk mode is active — app is locked in fullscreen."
    : "Kiosk mode is off.";
  kioskStatusEl.className = `key-status ${settings.kiosk ? "ok" : "missing"}`;

  setupSaved.classList.remove("hidden");
  setTimeout(() => setupSaved.classList.add("hidden"), 2500);
  showToast('Settings saved', 'success', 2500);

  // Refresh AI button visibility
  updateDisplay();
});

// ── Upgrade prompt ─────────────────────────────────────────────────
upgradeGo.addEventListener("click", () => {
  upgradeModal.classList.add("hidden");
  openPlansModal();
});

upgradeCancel.addEventListener("click", () => {
  upgradeModal.classList.add("hidden");
});

// ── Plans modal ────────────────────────────────────────────────────
function planBtnLabel(t) {
  if (t === "free")        return "Get Started Free";
  if (t === "family")      return "Get Family";
  if (t === "lifetime")    return "Buy Once — Own It";
  if (t === "clinic")      return "Get Clinic";
  if (t === "institution") return "Contact Us";
  return "Select";
}

function openPlansModal() {
  const tier = getTier();
  // Reflect current plan on buttons
  document.querySelectorAll(".plan-btn[data-select]").forEach(btn => {
    const t = btn.dataset.select;
    if (t === tier) {
      btn.textContent = "Current Plan";
      btn.disabled = true;
    } else {
      btn.disabled = false;
      btn.textContent = planBtnLabel(t);
    }
  });
  plansModal.classList.remove("hidden");
}

plansClose.addEventListener("click", () => {
  plansModal.classList.add("hidden");
});

// Stripe payment links — keyed by tier
const STRIPE_LINKS = {
  family:      'https://buy.stripe.com/8x25kw1eQfeMgdDeh8dwc00',
  lifetime:    'https://buy.stripe.com/dRm4gscXy5Ec5yZ0qidwc04',
  clinic:      'https://buy.stripe.com/00w9AM9Lm5Ec0eF5KCdwc01',
  institution: 'https://buy.stripe.com/28EfZa9LmeaI1iJb4Wdwc03',
};

document.querySelectorAll(".plan-btn[data-select]").forEach(btn => {
  btn.addEventListener("click", () => {
    const selected = btn.dataset.select;

    // Free tier — activate locally with no payment needed
    if (selected === "free") {
      const settings = loadSettings();
      settings.tier = "free";
      saveSettings(settings);
      document.querySelectorAll(".plan-btn[data-select]").forEach(b => {
        b.disabled = b.dataset.select === "free";
        b.textContent = b.dataset.select === "free" ? "Current Plan" : planBtnLabel(b.dataset.select);
      });
      updateDisplay();
      btn.textContent = "✅ Activated!";
      setTimeout(() => plansModal.classList.add("hidden"), 1200);
      return;
    }

    // Institution — open contact email
    if (selected === "institution") {
      window.open(
        "mailto:support@speakaac.org?subject=Institution%20Plan%20Inquiry&body=Hi%20Logan%2C%20I'm%20interested%20in%20the%20Institution%20plan%20for%20Speak.",
        "_blank"
      );
      return;
    }

    // Lifetime — redirect to Stripe one-time payment when link is ready
    if (selected === "lifetime") {
      if (STRIPE_LINKS.lifetime) {
        window.open(STRIPE_LINKS.lifetime, "_blank");
        showToast("Redirecting to checkout…", "info", 3000);
      } else {
        window.open(
          "mailto:support@speakaac.org?subject=Lifetime%20Plan&body=Hi%2C%20I'd%20like%20to%20purchase%20the%20Speak%20Lifetime%20plan.",
          "_blank"
        );
      }
      return;
    }

    // Paid tier (family / clinic) — redirect to Stripe
    if (STRIPE_LINKS[selected]) {
      window.open(STRIPE_LINKS[selected], "_blank");
      // Show a hint so the user knows what to do after paying
      btn.textContent = "Opening Stripe…";
      setTimeout(() => {
        btn.textContent = planBtnLabel(selected);
        plansModal.classList.add("hidden");
      }, 2000);
      return;
    }
  });
});

// ── Kiosk mode ────────────────────────────────────────────────────
const kioskBadge = document.getElementById("kiosk-badge");
let _kioskListenerAdded = false;

function applyKioskMode() {
  const settings = loadSettings();
  if (!settings.kiosk) {
    kioskBadge.classList.add("hidden");
    return;
  }

  kioskBadge.classList.remove("hidden");

  // Enter fullscreen
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();

  // Re-enter fullscreen if the user somehow exits — add listener only once
  if (!_kioskListenerAdded) {
    _kioskListenerAdded = true;
    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement && loadSettings().kiosk) {
        setTimeout(() => {
          document.documentElement.requestFullscreen &&
            document.documentElement.requestFullscreen().catch(() => {});
        }, 400);
      }
    });

    // Block common exit shortcuts (contextmenu, etc.) — also add only once
    document.addEventListener("contextmenu", e => {
      if (loadSettings().kiosk) e.preventDefault();
    });
  }
}

function exitKioskMode() {
  const settings = loadSettings();
  settings.kiosk = false;
  saveSettings(settings);
  kioskBadge.classList.add("hidden");
  if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
  else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
}

// ── Profile config ─────────────────────────────────────────────────
function setupCustomInterestCategory(interestName) {
  // Use 'interest' as the key — 'custom' is already taken by the Mine/photo category
  const key = 'interest';
  if (!SYMBOLS[key]) SYMBOLS[key] = [];
  if (document.querySelector(`.cat-btn[data-cat="${key}"]`)) return;

  const catNav  = document.getElementById('category-nav');
  const btn     = document.createElement('button');
  btn.className = 'cat-btn';
  btn.dataset.cat = key;
  const short   = interestName.length > 8 ? interestName.slice(0, 7) + '…' : interestName;
  btn.innerHTML = `<span class="cat-dot"></span><span class="cat-emoji">⭐</span>${short}`;
  // Insert before the Mine button so Mine stays last
  const mineBtn = document.querySelector('.cat-btn[data-cat="custom"]');
  catNav.insertBefore(btn, mineBtn || null);

  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = key;
    renderGrid(key);
    grid.scrollTop = 0;
  });
}

function applyProfileConfig() {
  const profile = loadSettings().profile || {};
  const root    = document.documentElement;
  const body    = document.body;

  if (profile.gridColumns) root.style.setProperty('--grid-cols', profile.gridColumns);

  body.classList.toggle('large-targets',      !!profile.largeTargets);
  body.classList.toggle('high-contrast',      !!profile.highContrast);
  body.classList.toggle('reduced-animations', !!profile.reducedAnimations);
  body.classList.toggle('adult-mode',         !!profile.adultMode);
  body.classList.toggle('keyboard-forward',   !!profile.keyboardForward);

  // Background theme
  ['sky', 'meadow', 'lavender', 'minimal'].forEach(t => body.classList.remove(`theme-${t}`));
  if (profile.backgroundTheme && profile.backgroundTheme !== 'default') {
    body.classList.add(`theme-${profile.backgroundTheme}`);
  }

  if (profile.startCategory && SYMBOLS[profile.startCategory]) {
    activeCategory = profile.startCategory;
    catBtns.forEach(b => b.classList.toggle('active', b.dataset.cat === activeCategory));
  }

  if (profile.customInterest) setupCustomInterestCategory(profile.customInterest);
}

// ── Session lock ───────────────────────────────────────────────────
const INACTIVITY_MS  = 10 * 60 * 1000; // 10 minutes
let   _inactivityTimer = null;
let   _slEntry         = '';
let   _returnVisit     = false;          // true if onboarding was already done on load

const sessionLockEl  = document.getElementById('session-lock');
const slNameEl       = document.getElementById('sl-name');
const slGreetingEl   = document.getElementById('sl-greeting');
const slErrorEl      = document.getElementById('sl-error');

function showSessionLock() {
  const name = loadSettings().userName || '';
  slNameEl.textContent     = name || 'Speak';
  slGreetingEl.textContent = name ? 'Welcome back,' : 'Welcome back to';
  _slEntry = '';
  slErrorEl.classList.add('hidden');
  updateSlDots();
  sessionLockEl.classList.remove('hidden');
}

function updateSlDots() {
  for (let i = 0; i < 4; i++) {
    document.getElementById(`sld${i}`).classList.toggle('filled', i < _slEntry.length);
  }
}

function submitSessionPin() {
  const correct = loadSettings().pin || '0000';
  if (_slEntry === correct) {
    sessionLockEl.classList.add('hidden');
    _slEntry = '';
    resetInactivityTimer();
  } else {
    slErrorEl.classList.remove('hidden');
    _slEntry = '';
    updateSlDots();
    setTimeout(() => slErrorEl.classList.add('hidden'), 2000);
  }
}

function resetInactivityTimer() {
  clearTimeout(_inactivityTimer);
  _inactivityTimer = setTimeout(() => {
    if (loadSettings().onboardingComplete && sessionLockEl.classList.contains('hidden')) {
      showSessionLock();
    }
  }, INACTIVITY_MS);
}

document.querySelectorAll('.sl-key[data-val]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (_slEntry.length < 4) {
      _slEntry += btn.dataset.val;
      updateSlDots();
      if (_slEntry.length === 4) setTimeout(submitSessionPin, 200);
    }
  });
});

document.getElementById('sl-del').addEventListener('click', () => {
  _slEntry = _slEntry.slice(0, -1);
  updateSlDots();
  slErrorEl.classList.add('hidden');
});

document.getElementById('sl-forgot')?.addEventListener('click', () => {
  slErrorEl.textContent = 'Default PIN is 0000 · Tap 🔊 3s in app to change it';
  slErrorEl.classList.remove('hidden');
  setTimeout(() => {
    slErrorEl.textContent = 'Incorrect PIN — try again';
    slErrorEl.classList.add('hidden');
  }, 5000);
});

// Reset inactivity timer on any user interaction
['touchstart', 'click', 'keydown', 'pointerdown'].forEach(evt => {
  document.addEventListener(evt, () => {
    if (sessionLockEl.classList.contains('hidden')) resetInactivityTimer();
  }, { passive: true });
});

// Re-lock when app comes back to foreground
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible'
      && loadSettings().onboardingComplete
      && sessionLockEl.classList.contains('hidden')) {
    showSessionLock();
  }
});

// ── Core Vocabulary Bar ────────────────────────────────────────────
function renderCoreBar() {
  const bar = document.getElementById('core-vocab-bar');
  if (!bar || typeof CORE_VOCAB === 'undefined') return;
  bar.innerHTML = '';

  CORE_VOCAB.forEach(word => {
    const btn = document.createElement('button');
    btn.className = 'core-word-btn';
    btn.title = word.speech;

    const pic = ARASAAC.makePicImg(word.arasaac, picCache);
    if (pic) {
      pic.style.width  = '28px';
      pic.style.height = '28px';
      pic.style.objectFit = 'contain';
      btn.appendChild(pic);
    } else {
      const emojiEl = document.createElement('span');
      emojiEl.className = 'core-word-emoji';
      emojiEl.textContent = word.emoji;
      btn.appendChild(emojiEl);
    }

    const lbl = document.createElement('span');
    lbl.className = 'core-word-label';
    lbl.textContent = word.label;
    btn.appendChild(lbl);

    btn.addEventListener('click', () => {
      btn.classList.add('flash');
      setTimeout(() => btn.classList.remove('flash'), 280);
      speak(word.speech);
      sentence.push(word.speech);
      logEvent('symbol', { id: word.id, label: word.label, category: 'core', speech: word.speech });
      updateDisplay();
      checkHiddenTrigger();
    });

    bar.appendChild(btn);
  });
}

// ── Session History Drawer ─────────────────────────────────────────
function updateHistoryCount() {
  const el = document.getElementById('history-count');
  if (!el) return;
  const n = sessionLog.length;
  el.textContent = n > 0 ? `· ${n} item${n !== 1 ? 's' : ''}` : '';
}

function renderHistoryDrawer() {
  const list = document.getElementById('history-list');
  const empty = document.getElementById('history-empty');
  if (!list) return;

  // Remove all entries (keep the empty placeholder in DOM)
  list.querySelectorAll('.history-entry').forEach(el => el.remove());

  if (sessionLog.length === 0) {
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';

  sessionLog.forEach(ev => {
    const entry = document.createElement('div');
    entry.className = 'history-entry';

    let dotClass = 'hdot-symbol';
    let text = '';

    switch (ev.type) {
      case 'sentence_spoken':
        dotClass = 'hdot-sentence';
        text = `🗣 &ldquo;${esc(ev.payload?.text)}&rdquo;`;
        break;
      case 'ai_sentence':
        dotClass = 'hdot-ai';
        text = `✨ AI: &ldquo;${esc(ev.payload?.output)}&rdquo;`;
        break;
      case 'keyboard':
        dotClass = 'hdot-keyboard';
        text = `⌨ Typed: &ldquo;${esc(ev.payload?.text)}&rdquo;`;
        break;
      case 'symbol':
        dotClass = ev.payload?.category === 'core' ? 'hdot-core' : 'hdot-symbol';
        text = esc(ev.payload?.label || ev.payload?.speech);
        break;
      case 'help_alert':
        dotClass = 'hdot-alert';
        text = `⚠ Safety alert — ${esc(ev.payload?.reason || 'Help requested')}`;
        break;
      default:
        text = esc(ev.type);
    }

    entry.innerHTML = `
      <div class="history-dot ${dotClass}"></div>
      <div class="history-body">
        <div class="history-text">${text}</div>
        <div class="history-time">${esc(ev.timeStr)}</div>
      </div>
    `;
    list.appendChild(entry);
  });
}

function toggleHistoryDrawer() {
  const drawer = document.getElementById('history-drawer');
  const btn    = document.getElementById('bar-history');
  if (!drawer) return;

  historyOpen = !historyOpen;
  drawer.classList.toggle('open', historyOpen);
  btn.classList.toggle('bar-active', historyOpen);

  if (historyOpen) renderHistoryDrawer();
}

document.getElementById('bar-history').addEventListener('click', toggleHistoryDrawer);
document.getElementById('history-close').addEventListener('click', () => {
  historyOpen = false;
  document.getElementById('history-drawer').classList.remove('open');
  document.getElementById('bar-history').classList.remove('bar-active');
});

// ── Custom Symbols ─────────────────────────────────────────────────
const CUSTOM_SYMS_KEY = 'aac_custom_v1';

function loadCustomSymbols() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_SYMS_KEY)) || []; }
  catch { return []; }
}

function saveCustomSymbol(sym) {
  const syms = loadCustomSymbols();
  syms.unshift(sym);
  localStorage.setItem(CUSTOM_SYMS_KEY, JSON.stringify(syms));
}

function deleteCustomSymbol(id) {
  const syms = loadCustomSymbols().filter(s => s.id !== id);
  localStorage.setItem(CUSTOM_SYMS_KEY, JSON.stringify(syms));
}

function renderCustomGrid() {
  const syms = loadCustomSymbols();
  if (syms.length === 0) {
    const ph = document.createElement('div');
    ph.className = 'custom-cat-placeholder';
    ph.innerHTML = `
      <div class="ccp-icon">📷</div>
      <div class="ccp-title">My Symbols</div>
      <div class="ccp-body">No custom symbols yet. Open <strong>Provider Settings → My Symbols</strong> to upload photos of people, pets, or favorite things — they become tappable symbol buttons right here.</div>
    `;
    grid.appendChild(ph);
    return;
  }
  syms.forEach(sym => grid.appendChild(makeCard(sym, 'custom')));
}

function renderCustomSetupSection() {
  const list = document.getElementById('custom-sym-list');
  if (!list) return;
  const syms = loadCustomSymbols();
  list.innerHTML = '';
  if (syms.length === 0) {
    list.innerHTML = '<p class="setup-hint" style="margin-top:4px;font-style:italic">No custom symbols yet — add your first one above.</p>';
    return;
  }
  syms.forEach(sym => {
    const row = document.createElement('div');
    row.className = 'custom-sym-row';
    row.innerHTML = `
      <img class="custom-sym-thumb" src="${esc(sym.dataUrl)}" alt="${esc(sym.label)}" />
      <div class="custom-sym-info">
        <div class="custom-sym-name">${esc(sym.label)}</div>
        <div class="custom-sym-speech">&ldquo;${esc(sym.speech)}&rdquo;</div>
      </div>
      <button class="custom-sym-delete" data-id="${esc(sym.id)}">Delete</button>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll('.custom-sym-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteCustomSymbol(btn.dataset.id);
      renderCustomSetupSection();
      if (activeCategory === 'custom') renderGrid('custom');
    });
  });
}

// Custom symbol upload wiring
let _pendingCustomDataUrl = null;

document.getElementById('custom-upload-btn').addEventListener('click', () => {
  document.getElementById('custom-file-input').click();
});

document.getElementById('custom-file-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    _pendingCustomDataUrl = ev.target.result;
    document.getElementById('custom-preview-img').src = _pendingCustomDataUrl;
    document.getElementById('custom-upload-preview').classList.remove('hidden');
    document.getElementById('custom-upload-btn').textContent = '📷 Change Photo';
  };
  reader.readAsDataURL(file);
  e.target.value = ''; // allow re-selecting same file
});

document.getElementById('custom-preview-clear').addEventListener('click', () => {
  _pendingCustomDataUrl = null;
  document.getElementById('custom-upload-preview').classList.add('hidden');
  document.getElementById('custom-upload-btn').textContent = '📷 Choose Photo';
});

document.getElementById('custom-sym-add').addEventListener('click', () => {
  const label  = document.getElementById('custom-sym-label').value.trim();
  const speech = document.getElementById('custom-sym-speech').value.trim();
  const status = document.getElementById('custom-sym-status');

  if (!_pendingCustomDataUrl) {
    status.textContent = 'Please choose a photo first.';
    status.className   = 'setup-hint err';
    status.classList.remove('hidden');
    return;
  }
  if (!label) {
    status.textContent = 'Please enter a name for this symbol.';
    status.className   = 'setup-hint err';
    status.classList.remove('hidden');
    return;
  }

  saveCustomSymbol({
    id:       'custom_' + Date.now(),
    label,
    speech:   speech || label,
    dataUrl:  _pendingCustomDataUrl,
    category: 'custom',
  });

  // Reset form
  _pendingCustomDataUrl = null;
  document.getElementById('custom-sym-label').value  = '';
  document.getElementById('custom-sym-speech').value = '';
  document.getElementById('custom-upload-preview').classList.add('hidden');
  document.getElementById('custom-upload-btn').textContent = '📷 Choose Photo';

  status.textContent = '✅ Symbol added! Find it in the "Mine" category.';
  status.className   = 'setup-hint ok';
  status.classList.remove('hidden');
  setTimeout(() => status.classList.add('hidden'), 3000);

  renderCustomSetupSection();
  if (activeCategory === 'custom') renderGrid('custom');
});

// ── Offline Indicator ──────────────────────────────────────────────
function updateOfflineBadge() {
  const badge = document.getElementById('offline-badge');
  if (!badge) return;
  badge.classList.toggle('hidden', navigator.onLine);
}

window.addEventListener('online',  updateOfflineBadge);
window.addEventListener('offline', updateOfflineBadge);
updateOfflineBadge();

// ── Init ───────────────────────────────────────────────────────────
async function init() {
  picCache = await ARASAAC.loadAllPictograms(SYMBOLS);

  // Try loading profile from cloud first (falls back to localStorage if offline/not signed in)
  if (window.Sync) {
    const cloud = await Sync.load();
    if (cloud) localStorage.setItem(SETTINGS_KEY, JSON.stringify(cloud));
  }

  const settings = loadSettings();
  if (!settings.onboardingComplete) {
    // New user — show sign-in/create account first, then onboarding
    const session = window.Sync ? await Sync.getSession() : null;
    if (session) {
      // Already signed in (e.g. cleared localStorage but still has Supabase session)
      startOnboarding();
    } else {
      showAuthModal('pre');
    }
    return;
  }
  _returnVisit = true; // Profile already existed on load — show session lock
  finishInit();
}

function hideAppLoading() {
  document.getElementById('app-loading').classList.add('hidden');
}

function finishInit() {
  hideAppLoading();
  document.getElementById('onboarding-overlay').classList.add('hidden');
  applyProfileConfig();
  renderCoreBar();
  renderGrid(activeCategory);
  updateDisplay();
  applyKioskMode();
  if (_returnVisit) showSessionLock();
  resetInactivityTimer();
}

if (!window.__awaitingAccess) init();

// ── Auth modal ─────────────────────────────────────────────────────
let _authPostOnboarding = false;
let _authPreOnboarding  = false;

function showAuthModal(mode = false) {
  // mode: 'pre' (before onboarding), 'post' (after onboarding), false (settings)
  _authPostOnboarding = (mode === 'post' || mode === true);
  _authPreOnboarding  = (mode === 'pre');

  if (_authPreOnboarding) {
    document.getElementById('auth-title').textContent = 'Welcome to Speak';
    document.getElementById('auth-sub').textContent =
      'Create a free account to save the profile across devices — or skip to set up right now.';
    // Default to sign-up tab
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('auth-tab-active'));
    document.querySelector('.auth-tab[data-tab="signup"]').classList.add('auth-tab-active');
    document.getElementById('auth-submit').textContent = 'Create Account';
    document.getElementById('auth-password').placeholder = 'Password (min 6 characters)';
  } else if (_authPostOnboarding) {
    const name = (loadSettings().userName || (window.obAnswers && obAnswers.userName) || '').trim();
    document.getElementById('auth-sub').textContent =
      `Create a free account so ${name ? name + "'s" : 'their'} settings are never lost — even if you switch devices.`;
    document.getElementById('auth-title').textContent = 'Save your profile';
  } else {
    document.getElementById('auth-sub').textContent = 'Sign in to sync your settings across devices.';
    document.getElementById('auth-title').textContent = 'Cloud Sync';
  }
  document.getElementById('auth-error').classList.add('hidden');
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-password').value = '';
  hideAppLoading();
  document.getElementById('auth-modal').classList.remove('hidden');
}

function hideAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}

document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('auth-tab-active'));
    tab.classList.add('auth-tab-active');
    const isSignup = tab.dataset.tab === 'signup';
    document.getElementById('auth-submit').textContent = isSignup ? 'Create Account' : 'Sign In';
    document.getElementById('auth-password').placeholder = isSignup ? 'Password (min 6 characters)' : 'Password';
    document.getElementById('auth-error').classList.add('hidden');
    const forgotLink = document.getElementById('auth-forgot-link');
    if (isSignup) forgotLink.classList.add('hidden');
    else forgotLink.classList.remove('hidden');
  });
});

document.getElementById('auth-forgot-link').addEventListener('click', async (e) => {
  e.preventDefault();
  const email  = document.getElementById('auth-email').value.trim();
  const errEl  = document.getElementById('auth-error');
  if (!email) {
    errEl.textContent = 'Enter your email address first.';
    errEl.classList.remove('hidden');
    return;
  }
  errEl.classList.add('hidden');
  const link = document.getElementById('auth-forgot-link');
  link.textContent = 'Sending…';
  const { error } = await Sync.resetPassword(email);
  if (error) {
    errEl.textContent = error.message || 'Could not send reset email — try again.';
    errEl.classList.remove('hidden');
    link.textContent = 'Forgot password?';
  } else {
    link.textContent = '✓ Check your email for a reset link.';
    link.style.color = 'var(--green)';
  }
});

document.getElementById('auth-submit').addEventListener('click', async () => {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const isSignup = document.querySelector('.auth-tab-active').dataset.tab === 'signup';
  const errEl    = document.getElementById('auth-error');
  const btn      = document.getElementById('auth-submit');

  if (!email || !password) {
    errEl.textContent = 'Please enter your email and password.';
    errEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.textContent = '...';
  errEl.classList.add('hidden');

  try {
    const { error } = isSignup
      ? await Sync.signUp(email, password)
      : await Sync.signIn(email, password);
    if (error) throw error;

    hideAuthModal();
    if (_authPostOnboarding) completeOnboarding();
    else if (_authPreOnboarding) { _authPreOnboarding = false; startOnboarding(); }
    updateAccountSection();
  } catch (e) {
    errEl.textContent = e.message || 'Something went wrong — try again.';
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = isSignup ? 'Create Account' : 'Sign In';
  }
});

document.getElementById('auth-skip').addEventListener('click', () => {
  hideAuthModal();
  if (_authPostOnboarding) completeOnboarding();
  else if (_authPreOnboarding) { _authPreOnboarding = false; startOnboarding(); }
});

// After onboarding done screen — show auth modal unless already signed in
document.addEventListener('ob:done', async () => {
  const session = window.Sync ? await Sync.getSession() : null;
  if (session) {
    completeOnboarding();
  } else {
    showAuthModal(true);
  }
});

// ── Account section in Provider Settings ──────────────────────────
async function updateAccountSection() {
  if (!window.Sync) return;
  const session    = await Sync.getSession();
  const statusEl   = document.getElementById('setup-account-status');
  const signinBtn  = document.getElementById('setup-signin-btn');
  const signoutBtn = document.getElementById('setup-signout-btn');

  if (session) {
    statusEl.textContent = `✅ Signed in as ${session.user.email}`;
    statusEl.className   = 'key-status ok';
    signinBtn.classList.add('hidden');
    signoutBtn.classList.remove('hidden');
  } else {
    statusEl.textContent = 'Not signed in — settings saved on this device only.';
    statusEl.className   = 'key-status missing';
    signinBtn.classList.remove('hidden');
    signoutBtn.classList.add('hidden');
  }
}

document.getElementById('setup-signin-btn').addEventListener('click', () => {
  setupModal.classList.add('hidden');
  showAuthModal(false);
});

document.getElementById('setup-signout-btn').addEventListener('click', async () => {
  await Sync.signOut();
  updateAccountSection();
});

// ── About / FAQ Modal ──────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "Where does my child's data go?",
    a: "On the free plan, everything stays on this device only — it lives in your browser's local storage and never leaves. Nothing is sent to any server. On paid plans (Family / Clinic), communications sync to a secure cloud database that only you can access."
  },
  {
    q: "Can anyone else see what my child types or taps?",
    a: "No. The app has no analytics, no advertising, and no third-party tracking. On the free plan, no data ever leaves the device. Speak cannot see your child's communications."
  },
  {
    q: "Who receives the safety alerts?",
    a: "Only the trusted contact you set in Provider Settings — a grandparent, teacher, therapist, or other adult outside the primary caretaker relationship. Nobody at Speak sees the content of alerts. The trusted contact's information is stored only on your device."
  },
  {
    q: "What if my child accidentally triggers the safety channel?",
    a: "Simply let your trusted contact know it was accidental. You can also see a log of all alerts in the Provider Dashboard. There is no penalty or lockout for accidental triggers — the child should never feel they did something wrong for pressing it."
  },
  {
    q: "Is this app HIPAA compliant?",
    a: "The free and Family tiers are personal-use tools and are not covered healthcare arrangements under HIPAA. The Clinic tier is designed for licensed healthcare providers and includes a Business Associate Agreement (BAA) and HIPAA-compliant data handling. Contact us for documentation."
  },
  {
    q: "Can I delete my child's data?",
    a: "Yes, completely. On the free plan: open your browser settings and clear site data for this page — everything is gone instantly. On paid plans: contact support@speakaac.org and we will permanently delete your account and all associated data within 48 hours."
  },
  {
    q: "Is the app safe for children to use unsupervised?",
    a: "Speak has no ads, no social features, no external links visible to the child, and no in-app purchases the child can trigger. In Kiosk Mode, the child cannot exit the app or access any other part of the device. The child-facing interface is completely contained."
  },
  {
    q: "What does Speak cost? Is the safety channel ever paywalled?",
    a: "The core app is free forever. The private safety channel — the most important feature — is always free on every plan. We believe safety should never require a subscription. AI sentence builder and communication history require a paid plan."
  },
  {
    q: "What is the AI sentence builder and who sees those requests?",
    a: "When a child taps 2 or more symbols, the ✨ button turns those symbols into a full natural sentence spoken aloud. Free accounts get 10 AI sentences per day. Paid plans (Family and up) get unlimited AI sentences. Requests are processed through Speak's secure backend — no API key needed."
  },
  {
    q: "Who built this app?",
    a: "Speak was built by Logan Snell, an 18-year-old developer in Axtell, Kansas. It is an independent project with no corporate backing. The goal is to make professional-grade AAC accessible to every family, regardless of income — and to give nonverbal children a private way to stay safe."
  }
];

function buildFaqList() {
  const container = document.getElementById('faq-list');
  if (!container) return;
  container.innerHTML = '';
  FAQ_ITEMS.forEach((item, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'faq-item';

    const btn = document.createElement('button');
    btn.className = 'faq-q';
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = `<span>${item.q}</span><span class="faq-chevron">›</span>`;

    const ans = document.createElement('div');
    ans.className = 'faq-a';
    ans.textContent = item.a;

    btn.addEventListener('click', () => {
      const open = wrap.classList.toggle('faq-open');
      btn.setAttribute('aria-expanded', open);
    });

    wrap.appendChild(btn);
    wrap.appendChild(ans);
    container.appendChild(wrap);
  });
}

function openAboutModal() {
  buildFaqList();
  document.getElementById('about-version-line').textContent = 'Speak · Version 0.9 (Preview) · © 2026 Logan Snell';
  document.getElementById('about-modal').classList.remove('hidden');
}

function closeAboutModal() {
  document.getElementById('about-modal').classList.add('hidden');
}

document.getElementById('about-close').addEventListener('click', closeAboutModal);
document.getElementById('about-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('about-modal')) closeAboutModal();
});

document.getElementById('pw-learn-more').addEventListener('click', openAboutModal);

document.getElementById('setup-open-about').addEventListener('click', () => {
  setupModal.classList.add('hidden');
  openAboutModal();
});

// ── "How are we doing?" review prompt ──────────────────────────
(function initReviewPrompt() {
  const REVIEW_KEY    = 'speak_review_submitted';
  const DISMISS_KEY   = 'speak_review_dismissed';
  const SESSION_KEY   = 'speak_session_count';
  const SESSIONS_NEEDED = 5;

  // Increment session counter (only for return visits with a completed profile)
  const count = (parseInt(localStorage.getItem(SESSION_KEY), 10) || 0) + 1;
  localStorage.setItem(SESSION_KEY, count);

  if (count < SESSIONS_NEEDED) return;
  if (localStorage.getItem(REVIEW_KEY)) return;
  if (localStorage.getItem(DISMISS_KEY)) return;

  // Wait for finishInit to run (it's async), then show after session lock settles
  // _returnVisit is set by finishInit — by 2.5s it's guaranteed to be set
  setTimeout(() => {
    if (!_returnVisit) return; // only show for return visitors (not mid-onboarding)
    document.getElementById('review-modal').classList.remove('hidden');
  }, 2500);

  const reviewModal  = document.getElementById('review-modal');
  const stars        = reviewModal.querySelectorAll('.review-star');
  const submitBtn    = document.getElementById('review-submit');
  const dismissBtn   = document.getElementById('review-dismiss');
  const commentEl    = document.getElementById('review-comment');
  let _rating = 0;

  stars.forEach(star => {
    star.addEventListener('click', () => {
      _rating = parseInt(star.dataset.v, 10);
      stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.v, 10) <= _rating));
      submitBtn.disabled = false;
    });
    // Hover preview
    star.addEventListener('mouseenter', () => {
      const v = parseInt(star.dataset.v, 10);
      stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.v, 10) <= v));
    });
    star.addEventListener('mouseleave', () => {
      stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.v, 10) <= _rating));
    });
  });

  submitBtn.addEventListener('click', () => {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    const settings = loadSettings();
    const payload = {
      to_email:     'support@speakaac.org',
      to_name:      'Logan',
      user_name:    settings.childName || 'App User',
      reason:       `${_rating}/5 stars — In-app feedback`,
      last_message: commentEl.value.trim() || '(no comment)',
      timestamp:    new Date().toLocaleString(),
    };

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, payload, EMAILJS_PUBLIC_KEY)
      .then(() => {
        localStorage.setItem(REVIEW_KEY, '1');
        submitBtn.textContent = 'Thank you!';
        setTimeout(() => reviewModal.classList.add('hidden'), 1200);
      })
      .catch(() => {
        // Still mark submitted so we don't keep asking if EmailJS fails
        localStorage.setItem(REVIEW_KEY, '1');
        submitBtn.textContent = 'Sent!';
        setTimeout(() => reviewModal.classList.add('hidden'), 1200);
      });
  });

  dismissBtn.addEventListener('click', () => {
    localStorage.setItem(DISMISS_KEY, '1');
    reviewModal.classList.add('hidden');
  });
})();
