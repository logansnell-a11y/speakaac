// ── ARASAAC Pictogram Loader ───────────────────────────────────────
// Fetches real AAC pictogram images from ARASAAC's free open API.
// Results are cached in localStorage so we don't re-fetch every load.
// Falls back to emoji if the API is unavailable.

const ARASAAC_BASE  = "https://static.arasaac.org/pictograms";
const ARASAAC_API   = "https://api.arasaac.org/v1/pictograms/en/search";
const CACHE_KEY     = "arasaac_id_cache_v1";
const CACHE_EXPIRY  = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// Load cache from localStorage
function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_EXPIRY) return {};
    return data;
  } catch { return {}; }
}

// Save cache to localStorage
function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

// Get image URL for a pictogram ID
function picUrl(id) {
  return `${ARASAAC_BASE}/${id}/${id}_500.png`;
}

// Fetch pictogram ID for a search term
async function fetchPicId(searchTerm) {
  try {
    const res  = await fetch(`${ARASAAC_API}/${encodeURIComponent(searchTerm)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.length === 0) return null;
    return data[0]._id;
  } catch { return null; }
}

// Load all pictogram IDs for the symbol library — uses cache first
async function loadAllPictograms(symbols) {
  const cache = loadCache();
  const dirty = { changed: false };

  // Collect all unique search terms
  const allSymbols = Object.values(symbols).flat();
  const toFetch    = allSymbols.filter(s => s.arasaac && !cache[s.arasaac]);

  if (toFetch.length === 0) return cache;

  // Fetch in small batches to avoid hammering the API
  const batchSize = 8;
  for (let i = 0; i < toFetch.length; i += batchSize) {
    const batch   = toFetch.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(s => fetchPicId(s.arasaac).then(id => ({ key: s.arasaac, id })))
    );
    results.forEach(({ key, id }) => {
      if (id) { cache[key] = id; dirty.changed = true; }
    });
    // Small pause between batches
    if (i + batchSize < toFetch.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  if (dirty.changed) saveCache(cache);
  return cache;
}

// Returns an <img> element if we have an ID, otherwise returns null
function makePicImg(searchTerm, cache) {
  const id = cache[searchTerm];
  if (!id) return null;
  const img = document.createElement("img");
  img.src   = picUrl(id);
  img.alt   = searchTerm;
  img.className = "symbol-pic";
  img.onerror   = () => { img.style.display = "none"; };
  return img;
}

window.ARASAAC = { loadAllPictograms, makePicImg };
