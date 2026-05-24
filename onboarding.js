// ── Onboarding Flow ────────────────────────────────────────────────

// Local esc() — onboarding.js loads before app.js so we can't rely on the global one
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Language helpers (onboarding.js loads alongside app.js) ────────
function obGetLang() { return localStorage.getItem('aac_lang') || 'en'; }

// ── Spanish strings for onboarding ─────────────────────────────────
const OB_STRINGS_ES = {
  welcome: {
    title: 'Toda persona merece una voz — y una segura.',
    body:  'Te haremos algunas preguntas rápidas para configurar Speak para quien lo usará. Toma aproximadamente un minuto.',
    start: 'Comenzar →',
    note:  'Puedes omitir cualquier pregunta y ajustar todo después en Configuración.',
    feat1: 'Personalizado según diagnóstico, edad y necesidades',
    feat2: 'Canal de seguridad privado — siempre gratis, siempre activo',
    feat3: 'Oraciones con IA, audio real y panel de proveedor',
  },
  name: {
    question: '¿Cómo se llama?', hint: 'El nombre de pila está bien',
    placeholder: 'ej. Alex', optional: 'Opcional — toca Continuar para omitir',
  },
  age: {
    question: '¿Cuántos años tiene [name]?',
    choices: { '2-4':'2 – 4','5-8':'5 – 8','9-12':'9 – 12','13-17':'13 – 17','18+':'18 o más' },
  },
  diagnosis: {
    question: '¿Conoces el diagnóstico de [name]?',
    hint: 'Elige la opción más cercana — esto ayuda a configurar el vocabulario y diseño correctos.',
  },
  reading: {
    question: '¿Puede [name] leer?',
    choices: { yes:'Sí, lee bien', some:'Algunas palabras', no:'Todavía no' },
  },
  motor: {
    question: '¿Qué tan bien puede [name] usar una pantalla táctil?',
    choices: { full:'Sin problema', limited:'Funciona, pero necesita botones más grandes', very_limited:'Tiene dificultad real para tocar' },
  },
  sensory: {
    question: '¿Tiene alguna sensibilidad sensorial?',
    hint: 'Selecciona todas las que apliquen',
    choices: { sound:'Sensible a sonidos', light:'Sensible a pantallas brillantes', none:'Ninguna' },
    optional: 'Selecciona todas — toca Continuar cuando termines',
  },
  background: {
    question: '¿Qué fondo se siente más cómodo para [name]?',
    hint: 'Elige mínimo si [name] se siente abrumado por patrones visuales. Puedes cambiarlo después.',
    choices: { default:'Cálido y acogedor', sky:'Azul cielo', meadow:'Verde pradera', lavender:'Lavanda suave', minimal:'Limpio y mínimo' },
  },
  primaryNeed: {
    question: '¿Qué necesita expresar [name] más?',
    choices: { needs:'Necesidades físicas', feelings:'Sentimientos', social:'Hablar con personas', all:'Todas estas' },
  },
  interests: {
    question: '¿Tiene [name] algún interés especial?',
    hint: 'Opcional — agregaremos una categoría personalizada',
    placeholder: 'ej. dinosaurios, Minecraft, trenes, música...',
    optional: 'Opcional — toca Continuar para omitir',
  },
  safety: {
    question: 'Agrega un contacto de seguridad de confianza',
    hint: 'Esta persona recibe una alerta privada si [name] se siente inseguro — sin pasar por el cuidador principal.',
    nameLabel: 'Nombre del contacto', emailLabel: 'Correo del contacto',
    namePH: 'ej. Abuela Susan', emailPH: 'confiable@ejemplo.com',
    optional: 'Opcional — toca Continuar para omitir',
  },
  pin: {
    question: 'Establece un PIN de proveedor',
    hint: 'Un PIN de 4 dígitos bloquea la configuración para que solo tú puedas cambiarla.',
    enter: 'Ingresa 4 dígitos', saved: '✅ PIN guardado',
  },
  done: {
    ready: 'está listo para ser escuchado.', allset: 'Todo listo para ser escuchado.',
    launch: 'Comenzar a usar Speak →',
    note: 'Ajusta cualquier configuración después manteniendo presionado 🔊 por 3 segundos.',
  },
};

