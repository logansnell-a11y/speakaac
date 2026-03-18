// ── Symbol Library ─────────────────────────────────────────────────
// arasaac: search term sent to ARASAAC API for the real pictogram image
// emoji:   fallback if API is unavailable
// speech:  what gets spoken / added to sentence

// core: true  = shown immediately, no scroll (max 8 per category)
// core: false = shown in "More" expansion

// ── Core Vocabulary Bar — always-visible high-frequency words ──────
// These appear in the persistent strip above the symbol grid regardless
// of which category is active. Clinical standard in AAC design.
const CORE_VOCAB = [
  { id:"cv_i",      label:"I",      emoji:"🫵", arasaac:"me",         speech:"I"             },
  { id:"cv_you",    label:"You",    emoji:"👆", arasaac:"you",        speech:"you"           },
  { id:"cv_want",   label:"Want",   emoji:"🙌", arasaac:"want",       speech:"want"          },
  { id:"cv_more",   label:"More",   emoji:"➕", arasaac:"more",       speech:"more"          },
  { id:"cv_go",     label:"Go",     emoji:"🚶", arasaac:"go",         speech:"go"            },
  { id:"cv_no",     label:"No",     emoji:"👎", arasaac:"no",         speech:"no"            },
  { id:"cv_yes",    label:"Yes",    emoji:"👍", arasaac:"yes",        speech:"yes"           },
  { id:"cv_stop",   label:"Stop",   emoji:"🛑", arasaac:"stop",       speech:"stop"          },
  { id:"cv_help",   label:"Help",   emoji:"🙋", arasaac:"help",       speech:"help"          },
  { id:"cv_like",   label:"Like",   emoji:"❤️", arasaac:"like",       speech:"like"          },
  { id:"cv_done",   label:"Done",   emoji:"✅", arasaac:"finished",   speech:"all done"      },
  { id:"cv_please", label:"Please", emoji:"🙏", arasaac:"please",     speech:"please"        },
  { id:"cv_not",    label:"Not",    emoji:"🚫", arasaac:"no",         speech:"not"           },
  { id:"cv_feel",   label:"Feel",   emoji:"💛", arasaac:"feel",       speech:"feel"          },
];

