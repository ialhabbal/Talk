<template>
  <div v-if="sidebarOpen" class="sidebar" :style="{ width: sidebarWidth + 'px' }">
    <div class="collapse-btn" @click="$emit('update:sidebarOpen', false)" title="Hide controls">⏴</div>
    <!-- 3. Theme selector UI -->
  <div class="section theme-section" style="display: flex; justify-content: center; align-items: center; gap: 10px;">
      <label style="margin-bottom: 0;">Theme:</label>
      <select
        :value="selectedThemeIdx"
        @change="onThemeChange"
        @click.stop
        @mousedown.stop
        style="min-width: 120px;"
      >
        <option v-for="(theme, idx) in themes" :key="theme.name" :value="idx">{{ theme.name }}</option>
      </select>
    </div>
    <!-- Resizer handle: vertical bar at the right edge of the sidebar -->
    <div
      class="sidebar-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      @pointerdown.prevent="startResize"
    ></div>
    <div class="button-row center-row" style="margin-top: 8px;">
      <button class="export-btn bg-btn-blue blue-text" @click="triggerBgFileInput">Set Chat Background</button>
    </div>
    <hr class="sidebar-separator" />
    <div class="section">
      <p class="center-label" style="margin-bottom: 8px; font-weight: 500; line-height: 1.2;">
        Load an Existing Chat File, or,
        <span style="display: block; text-align: center;">
          <br />
          Add New User and Character(s) and Start Chatting
        </span>
        <br>
        <span class="center-label">(P.S: Add only one user so you don't confuse the LLM)</span>
        <br />
        <span style="font-weight: 400; font-size: 0.97em; color: #b0b7c3;"></span>
      </p>
    </div>
    <div class="section bordered-section centered-section">
      <label style="text-align: center; width: 100%;">
        Load Existing Chat File
        <span style="font-weight: 400; font-size: 0.97em; color: #b0b7c3; margin-left: 6px;">
          (.txt / .docx / .json)
        </span>:
      </label>
      <br />
      <br />
      <button @click="openChatFile" class="export-btn left-indent-btn bg-btn-blue">Load Existing Chat File</button>
    </div>
    <div class="section">
      <label class="center-label">Chat Title</label>
      <span class="center-label">(Auto Generated or Write Own Title)</span>
      <div class="button-row title-row">
        <input v-model="state.chatTitle" class="input title-input" placeholder="Chat Title" />
      </div>
      <br />
      <br />
      <div class="button-row">
        <button class="export-btn bg-btn-blue" @click="openAddUserModal">Add New User</button>
        <div>
          <button class="export-btn bg-btn-blue" @click="triggerPersonaCardInput">Import Persona Card</button>
          <input type="file" ref="personaCardInput" accept=".json" style="display:none" @change="onImportPersonaCard" />
        </div>
      </div>
      <div class="button-row">
        <button class="export-btn bg-btn-blue" @click="openAddCharacterModal">Add New Character(s)</button>
        <div>
          <button class="export-btn bg-btn-blue" @click="triggerCharacterCardInput">Import Character Card</button>
          <input type="file" ref="characterCardInput" accept=".json" style="display:none" @change="onImportCharacterCard" />
        </div>
      </div>
    </div>
    <div class="section" v-if="state.potentialCharacters.length">
      <label>Select Characters:</label>
      <div class="characters-list">
        <label v-for="c in state.potentialCharacters" :key="c">
          <input type="checkbox" v-model="localCharacterSelections" :value="c" />
          {{ c }}
          <span v-if="findChar(c)?.personaCard" title="Persona Card Imported">🟢</span>
          <span v-if="findChar(c)?.characterCard" title="Character Card Imported">🔵</span>
        </label>
      </div>
      <button @click="applyCharacterSelection">Add Characters to Chat</button>
    </div>
    <div class="section" v-if="state.characters.length">
      <label class="center-label">Current User/Character(s):</label>
      <br />
      <br />
      <div class="character-edit" v-for="(c, idx) in state.characters" :key="c.name">
        <span class="type-label" style="font-weight:bold; margin-right:4px;">{{ c.typeLabel }}</span>
        <input v-model="c.name" class="input charname" @input="onCharacterNameEdit(idx)" />
        <!-- Reorder controls placed next to name -->
        <div class="reorder-controls" style="display:flex; gap:4px; align-items:center;">
          <button class="add-msg-btn small-btn reorder-btn icon-btn" @click="moveCharacterUp(idx)" :disabled="idx===0" title="Move up">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9"></circle>
              <polyline points="8 13 12 9 16 13"></polyline>
            </svg>
          </button>
          <button class="add-msg-btn small-btn reorder-btn icon-btn" @click="moveCharacterDown(idx)" :disabled="idx===state.characters.length-1" title="Move down">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9"></circle>
              <polyline points="8 11 12 15 16 11"></polyline>
            </svg>
          </button>
        </div>
        <span v-if="c.personaCard" title="Persona Card Imported">🟢</span>
        <span v-if="c.characterCard" title="Character Card Imported">🔵</span>
        <label class="portrait-label">
          <input
            type="file"
            accept="image/*"
            style="display:none"
            :ref="'portraitInput' + idx"
            @change="e => onPortraitUpload(idx, e)"
          />
          <span v-if="c.portraitData">
            <img :src="c.portraitData" class="portrait-thumb" />
          </span>
          <span v-else class="portrait-thumb default">{{ c.name[0] }}</span>
          <span
            class="portrait-upload-btn"
            @click.stop.prevent="triggerPortraitInput(idx)"
            title="Upload avatar"
          >🖼️</span>
        </label>
        <button
          class="add-msg-btn small-btn icon-btn"
          @click="addMessageForCharacter(c.name)"
          title="Add message for this character"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-8 8H8l-5 3 2-5a8 8 0 1 1 16-6z"></path>
            <path d="M12 8v8M8 12h8"></path>
          </svg>
        </button>
        <div class="btn-with-menu">
          <button class="add-msg-btn small-btn icon-btn" @click="toggleFontMenu(idx, $event)" title="Font">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 16l4-10 4 10m-1.5-4h-5"></path>
              <path d="M15 16a3 3 0 1 0 0-6c-1.657 0-3 1.343-3 3v5"></path>
            </svg>
          </button>
          <div
            v-if="fontMenuOpen[idx]"
            class="menu-popover font-popover"
            :class="fontMenuSide[idx] === 'left' ? 'left-of-btn' : 'right-of-btn'"
            @click.stop
            :ref="el => setFontPopoverRef(el, idx)"
          >
            <div class="font-style-controls inline-controls">
              <button
                :class="{active: c.fontStyle.bold, 'small-btn': true}"
                @click.prevent="toggleCharStyle(idx, 'bold')"
                title="Bold"
                type="button"
              ><b>B</b></button>
              <button
                :class="{active: c.fontStyle.italic, 'small-btn': true}"
                @click.prevent="toggleCharStyle(idx, 'italic')"
                title="Italic"
                type="button"
              ><i>I</i></button>
              <button
                :class="{active: c.fontStyle.underline, 'small-btn': true}"
                @click.prevent="toggleCharStyle(idx, 'underline')"
                title="Underline"
                type="button"
              ><u>U</u></button>
            </div>
            <div class="font-extra-controls">
              <input type="color" v-model="c.fontColor" title="Font Color" />
              <select v-model="c.fontFamily" title="Font Family">
                <option value="Segoe UI">Segoe UI</option>
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Comic Sans MS">Comic Sans MS</option>
                <option value="Verdana">Verdana</option>
                <option value="Tahoma">Tahoma</option>
                <option value="Trebuchet MS">Trebuchet MS</option>
                <option value="Impact">Impact</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
    <hr class="sidebar-separator" />
    <div class="section">
      <label class="center-label">Layout:</label>
      <br />
      <br />
      <div class="slider-row">
        <span>Message Box Width:</span>
        <input type="range" min="400" max="1200" v-model="state.layout.messageWidth" @input="onLayoutChange" />
        <span>{{ state.layout.messageWidth }}px</span>
        <button class="reset-btn" @click="resetLayout('messageWidth')" title="Reset to default">⭮</button>
      </div>
      <div class="slider-row">
        <span>Message Font Size:</span>
        <input type="range" min="12" max="24" v-model="state.layout.fontSize" @input="onLayoutChange" />
        <span>{{ state.layout.fontSize }}px</span>
        <button class="reset-btn" @click="resetLayout('fontSize')" title="Reset to default">⭮</button>
      </div>
      <div class="slider-row">
        <span>Portrait Size:</span>
        <input type="range" min="32" max="256" v-model="state.layout.portraitSize" @input="onLayoutChange" />
        <span>{{ state.layout.portraitSize }}px</span>
        <button class="reset-btn" @click="resetLayout('portraitSize')" title="Reset to default">⭮</button>
      </div>
      <div class="slider-row">
        <span>Portrait Shape:</span>
        <select v-model="state.layout.portraitShape" @change="onLayoutChange">
          <option>Circle</option>
          <option>Rounded Square</option>
          <option>Rounded Rectangle (2:3)</option>
        </select>
        <button class="reset-btn" @click="resetLayout('portraitShape')" title="Reset to default">⭮</button>
      </div>
      <div class="slider-row">
        <span>Message Blur:</span>
        <input type="range" min="0" max="12" v-model="state.layout.blur" @input="onLayoutChange" />
        <span>{{ state.layout.blur }}px</span>
        <button class="reset-btn" @click="resetLayout('blur')" title="Reset to default">⭮</button>
      </div>
    </div>
    <div class="slider-row">
      <input type="checkbox" id="autoScroll" v-model="localAutoScroll" />
      <label for="autoScroll" style="margin-left: 6px;">Auto-Scroll</label>
    </div>
    <hr class="sidebar-separator" />
    <div class="section">
      <label class="center-label">Colors:</label>
      <br />
      <br />
      <div class="color-row">
        <span>Text:</span>
        <input type="color" v-model="state.colors.text" />
        <span class="color-value">{{ state.colors.text }}</span>
        <button class="reset-btn" @click="resetColor('text')" title="Reset to default">⭮</button>
      </div>
      <div class="color-row">
        <span>Quote/Border:</span>
        <input type="color" v-model="state.colors.quote" />
        <span class="color-value">{{ state.colors.quote }}</span>
        <button class="reset-btn" @click="resetColor('quote')" title="Reset to default">⭮</button>
      </div>
      <div class="color-row">
        <span>Italic/Name:</span>
        <input type="color" v-model="state.colors.italic" />
        <span class="color-value">{{ state.colors.italic }}</span>
        <button class="reset-btn" @click="resetColor('italic')" title="Reset to default">⭮</button>
      </div>
      <div class="color-row">
        <span>Blur Overlay:</span>
        <input type="color" v-model="blurColor" />
        <input type="range" min="0" max="1" step="0.01" v-model="blurAlpha" style="width:60px;" />
        <span class="color-value">{{ blurColor }} α={{ blurAlpha }}</span>
        <button class="reset-btn" @click="resetBlurColor" title="Reset to default">⭮</button>
      </div>
    </div>
    <hr class="sidebar-separator" />
    <div class="section">
      <button @click="exportHTML" class="export-btn left-indent-btn bg-btn-blue">Export as HTML</button>
      <button @click="exportChatTxt" class="export-btn left-indent-btn bg-btn-blue">Save Chat as Text File (.txt)</button>
      <button @click="exportChatDocx" class="export-btn left-indent-btn bg-btn-blue">Save Chat as Word Document (.docx)</button>
      <button @click="exportChatJson" class="export-btn left-indent-btn bg-btn-blue">Export Chat as JSON</button>
    </div>
    <!-- Scene Description moved outside of LLM Presets (no surrounding box) -->
    <hr class="sidebar-separator" />
    <div class="section scene-description-section">
      <label class="center-label">Plot of the Scene</label>
      <div class="center-label" style="margin:0; font-weight: 400; font-size: 0.95em; color: #b0b7c3;">(for better roleplay experience, update it when the scene changes)</div>
      <details class="collapsible-info" style="margin-top:8px;">
        <summary>About “Plot of the Scene”</summary>
        <div class="info-body">
          <p><b>What “Plot of the Scene” does:</b></p>
          <ul>
            <li>It feeds always-on context to the LLM.</li>
            <li>Whatever you write here is stored in <code>aiPreset.textMemory</code> and injected into every generation prompt as a [Memory] block.</li>
            <li>Purpose: Give the model stable scene context (setting, stakes, constraints, relationships) so responses stay coherent across turns.</li>
          </ul>
          <p><b>When it’s used:</b> Every time you click generate/continue/correct, it’s appended to the prompt along with the compressed chat history, scenario summary, and persona/character cards.</p>
          <p><b>Persistence:</b></p>
          <ul>
            <li>It’s saved/restored when you Export/Import the chat JSON.</li>
            <li>If you close without saving the chat JSON, changes to this field won’t persist.</li>
          </ul>
          <p><b>Tips:</b></p>
          <ul>
            <li>Keep it concise and update it when the scene shifts.</li>
            <li>Use it for must-remember facts the model should see every turn.</li>
            <li>You don’t need to duplicate static character facts (age, likes, backstory) in “Plot of the Scene” if they’re already in the persona/character cards. Those cards are injected into every prompt automatically.</li>
          </ul>
          <p><b>What to put in “Plot of the Scene”</b></p>
          <ul>
            <li>Use it for scene-level, time-varying info:</li>
            <li>Current setting, stakes, constraints, objectives.</li>
            <li>Temporary relationships or conditions specific to this scene.</li>
            <li>Overrides to card facts for this scene (if any).</li>
            <li>Facts not present in the cards.</li>
            <li>Skip repeating card details; it wastes context budget and adds noise.</li>
            <li>If you haven’t imported cards, then include key character facts here until you do.</li>
          </ul>
        </div>
      </details>
      <br />
      <textarea v-model="aiPreset.textMemory" class="input ai-preset-textarea" placeholder="Describe the scene or context"></textarea>
    </div>
    <hr class="sidebar-separator" />
    <div class="section">
      <!-- LLM Presets Export/Import Row -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
        <div style="display: flex; align-items: center;">
          <button
            @click="exportAIPreset"
            style="background: transparent; border: none; color: var(--accent, #e75480); cursor: pointer; margin-right: 4px; padding: 0 6px;"
            title="Export LLM Presets"
          >⬆️</button>
          <span style="color: var(--text-main, #e0e3e7); font-size: 0.98em; margin-right: 12px;">Export</span>
        </div>
        <label style="flex: 1; text-align: center; color: var(--text-main, #e0e3e7); font-weight: 500;">AI Settings</label>
        <div style="display: flex; align-items: center;">
          <span style="color: var(--text-main, #e0e3e7); font-size: 0.98em; margin-right: 4px; margin-left: 12px;">Import</span>
          <button
            @click="triggerAIPresetImport"
            style="background: transparent; border: none; color: var(--accent, #e75480); cursor: pointer; padding: 0 6px;"
            title="Import LLM Presets"
          >⬇️</button>
          <input
            ref="aiPresetImportInput"
            type="file"
            accept=".json"
            style="display: none"
            @change="onAIPresetImport"
          />
        </div>
      </div>
      <!-- Basic/Advanced toggle -->
      <div class="button-row center-row" style="margin-bottom:8px;">
        <button class="export-btn" :class="{ disabled: !showAdvanced }" @click="showAdvanced = false" title="Show basic controls">Basic</button>
        <button class="export-btn" :class="{ disabled: showAdvanced }" @click="showAdvanced = true" title="Show all settings">Advanced</button>
      </div>
      <!-- Basic controls (default) -->
      <div v-if="!showAdvanced" class="ai-preset-block">
        <div class="ai-preset-row">
          <label>Response (Tokens)</label>
          <input type="number" v-model.number="aiPreset.responseTokens" min="1" max="4096" class="input ai-preset-input" />
        </div>
        <div class="ai-preset-row">
          <label>Context (Tokens)</label>
          <input type="number" v-model.number="aiPreset.contextTokens" min="1" max="4096" class="input ai-preset-input" />
        </div>
        <div class="ai-preset-row">
          <label>Temperature</label>
          <input type="number" v-model.number="aiPreset.temperature" min="0" max="2" step="0.01" class="input ai-preset-input" />
        </div>
        <div class="ai-preset-row">
          <label>Top P</label>
          <input type="number" v-model.number="aiPreset.topP" min="0" max="1" step="0.01" class="input ai-preset-input" />
        </div>
        <div class="ai-preset-row">
          <label>
            <input type="checkbox" v-model="aiPreset.alwaysAddCharNames" />
            Always add character's name to prompt
          </label>
        </div>
      </div>
      <!-- Advanced controls (all existing fields) -->
      <div v-else class="ai-preset-block">
        <div class="ai-preset-row">
          <label>Response (Tokens)</label>
          <input type="number" v-model.number="aiPreset.responseTokens" min="1" max="4096" class="input ai-preset-input" />
        </div>
        <div class="ai-preset-row">
          <label>Context (Tokens)</label>
          <input type="number" v-model.number="aiPreset.contextTokens" min="1" max="4096" class="input ai-preset-input" />
        </div>
        <div class="ai-preset-row">
          <label>Temperature  </label>
          <input type="number" v-model.number="aiPreset.temperature" min="0" max="2" step="0.01" class="input ai-preset-input" />
        </div>
        <div class="ai-preset-row">
          <label>Top K</label>
          <input type="number" v-model.number="aiPreset.topK" min="0" max="100" class="input ai-preset-input" />
        </div>
        <div class="ai-preset-row">
          <label>Top P</label>
          <input type="number" v-model.number="aiPreset.topP" min="0" max="1" step="0.01" class="input ai-preset-input" />
        </div>
        <div class="ai-preset-row">
          <label>Min P</label>
          <input type="number" v-model.number="aiPreset.minP" min="0" max="1" step="0.01" class="input ai-preset-input" />
        </div>
        <div class="ai-preset-row">
          <label>Repetition Penalty</label>
          <input type="number" v-model.number="aiPreset.repetitionPenalty" min="0" max="5" step="0.01" class="input ai-preset-input" />
        </div>
        <div class="ai-preset-row">
          <label>Rep Pen Range</label>
          <input type="number" v-model.number="aiPreset.repetitionPenaltyRange" min="0" max="2048" class="input ai-preset-input" />
        </div>
        <div class="ai-preset-row vertical">
          <label>Banned Tokens</label>
          <textarea v-model="aiPreset.multiLineBannedToken" class="input ai-preset-textarea" placeholder="Token(s) to ban (comma separated)"></textarea>
        </div>
        <hr class="sidebar-separator" />
        <div class="center-label" style="margin-bottom:6px;">System Prompt</div>
        <div class="ai-preset-row">
          <button type="button" class="ai-preset-link-btn preset-label-white" @click="triggerSystemPromptFileInput">System Prompt</button>
          <input type="file" ref="systemPromptFileInput" accept=".json" style="display:none" @change="onSystemPromptFileChange" />
        </div>
        <div class="ai-preset-row">
          <textarea v-model="aiPreset.systemPrompt" class="input ai-preset-textarea" placeholder="System-level instructions for the LLM"></textarea>
        </div>
        <div class="ai-preset-row vertical">
          <label>Post-History Instructions</label>
          <textarea v-model="aiPreset.postHistoryInstructions" class="input ai-preset-textarea" placeholder="Instructions to apply after chat history"></textarea>
        </div>
        <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start;">
          <label>JSON serialized array of strings</label>
          <input v-model="aiPreset.jsonArrayOfStrings" class="input" style="width: 100%;" placeholder='["Ford","BMW","Fiat"]' />
        </div>
        <div class="ai-preset-row">
          <label>
            <input type="checkbox" v-model="aiPreset.replaceMacroInStopStrings" />
            Replace Macro in Stop Strings
          </label>
        </div>
        <hr class="sidebar-separator" />
        <div class="center-label" style="margin-bottom:6px;">Context Template</div>
        <div class="ai-preset-row">
          <button type="button" class="ai-preset-link-btn preset-label-white" @click="triggerContextFileInput">Context Template</button>
          <input type="file" ref="contextFileInput" accept=".json" style="display:none" @change="onContextFileChange" />
        </div>                
        <div class="ai-preset-row">
          <textarea v-model="aiPreset.contextTemplate" class="input ai-preset-textarea" placeholder="Context template for the LLM"></textarea>
        </div>
        <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start;">
          <label>Example Separator</label>
          <input v-model="aiPreset.exampleSeparator" class="input" style="width: 100%;" />
        </div>
        <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start;">
          <label>Chat Start</label>
          <input v-model="aiPreset.chatStart" class="input" style="width: 100%;" />
        </div>                
        <div class="ai-preset-row">
          <label>
            <input type="checkbox" v-model="aiPreset.alwaysAddCharNames" />
            Always add character's name to prompt
          </label>
        </div>
        <div class="ai-preset-row">
          <label>
            <input type="checkbox" v-model="aiPreset.generateonlyonelineperrequest" />
            Generate only one line per request
          </label>
        </div>
        <div class="ai-preset-row">
          <label>
            <input type="checkbox" v-model="aiPreset.collapseconsecutivenewlines" />
            Collapse Consecutive Newlines
          </label>
        </div>
        <div class="ai-preset-row">
          <label>
            <input type="checkbox" v-model="aiPreset.trimspaces" />
            Trim spaces
          </label>
        </div>
        <div class="ai-preset-row">
          <label>
            <input type="checkbox" v-model="aiPreset.trimincompletesentences" />
            Trim Incomplete Sentences
          </label>
        </div>
        <div class="ai-preset-row">
          <label>
            <input type="checkbox" v-model="aiPreset.separatorsasstopstrings" />
            Separators as Stop Strings
          </label>
        </div>
        <div class="ai-preset-row">
          <label>
            <input type="checkbox" v-model="aiPreset.namesasstopstrings" />
            Names as Stop Strings
          </label>
        </div>                
        <hr class="sidebar-separator" />
        <div class="center-label" style="margin-bottom:6px;">Instruct Template</div>
        <div class="ai-preset-row">
          <button type="button" class="ai-preset-link-btn preset-label-white" @click="triggerInstructFileInput">Instruct Template</button>
          <input type="file" ref="instructFileInput" accept=".json" style="display:none" @change="onInstructFileChange" />
        </div>
        <div class="ai-preset-row">
          <textarea v-model="aiPreset.instructTemplate" class="input ai-preset-textarea" placeholder="Instruct template for the LLM"></textarea>
        </div> 
        <div class="ai-preset-row vertical">
          <label>Activation Regex</label>
          <textarea v-model="aiPreset.activationRegex" class="input ai-preset-textarea" placeholder="Regex to activate special behavior"></textarea>
        </div>
        <div class="ai-preset-row">
          <label>
            <input type="checkbox" v-model="aiPreset.wrapSequencesWithNewline" />
            Wrap Sequences with Newline
          </label>
        </div>
        <div class="ai-preset-row">
          <label>
            <input type="checkbox" v-model="aiPreset.replaceMacroInSequences" />
            Replace Macro in Sequences
          </label>
        </div>
        <div class="ai-preset-row">
          <label>
            <input type="checkbox" v-model="aiPreset.skipExampleDialoguesFormatting" />
            Skip Example Dialogues Formatting
          </label>
        </div>
        <div class="ai-preset-row">
          <label>
            <input type="checkbox" v-model="aiPreset.streaming" />
            Streaming
          </label>
        </div>
        <div class="ai-preset-row">
          <label>
            <input type="checkbox" v-model="aiPreset.clientSideMacroReplacement" />
            Client-side macro replacement
          </label>
        </div>
        <div class="ai-preset-row left-indent-btn" style="flex-direction: column; align-items: flex-start;">
          <label style="margin-bottom: 2px;">Include Names</label>
          <select v-model="aiPreset.includeNames" class="input" style="width: 180px;">
            <option value="Never">Never</option>
            <option value="Groups and Past Personas">Groups and Past Personas</option>
            <option value="Always">Always</option>
          </select>
        </div>
        <hr class="sidebar-separator" />
        <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start;">
          <label class="center-label">User Message Sequences</label>
          <div style="width: 100%;">
            <label style="margin-bottom: 2px;">User Message Prefix</label>
            <input v-model="aiPreset.userMessagePrefix" class="input" placeholder="e.g. <|im_start|>user" style="width: 100%;" />
          </div>
          <div style="width: 100%; margin-top: 8px;">
            <label style="margin-bottom: 2px;">User Message Suffix</label>
            <input v-model="aiPreset.userMessageSuffix" class="input" placeholder="e.g. <|im_end|>" style="width: 100%;" />
          </div>
        </div>
        <hr class="sidebar-separator" />
        <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start;">
          <label class="center-label">Assistant Message Sequences</label>
          <div style="width: 100%;">
            <label style="margin-bottom: 2px;">Assistant Message Prefix</label>
            <input v-model="aiPreset.assistantMessagePrefix" class="input" placeholder="e.g. <|im_start|>assistant" style="width: 100%;" />
          </div>
          <div style="width: 100%; margin-top: 8px;">
            <label style="margin-bottom: 2px;">Assistant Message Suffix</label>
            <input v-model="aiPreset.assistantMessageSuffix" class="input" placeholder="e.g. <|im_end|>" style="width: 100%;" />
          </div>
        </div>
        <hr class="sidebar-separator" />
        <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start;">
          <label class="center-label">System Message Sequences</label>
          <div style="width: 100%;">
            <label style="margin-bottom: 2px;">System Message Prefix</label>
            <input v-model="aiPreset.systemMessagePrefix" class="input" placeholder="e.g. <|im_start|>system" style="width: 100%;" />
          </div>
          <div style="width: 100%; margin-top: 8px;">
            <label style="margin-bottom: 2px;">System Message Suffix</label>
            <input v-model="aiPreset.systemMessageSuffix" class="input" placeholder="e.g. <|im_end|>" style="width: 100%;" />
          </div>
          <div class="ai-preset-row" style="margin-top: 8px;">
            <label>
              <input type="checkbox" v-model="aiPreset.systemSameAsUser" />
              System Same as User
            </label>
          </div>
        </div>
        <hr class="sidebar-separator" />
        <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start; margin-top: 8px;">
          <label class="center-label">System Prompt Sequences</label>
          <div style="width: 100%;">
            <label style="margin-bottom: 2px;">System Prompt Prefix</label>
            <input v-model="aiPreset.systemPromptPrefix" class="input" style="width: 100%;" />
          </div>
          <div style="width: 100%; margin-top: 8px;">
            <label style="margin-bottom: 2px;">System Prompt Suffix</label>
            <input v-model="aiPreset.systemPromptSuffix" class="input" style="width: 100%;" />
          </div>
        </div>
        <hr class="sidebar-separator" />
        <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start; margin-top: 8px;">
          <label class="center-label">Misc. Sequences</label>
          <div style="width: 100%;">
            <label style="margin-bottom: 2px;">First Assistant Prefix</label>
            <input v-model="aiPreset.firstAssistantPrefix" class="input" style="width: 100%;" />
          </div>
          <div style="width: 100%; margin-top: 8px;">
            <label style="margin-bottom: 2px;">Last Assistant Prefix</label>
            <input v-model="aiPreset.lastAssistantPrefix" class="input" style="width: 100%;" />
          </div>
          <div style="width: 100%; margin-top: 8px;">
            <label style="margin-bottom: 2px;">First User Prefix</label>
            <input v-model="aiPreset.firstUserPrefix" class="input" style="width: 100%;" />
          </div>
          <div style="width: 100%; margin-top: 8px;">
            <label style="margin-bottom: 2px;">Last User Prefix</label>
            <input v-model="aiPreset.lastUserPrefix" class="input" style="width: 100%;" />
          </div>
          <div style="width: 100%; margin-top: 8px;">
            <label style="margin-bottom: 2px;">System Instruction Prefix</label>
            <input v-model="aiPreset.systemInstructionPrefix" class="input" style="width: 100%;" />
          </div>
          <div style="width: 100%; margin-top: 8px;">
            <label style="margin-bottom: 2px;">Stop Sequence</label>
            <input v-model="aiPreset.stopSequence" class="input" style="width: 100%;" />
          </div>
          <div style="width: 100%; margin-top: 8px;">
            <label style="margin-bottom: 2px;">User Filler Message</label>
            <input v-model="aiPreset.userFillerMessage" class="input" style="width: 100%;" />
          </div>
        </div>
        <!-- Instruct Sequences (vendor) -->
        <hr class="sidebar-separator" />
        <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start; margin-top: 8px;">
          <label class="center-label">Instruct Sequences</label>
          <div style="width: 100%;">
            <label style="margin-bottom: 2px;">Input Sequence</label>
            <input v-model="aiPreset.inputSequence" class="input" style="width: 100%;" />
          </div>
          <div style="width: 100%; margin-top: 8px;">
            <label style="margin-bottom: 2px;">Output Sequence</label>
            <input v-model="aiPreset.outputSequence" class="input" style="width: 100%;" />
          </div>
          <div style="width: 100%; margin-top: 8px; display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <div>
              <label style="margin-bottom: 2px;">First Input Sequence</label>
              <input v-model="aiPreset.firstInputSequence" class="input" />
            </div>
            <div>
              <label style="margin-bottom: 2px;">Last Input Sequence</label>
              <input v-model="aiPreset.lastInputSequence" class="input" />
            </div>
            <div>
              <label style="margin-bottom: 2px;">First Output Sequence</label>
              <input v-model="aiPreset.firstOutputSequence" class="input" />
            </div>
            <div>
              <label style="margin-bottom: 2px;">Last Output Sequence</label>
              <input v-model="aiPreset.lastOutputSequence" class="input" />
            </div>
          </div>
          <div style="width: 100%; margin-top: 8px;">
            <label style="margin-bottom: 2px;">System Sequence</label>
            <input v-model="aiPreset.systemSequence" class="input" style="width: 100%;" />
          </div>
          <div style="width: 100%; margin-top: 8px; display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <div>
              <label style="margin-bottom: 2px;">System Sequence Prefix</label>
              <input v-model="aiPreset.systemSequencePrefix" class="input" />
            </div>
            <div>
              <label style="margin-bottom: 2px;">System Sequence Suffix</label>
              <input v-model="aiPreset.systemSequenceSuffix" class="input" />
            </div>
          </div>
          <div style="width: 100%; margin-top: 8px; display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px;">
            <div>
              <label style="margin-bottom: 2px;">Input Suffix</label>
              <input v-model="aiPreset.inputSuffix" class="input" />
            </div>
            <div>
              <label style="margin-bottom: 2px;">Output Suffix</label>
              <input v-model="aiPreset.outputSuffix" class="input" />
            </div>
            <div>
              <label style="margin-bottom: 2px;">System Suffix</label>
              <input v-model="aiPreset.systemSuffix" class="input" />
            </div>
          </div>
          <div class="ai-preset-row" style="margin-top:8px;">
            <label><input type="checkbox" v-model="aiPreset.wrapSequences" /> Wrap Sequences</label>
          </div>
          <div class="ai-preset-row">
            <label><input type="checkbox" v-model="aiPreset.namesForceGroups" /> Names Force Groups</label>
          </div>
        </div>
        <!-- Context Options (vendor) -->
        <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start; margin-top: 8px;">
          <label>Context Options</label>
          <div class="ai-preset-row">
            <label><input type="checkbox" v-model="aiPreset.useStopStrings" /> Use Stop Strings</label>
          </div>
          <div class="ai-preset-row">
            <label><input type="checkbox" v-model="aiPreset.allowJailbreak" /> Allow Jailbreak</label>
          </div>
          <div class="ai-preset-row">
            <label><input type="checkbox" v-model="aiPreset.alwaysForceName2" /> Always Force Name2</label>
          </div>
        </div>
        <!-- Advanced Sampling -->
        <hr class="sidebar-separator" />
        <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start; margin-top: 8px;">
          <label class="center-label" style="margin-bottom: 6px;">Advanced Sampling</label>
          <div style="width:100%; display:grid; grid-template-columns: repeat(5, 1fr); gap:8px;">
            <div><label style="margin-bottom:2px;">typical_p</label><input type="number" step="0.01" v-model.number="aiPreset.typicalP" class="input" /></div>
            <div><label style="margin-bottom:2px;">tfs</label><input type="number" step="0.01" v-model.number="aiPreset.tfs" class="input" /></div>
            <div><label style="margin-bottom:2px;">top_a</label><input type="number" step="0.01" v-model.number="aiPreset.topA" class="input" /></div>
            <div><label style="margin-bottom:2px;">ε cutoff</label><input type="number" step="0.01" v-model.number="aiPreset.epsilonCutoff" class="input" /></div>
            <div><label style="margin-bottom:2px;">η cutoff</label><input type="number" step="0.01" v-model.number="aiPreset.etaCutoff" class="input" /></div>
          </div>
        </div>
        <!-- Penalties -->
        <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start; margin-top: 8px;">
          <label class="center-label" style="margin-bottom: 6px;">Penalties</label>
          <div style="width:100%; display:grid; grid-template-columns: repeat(4, 1fr); gap:8px;">
            <div><label style="margin-bottom:2px;">Encoder Rep</label><input type="number" step="0.01" v-model.number="aiPreset.encoderRepetitionPenalty" class="input" /></div>
            <div><label style="margin-bottom:2px;">Freq</label><input type="number" step="0.01" v-model.number="aiPreset.frequencyPenalty" class="input" /></div>
            <div><label style="margin-bottom:2px;">Presence</label><input type="number" step="0.01" v-model.number="aiPreset.presencePenalty" class="input" /></div>
            <div><label style="margin-bottom:2px;">Alpha</label><input type="number" step="0.01" v-model.number="aiPreset.penaltyAlpha" class="input" /></div>
          </div>
        </div>
        <!-- Length & Beams -->
        <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start; margin-top: 8px;">
          <label class="center-label" style="margin-bottom: 6px;">Length & Beams</label>
          <div style="width:100%; display:grid; grid-template-columns: repeat(5, 1fr); gap:8px;">
            <div><label style="margin-bottom:2px;">max_length</label><input type="number" v-model.number="aiPreset.maxLength" class="input" /></div>
            <div><label style="margin-bottom:2px;">min_length</label><input type="number" v-model.number="aiPreset.minLength" class="input" /></div>
            <div><label style="margin-bottom:2px;">num_beams</label><input type="number" v-model.number="aiPreset.numBeams" class="input" /></div>
            <div><label style="margin-bottom:2px;">length_penalty</label><input type="number" step="0.01" v-model.number="aiPreset.lengthPenalty" class="input" /></div>
            <div style="display:flex; align-items:center; gap:6px;"><input type="checkbox" v-model="aiPreset.earlyStopping" /> <span>early_stopping</span></div>
          </div>
        </div>
        <!-- Dynamic Temperature -->
        <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start; margin-top: 8px;">
          <label class="center-label" style="margin-bottom: 6px;">Dynamic Temperature</label>
          <div style="width:100%; display:grid; grid-template-columns: repeat(4, 1fr); gap:8px;">
            <div style="display:flex; align-items:center; gap:6px;"><input type="checkbox" v-model="aiPreset.dynatemp" /> <span>dynatemp</span></div>
            <div><label style="margin-bottom:2px;">min_temp</label><input type="number" step="0.01" v-model.number="aiPreset.minTemp" class="input" /></div>
            <div><label style="margin-bottom:2px;">max_temp</label><input type="number" step="0.01" v-model.number="aiPreset.maxTemp" class="input" /></div>
            <div><label style="margin-bottom:2px;">dynatemp_exponent</label><input type="number" step="0.01" v-model.number="aiPreset.dynatempExponent" class="input" /></div>
          </div>
        </div>
        <!-- Dryness Controls -->
        <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start; margin-top: 8px;">
          <label class="center-label" style="margin-bottom: 6px;">Dryness Controls</label>
          <div style="width:100%; display:grid; grid-template-columns: repeat(5, 1fr); gap:8px;">
            <div><label style="margin-bottom:2px;">allowed_length</label><input type="number" v-model.number="aiPreset.dryAllowedLength" class="input" /></div>
            <div><label style="margin-bottom:2px;">multiplier</label><input type="number" step="0.01" v-model.number="aiPreset.dryMultiplier" class="input" /></div>
            <div><label style="margin-bottom:2px;">base</label><input type="number" step="0.01" v-model.number="aiPreset.dryBase" class="input" /></div>
            <div><label style="margin-bottom:2px;">penalty_last_n</label><input type="number" v-model.number="aiPreset.dryPenaltyLastN" class="input" /></div>
            <div>
              <label style="margin-bottom:2px;">sequence_breakers (JSON)</label>
              <input v-model="aiPreset.drySequenceBreakers" class="input" />
            </div>
          </div>
        </div>
        <!-- Grammar / JSON Schema -->
        <hr class="sidebar-separator" />
        <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start; margin-top: 8px;">
          <label class="center-label">Grammar / JSON Schema</label>
          <div style="width:100%;">
            <label style="margin-bottom:2px;">Grammar String</label>
            <textarea v-model="aiPreset.grammarString" class="input ai-preset-textarea" placeholder="e.g., PEG grammar"></textarea>
          </div>
          <div style="width:100%; margin-top:8px;">
            <label style="margin-bottom:2px;">JSON Schema</label>
            <textarea v-model="aiPreset.jsonSchema" class="input ai-preset-textarea" placeholder='{"type": "object"}'></textarea>
          </div>
        </div>
        <!-- Sampler Config (JSON) -->
        <hr class="sidebar-separator" />
        <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start; margin-top: 8px;">
          <label class="center-label" style="margin-bottom: 6px;">Sampler Config</label>
          <div style="width:100%; display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <div>
              <label style="margin-bottom:2px;">sampler_priority (JSON)</label>
              <textarea v-model="aiPreset.samplerPriority" class="input ai-preset-textarea" placeholder='["repetition_penalty", "top_p", "top_k"]'></textarea>
            </div>
            <div>
              <label style="margin-bottom:2px;">samplers (JSON)</label>
              <textarea v-model="aiPreset.samplers" class="input ai-preset-textarea" placeholder='["dry", "top_k", "temperature"]'></textarea>
            </div>
          </div>
          <div style="width:100%; display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:8px;">
            <div>
              <label style="margin-bottom:2px;">samplers_priorities (JSON)</label>
              <textarea v-model="aiPreset.samplersPriorities" class="input ai-preset-textarea"></textarea>
            </div>
            <div>
              <label style="margin-bottom:2px;">sampler_order (JSON)</label>
              <textarea v-model="aiPreset.samplerOrder" class="input ai-preset-textarea" placeholder='[6,0,1,3,4,2,5]'></textarea>
            </div>
          </div>
          <div style="width:100%; margin-top:8px;">
            <label style="margin-bottom:2px;">logit_bias (JSON)</label>
            <textarea v-model="aiPreset.logitBias" class="input ai-preset-textarea" placeholder='[{"token":123,"bias":-5}]'></textarea>
          </div>
        </div>
      </div> <!-- closes .ai-preset-block -->
    </div> <!-- closes .section -->
  </div> <!-- closes .sidebar -->
  <div v-else class="sidebar-collapsed">
    <div class="expand-btn" @click="$emit('update:sidebarOpen', true)" title="Show controls">⏵</div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, reactive, nextTick } from 'vue'