function obStr(stepId, key, fallback) {
  if (obGetLang() !== 'es') return fallback;
  return (OB_STRINGS_ES[stepId] && OB_STRINGS_ES[stepId][key]) || fallback;
}
function obChoiceStr(stepId, value, fallback) {
  if (obGetLang() !== 'es') return fallback;
  const ch = OB_STRINGS_ES[stepId] && OB_STRINGS_ES[stepId].choices;
  return (ch && ch[value]) || fallback;
}
function obContinue() { return obGetLang() === 'es' ? 'Continuar →' : 'Continue →'; }

const OB_STEPS = [
  { id: 'welcome',     type: 'welcome' },
  {
    id: 'name', type: 'text',
    question: "What's their name?",
    hint: "First name is fine",
    placeholder: "e.g. Alex",
    key: 'userName', optional: false,
  },
  {
    id: 'age', type: 'choice',
    question: "How old is [name]?",
    key: 'age',
    choices: [
      { label: '2 – 4',       value: '2-4'   },
      { label: '5 – 8',       value: '5-8'   },
      { label: '9 – 12',      value: '9-12'  },
      { label: '13 – 17',     value: '13-17' },
      { label: '18 or older', value: '18+'   },
    ],
  },
  {
    id: 'diagnosis', type: 'diagnosis',
    question: "Do you know [name]'s diagnosis?",
    hint: "Choose the closest match — this helps us set up the right vocabulary and layout.",
  },
  {
    id: 'reading', type: 'choice',
    question: "Can [name] read?",
    key: 'reading',
    choices: [
      { label: 'Yes, reads well', value: 'yes',  icon: '📖' },
      { label: 'Some words',      value: 'some', icon: '🔤' },
      { label: 'Not yet',         value: 'no',   icon: '🖼️' },
    ],
  },
  {
    id: 'motor', type: 'choice',
    question: "How well can [name] use a touchscreen?",
    key: 'motor',
    choices: [
      { label: 'No problem',                        value: 'full',         icon: '👆' },
      { label: 'Works, but needs bigger buttons',    value: 'limited',      icon: '🤏' },
      { label: 'Has real difficulty tapping',        value: 'very_limited', icon: '⚠️' },
    ],
  },
  {
    id: 'sensory', type: 'multi',
    question: "Any sensory sensitivities?",
    hint: "Select all that apply",
    key: 'sensory',
    choices: [
      { label: 'Sensitive to sounds',        value: 'sound', icon: '🔇' },
      { label: 'Sensitive to bright screens', value: 'light', icon: '🌑' },
      { label: 'Neither',                    value: 'none',  icon: '✓', exclusive: true },
    ],
  },
  {
    id: 'background', type: 'choice',
    question: "Which background feels most comfortable for [name]?",
    hint: "Choose minimal if [name] gets overwhelmed by visual patterns. You can change this later.",
    key: 'backgroundTheme',
    choices: [
      { label: 'Warm & cozy',    value: 'default',  icon: '🌅', sub: 'Soft parchment — warm and friendly' },
      { label: 'Sky blue',       value: 'sky',       icon: '🌤️', sub: 'Calm and airy — soft blue' },
      { label: 'Meadow green',   value: 'meadow',    icon: '🌿', sub: 'Natural and soothing' },
      { label: 'Soft lavender',  value: 'lavender',  icon: '💜', sub: 'Gentle and calm' },
      { label: 'Clean & minimal',value: 'minimal',   icon: '⬜', sub: 'Simple white — no distractions' },
    ],
  },
  {
    id: 'primaryNeed', type: 'choice',
    question: "What does [name] most need to express?",
    key: 'primaryNeed',
    choices: [
      { label: 'Physical needs',      value: 'needs',    icon: '🙌', sub: 'Hungry, tired, pain, bathroom' },
      { label: 'Feelings',            value: 'feelings', icon: '💛', sub: 'Happy, scared, frustrated, loved' },
      { label: 'Talking with people', value: 'social',   icon: '👋', sub: 'Greetings, connection, conversation' },
      { label: 'All of these',        value: 'all',      icon: '✨', sub: 'Balanced vocabulary across everything' },
    ],
  },
  {
    id: 'interests', type: 'text',
    question: "Does [name] have any special interests?",
    hint: "Optional — we'll add a custom category just for them",
    placeholder: "e.g. dinosaurs, Minecraft, trains, music...",
    key: 'interests', optional: true,
  },
  {
    id: 'safety', type: 'contact',
    question: "Add a trusted safety contact",
    hint: "This person gets a private alert if [name] feels unsafe — bypassing the primary caretaker. Can be a grandparent, teacher, or therapist.",
    keys: { name: 'contactName', email: 'contactEmail' },
    optional: true,
  },
  {
    id: 'pin', type: 'pin',
    question: 'Set a Provider PIN',
    hint: 'A 4-digit PIN locks settings so only you can change them.',
  },
  { id: 'done', type: 'done' },
];

