// ── Mulberry Symbol Loader ─────────────────────────────────────────
// Replaces the ARASAAC loader. Uses Mulberry Symbols (CC BY-SA 4.0)
// which permits commercial use. Falls back to emoji for any symbol
// not available in the Mulberry library.
//
// License: Mulberry Symbols © Garry Pye, CC BY-SA 4.0
// https://mulberrysymbols.org / https://github.com/mulberrysymbols/mulberry-symbols

const MULBERRY_BASE = "https://cdn.jsdelivr.net/gh/mulberrysymbols/mulberry-symbols@master/EN";

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
  "finished":           null,
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
  "scared":             null,
  "hurt":               null,
  "tired":              null,
  "frustrated":         null,
  "calm":               null,
  "lonely":             null,
  "overwhelmed":        null,
  "loved":              null,
  "bored":              null,
  "nervous":            null,
  "proud":              null,

  // People
  "teacher":            "teacher_1a.svg",
  "doctor":             "doctor_1a.svg",
  "grandmother":        "grandmother.svg",
  "grandfather":        "grandfather.svg",
  "mother":             null,
  "father":             null,
  "friend":             null,
  "sibling":            null,
  "therapist":          null,

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
  "cookie":             null,

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
  "question":           null,
  "understand":         null,
  "do not understand":  null,
};

// Returns an <img> element for the Mulberry symbol, or null for emoji fallback
function makePicImg(searchTerm, _cache) {
  const filename = MULBERRY_MAP[searchTerm];
  if (!filename) return null;

  const img = document.createElement("img");
  img.src       = `${MULBERRY_BASE}/${filename}`;
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