const SYMBOLS = {

  needs: [
    { id:"yes",        label:"Yes",          emoji:"👍", arasaac:"yes",        speech:"yes",            core:true  },
    { id:"no",         label:"No",           emoji:"👎", arasaac:"no",         speech:"no",             core:true  },
    { id:"eat",        label:"Eat",          emoji:"🍽️", arasaac:"eat",        speech:"eat",            core:true  },
    { id:"drink",      label:"Drink",        emoji:"🥤", arasaac:"drink",      speech:"drink",          core:true  },
    { id:"bathroom",   label:"Bathroom",     emoji:"🚽", arasaac:"toilet",     speech:"bathroom",       core:true  },
    { id:"hurt",       label:"Hurt",         emoji:"🤕", arasaac:"pain",       speech:"I am hurting",   core:true  },
    { id:"help",       label:"Help Me",      emoji:"🙋", arasaac:"help",       speech:"I need help",    core:true  },
    { id:"done",       label:"All Done",     emoji:"✅", arasaac:"finished",   speech:"all done",       core:true  },
    // — More —
    { id:"water",      label:"Water",        emoji:"💧", arasaac:"water",      speech:"water",          core:false },
    { id:"sleep",      label:"Sleep",        emoji:"😴", arasaac:"sleep",      speech:"sleep",          core:false },
    { id:"rest",       label:"Rest",         emoji:"🛋️", arasaac:"rest",       speech:"rest",           core:false },
    { id:"sick",       label:"Sick",         emoji:"🤢", arasaac:"sick",       speech:"I feel sick",    core:false },
    { id:"medicine",   label:"Medicine",     emoji:"💊", arasaac:"medicine",   speech:"medicine",       core:false },
    { id:"hot",        label:"Hot",          emoji:"🔥", arasaac:"hot",        speech:"hot",            core:false },
    { id:"cold",       label:"Cold",         emoji:"🥶", arasaac:"cold",       speech:"cold",           core:false },
    { id:"stop",       label:"Stop",         emoji:"🛑", arasaac:"stop",       speech:"stop",           core:false },
    { id:"please",     label:"Please",       emoji:"🙏", arasaac:"please",     speech:"please",         core:false },
    { id:"more",       label:"More",         emoji:"➕", arasaac:"more",       speech:"more",           core:false },
  ],

  feelings: [
    { id:"happy",      label:"Happy",        emoji:"😊", arasaac:"happy",      speech:"happy",          core:true  },
    { id:"sad",        label:"Sad",          emoji:"😢", arasaac:"sad",        speech:"sad",            core:true  },
    { id:"angry",      label:"Angry",        emoji:"😠", arasaac:"angry",      speech:"angry",          core:true  },
    { id:"scared",     label:"Scared",       emoji:"😨", arasaac:"scared",     speech:"scared",         core:true  },
    { id:"hurt2",      label:"Hurt Inside",  emoji:"💔", arasaac:"hurt",       speech:"I feel hurt",    core:true  },
    { id:"tired",      label:"Tired",        emoji:"😪", arasaac:"tired",      speech:"tired",          core:true  },
    { id:"excited",    label:"Excited",      emoji:"🤩", arasaac:"excited",    speech:"excited",        core:true  },
    { id:"confused",   label:"Confused",     emoji:"😕", arasaac:"confused",   speech:"confused",       core:true  },
    // — More —
    { id:"frustrated", label:"Frustrated",   emoji:"😤", arasaac:"frustrated", speech:"frustrated",     core:false },
    { id:"calm",       label:"Calm",         emoji:"😌", arasaac:"calm",       speech:"calm",           core:false },
    { id:"lonely",     label:"Lonely",       emoji:"🫂", arasaac:"lonely",     speech:"lonely",         core:false },
    { id:"overwhelmed",label:"Overwhelmed",  emoji:"😵", arasaac:"overwhelmed",speech:"overwhelmed",    core:false },
    { id:"loved",      label:"Loved",        emoji:"🥰", arasaac:"loved",      speech:"loved",          core:false },
    { id:"bored",      label:"Bored",        emoji:"😑", arasaac:"bored",      speech:"bored",          core:false },
    { id:"nervous",    label:"Nervous",      emoji:"😬", arasaac:"nervous",    speech:"nervous",        core:false },
    { id:"proud",      label:"Proud",        emoji:"😎", arasaac:"proud",      speech:"proud",          core:false },
  ],

  people: [
    { id:"mom",        label:"Mom",           emoji:"👩", arasaac:"mother",      speech:"mom",              core:true  },
    { id:"dad",        label:"Dad",           emoji:"👨", arasaac:"father",      speech:"dad",              core:true  },
    { id:"me",         label:"Me",            emoji:"🫵", arasaac:"me",          speech:"I",                core:true  },
    { id:"friend",     label:"Friend",        emoji:"🤝", arasaac:"friend",      speech:"my friend",        core:true  },
    { id:"teacher",    label:"Teacher",       emoji:"👩‍🏫", arasaac:"teacher",    speech:"teacher",          core:true  },
    { id:"doctor",     label:"Doctor",        emoji:"👨‍⚕️", arasaac:"doctor",     speech:"doctor",           core:true  },
    { id:"grandma",    label:"Grandma",       emoji:"👵", arasaac:"grandmother", speech:"grandma",          core:true  },
    { id:"grandpa",    label:"Grandpa",       emoji:"👴", arasaac:"grandfather", speech:"grandpa",          core:true  },
    { id:"sibling",    label:"Brother/Sister",emoji:"👦", arasaac:"sibling",     speech:"my sibling",       core:false },
    { id:"therapist",  label:"Therapist",     emoji:"🧑‍⚕️", arasaac:"therapist",  speech:"therapist",        core:false },
  ],

  places: [
    { id:"home",       label:"Home",          emoji:"🏠", arasaac:"house",       speech:"home",             core:true  },
    { id:"school",     label:"School",        emoji:"🏫", arasaac:"school",      speech:"school",           core:true  },
    { id:"outside",    label:"Outside",       emoji:"🌳", arasaac:"outside",     speech:"outside",          core:true  },
    { id:"bedroom",    label:"Bedroom",       emoji:"🛏️", arasaac:"bedroom",     speech:"bedroom",          core:true  },
    { id:"bathroom2",  label:"Bathroom",      emoji:"🚿", arasaac:"bathroom",    speech:"the bathroom",     core:true  },
    { id:"car",        label:"Car",           emoji:"🚗", arasaac:"car",         speech:"the car",          core:true  },
    { id:"kitchen",    label:"Kitchen",       emoji:"🍳", arasaac:"kitchen",     speech:"kitchen",          core:true  },
    { id:"park",       label:"Park",          emoji:"🏞️", arasaac:"park",        speech:"the park",         core:true  },
    { id:"hospital",   label:"Hospital",      emoji:"🏥", arasaac:"hospital",    speech:"hospital",         core:false },
    { id:"store",      label:"Store",         emoji:"🛒", arasaac:"shop",        speech:"the store",        core:false },
  ],

  actions: [
    { id:"want",       label:"Want",          emoji:"🙌", arasaac:"want",        speech:"I want",           core:true  },
    { id:"play",       label:"Play",          emoji:"🎮", arasaac:"play",        speech:"play",             core:true  },
    { id:"go",         label:"Go",            emoji:"🚶", arasaac:"go",          speech:"go",               core:true  },
    { id:"hug",        label:"Hug",           emoji:"🤗", arasaac:"hug",         speech:"a hug",            core:true  },
    { id:"stop",       label:"Stop",          emoji:"🛑", arasaac:"stop",        speech:"stop",             core:true  },
    { id:"break",      label:"Break",         emoji:"⏸️", arasaac:"break",       speech:"a break",          core:true  },
    { id:"music",      label:"Music",         emoji:"🎵", arasaac:"music",       speech:"listen to music",  core:true  },
    { id:"read",       label:"Read",          emoji:"📖", arasaac:"read",        speech:"read",             core:true  },
    { id:"watch",      label:"Watch TV",      emoji:"📺", arasaac:"watch television", speech:"watch TV",    core:false },
    { id:"talk",       label:"Talk",          emoji:"💬", arasaac:"talk",        speech:"talk",             core:false },
    { id:"walk",       label:"Walk",          emoji:"👟", arasaac:"walk",        speech:"walk",             core:false },
    { id:"quiet",      label:"Quiet Time",    emoji:"🤫", arasaac:"quiet",       speech:"quiet time",       core:false },
    { id:"wait",       label:"Wait",          emoji:"⏳", arasaac:"wait",        speech:"wait",             core:false },
  ],

  food: [
    { id:"eat2",       label:"Eat",           emoji:"🍽️", arasaac:"eat",         speech:"eat",              core:true  },
    { id:"drink2",     label:"Drink",         emoji:"🥤", arasaac:"drink",       speech:"drink",            core:true  },
    { id:"apple",      label:"Apple",         emoji:"🍎", arasaac:"apple",       speech:"apple",            core:true  },
    { id:"banana",     label:"Banana",        emoji:"🍌", arasaac:"banana",      speech:"banana",           core:true  },
    { id:"sandwich",   label:"Sandwich",      emoji:"🥪", arasaac:"sandwich",    speech:"sandwich",         core:true  },
    { id:"milk",       label:"Milk",          emoji:"🥛", arasaac:"milk",        speech:"milk",             core:true  },
    { id:"snack",      label:"Snack",         emoji:"🍿", arasaac:"snack",       speech:"a snack",          core:true  },
    { id:"juice",      label:"Juice",         emoji:"🧃", arasaac:"juice",       speech:"juice",            core:true  },
    { id:"pizza",      label:"Pizza",         emoji:"🍕", arasaac:"pizza",       speech:"pizza",            core:false },
    { id:"chicken",    label:"Chicken",       emoji:"🍗", arasaac:"chicken",     speech:"chicken",          core:false },
    { id:"rice",       label:"Rice",          emoji:"🍚", arasaac:"rice",        speech:"rice",             core:false },
    { id:"soup",       label:"Soup",          emoji:"🍲", arasaac:"soup",        speech:"soup",             core:false },
    { id:"cookie",     label:"Cookie",        emoji:"🍪", arasaac:"cookie",      speech:"cookie",           core:false },
    { id:"icecream",   label:"Ice Cream",     emoji:"🍦", arasaac:"ice cream",   speech:"ice cream",        core:false },
  ],

  quick: [
    { id:"q_break",    label:"Need a break",     emoji:"⏸️", arasaac:"break",              speech:"I need a break",           core:true  },
    { id:"q_bathroom", label:"Bathroom",          emoji:"🚽", arasaac:"toilet",             speech:"I need the bathroom",      core:true  },
    { id:"q_snack",    label:"Snack please",      emoji:"🍎", arasaac:"snack",              speech:"Can I have a snack?",      core:true  },
    { id:"q_gohome",   label:"Go home",           emoji:"🏠", arasaac:"house",              speech:"I want to go home",        core:true  },
    { id:"q_sick",     label:"I feel sick",       emoji:"🤒", arasaac:"sick",               speech:"I feel sick",              core:true  },
    { id:"q_ok",       label:"I'm okay",          emoji:"👍", arasaac:"good",               speech:"I'm okay",                 core:true  },
    { id:"q_noget",    label:"Don't understand",  emoji:"🤷", arasaac:"do not understand",  speech:"I don't understand",       core:true  },
    { id:"q_again",    label:"Say it again",      emoji:"🔁", arasaac:"again",              speech:"Can you say that again?",  core:true  },
    { id:"q_wait",     label:"Please wait",       emoji:"⏳", arasaac:"wait",               speech:"Please wait",              core:true  },
    { id:"q_look",     label:"Look at me",        emoji:"👀", arasaac:"look",               speech:"Please look at me",        core:true  },
    { id:"q_hurt",     label:"I'm hurting",       emoji:"🤕", arasaac:"pain",               speech:"I'm hurting",              core:true  },
    { id:"q_happy",    label:"I'm happy",         emoji:"😊", arasaac:"happy",              speech:"I'm happy",                core:true  },
    { id:"q_nolike",   label:"Don't like this",   emoji:"💔", arasaac:"dislike",            speech:"I don't like this",        core:false },
    { id:"q_play",     label:"I want to play",    emoji:"🎮", arasaac:"play",               speech:"I want to play",           core:false },
    { id:"q_read",     label:"Read to me",        emoji:"📖", arasaac:"read",               speech:"Please read to me",        core:false },
    { id:"q_music",    label:"I want music",      emoji:"🎵", arasaac:"music",              speech:"I want to listen to music",core:false },
    { id:"q_quiet",    label:"Too loud",          emoji:"🤫", arasaac:"quiet",              speech:"It's too loud",            core:false },
    { id:"q_tired",    label:"I'm tired",         emoji:"😴", arasaac:"tired",              speech:"I'm tired",                core:false },
  ],

  social: [
    { id:"hello",      label:"Hello",         emoji:"👋", arasaac:"hello",       speech:"hello",            core:true  },
    { id:"thankyou",   label:"Thank You",     emoji:"😊", arasaac:"thank you",   speech:"thank you",        core:true  },
    { id:"like",       label:"I Like",        emoji:"❤️", arasaac:"like",        speech:"I like",           core:true  },
    { id:"dontlike",   label:"Don't Like",    emoji:"💔", arasaac:"dislike",     speech:"I don't like",     core:true  },
    { id:"sorry",      label:"Sorry",         emoji:"😔", arasaac:"sorry",       speech:"I'm sorry",        core:true  },
    { id:"good",       label:"Good",          emoji:"⭐", arasaac:"good",        speech:"good",             core:true  },
    { id:"again",      label:"Again",         emoji:"🔁", arasaac:"again",       speech:"again",            core:true  },
    { id:"bye",        label:"Goodbye",       emoji:"🫡", arasaac:"goodbye",     speech:"goodbye",          core:true  },
    { id:"bad",        label:"Bad",           emoji:"❌", arasaac:"bad",         speech:"bad",              core:false },
    { id:"question",   label:"Question",      emoji:"❓", arasaac:"question",    speech:"I have a question",core:false },
    { id:"understand", label:"Understand",    emoji:"💡", arasaac:"understand",  speech:"I understand",     core:false },
    { id:"dontunderstand",label:"Don't Understand",emoji:"🤷",arasaac:"do not understand",speech:"I don't understand",core:false},
  ],

};