const DIAGNOSES = [
  {
    group: 'Developmental',
    items: [
      { label: 'Autism Spectrum Disorder',    value: 'autism' },
      { label: 'Down Syndrome',               value: 'down_syndrome' },
      { label: 'Cerebral Palsy',              value: 'cp' },
      { label: 'Childhood Apraxia of Speech', value: 'apraxia' },
      { label: 'Fragile X Syndrome',          value: 'fragile_x' },
      { label: 'Angelman Syndrome',           value: 'angelman' },
      { label: 'Rett Syndrome',               value: 'rett' },
      { label: 'Williams Syndrome',           value: 'williams' },
      { label: 'Phelan-McDermid Syndrome',    value: 'phelan_mcdermid' },
      { label: 'Intellectual Disability',     value: 'intellectual_disability' },
    ],
  },
  {
    group: 'Acquired Conditions',
    items: [
      { label: 'Traumatic Brain Injury (TBI)', value: 'tbi' },
      { label: 'Stroke / Aphasia',             value: 'aphasia' },
      { label: 'ALS',                          value: 'als' },
      { label: 'Multiple Sclerosis (MS)',       value: 'ms' },
    ],
  },
  {
    group: 'Other',
    items: [
      { label: 'Selective Mutism',              value: 'selective_mutism' },
      { label: 'Other condition',               value: 'other' },
      { label: 'Not sure / Prefer not to say',  value: 'unknown' },
    ],
  },
];

// ── State ──────────────────────────────────────────────────────────
let obStep    = 0;
let obAnswers = {};

// ── DOM refs ───────────────────────────────────────────────────────
const obOverlay  = document.getElementById('onboarding-overlay');
const obContent  = document.getElementById('ob-content');
const obBackBtn  = document.getElementById('ob-back-btn');
const obNextBtn  = document.getElementById('ob-next-btn');
const obSkipBtn  = document.getElementById('ob-skip-setup');
const obFill     = document.getElementById('ob-progress-fill');

// Question steps only (excludes welcome + done) for progress calc
const OB_QUESTION_STEPS = OB_STEPS.filter(s => s.type !== 'welcome' && s.type !== 'done');

// ── Helpers ────────────────────────────────────────────────────────
function obName() {
  const n = (obAnswers.userName || '').trim();
  return n || 'them';
}

function injectName(str) {
  const n = (obAnswers.userName || '').trim();
  return str.replace(/\[name\]/g, n || 'them');
}

function updateObProgress() {
  const step = OB_STEPS[obStep];
  if (step.type === 'welcome') {
    obFill.style.width = '0%';
  } else if (step.type === 'done') {
    obFill.style.width = '100%';
  } else {
    const idx = OB_QUESTION_STEPS.findIndex(s => s.id === step.id);
    obFill.style.width = `${((idx + 1) / OB_QUESTION_STEPS.length) * 100}%`;
  }
}