const props = defineProps({
  sidebarOpen: Boolean,
  themes: Array,
  selectedThemeIdx: Number,
  state: Object,
  characterSelections: Array,
  aiPreset: Object,
  autoScroll: Boolean,
  applyTheme: Function,
  openChatFile: Function,
  openAddUserModal: Function,
  openAddCharacterModal: Function,
  applyCharacterSelection: Function,
  onCharacterNameEdit: Function,
  onPortraitUpload: Function,
  triggerPortraitInput: Function,
  addMessageForCharacter: Function,
  toggleCharStyle: Function,
  moveCharacterUp: Function,
  moveCharacterDown: Function,
  onLayoutChange: Function,
  resetLayout: Function,
  resetColor: Function,
  exportHTML: Function,
  exportChatTxt: Function,
  exportChatDocx: Function,
  exportChatJson: Function,
  triggerBgFileInput: Function,
  exportAIPreset: Function,
  triggerAIPresetImport: Function,
  onAIPresetImport: Function,
  triggerSystemPromptFileInput: Function,
  onSystemPromptFileChange: Function,
  triggerContextFileInput: Function,
  onContextFileChange: Function,
  triggerInstructFileInput: Function,
  onInstructFileChange: Function,
})
const emit = defineEmits(['update:sidebarOpen','update:selectedThemeIdx','update:characterSelections','update:autoScroll','importPersonaCard','importCharacterCard'])

