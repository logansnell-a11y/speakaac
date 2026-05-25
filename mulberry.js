// ── Symbol Loader ──────────────────────────────────────────────────
// Primary:   Mulberry Symbols © Garry Pye, CC BY-SA 4.0
//            https://mulberrysymbols.org
// Secondary: OpenMoji, CC BY-SA 4.0
//            https://openmoji.org / https://github.com/hfg-gmuend/openmoji
// Both licenses permit commercial use with attribution.
// Lookup order: Mulberry → OpenMoji → emoji text fallback.

const MULBERRY_BASE  = "https://cdn.jsdelivr.net/gh/mulberrysymbols/mulberry-symbols@master/EN";
const OPENMOJI_BASE  = "https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@15.0.0/color/svg";

// Map from search term → Mulberry filename (null = use emoji fallback)
const MULBERRY_MAP = {
  // Core vocab
  "want":               "want_,_to.svg",
  "more":               "more.svg",
  "go":                 "go_,_to.svg",
  "help":               "help_,_to.svg",
  "look":               "look_,_to.svg",

  // Needs
  "eat":                "eat_,_to.svg",
  "drink":              "drink.svg",
  "toilet":             "toilet.svg",
  "water":              "water.svg",
  "sleep":              "sleep_female_,_to.svg",
  "rest":               "rest_,_to.svg",
  "medicine":           "medicine.svg",
  "hot":                "hot.svg",
  "stop":               null,
  "please":             null,
  "finished":           "finish.svg",
  "pain":               null,
  "sick":               null,
  "cold":               null,
  "no":                 null,
  "yes":                null,
  "me":                 null,
  "you":                null,
  "feel":               null,

  // Feelings
  "happy":              "happy_lady.svg",
  "sad":                "sad_lady.svg",
  "angry":              "angry_lady.svg",
  "excited":            "excited_lady.svg",
  "confused":           "confused_lady.svg",
  "scared":             "afraid_lady.svg",
  "hurt":               null,
  "tired":              "yawn_,_to.svg",
  "frustrated":         "cross.svg",
  "calm":               "relax_,_to.svg",
  "lonely":             null,
  "overwhelmed":        null,
  "loved":              "heart.svg",
  "bored":              null,
  "nervous":            "worried_lady.svg",
  "proud":              null,

  // People
  "teacher":            "teacher_1a.svg",
  "doctor":             "doctor_1a.svg",
  "grandmother":        "grandmother.svg",
  "grandfather":        "grandfather.svg",
  "mother":             "mum_parent.svg",
  "father":             "dad_parent.svg",
  "friend":             null,
  "sibling":            "brother.svg",
  "therapist":          "occupational_therapist_1a.svg",

  // Places
  "house":              "house.svg",
  "school":             "school.svg",
  "outside":            "outside.svg",
  "shop":               "shop.svg",
  "car":                "car.svg",
  "bedroom":            null,
  "bathroom":           null,
  "kitchen":            null,
  "park":               null,
  "hospital":           null,

  // Actions
  "play":               "play_,_to.svg",
  "hug":                "hug_,_to.svg",
  "break":              "break_,_to.svg",
  "music":              "music.svg",
  "read":               "read_,_to.svg",
  "talk":               "talk_1_,_to.svg",
  "walk":               "walk_,_to.svg",
  "quiet":              "quiet.svg",
  "wait":               "wait_,_to.svg",
  "watch television":   "switch_on_television_,_to.svg",

  // Food
  "apple":              "apple.svg",
  "banana":             "banana.svg",
  "sandwich":           "sandwich.svg",
  "milk":               "milk.svg",
  "juice":              "apple_juice.svg",
  "pizza":              "pizza.svg",
  "chicken":            "chicken.svg",
  "rice":               "rice.svg",
  "soup":               "soup.svg",
  "ice cream":          "ice_cream.svg",
  "snack":              null,
  "cookie":             "biscuits.svg",

  // Social
  "hello":              "hello.svg",
  "good":               "good.svg",
  "bad":                "bad.svg",
  "like":               null,
  "dislike":            null,
  "sorry":              null,
  "thank you":          null,
  "again":              null,
  "goodbye":            null,
  "question":           "ask_,_to.svg",
  "understand":         null,
  "do not understand":  null,
};

// OpenMoji codepoints for vocabulary not in Mulberry (CC BY-SA 4.0)
const OPENMOJI_MAP = {
  // Core vocab
  "stop":              "1F6D1",  // 🛑 stop sign
  "please":            "1F64F",  // 🙏 folded hands
  "pain":              "1F623",  // 😣 persevering face
  "sick":              "1F912",  // 🤒 thermometer face
  "cold":              "1F976",  // 🥶 cold face
  "no":                "1F6AB",  // 🚫 prohibited
  "yes":               "2705",   // ✅ check mark
  "me":                "1F464",  // 👤 silhouette / self
  "you":               "1F449",  // 👉 pointing right
  "feel":              "1F4AD",  // 💭 thought balloon

  // Feelings
  "hurt":              "1F915",  // 🤕 bandaged head
  "lonely":            "1F614",  // 😔 pensive face
  "overwhelmed":       "1F629",  // 😩 weary face
  "bored":             "1F611",  // 😑 expressionless face
  "proud":             "1F3C6",  // 🏆 trophy

  // People
  "friend":            "1F91D",  // 🤝 handshake

  // Places
  "bedroom":           "1F6CF",  // 🛏️ bed
  "bathroom":          "1F6C1",  // 🛁 bathtub
  "kitchen":           "1F373",  // 🍳 cooking
  "park":              "1F333",  // 🌳 tree / park
  "hospital":          "1F3E5",  // 🏥 hospital

  // Food
  "snack":             "1F37F",  // 🍿 popcorn / snack

  // Social
  "like":              "1F44D",  // 👍 thumbs up
  "dislike":           "1F44E",  // 👎 thumbs down
  "sorry":             "1F647",  // 🙇 person bowing
  "thank you":         "1F64F",  // 🙏 folded hands
  "again":             "1F504",  // 🔄 repeat arrows
  "goodbye":           "1F44B",  // 👋 waving hand
  "understand":        "1F4A1",  // 💡 light bulb
  "do not understand": "1F937",  // 🤷 shrug
};

// Returns an <img> element — tries Mulberry first, then OpenMoji, null = emoji fallback
function makePicImg(searchTerm, _cache) {
  const mulFile = MULBERRY_MAP[searchTerm];
  const omCode  = OPENMOJI_MAP[searchTerm];

  let src = null;
  if (mulFile)  src = `${MULBERRY_BASE}/${mulFile}`;
  else if (omCode) src = `${OPENMOJI_BASE}/${omCode}.svg`;
  else return null;

  const img = document.createElement("img");
  img.src       = src;
  img.alt       = searchTerm;
  img.className = "symbol-pic";
  img.onerror   = () => { img.style.display = "none"; };
  return img;
}

// No async loading needed — Mulberry uses static CDN URLs
// Returns a resolved "cache" object so existing app.js code works unchanged
async function loadAllPictograms(_symbols) {
  return {};
}

window.ARASAAC = { loadAllPictograms, makePicImg };
