const { app, BrowserWindow, ipcMain, dialog, Menu, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
// Support ESM default export shape for electron-context-menu when required from CJS
const contextMenuModule = require('electron-context-menu');
const contextMenu = contextMenuModule.default || contextMenuModule;
const promptModule = require('electron-prompt');
const prompt = promptModule.default || promptModule;

let serverProcess;
let mainWindow = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // ✅ use preload
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true, // ✅ enable Chromium/Electron spellcheck
    },
  });

  // keep a reference to the window so IPC handlers can access it
  mainWindow = win;

  // Use OS/Chromium spellchecker with preferred languages
  // Adjust or extend this list as needed, e.g., ['en-US', 'en-GB'].
  win.webContents.session.setSpellCheckerLanguages(['en-US']);

  win.loadURL('http://localhost:3000');

  // notify renderer when BrowserWindow fullscreen state changes
  win.on('enter-full-screen', () => {
    try { win.webContents.send('window-fullscreen-changed', true); } catch (e) {}
  });
  win.on('leave-full-screen', () => {
    try { win.webContents.send('window-fullscreen-changed', false); } catch (e) {}
  });
}

// IPC handlers to query/set window fullscreen
ipcMain.handle('get-fullscreen', async () => {
  try { return !!(mainWindow && mainWindow.isFullScreen && mainWindow.isFullScreen()); } catch { return false; }
});

ipcMain.handle('set-fullscreen', async (_, value) => {
  try {
    if (mainWindow && typeof mainWindow.setFullScreen === 'function') {
      mainWindow.setFullScreen(!!value);
      return !!mainWindow.isFullScreen();
    }
    return false;
  } catch (err) { return false; }
});

// Resolve a fetch implementation (Electron with Node may not always expose global fetch)
async function getFetch() {
  // Always use node-fetch in the main process for consistent Node streams
  const mod = await import('node-fetch');
  return mod.default;
}

// Grammar checking via LanguageTool public API (selection-based, non-blocking)
async function checkGrammarAndPopup(browserWindow, params) {
  try {
    const text = (params.selectionText || '').trim();
    if (!text) return;
    // Limit to a reasonable size for API
    const limited = text.length > 8000 ? text.slice(0, 8000) : text;
    const $fetch = await getFetch();
    const body = new URLSearchParams();
    body.set('text', limited);
    body.set('language', 'en-US');
    // You can self-host LT and point to it; this uses the public endpoint
    const response = await $fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!response.ok) throw new Error('LanguageTool request failed');
    const result = await response.json();
    const matches = Array.isArray(result.matches) ? result.matches : [];

    // Build corrected text applying first suggestion for each match
    let corrected = limited;
    if (matches.length) {
      // Sort by offset; apply non-overlapping replacements left-to-right
      const sorted = matches
        .filter(m => m && typeof m.offset === 'number' && typeof m.length === 'number' && Array.isArray(m.replacements) && m.replacements[0] && m.replacements[0].value)
        .sort((a, b) => a.offset - b.offset);

      let out = '';
      let last = 0;
      for (const m of sorted) {
        const start = m.offset;
        const end = m.offset + m.length;
        if (start < last) continue; // skip overlapping
        out += limited.slice(last, start) + m.replacements[0].value;
        last = end;
      }
      out += limited.slice(last);
      corrected = out;
    }

    const suggestionMenu = Menu.buildFromTemplate([
      {
        label: matches.length ? `Apply ${matches.length} grammar fix(es)` : 'No issues found',
        enabled: !!matches.length,
        click: () => {
          // Replaces current selection in the focused editable with corrected text
          browserWindow.webContents.insertText(corrected);
        }
      }
    ]);
    suggestionMenu.popup({ window: browserWindow });
  } catch (err) {
    const errorMenu = Menu.buildFromTemplate([
      { label: 'Grammar check failed', enabled: false }
    ]);
    errorMenu.popup({ window: browserWindow });
  }
}