const aiPresetImportInput = ref(null)
const personaCardInput = ref(null)
const characterCardInput = ref(null)
const showAdvanced = ref(false)
const blurColor = ref('#232733'); // Default blur color
const blurAlpha = ref(0.4); // Default opacity

function hexToRgba(hex, alpha) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

watch([blurColor, blurAlpha], ([newColor, newAlpha]) => {
  document.documentElement.style.setProperty('--blur-overlay', hexToRgba(newColor, newAlpha));
});

onMounted(() => {
  document.documentElement.style.setProperty('--blur-overlay', hexToRgba(blurColor.value, blurAlpha.value));
});

function resetBlurColor() {
  blurColor.value = '#232733';
  blurAlpha.value = 0.4;
}
// Local copy for v-model
const localCharacterSelections = ref([...props.characterSelections])

// Watch for prop changes from parent
watch(
  () => props.characterSelections,
  (newVal) => {
    localCharacterSelections.value = [...newVal]
  }
)

// emit already defined above with all events (including update:sidebarOpen)

// Local copy for autoScroll
const localAutoScroll = ref(props.autoScroll)

// Watch for prop changes from parent
watch(
  () => props.autoScroll,
  (newVal) => {
    localAutoScroll.value = newVal
  }
)

// Emit changes to parent
watch(localAutoScroll, (val) => {
  emit('update:autoScroll', val)
})

