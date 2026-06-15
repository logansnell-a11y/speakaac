// Standalone test of the generative-vocab core (no Netlify/Supabase needed).
// Run: node test-generate-vocab.mjs
// Uses your local ANTHROPIC_API_KEY. Haiku ≈ a tenth of a cent per call.

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }

const CONTEXTS = ['doctor', "I'm hurt", 'playground', 'I am scared'];

function buildPrompt(context, ageBand = 'child') {
  const ageNote = ` The user is a ${ageBand}; keep words age-appropriate.`;
  return (
    `A nonverbal person using an AAC app wants to say something that isn't on their board yet. ` +
    `Their starting idea or context is: "${context}".${ageNote} ` +
    `Return a JSON object {"buttons": [...]} with 9 short vocabulary items (1–2 words each) that best help them ` +
    `express themselves here: a mix of actions/needs, feelings, people, places, or things relevant to the context, ` +
    `plus at least 2 high-frequency core words ("want","more","stop","help","go","no") useful for building sentences. ` +
    `If the context suggests pain, fear, or danger, include relevant words like "help","hurt","stop","scared","who","where". ` +
    `Use simple, first-person-friendly words. Return ONLY the JSON object, no markdown.`
  );
}

async function gen(context) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: buildPrompt(context) }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`API ${res.status}: ${t}`);
  }
  const data = await res.json();
  const raw = (data.content?.[0]?.text || '').trim().replace(/^```json\s*|\s*```$/g, '');
  let buttons = [];
  try { buttons = JSON.parse(raw).buttons || []; }
  catch { buttons = raw.split(/[,\n]/).map(s => s.replace(/["\[\]{}]/g, '')); }
  return buttons.map(b => String(b).trim().toLowerCase()).filter(Boolean).slice(0, 12);
}

for (const ctx of CONTEXTS) {
  try {
    const buttons = await gen(ctx);
    console.log(`\n  context: "${ctx}"`);
    console.log(`  buttons: ${buttons.join('  ·  ')}`);
  } catch (e) {
    console.error(`\n  context: "${ctx}"  →  ERROR: ${e.message}`);
  }
}
console.log('\n  done.\n');