// Case adjust helper to preserve original capitalization style
function adjustCaseLike(original, replacement) {
  if (!original) return replacement;
  const isAllCaps = /^[A-Z]+$/.test(original);
  const isCapitalized = /^[A-Z][a-z']*$/.test(original);
  if (isAllCaps) return replacement.toUpperCase();
  if (isCapitalized) return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase();
  return replacement.toLowerCase();
}

// Fetch synonyms and present a popup menu to replace the selected word
async function showSynonymsMenu(browserWindow, params) {
  try {
    const raw = (params.selectionText || '').trim();
    if (!raw) return;
    const m = raw.match(/^(\W*)([A-Za-z']+)(\W*)$/);
    if (!m) {
      const noMenu = Menu.buildFromTemplate([{ label: 'Select a single word', enabled: false }]);
      noMenu.popup({ window: browserWindow });
      return;
    }
    const [, prefix, core, suffix] = m;
    const $fetch = await getFetch();
    const url = `https://api.datamuse.com/words?ml=${encodeURIComponent(core.toLowerCase())}&max=10`;
    const resp = await $fetch(url);
    if (!resp.ok) throw new Error('Datamuse request failed');
    const arr = await resp.json();
    const synonyms = Array.isArray(arr) ? arr.map(x => x && x.word).filter(Boolean) : [];

    const items = synonyms.length
      ? synonyms.map((syn) => ({
          label: adjustCaseLike(core, syn),
          click: () => {
            const replacement = prefix + adjustCaseLike(core, syn) + suffix;
            browserWindow.webContents.insertText(replacement);
          }
        }))
      : [{ label: 'No synonyms found', enabled: false }];

    const menu = Menu.buildFromTemplate(items);
    menu.popup({ window: browserWindow });
  } catch (err) {
    const errorMenu = Menu.buildFromTemplate([{ label: 'Synonyms lookup failed', enabled: false }]);
    errorMenu.popup({ window: browserWindow });
  }
}

// ---------- Rewrite (selection) via local LLM backend ----------
function buildRewritePrompt(style, text) {
  const instructions = {
    Formal: 'Rewrite the text in a formal tone. Preserve original meaning and details.',
    Friendly: 'Rewrite the text in a friendly, approachable tone. Preserve meaning.',
    Concise: 'Rewrite the text to be more concise and clear. Remove redundancy.',
    Clearer: 'Rewrite the text to improve clarity, structure, and readability without changing meaning.',
    'Active voice': 'Rewrite the text to use active voice and stronger verbs where appropriate.',
    Shorter: 'Rewrite the text to be shorter while preserving key information.',
    Longer: 'Rewrite the text to be longer by elaborating slightly while preserving meaning.',
    'Bullet points': 'Rewrite the text as clear bullet points. Keep each point short and informative.',
  };
  const directive = instructions[style] || 'Rewrite the text clearly while preserving meaning.';
  return `${directive}\n\nText:\n"""\n${text}\n"""\n\nRewritten:`;
}

async function streamRewriteFromBackend(prompt) {
  const $fetch = await getFetch();
  const resp = await $fetch('http://localhost:3000/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, max_tokens: 512, stop_sequences: [] })
  });
  if (!resp.ok) throw new Error('Rewrite backend error');
  const text = await resp.text();
  return (text || '').trim();
}

async function rewriteSelection(browserWindow, params, style) {
  const text = (params.selectionText || '').trim();
  if (!text) return;
  // Allow local transforms without backend
  if (style === 'Title case') {
    const tc = text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    browserWindow.webContents.insertText(tc);
    return;
  }
  const prompt = buildRewritePrompt(style, text);
  const rewritten = await streamRewriteFromBackend(prompt);
  if (rewritten) browserWindow.webContents.insertText(rewritten);
}

async function rewriteSelectionCustom(browserWindow, params) {
  const text = (params.selectionText || '').trim();
  if (!text) return;
  try {
    const instruction = await prompt({
      title: 'Custom rewrite',
      label: 'Instruction for the rewrite:',
      value: '',
      inputAttrs: {
        type: 'text',
        placeholder: 'e.g., Make it witty and concise; speak like character X'
      },
      type: 'input',
      resizable: true,
      width: 520,
      height: 180
    });
    if (!instruction || !instruction.trim()) return;
    const customPrompt = `${instruction.trim()}\n\nText:\n"""\n${text}\n"""\n\nRewritten:`;
    const rewritten = await streamRewriteFromBackend(customPrompt);
    if (rewritten) browserWindow.webContents.insertText(rewritten);
  } catch (err) {
    const errorMenu = Menu.buildFromTemplate([{ label: 'Custom rewrite cancelled/failed', enabled: false }]);
    errorMenu.popup({ window: browserWindow });
  }
}

// ---------- Smart punctuation (selection) ----------
function smartPunctuation(text) {
  if (!text) return text;
  let t = text;
  // Straight quotes to curly (basic heuristic)
  t = t
    .replace(/\b\"(\w)/g, '“$1') // opening double
    .replace(/(\w)\"/g, '$1”')    // closing double
    .replace(/\b\'(\w)/g, '‘$1')  // opening single
    .replace(/(\w)\'/g, '$1’');    // closing single
  // Dashes
  t = t.replace(/\s--\s/g, ' — '); // em dash
  t = t.replace(/(\d)\s?-\s?(\d)/g, '$1–$2'); // en dash for number ranges
  // Ellipsis
  t = t.replace(/\.\.\./g, '…');
  // Non-breaking space before some punctuation (basic, locale-naive)
  t = t.replace(/\s([!?;:])/g, '\u00A0$1');
  return t;
}

function applySmartPunctuation(browserWindow, params) {
  const text = (params.selectionText || '').trim();
  if (!text) return;
  const converted = smartPunctuation(text);
  if (converted) browserWindow.webContents.insertText(converted);
}

// ---------- Definitions & examples (selection) ----------
async function showDefinitionsMenu(browserWindow, params) {
  try {
    const raw = (params.selectionText || '').trim();
    const m = raw.match(/^(\W*)([A-Za-z']+)(\W*)$/);
    if (!m) {
      const noMenu = Menu.buildFromTemplate([{ label: 'Select a single word', enabled: false }]);
      noMenu.popup({ window: browserWindow });
      return;
    }
    const [, , core] = m;
    const $fetch = await getFetch();
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(core.toLowerCase())}`;
    const resp = await $fetch(url);
    if (!resp.ok) throw new Error('Dictionary request failed');
    const data = await resp.json();
    const defs = [];
    for (const entry of Array.isArray(data) ? data : []) {
      for (const m of entry.meanings || []) {
        for (const d of m.definitions || []) {
          if (d.definition) defs.push(d.definition);
        }
      }
    }
    const items = defs.length
      ? defs.slice(0, 8).map((d) => ({ label: d.length > 80 ? d.slice(0, 77) + '…' : d, enabled: false }))
      : [{ label: 'No definitions found', enabled: false }];
    const menu = Menu.buildFromTemplate(items);
    menu.popup({ window: browserWindow });
  } catch (err) {
    const errorMenu = Menu.buildFromTemplate([{ label: 'Definitions lookup failed', enabled: false }]);
    errorMenu.popup({ window: browserWindow });
  }
}

async function showExamplesMenu(browserWindow, params) {
  try {
    const raw = (params.selectionText || '').trim();
    const m = raw.match(/^(\W*)([A-Za-z']+)(\W*)$/);
    if (!m) {
      const noMenu = Menu.buildFromTemplate([{ label: 'Select a single word', enabled: false }]);
      noMenu.popup({ window: browserWindow });
      return;
    }
    const [, , core] = m;
    const $fetch = await getFetch();
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(core.toLowerCase())}`;
    const resp = await $fetch(url);
    if (!resp.ok) throw new Error('Dictionary request failed');
    const data = await resp.json();
    const examples = [];
    for (const entry of Array.isArray(data) ? data : []) {
      for (const meaning of entry.meanings || []) {
        for (const def of meaning.definitions || []) {
          if (def.example) examples.push(def.example);
          if (Array.isArray(def.synonyms)) {
            // ignore
          }
        }
      }
    }
    const items = examples.length
      ? examples.slice(0, 8).map((e) => ({ label: e.length > 80 ? e.slice(0, 77) + '…' : e, enabled: false }))
      : [{ label: 'No examples found', enabled: false }];
    const menu = Menu.buildFromTemplate(items);
    menu.popup({ window: browserWindow });
  } catch (err) {
    const errorMenu = Menu.buildFromTemplate([{ label: 'Examples lookup failed', enabled: false }]);
    errorMenu.popup({ window: browserWindow });
  }
}

async function showAntonymsMenu(browserWindow, params) {
  try {
    const raw = (params.selectionText || '').trim();
    const m = raw.match(/^(\W*)([A-Za-z']+)(\W*)$/);
    if (!m) {
      const noMenu = Menu.buildFromTemplate([{ label: 'Select a single word', enabled: false }]);
      noMenu.popup({ window: browserWindow });
      return;
    }
    const [, prefix, core, suffix] = m;
    const $fetch = await getFetch();
    const url = `https://api.datamuse.com/words?rel_ant=${encodeURIComponent(core.toLowerCase())}&max=10`;
    const resp = await $fetch(url);
    if (!resp.ok) throw new Error('Datamuse request failed');
    const arr = await resp.json();
    const words = Array.isArray(arr) ? arr.map(x => x && x.word).filter(Boolean) : [];

    const items = words.length
      ? words.map((w) => ({
          label: adjustCaseLike(core, w),
          click: () => {
            const replacement = prefix + adjustCaseLike(core, w) + suffix;
            browserWindow.webContents.insertText(replacement);
          }
        }))
      : [{ label: 'No antonyms found', enabled: false }];

    const menu = Menu.buildFromTemplate(items);
    menu.popup({ window: browserWindow });
  } catch (err) {
    const errorMenu = Menu.buildFromTemplate([{ label: 'Antonyms lookup failed', enabled: false }]);
    errorMenu.popup({ window: browserWindow });
  }
}

// ---------- Split / Join sentences (selection) ----------
function splitSentences(text) {
  if (!text) return text;
  // naive split on . ! ? keeping punctuation
  const parts = text.match(/[^.!?\n]+[.!?]?/g);
  if (!parts) return text;
  return parts.map(s => s.trim()).filter(Boolean).join('\n');
}

function joinSentences(text) {
  if (!text) return text;
  // replace line breaks with space, collapse extra spaces
  return text.replace(/\s*\n+\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function applySplitSentences(browserWindow, params) {
  const text = (params.selectionText || '').trim();
  if (!text) return;
  const out = splitSentences(text);
  if (out) browserWindow.webContents.insertText(out);
}

function applyJoinSentences(browserWindow, params) {
  const text = (params.selectionText || '').trim();
  if (!text) return;
  const out = joinSentences(text);
  if (out) browserWindow.webContents.insertText(out);
}

// ---------- Translate (selection) ----------
async function translateSelection(browserWindow, params, targetLang) {
  try {
    const text = (params.selectionText || '').trim();
    if (!text) return;
    const $fetch = await getFetch();
    const resp = await $fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: 'auto', target: targetLang, format: 'text' })
    });
    if (!resp.ok) throw new Error('Translate request failed');
    const json = await resp.json();
    const translated = json.translatedText || '';
    if (translated) browserWindow.webContents.insertText(translated);
  } catch (err) {
    const errorMenu = Menu.buildFromTemplate([{ label: 'Translation failed', enabled: false }]);
    errorMenu.popup({ window: browserWindow });
  }
}

app.whenReady().then(() => {
  // Show native context menu with spelling suggestions in editable fields only
  // to avoid interfering with custom right-click actions elsewhere.
  contextMenu({
    showSpellCheckerSuggestions: true,
    showLookUpSelection: false,
    shouldShowMenu: (event, params) => params.isEditable,
    prepend: (defaultActions, params, browserWindow) => {
      const items = [];
      if (params.misspelledWord) {
        items.push({
          label: 'Add to dictionary',
          click: () =>
            browserWindow.webContents.session.addWordToSpellCheckerDictionary(
              params.misspelledWord
            ),
        });
      }
      // Synonyms for a single-word selection
      if (params.selectionText && /^\W*[A-Za-z']+\W*$/.test(params.selectionText.trim())) {
        items.push({
          label: 'Synonyms…',
          click: () => showSynonymsMenu(browserWindow, params)
        });
        items.push({
          label: 'Define…',
          click: () => showDefinitionsMenu(browserWindow, params)
        });
      }
      if (params.selectionText && params.selectionText.trim().length > 0) {
        // Rewrite submenu
        items.push({
          label: 'Rewrite →',
          submenu: [
            { label: 'Formal', click: () => rewriteSelection(browserWindow, params, 'Formal') },
            { label: 'Friendly', click: () => rewriteSelection(browserWindow, params, 'Friendly') },
            { label: 'Concise', click: () => rewriteSelection(browserWindow, params, 'Concise') },
            { label: 'Clearer', click: () => rewriteSelection(browserWindow, params, 'Clearer') },
            { label: 'Active voice', click: () => rewriteSelection(browserWindow, params, 'Active voice') },
            { label: 'Shorter', click: () => rewriteSelection(browserWindow, params, 'Shorter') },
            { label: 'Longer', click: () => rewriteSelection(browserWindow, params, 'Longer') },
            { label: 'Bullet points', click: () => rewriteSelection(browserWindow, params, 'Bullet points') },
            { type: 'separator' },
            { label: 'Title case (local)', click: () => rewriteSelection(browserWindow, params, 'Title case') },
            { type: 'separator' },
            { label: 'Custom…', click: () => rewriteSelectionCustom(browserWindow, params) },
          ]
        });
        // Split/Join
        items.push({
          label: 'Sentences →',
          submenu: [
            { label: 'Split into lines', click: () => applySplitSentences(browserWindow, params) },
            { label: 'Join lines', click: () => applyJoinSentences(browserWindow, params) },
          ]
        });
        // Translate submenu (basic)
        items.push({
          label: 'Translate →',
          submenu: [
            { label: 'Spanish', click: () => translateSelection(browserWindow, params, 'es') },
            { label: 'French', click: () => translateSelection(browserWindow, params, 'fr') },
            { label: 'German', click: () => translateSelection(browserWindow, params, 'de') },
            { label: 'Chinese (Simplified)', click: () => translateSelection(browserWindow, params, 'zh') },
            { label: 'Arabic', click: () => translateSelection(browserWindow, params, 'ar') },
          ]
        });
        // Smart punctuation
        items.push({ label: 'Smart punctuation', click: () => applySmartPunctuation(browserWindow, params) });
        // Style suggestions (placeholder: included as Grammar for now)
        items.push({ type: 'separator' });
        items.push({
          label: 'Check grammar/style…',
          click: () => checkGrammarAndPopup(browserWindow, params)
        });
        // Examples / Antonyms
        items.push({
          label: 'Examples…',
          click: () => showExamplesMenu(browserWindow, params)
        });
        items.push({
          label: 'Antonyms…',
          click: () => showAntonymsMenu(browserWindow, params)
        });
      }
      return items;
    },
  });

  const serverPath = path.join(__dirname, 'src', 'server.js');
  serverProcess = spawn('node', [serverPath], { stdio: 'inherit' });
  setTimeout(createWindow, 1000);
}).catch((err) => {
  console.error('Electron initialization failed:', err);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (serverProcess) serverProcess.kill();
});

ipcMain.handle('save-chat', async (event, filepath, content) => {
  try {
    fs.writeFileSync(filepath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('load-chat', async (event, filepath) => {
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('showSaveDialog', async () => {
  const result = await dialog.showSaveDialog({
    title: 'Save chat file',
    defaultPath: 'chat.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  return result;
});

ipcMain.handle('showOpenDialog', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Open chat file',
    filters: [{ name: 'Chat Files', extensions: ['json'] }],
    properties: ['openFile']
  });
  return result;
});