// ── Render dispatcher ──────────────────────────────────────────────
function renderObStep() {
  const step = OB_STEPS[obStep];
  obContent.innerHTML = '';
  obContent.scrollTop = 0;
  obNextBtn.classList.remove('hidden');
  updateObProgress();

  obBackBtn.classList.toggle('hidden', obStep === 0);
  obSkipBtn.style.visibility = (step.type === 'welcome' || step.type === 'done') ? 'hidden' : 'visible';

  switch (step.type) {
    case 'welcome':   renderObWelcome();       break;
    case 'text':      renderObText(step);      break;
    case 'choice':    renderObChoice(step);    break;
    case 'diagnosis': renderObDiagnosis(step); break;
    case 'multi':     renderObMulti(step);     break;
    case 'contact':   renderObContact(step);   break;
    case 'pin':       renderObPin(step);       break;
    case 'done':      renderObDone();          break;
  }
}

// ── Welcome ────────────────────────────────────────────────────────
function renderObWelcome() {
  const es = obGetLang() === 'es';
  obNextBtn.textContent = es ? 'Comenzar →' : "Let's get started →";
  obNextBtn.disabled    = false;
  obContent.innerHTML = `
    <div class="ob-welcome">
      <img class="ob-welcome-icon" src="icons/icon.png" alt="Speak" />
      <h1 class="ob-welcome-title">${es
        ? 'Toda persona merece una voz — y una segura.'
        : 'Every person deserves a voice — and a safe one.'}</h1>
      <p class="ob-welcome-body">${es
        ? 'Te haremos algunas preguntas rápidas para configurar Speak para quien lo usará. Toma aproximadamente un minuto.'
        : "We'll ask a few quick questions to set up Speak specifically for the person who will use it. Takes about a minute."}</p>
      <div class="ob-welcome-features">
        <div class="ob-welcome-feat">
          <span class="ob-wf-icon">🎯</span>
          <span class="ob-wf-text">${es ? 'Personalizado según diagnóstico, edad y necesidades' : 'Personalized for their diagnosis, age &amp; needs'}</span>
        </div>
        <div class="ob-welcome-feat">
          <span class="ob-wf-icon">🛡️</span>
          <span class="ob-wf-text">${es ? 'Canal de seguridad privado — siempre gratis, siempre activo' : 'Private safety channel — always free, always on'}</span>
        </div>
        <div class="ob-welcome-feat">
          <span class="ob-wf-icon">✨</span>
          <span class="ob-wf-text">${es ? 'Oraciones con IA, audio real y panel de proveedor' : 'AI sentences, real audio &amp; provider dashboard'}</span>
        </div>
      </div>
      <div class="ob-lang-toggle">
        <span class="ob-lang-label">${es ? 'Idioma / Language' : 'Language / Idioma'}</span>
        <div class="ob-lang-btns">
          <button class="ob-lang-btn ${!es ? 'ob-lang-active' : ''}" data-lang="en">EN — English</button>
          <button class="ob-lang-btn ${es ? 'ob-lang-active' : ''}" data-lang="es">ES — Español</button>
        </div>
      </div>
      <p class="ob-welcome-note">${es
        ? 'Puedes omitir cualquier pregunta y ajustar todo después en Configuración.'
        : 'You can skip any question and adjust everything later in Provider Settings.'}</p>
    </div>
  `;
  obContent.querySelectorAll('.ob-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      localStorage.setItem('aac_lang', btn.dataset.lang);
      renderObWelcome();
    });
  });
}

// ── Text input ────────────────────────────────────────────────────
function renderObText(step) {
  obNextBtn.textContent = obContinue();
  const val = obAnswers[step.key] || '';
  obNextBtn.disabled = !step.optional && !val.trim();

  obContent.innerHTML = `
    <div class="ob-qwrap">
      <div class="ob-question">${injectName(obStr(step.id, 'question', step.question))}</div>
      ${step.hint ? `<div class="ob-hint">${obStr(step.id, 'hint', step.hint)}</div>` : ''}
      <input class="ob-text-input" id="ob-text-field" type="text"
        placeholder="${esc(obStr(step.id, 'placeholder', step.placeholder || ''))}" value="${esc(val)}"
        autocomplete="off" spellcheck="false" />
      ${step.optional ? `<div class="ob-optional">${obStr(step.id, 'optional', 'Optional — tap Continue to skip')}</div>` : ''}
    </div>
  `;

  const field = document.getElementById('ob-text-field');
  field.focus();

  field.addEventListener('input', () => {
    obAnswers[step.key] = field.value;
    obNextBtn.disabled  = !step.optional && !field.value.trim();
  });
  field.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !obNextBtn.disabled) obAdvance();
  });
}