// Emit changes to parent
watch(localCharacterSelections, (val) => {
  emit('update:characterSelections', val)
})

function onThemeChange(event) {
  const idx = Number(event.target.value)
  emit('update:selectedThemeIdx', idx)
  applyTheme(idx)
}

// Font formatter menu state and click-away handling
const fontMenuOpen = reactive({})
const fontMenuSide = reactive({}) // 'right' (default) or 'left'
const fontPopoverRefs = ref({})
function setFontPopoverRef(el, idx) {
  if (!fontPopoverRefs.value) fontPopoverRefs.value = {}
  if (el) fontPopoverRefs.value[idx] = el; else delete fontPopoverRefs.value[idx]
}
function toggleFontMenu(idx, evt) {
  fontMenuOpen[idx] = !fontMenuOpen[idx]
  if (fontMenuOpen[idx]) {
    fontMenuSide[idx] = 'right'
    nextTick(() => {
      try {
        const triggerBtn = evt && evt.currentTarget ? evt.currentTarget : null
        if (!triggerBtn) return;
        const sidebar = triggerBtn.closest && triggerBtn.closest('.sidebar')
        if (!sidebar) return;
        const sidebarRect = sidebar.getBoundingClientRect()
        const btnRect = triggerBtn.getBoundingClientRect()
        const pop = fontPopoverRefs.value[idx]
        const popWidth = pop ? pop.getBoundingClientRect().width : 220
        const gap = 6
        const spaceRight = sidebarRect.right - btnRect.right
        const spaceLeft = btnRect.left - sidebarRect.left
        if (spaceRight < popWidth + gap && spaceLeft >= popWidth + gap) {
          fontMenuSide[idx] = 'left'
        } else {
          fontMenuSide[idx] = 'right'
        }
      } catch (e) {
        fontMenuSide[idx] = 'right'
      }
    })
  }
}
function closeAllFontMenus() {
  Object.keys(fontMenuOpen).forEach(k => { fontMenuOpen[k] = false })
}
function onDocClick(e) {
  const t = e.target
  const within = t && t.closest && (t.closest('.menu-popover') || t.closest('.btn-with-menu'))
  if (!within) closeAllFontMenus()
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
})

