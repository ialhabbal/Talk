// src/llm_helpers/scenarioManager.js
const STORAGE_KEY = 'talk:scenario:v1';
let store = null;

function loadStore() {
  if (store) return store;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    store = raw ? JSON.parse(raw) : {};
  } catch {
    store = {};
  }
  return store;
}
function saveStore() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch {}
}
function getScenario(chatId = 'global') {
  const s = loadStore();
  if (!s[chatId]) {
    s[chatId] = {
      setting: '',
      locations: [],
      entities: {}, // name -> { traits:[], inventory:[] }
      timeline: [], // short event strings
      goals: [],
      unresolved: [],
      lastUpdated: Date.now()
    };
  }
  return s[chatId];
}
function pushUnique(arr, item, cap = 40, maxLen = 240) {
  if (!item) return;
  const t = item.trim().slice(0, maxLen);
  if (!t) return;
  if (!arr.find(x => x.toLowerCase() === t.toLowerCase())) {
    arr.push(t);
    if (arr.length > cap) arr.shift();
  }
}

export function loadScenario(chatId = 'global') {
  getScenario(chatId);
}
export function updateScenarioWithMessage(chatId, speaker, content) {
  if (!content) return;
  const sc = getScenario(chatId);
  const sentences = content.split(/(?<=[.!?])\s+/).slice(0, 6);

  // locations (simple heuristic)
  for (const s of sentences) {
    const m = s.match(/\b(at|in|inside|within|from|to|near|on)\s+([A-Z][\w'’\-]+(?:\s+[A-Z][\w'’\-]+)*)/);
    if (m && m[2]) pushUnique(sc.locations, m[2], 30, 64);
  }
  // goals / unresolved
  for (const s of sentences) {
    if (/\b(quest|mission|goal|plan|need to|must|should|going to|will)\b/i.test(s)) {
      pushUnique(sc.goals, s.trim(), 30);
      pushUnique(sc.unresolved, s.trim(), 30);
    }
  }
  // timeline (brief)
  pushUnique(sc.timeline, `${speaker}: ${sentences[0]?.trim() || content.trim()}`.slice(0, 160), 60, 160);
  sc.lastUpdated = Date.now();
  saveStore();
}

function compressScenario(sc, maxChars = 900) {
  const lines = [];
  if (sc.setting) lines.push(`[Setting] ${sc.setting}`);
  if (sc.locations.length) lines.push(`[Locations] ${sc.locations.slice(-5).join(', ')}`);
  if (Object.keys(sc.entities).length) {
    const brief = Object.entries(sc.entities).slice(0, 5).map(([k, v]) => {
      const traits = (v.traits || []).slice(0, 3).join(', ');
      return `${k}${traits ? `: ${traits}` : ''}`;
    }).join(' | ');
    if (brief) lines.push(`[Entities] ${brief}`);
  }
  if (sc.goals.length) lines.push(`[Goals] ${sc.goals.slice(-4).join(' | ')}`);
  if (sc.unresolved.length) lines.push(`[Unresolved] ${sc.unresolved.slice(-4).join(' | ')}`);
  if (sc.timeline.length) {
    const t = sc.timeline.slice(-6).map(x => `- ${x}`).join('\n');
    lines.push(`[Recent Events]\n${t}`);
  }
  let out = lines.join('\n');
  if (out.length > maxChars) out = out.slice(out.length - maxChars);
  return out;
}

export function getScenarioSummary(chatId = 'global', maxChars) {
  const sc = getScenario(chatId);
  return compressScenario(sc, maxChars || 900);
}

// Legacy exports for compatibility
export function updateScenario(newInfo) {
  // no-op legacy shim
}