// ── Single-select choice ──────────────────────────────────────────
function renderObChoice(step) {
  obNextBtn.textContent = obContinue();
  const current         = obAnswers[step.key];
  obNextBtn.disabled    = !current;

  const html = step.choices.map(c => `
    <button class="ob-choice ${current === c.value ? 'ob-selected' : ''}" data-val="${c.value}">
      ${c.icon ? `<span class="ob-choice-icon">${c.icon}</span>` : ''}
      <span class="ob-choice-label">${obChoiceStr(step.id, c.value, c.label)}</span>
      ${c.sub ? `<span class="ob-choice-sub">${c.sub}</span>` : ''}
    </button>
  `).join('');

  obContent.innerHTML = `
    <div class="ob-qwrap">
      <div class="ob-question">${injectName(obStr(step.id, 'question', step.question))}</div>
      <div class="ob-choices">${html}</div>
    </div>
  `;

  obContent.querySelectorAll('.ob-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      obAnswers[step.key] = btn.dataset.val;
      obContent.querySelectorAll('.ob-choice').forEach(b => b.classList.remove('ob-selected'));
      btn.classList.add('ob-selected');
      obNextBtn.disabled = false;

      // Live theme preview — apply background choice immediately to the onboarding card
      if (step.key === 'backgroundTheme') {
        ['sky', 'meadow', 'lavender', 'minimal'].forEach(t => document.body.classList.remove(`theme-${t}`));
        if (btn.dataset.val !== 'default') document.body.classList.add(`theme-${btn.dataset.val}`);
      }

      setTimeout(obAdvance, 240);
    });
  });
}

// ── Diagnosis list ────────────────────────────────────────────────
function renderObDiagnosis(step) {
  obNextBtn.textContent = obContinue();
  const current         = obAnswers.diagnosis;
  obNextBtn.disabled    = !current;

  const groupsHTML = DIAGNOSES.map(g => `
    <div class="ob-diag-group">
      <div class="ob-diag-group-label">${g.group}</div>
      ${g.items.map(item => `
        <button class="ob-diag-item ${current === item.value ? 'ob-selected' : ''}" data-val="${item.value}">
          ${item.label}
        </button>
      `).join('')}
    </div>
  `).join('');

  obContent.innerHTML = `
    <div class="ob-qwrap">
      <div class="ob-question">${injectName(obStr(step.id, 'question', step.question))}</div>
      ${step.hint ? `<div class="ob-hint">${obStr(step.id, 'hint', step.hint)}</div>` : ''}
      <div class="ob-diag-list">${groupsHTML}</div>
    </div>
  `;

  obContent.querySelectorAll('.ob-diag-item').forEach(btn => {
    btn.addEventListener('click', () => {
      obAnswers.diagnosis = btn.dataset.val;
      obContent.querySelectorAll('.ob-diag-item').forEach(b => b.classList.remove('ob-selected'));
      btn.classList.add('ob-selected');
      obNextBtn.disabled = false;
      setTimeout(obAdvance, 240);
    });
  });
}