function triggerAIPresetImport() {
  if (aiPresetImportInput.value) {
    aiPresetImportInput.value.click()
  }
}
function triggerPersonaCardInput() {
  if (personaCardInput.value) {
    personaCardInput.value.click()
  }
}
function triggerCharacterCardInput() {
  if (characterCardInput.value) {
    characterCardInput.value.click()
  }
}
function onImportPersonaCard(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const json = JSON.parse(evt.target.result);
      emit('importPersonaCard', json);
    } catch (err) {
      // Optionally show a toast or error
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function onImportCharacterCard(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const json = JSON.parse(evt.target.result);
      emit('importCharacterCard', json);
    } catch (err) {
      // Optionally show a toast or error
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function findChar(name) {
  return props.state.characters.find(c => c.name === name);
}

// --- Resizer logic ---
const sidebarWidth = ref(Number(localStorage.getItem('sidebarWidth')) || 320)
const SIDEBAR_MIN = 220
let _startX = 0
let _startWidth = 0

function clampWidth(w) {
  // Only enforce minimum width to remove any artificial right-side limit
  return Math.max(SIDEBAR_MIN, Math.round(w))
}

function startResize(e) {
  // Pointer events unify mouse/touch/pen
  const clientX = e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || 0
  _startX = clientX
  _startWidth = sidebarWidth.value || 320
  document.body.classList.add('resizing-in-progress')
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', stopResize)
  // prevent text selection while dragging
}

function onPointerMove(e) {
  const dx = (e.clientX || 0) - _startX
  sidebarWidth.value = clampWidth(_startWidth + dx)
}

function stopResize() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', stopResize)
  document.body.classList.remove('resizing-in-progress')
  try { localStorage.setItem('sidebarWidth', String(sidebarWidth.value)) } catch (e) { /* ignore */ }
}

onMounted(() => {
  // clamp loaded width in case prefs changed
  sidebarWidth.value = clampWidth(sidebarWidth.value)
})

onBeforeUnmount(() => {
  // ensure listeners removed
  stopResize()
})
</script>

/*
  Remove all local sidebar and button styles to ensure SidebarPanel.vue uses only the global .sidebar and .sidebar-collapsed styles from style.css.
  This prevents style duplication and ensures unified sidebar appearance across the app.
*/