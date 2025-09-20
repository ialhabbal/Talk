// src/llm_helpers/memoryManager.js
const STORAGE_KEY = 'talk:memories:v1';
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}
function getChatBucket(chatId = 'global') {
  const s = loadStore();
  if (!s[chatId]) s[chatId] = {};
  return s[chatId];
}
function norm(text) {
  return (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function now() { return Date.now(); }

export function getCharacterMemory(name, chatId = 'global') {
  const bucket = getChatBucket(chatId);
  const arr = bucket[name] || [];
  return arr.map(e => e.text).join('\n');
}
export function setCharacterMemory(name, memory, chatId = 'global') {
  const bucket = getChatBucket(chatId);
  const lines = (memory || '').split('\n').map(s => s.trim()).filter(Boolean);
  bucket[name] = lines.map(t => ({ text: t, score: 1, lastUsed: now(), createdAt: now() }));
  saveStore();
}

// New API
export function loadMemories(chatId = 'global') {
  getChatBucket(chatId);
}
export function retrieveMemories(chatId, names, query, limit = 6) {
  const q = new Set((query || '').toLowerCase().match(/[a-z][a-z']{2,}/g) || []);
  const bucket = getChatBucket(chatId);
  const res = {};
  for (const name of names) {
    const arr = bucket[name] || [];
    const scored = arr.map(e => {
      const words = new Set((e.text || '').toLowerCase().match(/[a-z][a-z']{2,}/g) || []);
      let overlap = 0;
      for (const w of words) if (q.has(w)) overlap++;
      const recency = 1 + Math.log10(1 + (e.lastUsed || e.createdAt || 0));
      const score = overlap * 3 + (e.score || 1) + recency;
      return { ...e, score };
    });
    scored.sort((a, b) => b.score - a.score);
    res[name] = scored.slice(0, limit).map(e => e.text);
  }
  return res;
}
export function updateMemoriesFromMessage(chatId, speaker, content) {
  if (!speaker || !content) return;
  const bucket = getChatBucket(chatId);
  if (!bucket[speaker]) bucket[speaker] = [];

  // extract simple first-person facts
  const sentences = content.split(/(?<=[.!?])\s+/).slice(0, 6);
  const candidates = [];
  const firstPerson = /\b(I|I'm|I’m|I am|my|mine|I have|I like|I hate|I can|I cannot|I can't|I used to|I live|I'm from|I was|I will|I want|I need|I prefer|I know|I carry|I wield|I study|I practice|I fear)\b/i;
  const relation = /\b(mother|father|sister|brother|friend|mentor|ally|enemy|wife|husband|partner|child)\b/i;
  const traits = /\b(mage|wizard|sorcerer|healer|warrior|paladin|rogue|archer|swordsman|alchemist)\b/i;

  for (const s of sentences) {
    const sClean = s.trim();
    if (!sClean) continue;
    if (firstPerson.test(sClean) || relation.test(sClean) || traits.test(sClean)) {
      // normalize tiny things
      const text = sClean.replace(/\s+/g, ' ').slice(0, 240);
      candidates.push(text);
    }
  }

  const existing = bucket[speaker];
  for (const c of candidates) {
    const exists = existing.find(e => norm(e.text) === norm(c));
    if (exists) {
      exists.score = (exists.score || 1) + 1;
      exists.lastUsed = now();
    } else {
      existing.push({ text: c, score: 1, lastUsed: now(), createdAt: now() });
    }
  }

  // bound size
  if (existing.length > 80) {
    existing.sort((a, b) => (b.score + (b.lastUsed || 0)/1e12) - (a.score + (a.lastUsed || 0)/1e12));
    bucket[speaker] = existing.slice(0, 80);
  }
  saveStore();
}