// ── Multi-select ──────────────────────────────────────────────────
function renderObMulti(step) {
  obNextBtn.textContent = obContinue();
  obNextBtn.disabled    = false;
  const current         = obAnswers[step.key] || [];

  const html = step.choices.map(c => `
    <button class="ob-choice ob-choice-multi ${current.includes(c.value) ? 'ob-selected' : ''}"
      data-val="${c.value}" ${c.exclusive ? 'data-exclusive="true"' : ''}>
      ${c.icon ? `<span class="ob-choice-icon">${c.icon}</span>` : ''}
      <span class="ob-choice-label">${obChoiceStr(step.id, c.value, c.label)}</span>
    </button>
  `).join('');

  obContent.innerHTML = `
    <div class="ob-qwrap">
      <div class="ob-question">${injectName(obStr(step.id, 'question', step.question))}</div>
      ${step.hint ? `<div class="ob-hint">${obStr(step.id, 'hint', step.hint)}</div>` : ''}
      <div class="ob-choices">${html}</div>
      <div class="ob-optional">${obStr(step.id, 'optional', 'Select all that apply — tap Continue when done')}</div>
    </div>
  `;

  obContent.querySelectorAll('.ob-choice-multi').forEach(btn => {
    btn.addEventListener('click', () => {
      let sel = [...(obAnswers[step.key] || [])];
      const val        = btn.dataset.val;
      const isExcl     = btn.dataset.exclusive === 'true';

      if (isExcl) {
        sel = sel.includes(val) ? [] : [val];
      } else {
        // Deselect any exclusive option
        sel = sel.filter(v => {
          const c = step.choices.find(x => x.value === v);
          return c && !c.exclusive;
        });
        if (sel.includes(val)) sel = sel.filter(v => v !== val);
        else sel.push(val);
      }

      obAnswers[step.key] = sel;
      obContent.querySelectorAll('.ob-choice-multi').forEach(b => {
        b.classList.toggle('ob-selected', sel.includes(b.dataset.val));
      });
    });
  });
}

// ── Contact fields ────────────────────────────────────────────────
function renderObContact(step) {
  obNextBtn.textContent = 'Continue →';
  obNextBtn.disabled    = false;
  const nameVal  = obAnswers[step.keys.name]  || '';
  const emailVal = obAnswers[step.keys.email] || '';

  obContent.innerHTML = `
    <div class="ob-qwrap">
      <div class="ob-question">${injectName(obStr(step.id, 'question', step.question))}</div>
      <div class="ob-hint">${obStr(step.id, 'hint', step.hint)}</div>
      <div class="ob-contact-fields">
        <label class="ob-field-label">
          ${obStr(step.id, 'nameLabel', 'Contact Name')}
          <input class="ob-text-input" id="ob-cname" type="text"
            placeholder="${esc(obStr(step.id, 'namePH', 'e.g. Grandma Susan'))}" value="${esc(nameVal)}" autocomplete="name" />
        </label>
        <label class="ob-field-label">
          ${obStr(step.id, 'emailLabel', 'Contact Email')}
          <input class="ob-text-input" id="ob-cemail" type="email"
            placeholder="${esc(obStr(step.id, 'emailPH', 'trusted@example.com'))}" value="${esc(emailVal)}" autocomplete="email" />
        </label>
      </div>
      <div class="ob-optional">${obStr(step.id, 'optional', 'Optional — tap Continue to skip')}</div>
    </div>
  `;

  document.getElementById('ob-cname').addEventListener('input', e => {
    obAnswers[step.keys.name] = e.target.value;
  });
  document.getElementById('ob-cemail').addEventListener('input', e => {
    obAnswers[step.keys.email] = e.target.value;
  });
}

// ── PIN step ──────────────────────────────────────────────────────
function renderObPin(step) {
  obNextBtn.classList.add('hidden'); // auto-advance on 4th digit; no manual Continue needed
  obSkipBtn.style.visibility = 'hidden'; // PIN is required — no skip

  obContent.innerHTML = `
    <div class="ob-qwrap">
      <div class="ob-question">${obStr(step.id, 'question', step.question)}</div>
      <div class="ob-hint">${obStr(step.id, 'hint', step.hint)}</div>
      <div class="ob-pin-wrap">
        <div class="ob-pin-dots" id="ob-pin-dots">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="ob-pin-hint" id="ob-pin-hint">${obStr('pin', 'enter', 'Enter 4 digits')}</div>
        <div class="ob-pin-pad">
          ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k =>
            `<button class="ob-pin-key" data-key="${k}">${k}</button>`
          ).join('')}
        </div>
      </div>
    </div>
  `;

  let pin = '';

  function updateDots() {
    document.querySelectorAll('#ob-pin-dots span').forEach((s, i) => {
      s.style.background = i < pin.length ? 'var(--primary)' : 'var(--border)';
    });
  }
  updateDots();

  obContent.querySelectorAll('.ob-pin-key').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.key;
      if (k === '⌫') { pin = pin.slice(0, -1); }
      else if (k !== '' && pin.length < 4) { pin += k; }
      updateDots();
      if (pin.length === 4) {
        const s = typeof loadSettings === 'function' ? loadSettings() : {};
        s.pin = pin;
        if (typeof saveSettings === 'function') saveSettings(s);
        document.getElementById('ob-pin-hint').textContent = obStr('pin', 'saved', '✅ PIN saved!');
        setTimeout(() => obAdvance(), 700);
      }
    });
  });
}

// ── Done screen ───────────────────────────────────────────────────
function renderObDone() {
  obNextBtn.classList.add('hidden');
  obBackBtn.classList.add('hidden');
  obFill.style.width = '100%';

  const name = (obAnswers.userName || '').trim();
  const cfg  = generateObConfig(obAnswers);

  const bullets = [];
  if (cfg.largeTargets)      bullets.push('Larger symbol buttons for easier tapping');
  if (cfg.soundMuted)        bullets.push('Sound off — sensory-friendly mode');
  if (cfg.highContrast)      bullets.push('High contrast display');
  if (cfg.reducedAnimations) bullets.push('Reduced animations');
  if (cfg.keyboardForward)   bullets.push('Keyboard promoted for text-based communication');
  if (cfg.customInterest)    bullets.push(`Custom "${esc(cfg.customInterest)}" category created`);
  if (obAnswers.contactName) bullets.push(`Safety contact: ${esc(obAnswers.contactName)}`);
  if (bullets.length === 0)  bullets.push('Standard layout with balanced vocabulary');

  const startCatLabel = {
    needs: 'Needs', feelings: 'Feelings', social: 'Social',
  }[cfg.startCategory] || 'Needs';
  bullets.unshift(`Starting on the ${startCatLabel} category`);

  const bulletHTML = bullets.map(b => `<div class="ob-done-bullet">✓ ${b}</div>`).join('');

  const es = obGetLang() === 'es';
  const doneTitle = name
    ? `${esc(name)} ${es ? 'está listo para ser escuchado.' : 'is ready to be heard.'}`
    : (es ? 'Todo listo para ser escuchado.' : 'All set to be heard.');

  obContent.innerHTML = `
    <div class="ob-done-wrap">
      <div class="ob-done-icon">💛</div>
      <h2 class="ob-done-title">${doneTitle}</h2>
      <div class="ob-done-config">${bulletHTML}</div>
      <button id="ob-launch" class="ob-launch-btn">${es ? 'Comenzar a usar Speak →' : 'Start using Speak →'}</button>
      <div class="ob-done-note">${es ? 'Ajusta cualquier configuración después manteniendo presionado 🔊 por 3 segundos.' : 'Adjust any setting later by holding 🔊 for 3 seconds.'}</div>
    </div>
  `;

  document.getElementById('ob-launch').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('ob:done'));
  });
}

// ── Navigation ────────────────────────────────────────────────────
function obAdvance() {
  if (obStep < OB_STEPS.length - 1) {
    obStep++;
    renderObStep();
  }
}

function obRetreat() {
  if (obStep > 0) {
    obStep--;
    renderObStep();
  }
}

obNextBtn.addEventListener('click', obAdvance);
obBackBtn.addEventListener('click', obRetreat);

let _skipConfirmTimer = null;

obSkipBtn.addEventListener('click', () => {
  if (obSkipBtn.dataset.confirm === 'true') {
    clearTimeout(_skipConfirmTimer);
    obSkipBtn.textContent = 'Skip Setup';
    delete obSkipBtn.dataset.confirm;
    obAnswers = {};
    completeOnboarding();
    return;
  }
  // First tap — ask for confirmation
  obSkipBtn.textContent = 'Tap again to skip →';
  obSkipBtn.dataset.confirm = 'true';
  _skipConfirmTimer = setTimeout(() => {
    obSkipBtn.textContent = 'Skip Setup';
    delete obSkipBtn.dataset.confirm;
  }, 3000);
});

// ── Config engine ─────────────────────────────────────────────────
function generateObConfig(answers) {
  const cfg  = {};
  const diag = answers.diagnosis || 'unknown';
  const age  = answers.age       || '5-8';
  const sens = answers.sensory   || [];

  // Grid density
  if (age === '2-4' || answers.reading === 'no') {
    cfg.gridColumns = 2;
    cfg.coreOnly    = true;
    cfg.simpleMode  = true;   // 4-button layout for very young / non-readers
  } else {
    cfg.gridColumns = 4;
    cfg.coreOnly    = false;
    cfg.simpleMode  = false;
  }

  // Large targets + simple mode for severe motor impairment
  const needsSimple = (
    answers.motor === 'very_limited' ||
    diag === 'rett'                  ||
    diag === 'als'                   ||
    diag === 'dementia'
  );
  if (needsSimple && !cfg.simpleMode) cfg.simpleMode = true;

  cfg.largeTargets = (
    answers.motor === 'limited'      ||
    answers.motor === 'very_limited' ||
    age === '2-4'                    ||
    diag === 'cp'                    ||
    diag === 'rett'                  ||
    diag === 'als'                   ||
    diag === 'dementia'
  );

  // Sound
  cfg.soundMuted = sens.includes('sound');

  // Visual
  cfg.highContrast = sens.includes('light');

  // Animations
  cfg.reducedAnimations = (
    diag === 'autism'     ||
    diag === 'fragile_x'  ||
    sens.includes('light')
  );

  // Start category — diagnosis-informed defaults
  const socialFirst   = ['down_syndrome', 'williams', 'selective_mutism'];
  const feelingsFirst = ['fragile_x', 'angelman', 'rett'];
  if      (feelingsFirst.includes(diag)) cfg.startCategory = 'feelings';
  else if (socialFirst.includes(diag))   cfg.startCategory = 'social';
  else                                   cfg.startCategory = 'needs';

  // User's explicit answer overrides diagnosis default
  if (answers.primaryNeed && answers.primaryNeed !== 'all') {
    cfg.startCategory = answers.primaryNeed;
  }

  // Adult mode — affects placeholder text and tone
  cfg.adultMode = (
    age === '13-17' || age === '18+' ||
    ['tbi', 'aphasia', 'als', 'ms', 'selective_mutism'].includes(diag)
  );

  // Keyboard-forward — promote the type button for text-primary users
  cfg.keyboardForward = [
    'apraxia', 'selective_mutism', 'aphasia', 'tbi', 'als', 'ms',
  ].includes(diag);

  // Custom interest
  if (answers.interests && answers.interests.trim()) {
    cfg.customInterest = answers.interests.trim();
  }

  // Background theme
  cfg.backgroundTheme = answers.backgroundTheme || 'default';
  // If they said light sensitivity in sensory, nudge toward minimal unless they explicitly chose otherwise
  if (!answers.backgroundTheme && sens.includes('light')) {
    cfg.backgroundTheme = 'minimal';
  }

  return cfg;
}

// ── Complete onboarding ───────────────────────────────────────────
function completeOnboarding() {
  const settings = loadSettings();

  // PIN is mandatory — bounce to PIN step if not yet set
  if (!settings.pin) {
    const pinIdx = OB_STEPS.findIndex(s => s.id === 'pin');
    if (pinIdx !== -1) {
      obStep = pinIdx;
      renderObStep();
      return;
    }
  }

  const cfg = generateObConfig(obAnswers);
  if (obAnswers.userName)     settings.userName     = obAnswers.userName.trim();
  if (obAnswers.contactName)  settings.contactName  = obAnswers.contactName.trim();
  if (obAnswers.contactEmail) settings.contactEmail = obAnswers.contactEmail.trim();

  settings.profile            = cfg;
  settings.onboardingComplete = true;
  saveSettings(settings);

  obOverlay.classList.add('hidden');
  finishInit();
}

// ── Entry point (called by app.js init) ───────────────────────────
function startOnboarding() {
  obStep    = 0;
  obAnswers = {};
  obOverlay.classList.remove('hidden');
  obNextBtn.classList.remove('hidden');
  renderObStep();
}
