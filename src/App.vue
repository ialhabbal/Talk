<template>
  <div class="app-root" @keydown="handleDirShortcut" tabindex="0">
    <div class="main-row">
      <div class="sidebar-container">
        <transition name="sidebar">
          <div v-if="sidebarOpen" class="sidebar">
            <div class="collapse-btn" @click="sidebarOpen = false" title="Hide controls">⏴</div>
            <!-- 3. Theme selector UI -->
            <div class="section">
              <label>Theme:</label>
              <select v-model="selectedThemeIdx" @change="applyTheme(selectedThemeIdx)">
                <option v-for="(theme, idx) in themes" :key="theme.name" :value="idx">{{ theme.name }}</option>
              </select>
            </div>
            <hr class="sidebar-separator" />
            <div class="section">
              <p style="margin-bottom: 8px; font-weight: 500; line-height: 1.2;">
                Add User, Character(s) and Start Chatting, or Load an Existing Chat File<br>
                <span style="font-weight: 400; font-size: 0.97em; color: #b0b7c3;">(.txt / .docx / .json)</span>
              </p>
            </div>
            <!-- Removed bordered-section that contained Start New Chat button -->
            <div class="section bordered-section">
              <label>Load Existing Chat File:</label>
              <input type="file" accept=".json,.txt,.docx" @change="onFileUpload" />
            </div>
            <!-- Move Chat Title section here -->
            <div class="section">
              <label>Chat Title<br> (Auto Generated or Write Own Title)</label>
              <input v-model="state.chatTitle" class="input" placeholder="Chat Title" />
              <button class="export-btn" style="margin-top:8px;" @click="addNewCharacter">Add New Character</button>
              <button class="export-btn" style="margin-top:8px;" @click="addNewUser">Add New User</button>
            </div>
            <!-- Characters sections below -->
            <div class="section" v-if="state.potentialCharacters.length">
              <label>Select Characters:</label>
              <div class="characters-list">
                <label v-for="c in state.potentialCharacters" :key="c">
                  <input type="checkbox" v-model="characterSelections" :value="c" />
                  {{ c }}
                </label>
              </div>
              <button @click="applyCharacterSelection">Add Characters to Chat</button>
            </div>
            <div class="section" v-if="state.characters.length">
              <label>Characters:</label>
              <div class="character-edit" v-for="(c, idx) in state.characters" :key="c.name">
                <span class="type-label" style="font-weight:bold; margin-right:4px;">{{ c.typeLabel }}</span>
                <input v-model="c.name" class="input charname" @input="onCharacterNameEdit(idx)" />
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
                  class="add-msg-btn small-btn"
                  @click="addMessageForCharacter(c.name)"
                  title="Add message for this character"
                >➕</button>
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
                <input
                  type="color"
                  v-model="c.fontColor"
                  title="Font Color"
                  class="font-color-input small-color"
                />
                <select v-model="c.fontFamily" class="font-family-select small-select" title="Font Family">
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
            <hr class="sidebar-separator" />
            <div class="section">
              <label>Layout:</label>
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
              <!-- New slider for Message Blur -->
              <div class="slider-row">
                <span>Message Blur:</span>
                <input type="range" min="0" max="12" v-model="state.layout.blur" @input="onLayoutChange" />
                <span>{{ state.layout.blur }}px</span>
                <button class="reset-btn" @click="resetLayout('blur')" title="Reset to default">⭮</button>
              </div>
            </div>
            <div class="slider-row">
              <input type="checkbox" id="autoScroll" v-model="autoScroll" />
              <label for="autoScroll" style="margin-left: 6px;">Auto-Scroll</label>
            </div>
            <hr class="sidebar-separator" />
            <div class="section">
              <label>Colors:</label>
              <div class="color-row">
                <span>Text:</span>
                <ColorPicker v-model:pureColor="state.colors.text" />
                <span class="color-value">{{ state.colors.text }}</span>
                <button class="reset-btn" @click="resetColor('text')" title="Reset to default">⭮</button>
              </div>
              <div class="color-row">
                <span>Quote/Border:</span>
                <ColorPicker v-model:pureColor="state.colors.quote" />
                <span class="color-value">{{ state.colors.quote }}</span>
                <button class="reset-btn" @click="resetColor('quote')" title="Reset to default">⭮</button>
              </div>
              <div class="color-row">
                <span>Italic/Name:</span>
                <ColorPicker v-model:pureColor="state.colors.italic" />
                <span class="color-value">{{ state.colors.italic }}</span>
                <button class="reset-btn" @click="resetColor('italic')" title="Reset to default">⭮</button>
              </div>
            </div>
            <hr class="sidebar-separator" />
            <div class="section">
              <button @click="exportHTML" class="export-btn left-indent-btn">Export as HTML</button>
              <button @click="exportChatTxt" class="export-btn left-indent-btn">Save Chat as Text File (.txt)</button>
              <button @click="exportChatDocx" class="export-btn left-indent-btn">Save Chat as Word Document (.docx)</button>
              <button @click="exportChatJson" class="export-btn left-indent-btn">Export Chat as JSON</button>
            </div>
            <div class="section">
              <button class="export-btn bg-btn-blue" @click="triggerBgFileInput">Set Chat Background</button>
            </div>
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
                <label style="flex: 1; text-align: center; color: var(--text-main, #e0e3e7); font-weight: 500;">LLM Presets</label>
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
              
              <div class="ai-preset-block">
                <div class="ai-preset-row vertical">
                  <label>LLM Memory</label>
                  <textarea v-model="aiPreset.textMemory" class="input ai-preset-textarea" placeholder="Enter memory/context for the LLM"></textarea>
                </div>
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
                <div class="ai-preset-row">
                  <label>Banned Tokens</label>
                  <input v-model="aiPreset.multiLineBannedToken" class="input ai-preset-input" placeholder="Token(s) to ban (comma separated)" />
                </div>
                <!-- New: System Prompt -->
                <div class="ai-preset-row">
                  <button type="button" class="ai-preset-link-btn preset-label-white" @click="triggerSystemPromptFileInput">System Prompt</button>
                  <input type="file" ref="systemPromptFileInput" accept=".json" style="display:none" @change="onSystemPromptFileChange" />
                </div>
                <div class="ai-preset-row">
                  <textarea v-model="aiPreset.systemPrompt" class="input ai-preset-textarea" placeholder="System-level instructions for the LLM"></textarea>
                </div>
                <!-- Context Template Button and Textarea -->
                <!-- Post-History Instructions -->
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
                <!-- Context Template Button and Textarea -->
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
                <!-- Instruct Template Button and Textarea -->
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
                <div class="ai-preset-row left-indent-btn" style="flex-direction: column; align-items: flex-start;">
                  <label style="margin-bottom: 2px;">Include Names</label>
                  <select v-model="aiPreset.includeNames" class="input" style="width: 180px;">
                    <option value="Never">Never</option>
                    <option value="Groups and Past Personas">Groups and Past Personas</option>
                    <option value="Always">Always</option>
                  </select>
                </div>
                <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start;">
                <label>User Message Sequences</label>
                <div style="width: 100%;">
                  <label style="margin-bottom: 2px;">User Message Prefix</label>
                  <input v-model="aiPreset.userMessagePrefix" class="input" placeholder="e.g. <|im_start|>user" style="width: 100%;" />
                </div>
                <div style="width: 100%; margin-top: 8px;">
                  <label style="margin-bottom: 2px;">User Message Suffix</label>
                  <input v-model="aiPreset.userMessageSuffix" class="input" placeholder="e.g. <|im_end|>" style="width: 100%;" />
                </div>
              </div>
              <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start;">
                <label>Assistant Message Sequences</label>
                <div style="width: 100%;">
                  <label style="margin-bottom: 2px;">Assistant Message Prefix</label>
                  <input v-model="aiPreset.assistantMessagePrefix" class="input" placeholder="e.g. <|im_start|>assistant" style="width: 100%;" />
                </div>
                <div style="width: 100%; margin-top: 8px;">
                  <label style="margin-bottom: 2px;">Assistant Message Suffix</label>
                  <input v-model="aiPreset.assistantMessageSuffix" class="input" placeholder="e.g. <|im_end|>" style="width: 100%;" />
                </div>
              </div>
              <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start;">
                <label>System Message Sequences</label>
                <div style="width: 100%;">
                  <label style="margin-bottom: 2px;">System Message Prefix</label>
                  <input v-model="aiPreset.systemMessagePrefix" class="input" placeholder="e.g. <|im_start|>system" style="width: 100%;" />
                </div>
                <div style="width: 100%; margin-top: 8px;">
                  <label style="margin-bottom: 2px;">System Message Suffix</label>
                  <input v-model="aiPreset.systemMessageSuffix" class="input" placeholder="e.g. <|im_end|>" style="width: 100%;" />
                </div>
                <!-- Move the checkbox here, after the suffix input -->
                <div class="ai-preset-row" style="margin-top: 8px;">
                  <label>
                    <input type="checkbox" v-model="aiPreset.systemSameAsUser" />
                    System Same as User
                  </label>
                </div>
              </div>
              <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start; margin-top: 8px;">
                <label>System Prompt Sequences</label>
                <div style="width: 100%;">
                  <label style="margin-bottom: 2px;">System Prompt Prefix</label>
                  <input v-model="aiPreset.systemPromptPrefix" class="input" style="width: 100%;" />
                </div>
                <div style="width: 100%; margin-top: 8px;">
                  <label style="margin-bottom: 2px;">System Prompt Suffix</label>
                  <input v-model="aiPreset.systemPromptSuffix" class="input" style="width: 100%;" />
                </div>
              </div>
              <div class="ai-preset-row vertical left-indent-btn" style="align-items: flex-start; margin-top: 8px;">
                <label>Misc. Sequences</label>
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
                <!-- New: Streaming Checkbox -->
                
              </div>
            </div>
            </div>
        </transition>
        <div v-if="!sidebarOpen" class="sidebar-collapsed">
          <div class="expand-btn" @click="sidebarOpen = true" title="Show controls">⏵</div>
        </div>
      </div>
      <!-- Main Chat Area -->
      <div class="main" :class="{ 'sidebar-collapsed-main': !sidebarOpen }" ref="mainChatArea">
        <!-- Place this inside the .main div, before <h3> -->
        <div class="close-chat-btn-container">
          <button
            class="close-chat-btn"
            @click="onCloseChat"
            title="Close Chat"
          >✖</button>
        </div>
        <h3>{{ state.chatTitle || autoTitle }}</h3>
        <div class="chat-box">
          <div
            v-for="(msg, idx) in state.messages"
            :key="idx"
            class="msg-row"
            :style="{ flexDirection: (msg.direction === 'rtl') ? 'row-reverse' : 'row' }"
          >
            <div
              class="msg-portrait"
              :style="{
                ...portraitStyle(msg.speaker),
                marginRight: (msg.direction === 'rtl') ? '0' : '16px',
                marginLeft: (msg.direction === 'rtl') ? '16px' : '0'
              }"
            >
              <img v-if="findChar(msg.speaker)?.portraitData" :src="findChar(msg.speaker).portraitData" />
              <span v-else>{{ msg.speaker[0] }}</span>
            </div>
            <div class="msg-body" :style="msgBodyStyle">
              <div class="msg-header"
                :style="characterFontStyle(msg.speaker)">

                {{ msg.speaker }}
              </div>
              <div v-if="editIdx !== idx"
                class="msg-content"
                v-html="formatText(msg.versions && msg.versions[msg.currentVersionIdx] ? msg.versions[msg.currentVersionIdx].content : msg.content, msg.speaker)"
                :dir="msg.direction || 'ltr'"
                :style="{ textAlign: (msg.direction === 'rtl') ? 'right' : 'left' }"
                @click="startEdit(idx, msg.content)"
              >
              </div>
              <textarea
                v-else
                v-model="editContent"
                class="msg-edit"
                :style="{
                  fontSize: state.layout.fontSize + 'px',
                  color: state.colors.text,
                  textAlign: editDirection === 'rtl' ? 'right' : 'left'
                }"
                :dir="editDirection"
                @input="autoGrow($event)"
                ref="editArea"
                @keydown.enter.exact.prevent="saveEdit(idx)"
              ></textarea>
              <!-- MEDIA PREVIEW AND REMOVE BUTTON -->
              <div class="msg-media" v-if="msg.media">
                <div
                  class="media-resize-wrapper"
                  :style="{
                    height: (msg.media.height || (msg.media.type === 'image' ? 180 : 140)) + 'px'
                  }"
                  style="position: relative;"
                >
                  <img
                    v-if="msg.media.type === 'image'"
                    :src="msg.media.data"
                    class="attached-media"
                    :style="{ width: '100%', height: '100%', objectFit: 'contain' }"
                    alt="Attached"
                    draggable="false"
                  />
                  <video
                    v-else-if="msg.media.type === 'video'"
                    :src="msg.media.data"
                    controls
                    class="attached-media"
                    :style="{ width: '100%', height: '100%', objectFit: 'contain' }"
                    draggable="false"
                  ></video>
                  <!-- Horizontal controls bar at the bottom of attached media -->
                  <div class="media-action-row">
                    <button
                      class="remove-media-btn"
                      @click="removeMedia(idx)"
                      title="Remove media"
                    >✖</button>
                    <button
                      class="detach-media-btn"
                      @click="detachMedia(idx)"
                      title="Detach media"
                    >⇱</button>
                    <button
                      class="drag-media-btn"
                      @mousedown.prevent="startMediaDrag(idx, $event)"
                      title="Drag to detach and move"
                    >⠿</button>
                  </div>
                  <!-- Corner resize handles (attached) -->
                  <div
                    class="resize-handle corner top-left"
                    @mousedown.prevent="startAttachedCornerResize(idx, 'top-left', $event)"
                    title="Resize"
                  ></div>
                  <div
                    class="resize-handle corner top-right"
                    @mousedown.prevent="startAttachedCornerResize(idx, 'top-right', $event)"
                    title="Resize"
                  ></div>
                  <div
                    class="resize-handle corner bottom-left"
                    @mousedown.prevent="startAttachedCornerResize(idx, 'bottom-left', $event)"
                    title="Resize"
                  ></div>
                  <div
                    class="resize-handle corner bottom-right"
                    @mousedown.prevent="startAttachedCornerResize(idx, 'bottom-right', $event)"
                    title="Resize"
                  ></div>
                </div>
              </div>
              <div class="msg-actions">
                <!-- Direction arrows -->
                <button
                  class="msg-action-btn small-action-btn"
                  @click="setMessageDirection(idx, 'ltr')"
                  :title="'Set Left-to-Right'"
                  :disabled="msg.direction === 'ltr'"
                >⬅️</button>
                <button
                  class="msg-action-btn small-action-btn"
                  @click="setMessageDirection(idx, 'rtl')"
                  :title="'Set Right-to-Left'"
                  :disabled="msg.direction === 'rtl'"
                >➡️</button>
                <button
                  class="msg-action-btn small-action-btn"
                  @click="triggerMediaInput(idx)"
                  title="Attach image/video"
                >📎</button>
                <input
                  type="file"
                  accept="image/*,video/*"
                  :ref="'mediaInput' + idx"
                  style="display:none"
                  @change="e => onMediaUpload(idx, e)"
                />
                <button
                  class="msg-action-btn small-action-btn"
                  v-if="editIdx !== idx"
                  @click="startEdit(idx, msg.content)"
                  title="Edit"
                >🖉</button>
                <template v-else>
                  <button class="msg-action-btn small-action-btn" @click="saveEdit(idx)" title="Save">💾</button>
                  <button class="msg-action-btn small-action-btn" @click="cancelEdit" title="Cancel">✖</button>
                  <button
                    class="msg-action-btn delete-msg-btn small-action-btn"
                    @click="deleteMessage(idx)"
                    title="Delete this message"
                  >🗑️</button>
                </template>
                <button
                  class="msg-action-btn small-action-btn"
                  @click="undo"
                  :disabled="!canUndo"
                  title="Undo"
                >↺</button>
                <button
                  class="msg-action-btn small-action-btn"
                  @click="redo"
                  :disabled="!canRedo"
                  title="Redo"
                >↻</button>
                <!-- Character Avatars and Generate Buttons (moved here) -->
                <div class="msg-char-avatars-inline">
                  <span
                    v-for="(char, cidx) in state.characters"
                    :key="'avatar-inline-' + char.name + '-' + idx"
                    class="msg-char-avatar"
                    :title="'Insert empty message as ' + char.name"
                    @click="insertEmptyMessageForCharacter(char.name, idx)"
                    @contextmenu.prevent="insertEmptyMessageForCharacter(char.name, idx)"
                    :class="{ disabled: isGenerating }"
                    :aria-disabled="isGenerating"
                  >
                    <img v-if="char.portraitData" :src="char.portraitData" :alt="char.name" />
                    <span v-else>{{ char.name[0] }}</span>
                  </span>
                </div>
                <div class="msg-char-generate-inline">
                  <button
                    v-for="char in state.characters"
                    :key="'generate-inline-' + char.name + '-' + idx"
                    class="msg-action-btn small-gen-btn"
                    @click="generateMessageForCharacter(char.name, idx)"
                    :title="`Generate message as ${char.name}`"
                  >🤖</button>
                  <!-- Add the stop button -->
                  <button
                    class="msg-action-btn small-gen-btn"
                    :class="{ 'disabled': !isGenerating }"
                    @click="stopGeneration"
                    title="Stop generation"
                    :disabled="!isGenerating"
                  >⏹️</button>
                  <button
                    class="msg-action-btn small-gen-btn"
                    @click="retryGenerateMessage(idx)"
                    title="Retry generation"
                    :disabled="isGenerating"
                  >🔁</button>
                  <!-- Left arrow button -->
                  <button
                    class="msg-action-btn small-gen-btn"
                    @click="onLeftArrow(idx)"
                    title="Left arrow"
                    :disabled="isGenerating"
                  >⬅️</button>
                  <!-- Right arrow button -->
                  <button
                    class="msg-action-btn small-gen-btn"
                    @click="onRightArrow(idx)"
                    title="Right arrow"
                    :disabled="isGenerating"
                  >➡️</button>
                </div>
              </div>
            </div>
          </div>
          <div v-if="!state.messages.length" class="empty-chat">
            <em>No messages. Load a chat file or add messages manually.</em>
          </div>
        </div>
      </div>
      <!-- Fixed Arrow Buttons -->
      <button
        class="scroll-arrow scroll-down"
        @click="scrollToBottom"
        title="Jump to bottom"
      >⬇️</button>
      <button
        class="scroll-arrow scroll-up"
        @click="scrollToTop"
        title="Jump to top"
      >⬆️</button>
    </div>
    <a v-if="exportUrl" :href="exportUrl" download="chat.html" ref="exportLink" style="display:none"></a>
    <div v-if="toast" class="toast">{{ toast }}</div>

    <!-- Detached media box (for drag-and-drop) -->
    <div
      v-if="detachedMedia.visible && detachedMedia.media"
      class="detached-media-box"
      :style="{
  left: detachedMedia.position.x + 'px',
  top: detachedMedia.position.y + 'px',
  width: detachedMedia.size.width + 'px',
  height: detachedMedia.size.height + 'px'
}"
    >
      <img
        v-if="detachedMedia.media.type === 'image'"
        :src="detachedMedia.media.data"
        class="attached-media"
        :style="{ width: '100%', height: '100%', objectFit: 'contain' }"
        alt="Detached"
        draggable="false"
      />
      <video
        v-else-if="detachedMedia.media.type === 'video'"
        :src="detachedMedia.media.data"
        controls
        class="attached-media"
        :style="{ width: '100%', height: '100%', objectFit: 'contain' }"
        draggable="false"
      ></video>
      <!-- Vertically aligned action icons for detached media -->
      <div class="media-action-column">
        <button class="remove-media-btn" @click="closeDetachedMedia" title="Close">✖</button>
        <button
          class="pin-media-btn"
          v-if="typeof detachedMedia.originIdx === 'number'"
          @click="pinDetachedMedia"
          title="Pin back to message"
        >📌</button>
        <div
          class="move-handle"
          @mousedown.prevent="startDetachedMove($event)"
          title="Move"
        >⠿</div>
      </div>
      <div
        class="resize-handle corner top-left"
        @mousedown.prevent="startDetachedCornerResize('top-left', $event)"
        title="Resize"
      ></div>
      <div
        class="resize-handle corner top-right"
        @mousedown.prevent="startDetachedCornerResize('top-right', $event)"
        title="Resize"
      ></div>
      <div
        class="resize-handle corner bottom-left"
        @mousedown.prevent="startDetachedCornerResize('bottom-left', $event)"
        title="Resize"
      ></div>
      <div
        class="resize-handle corner bottom-right"
        @mousedown.prevent="startDetachedCornerResize('bottom-right', $event)"
        title="Resize"
      ></div>
    </div>

    <!-- Close chat confirmation prompt -->
    <div v-if="closeChatPrompt" class="close-chat-modal">
      <div class="close-chat-box">
        <h3>Close Chat</h3>
        <p>Do you want to save the chat before closing?</p>
        <button @click="saveAndClose('json')">Save as JSON</button>
        <button @click="saveAndClose('txt')">Save as TXT</button>
        <button @click="saveAndClose('docx')">Save as DOCX</button>
        <button @click="closeWithoutSaving">Close without Saving</button>
        <button @click="closeChatPrompt = false">Cancel</button>
      </div>
    </div>

    <!-- Background image picker modal -->
    <div v-if="showBgBox" class="bg-modal">
      <div class="bg-modal-box">
        <h3>Set Chat Background</h3>
        <input type="file" accept="image/*" @change="onBgImageChange" />
        <button @click="removeBgImage" v-if="bgImage">Remove Background</button>
        <button @click="showBgBox = false">Close</button>
      </div>
    </div>

    <!-- Hidden file input for background image -->
    <input
      type="file"
      ref="bgFileInput"
      accept="image/*"
      style="display:none"
      @change="onBgImageChange"
    />
  </div>
</template>

<script setup>
import { reactive, ref, computed, nextTick, getCurrentInstance, watch, onMounted, onBeforeUnmount } from 'vue';
import { ColorPicker } from 'vue3-colorpicker';
import 'vue3-colorpicker/style.css';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from "docx";

// Export/Import LLM Preset logic
const aiPresetImportInput = ref(null);
const closeChatPrompt = ref(false);

function exportAIPreset() {
  const data = JSON.parse(JSON.stringify(aiPreset));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = "llm-preset.json";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }, 100);
}

function triggerAIPresetImport() {
  if (aiPresetImportInput.value) aiPresetImportInput.value.value = '';
  aiPresetImportInput.value && aiPresetImportInput.value.click();
}

function onAIPresetImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const json = JSON.parse(evt.target.result);
      Object.keys(aiPreset).forEach(k => {
        if (json.hasOwnProperty(k)) aiPreset[k] = json[k];
      });
      showToast('LLM Presets imported!');
    } catch (err) {
      showToast('Invalid LLM Preset file.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

const contextFileInput = ref(null);
const instructFileInput = ref(null);

const systemPromptFileInput = ref(null);

function triggerSystemPromptFileInput() {
  systemPromptFileInput.value && systemPromptFileInput.value.click();
}

function onSystemPromptFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const json = JSON.parse(evt.target.result);
      aiPreset.systemPrompt = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
    } catch (err) {
      aiPreset.systemPrompt = 'Invalid JSON file';
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function triggerContextFileInput() {
  contextFileInput.value && contextFileInput.value.click();
}
function triggerInstructFileInput() {
  if (instructFileInput.value) {
    instructFileInput.value.click();
  }  
}


function onContextFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const json = JSON.parse(evt.target.result);
      aiPreset.contextTemplate = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
    } catch (err) {
      aiPreset.contextTemplate = 'Invalid JSON file';
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function onInstructFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const json = JSON.parse(evt.target.result);
      aiPreset.instructTemplate = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
    } catch (err) {
      aiPreset.instructTemplate = 'Invalid JSON file';
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}
// Add reactive refs for LLM generation state
const isGenerating = ref(false);
const abortController = ref(null);

const isRTL = ref(false); // Add this line to avoid runtime errors

const backendUrl = ref('http://localhost:3000'); // Change as needed

function addNewCharacter() {
  let name = prompt("Enter new character name:");
  if (!name) return;
  name = name.trim();
  if (!name) return;
  // Prevent duplicates
  if (state.characters.some(c => c.name === name)) {
    showToast("Character already exists!");
    return;
  }
  state.characters.push({
    name,
    portraitData: null,
    fontStyle: { bold: false, italic: false, underline: false },
    fontColor: '#A9B3C1',
    fontFamily: 'Segoe UI',
    role: 'character',
    typeLabel: 'C' // <-- Add this line
  });
  pushUndo();
  showToast("Character added!");
}
function addNewUser() {
  let name = prompt("Enter new user name:");
  if (!name) return;
  name = name.trim();
  if (!name) return;
  // Prevent duplicates
  if (state.characters.some(c => c.name === name)) {
    showToast("User already exists!");
    return;
  }
  // Add user immediately (without avatar)
  const userObj = {
    name,
    portraitData: null,
    fontStyle: { bold: false, italic: false, underline: false },
    fontColor: '#A9B3C1',
    fontFamily: 'Segoe UI',
    role: 'user',
    typeLabel: 'U' // <-- Add this line
  };
  state.characters.push(userObj);
  pushUndo();
  showToast("User added!");
}
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Default layout and color values
const defaultLayout = {
  messageWidth: 700,
  fontSize: 17,
  portraitSize: 64,
  portraitShape: 'Rounded Rectangle (2:3)',
  blur: 0 // <-- Add this line
};
const defaultColors = {
  text: '#AAC1CB',
  quote: '#e75480',
  italic: '#00ced1'
};

const autoScroll = ref(true); // Controls the Auto-Scroll checkbox

const state = reactive({ 
  chatTitle: '',
  chatText: '',
  potentialCharacters: [],
  characters: [],
  messages: [],
  layout: { ...defaultLayout },
  colors: { ...defaultColors }

});
const characterList = computed(() => state.characters.map(c => c.name));
const currentSpeaker = ref(""); // <-- Add this line
// Example sequence object for use in your code
const sequence = {
  messages: [],
  characterList: characterList.value,
  get currentSpeaker() { return currentSpeaker.value; }
};
const characterSelections = ref([]);

// Reset functions
function resetLayout(key) {
  state.layout[key] = defaultLayout[key];
  onLayoutChange();
}
function resetColor(key) {
  state.colors[key] = defaultColors[key];
}

// Undo/Redo logic
const undoStack = ref([]);
const redoStack = ref([]);
function pushUndo() {
  undoStack.value.push(clone(state));
  if (undoStack.value.length > 50) undoStack.value.shift();
  redoStack.value = [];
}
function undo() {
  if (!undoStack.value.length) return;
  redoStack.value.push(clone(state));
  let prev = undoStack.value.pop();
  restoreState(prev);
  editIdx.value = null;
  editContent.value = "";
  justInsertedIdx.value = null;
}
function redo() {
  if (!redoStack.value.length) return;
  undoStack.value.push(clone(state));
  let next = redoStack.value.pop();
  restoreState(next);
  editIdx.value = null;
  editContent.value = "";
  justInsertedIdx.value = null;
}
const canUndo = computed(() => undoStack.value.length > 0);
const canRedo = computed(() => redoStack.value.length > 0);
function restoreState(snapshot) {
  Object.keys(state).forEach(key => {
    if (typeof state[key] === 'object' && state[key] !== null && !Array.isArray(state[key])) {
      Object.assign(state[key], snapshot[key]);
    } else {
      state[key] = clone(snapshot[key]);
    }
  });
}

// File upload and chat parsing
function onFileUpload(e) { 
const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async evt => {
    if (file.name.endsWith('.json')) {
      try {
        const data = JSON.parse(evt.target.result);
        importChatJson(data);
        showToast('Chat imported!');
      } catch (err) {
        showToast('Invalid JSON file.');
      }
      return;
    }
    if (file.name.endsWith('.txt')) {
      state.chatText = evt.target.result;
      processTextFile(state.chatText);
    } else if (file.name.endsWith('.docx')) {
      const arrayBuffer = evt.target.result;
      try {
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        state.chatText = result.value;
        processTextFile(state.chatText);
      } catch (error) {
        console.error("Error extracting text from DOCX:", error);
        showToast('Error reading DOCX file.');
        return;
      }
    } else {
      showToast('Unsupported file type.');
      return;
    }
  };

  if (file.name.endsWith('.docx')) {
    reader.readAsArrayBuffer(file);
  } else {
    reader.readAsText(file);
  }
}
function importChatJson(data) {
  state.chatTitle = data.chatTitle || '';
  state.characters = data.characters || [];
  state.messages = data.messages || [];
    // Ensure all messages have versions and currentVersionIdx
  state.messages.forEach(msg => {
    if (!msg.versions) {
      msg.versions = [{ content: msg.content, direction: msg.direction || 'ltr' }];
      msg.currentVersionIdx = 0;
    }
  });
  state.layout = data.layout || { ...defaultLayout };
  state.colors = data.colors || { ...defaultColors };
  Object.assign(aiPreset, data.aiPreset || {});
  bgImage.value = data.bgImage || '';
  if (data.bgImage) {
    localStorage.setItem('chatBgImage', data.bgImage); // <-- Add this line
  } else {
    localStorage.removeItem('chatBgImage');
  }
    // Force background update after import
  nextTick(() => {
    const main = document.querySelector('.main');
    if (main) {
      if (bgImage.value) {
        main.style.background = `url('${bgImage.value}') center center / cover no-repeat fixed`;
      } else {
        main.style.background = '';
        main.style.backgroundColor = 'var(--bg-panel, #212733)';
      }
    }
  });
}
function processTextFile(text) {
  state.chatText = text;
  state.potentialCharacters = detectPotentialCharacters(state.chatText);
  characterSelections.value = clone(state.potentialCharacters);
  showToast('Chat loaded! Select characters.');
}

function detectPotentialCharacters(text) {
  const exclude = ["OOC", "[System]", "System", "[Command]", "Command", "User", "Assistant", "Note"];
  const set = new Set();
  text.split('\n').forEach(line => {
    if (line.includes(':')) {
      let speaker = line.split(':', 1)[0].trim();
      if (speaker && !exclude.some(ex => speaker.toLowerCase().includes(ex.toLowerCase())))
        set.add(speaker);
    }
  });
  return Array.from(set);
}

function applyCharacterSelection() {
  state.characters = characterSelections.value.map(n => ({
    name: n,
    portraitData: null,
    fontStyle: { bold: false, italic: false, underline: false },
    fontColor: '#A9B3C1',
    fontFamily: 'Segoe UI',
    role: 'character',
    typeLabel: 'C' // <-- Add this line
  }));
  state.messages = parseChat(state.chatText, state.characters);
  pushUndo();
  showToast('Characters applied!');
}

function parseChat(text, chars) {
  const charNames = new Set(chars.map(c => c.name));
  let lines = text.split('\n');
  let out = [];
  let currSpeaker = null, currMsg = [];
  for (let line of lines) {
    if (line.includes(':')) {
      let [speaker, ...rest] = line.split(':');
      speaker = speaker.trim();
      if (charNames.has(speaker)) {
        if (currSpeaker && currMsg.length) {
  const content = currMsg.join('\n');
  out.push({
    speaker: currSpeaker,
    content,
    media: null,
    direction: 'ltr',
    versions: [{ content, direction: 'ltr' }],
    currentVersionIdx: 0
  });
}
        currSpeaker = speaker;
        currMsg = [rest.join(':').trim()];
      } else if (currSpeaker) {
        currMsg.push(line);
      }
    } else if (currSpeaker) {
      currMsg.push(line);
    }
  }
  if (currSpeaker && currMsg.length) {
  const content = currMsg.join('\n');
  out.push({
    speaker: currSpeaker,
    content,
    media: null,
    direction: 'ltr',
    versions: [{ content, direction: 'ltr' }],
    currentVersionIdx: 0
  });
}
  return out;
}

// Character editing (modern per-character input)
const { proxy } = getCurrentInstance();

function scrollToBottom() {
  const main = proxy.$refs.mainChatArea;
  if (main && main.scrollTo) {
    main.scrollTo({ top: main.scrollHeight, behavior: 'smooth' });
  }
}

function scrollToTop() {
  const main = proxy.$refs.mainChatArea;
  if (main && main.scrollTo) {
    main.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function triggerPortraitInput(idx) {
  // Vue 3: $refs returns array for v-for refs.
  const refKey = 'portraitInput' + idx;
  let input = proxy.$refs[refKey];
  if (Array.isArray(input)) input = input[0];
  if (input) {
    input.value = ""; // Reset so same file can be selected again
    setTimeout(() => input.click(), 0); // delay ensures reset registers before click
  }
}
function onPortraitUpload(idx, e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    state.characters[idx].portraitData = evt.target.result;
    pushUndo();
    showToast('Portrait uploaded!');
  };
  reader.readAsDataURL(file);
  e.target.value = ""; // Reset after use as well
}
function onCharacterNameEdit(idx) {
  pushUndo();
}

// Layout controls
function onLayoutChange() {
  pushUndo();
}

// Main chat area rendering
function findChar(name) {
  return state.characters.find(c => c.name === name) || {};
}
function portraitStyle(speaker) {
  const size = state.layout.portraitSize;
  let shape = state.layout.portraitShape;
  let borderRadius = shape === "Circle" ? "50%" : shape === "Rounded Square" ? "12px" : "8px";
  let height = shape === "Rounded Rectangle (2:3)" ? Math.round(size * 1.5) + "px" : size + "px";
  return {
    width: size + "px",
    height: height,
    background: state.colors.quote,
    borderRadius,
    fontSize: Math.round(size / 2) + "px",
    color: "#222",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };
}
const msgBodyStyle = computed(() => ({
  width: state.layout.messageWidth + "px",
  fontSize: state.layout.fontSize + "px",
  color: state.colors.text,
  border: `1px solid ${state.colors.quote}`,
  background: "rgba(38,46,52,0.4)",
  borderRadius: "8px",
  padding: "8px 14px",
  minHeight: "40px",
  textAlign: "left",
  backdropFilter: state.layout.blur ? `blur(${state.layout.blur}px)` : "none",
  WebkitBackdropFilter: state.layout.blur ? `blur(${state.layout.blur}px)` : "none"
}));

// Message editing (inline)
const editIdx = ref(null);
const editContent = ref("");
const editArea = ref(null);
const justInsertedIdx = ref(null);
const editDirection = ref('ltr');
function startEdit(idx, content) {
  editIdx.value = idx;
  editContent.value = content;
  editDirection.value = state.messages[idx].direction || 'ltr';
  nextTick(() => {
    if (editArea.value) {
      editArea.value.focus();
      // Use a second nextTick to ensure DOM is updated
      nextTick(() => {
      autoGrow({ target: editArea.value });
      });
    }
  });
}
function saveEdit(idx) {
  pushUndo();
  state.messages[idx].content = editContent.value;
  state.messages[idx].direction = editDirection.value;
  // Ensure manual edits are saved as a new version
const msg = state.messages[idx];
if (!msg.versions) {
  msg.versions = [{ content: msg.content, direction: msg.direction || "ltr" }];
  msg.currentVersionIdx = 0;
}
msg.versions = msg.versions.slice(0, msg.currentVersionIdx + 1); // Discard any "future" versions
msg.versions.push({ content: editContent.value, direction: editDirection.value });
msg.currentVersionIdx = msg.versions.length - 1;
  editIdx.value = null;
  editContent.value = "";
  if (justInsertedIdx.value === idx) justInsertedIdx.value = null;
}
function cancelEdit() {
  if (justInsertedIdx.value === editIdx.value) justInsertedIdx.value = null;
  editIdx.value = null;
  editContent.value = "";
}
function autoGrow(e) {
  const ta = e.target;
  ta.style.height = "auto";
  ta.style.height = ta.scrollHeight + "px";
}

// MEDIA ATTACHMENT LOGIC
function triggerMediaInput(idx) {
  const refKey = 'mediaInput' + idx;
  let input = proxy.$refs[refKey];
  if (Array.isArray(input)) input = input[0];
  if (input) {
    input.value = "";
    setTimeout(() => input.click(), 0);
  }
}

function onMediaUpload(idx, e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    const type = file.type.startsWith('image') ? 'image'
      : file.type.startsWith('video') ? 'video'
      : null;
    if (!type) {
      showToast('Unsupported media type.');
      return;
    }
    if (!state.messages[idx].media) state.messages[idx].media = {};
    state.messages[idx].media = { type, data: evt.target.result };
    pushUndo();
    showToast('Media attached!');
  };
  reader.readAsDataURL(file);
  e.target.value = "";
}

function removeMedia(idx) {
  state.messages[idx].media = null;
  pushUndo();
  showToast('Media removed.');
}

// --- MEDIA RESIZE LOGIC ---
// Attached media resize
let attachedResize = {
  idx: null,
  corner: null,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0
};

function startAttachedCornerResize(idx, corner, e) {
  attachedResize.idx = idx;
  attachedResize.corner = corner;
  attachedResize.startX = e.clientX;
  attachedResize.startY = e.clientY;
  const media = state.messages[idx].media;
  attachedResize.startWidth = media.width || 220;
  attachedResize.startHeight = media.height || (media.type === 'image' ? 180 : 140);
  window.addEventListener('mousemove', doAttachedCornerResize);
  window.addEventListener('mouseup', stopAttachedCornerResize);
}

function doAttachedCornerResize(e) {
  const idx = attachedResize.idx;
  if (idx === null) return;
  const media = state.messages[idx].media;
  if (!media) return;
  let dx = e.clientX - attachedResize.startX;
  let dy = e.clientY - attachedResize.startY;
  let width = attachedResize.startWidth;
  let height = attachedResize.startHeight;
  // Handle corners
  switch (attachedResize.corner) {
    case 'top-left':
      width -= dx;
      height -= dy;
      break;
    case 'top-right':
      width += dx;
      height -= dy;
      break;
    case 'bottom-left':
      width -= dx;
      height += dy;
      break;
    case 'bottom-right':
      width += dx;
      height += dy;
      break;
  }
  width = Math.max(80, width);
  height = Math.max(60, height);
  media.width = width;
  media.height = height;
}

function stopAttachedCornerResize() {
  if (attachedResize.idx !== null) pushUndo();
  attachedResize.idx = null;
  window.removeEventListener('mousemove', doAttachedCornerResize);
  window.removeEventListener('mouseup', stopAttachedCornerResize);
}

// Detached media corner resize
let detachedCornerResize = {
  corner: null,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0
};
function startDetachedCornerResize(corner, e) {
  detachedCornerResize.corner = corner;
  detachedCornerResize.startX = e.clientX;
  detachedCornerResize.startY = e.clientY;
  detachedCornerResize.startWidth = detachedMedia.size.width;
  detachedCornerResize.startHeight = detachedMedia.size.height;
  window.addEventListener('mousemove', doDetachedCornerResize);
  window.addEventListener('mouseup', stopDetachedCornerResize);
}
function doDetachedCornerResize(e) {
  let dx = e.clientX - detachedCornerResize.startX;
  let dy = e.clientY - detachedCornerResize.startY;
  let width = detachedCornerResize.startWidth;
  let height = detachedCornerResize.startHeight;
  switch (detachedCornerResize.corner) {
    case 'top-left':
      width -= dx;
      height -= dy;
      break;
    case 'top-right':
      width += dx;
      height -= dy;
      break;
    case 'bottom-left':
      width -= dx;
      height += dy;
      break;
    case 'bottom-right':
      width += dx;
      height += dy;
      break;
  }
  width = Math.max(80, width);
  height = Math.max(60, height);
  detachedMedia.size.width = width;
  detachedMedia.size.height = height;
}
function stopDetachedCornerResize() {
  detachedCornerResize.corner = null;
  window.removeEventListener('mousemove', doDetachedCornerResize);
  window.removeEventListener('mouseup', stopDetachedCornerResize);
}

// Detach media (for any message)
function detachMedia(idx) {
  const media = state.messages[idx].media;
  if (!media) return;

  // Find the avatar element for this message
nextTick(() => {
  const msgRow = document.querySelectorAll('.msg-row')[idx];
  if (msgRow) {
    const media = msgRow.querySelector('.msg-media, .media-resize-wrapper, img.attached-media, video.attached-media');
    if (media) {
      const rect = media.getBoundingClientRect();
      // Place the detached media exactly where the attached media was
      const offsetX = rect.left + window.scrollX;
      const offsetY = rect.top + window.scrollY;
      detachedMedia.position.x = offsetX;
      detachedMedia.position.y = offsetY;
    }
  }
});
  detachedMedia.media = { ...media };
  detachedMedia.size.width = media.width || 320;
  detachedMedia.size.height = media.height || (media.type === 'image' ? 200 : 160);
  detachedMedia.visible = true;
  detachedMedia.originIdx = idx; // Track original message index
  state.messages[idx].media = null;
  pushUndo();
}

// Insert Empty Message for Character (from msg actions)
function insertEmptyMessageForCharacter(speaker, afterIdx) {
  pushUndo();
  const newMsg = {
    speaker,
    content: "",
    media: null,
    direction: state.layout && state.layout.portraitShape === 'RTL' ? 'rtl' : 'ltr', // fallback to ltr if not set
    versions: [{ content: "", direction: state.layout && state.layout.portraitShape === 'RTL' ? 'rtl' : 'ltr' }],
    currentVersionIdx: 0
  };
  state.messages.splice(afterIdx + 1, 0, newMsg);
  if (autoScroll.value) nextTick(scrollToBottom);
  editIdx.value = afterIdx + 1;
  justInsertedIdx.value = afterIdx + 1;
  editContent.value = "";
  editDirection.value = newMsg.direction; // <-- ensure editDirection is set
  nextTick(() => {
    if (editArea.value) editArea.value.focus();
  });
}

function addMessageForCharacter(speaker) {
  pushUndo();
  const newMsg = {
    speaker,
    content: "",
    media: null,
    direction: state.layout && state.layout.portraitShape === 'RTL' ? 'rtl' : 'ltr',
    versions: [{ content: "", direction: state.layout && state.layout.portraitShape === 'RTL' ? 'rtl' : 'ltr' }],
    currentVersionIdx: 0
  };
  state.messages.push(newMsg);
  editIdx.value = state.messages.length - 1;
  justInsertedIdx.value = state.messages.length - 1;
  editContent.value = "";
  editDirection.value = newMsg.direction;
  nextTick(() => {
    if (editArea.value) editArea.value.focus();
  });
}

function setMessageDirection(idx, dir) {
  if (!['ltr', 'rtl'].includes(dir)) return;
  state.messages[idx].direction = dir;
  pushUndo();
}

// Delete message (now for any message in edit mode)
function deleteMessage(idx) {
  pushUndo();
  state.messages.splice(idx, 1);
  if (justInsertedIdx.value === idx) justInsertedIdx.value = null;
  editIdx.value = null;
  editContent.value = "";
  showToast("Message deleted.");
}

// Text formatting (supports italics, quotes)
function formatText(text, speaker) {
  if (!text) return '';
  let t = text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"([^"]+)"/g, `<span style="color:${state.colors.quote};">"$1"</span>`)
    .replace(/\*([^*]+)\*/g, `<span style="font-style:italic;color:${state.colors.italic};">$1</span>`)
    .replace(/_([^_]+)_/g, `<span style="font-style:italic;color:${state.colors.italic};">$1</span>`)
    .replace(/\n/g, '<br>');
  // Wrap in span with character style
  const char = findChar(speaker);
  let style = '';
  if (char.fontStyle) {
    if (char.fontStyle.bold) style += 'font-weight:bold;';
    if (char.fontStyle.italic) style += 'font-style:italic;';
    if (char.fontStyle.underline) style += 'text-decoration:underline;';
  }
  if (char.fontColor) style += `color:${char.fontColor};`;
  if (char.fontFamily) style += `font-family:${char.fontFamily};`;
  style += `font-size:${state.layout.fontSize}px;`;
  return `<span style="${style}">${t}</span>`;
}

// Chat title auto-generation
const autoTitle = computed(() => {
  if (!state.characters.length) return "Chat";
  if (state.characters.length === 1) return `${state.characters[0].name}'s Chat`;
  return state.characters.map(c => c.name).join(", ") + " Chat";
});

// Export
const exportUrl = ref("");
const exportLink = ref(null);
function exportChatJson() {
  const data = {
    chatTitle: state.chatTitle,
    characters: state.characters,
    messages: state.messages,
    layout: state.layout,
    colors: state.colors,
    aiPreset: aiPreset,
    bgImage: bgImage.value
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (state.chatTitle || "chat") + ".json";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
function exportHTML() {
  const html = makeExportHTML();
  const blob = new Blob([html], { type: "text/html" });
  exportUrl.value = URL.createObjectURL(blob);
  nextTick(() => {
    exportLink.value.click();
    setTimeout(() => URL.revokeObjectURL(exportUrl.value), 5000);
  });
  showToast("Exported HTML!");
}
// --- EXPORT LOGIC: INCLUDE MEDIA SIZE ---
function makeExportHTML() {
  const chars = state.characters;
  const settings = state.layout;
  const colors = state.colors;
  // Add background image if set
  let bgCss = bgImage.value
    ? `body { background: url('${bgImage.value}') center center / cover no-repeat fixed; }`
    : `body { background: #121319; }`;

  const css = `
${bgCss}
body {
  color: ${colors.text};
  font-family: 'Segoe UI', Arial, sans-serif;
}
.chat-container {
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  padding:20px;
  border:1px solid ${colors.quote};
  max-width: 100%;
}
.chat-message {
  display: flex;
  margin-bottom: 20px;
  max-width: ${settings.messageWidth}px;
}
.portrait {
  width: ${settings.portraitSize}px;
  height: ${settings.portraitShape === "Rounded Rectangle (2:3)" ? Math.round(settings.portraitSize*1.5) : settings.portraitSize}px;
  background: ${colors.quote};
  border-radius: ${settings.portraitShape === "Circle" ? "50%" : settings.portraitShape === "Rounded Square" ? "12px" : "8px"};
  margin-right: 15px;
  flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  color:#121319;
  font-weight:bold;
  overflow:hidden;
  font-size:${Math.round(settings.portraitSize/2)}px;
}
.portrait img {width:100%;height:100%;object-fit:cover;}
.message-content {
  flex-grow:1;
  font-size: ${settings.fontSize}px;
  background: rgba(38,46,52,0.4);
  padding: 15px;
  border-radius:8px;
  word-wrap:break-word;
  border:1px solid ${colors.quote};
  min-height: 40px;
  text-align: left;
}
.message-header {
  font-weight:bold;
  margin-bottom: 8px;
  color: ${colors.italic};
  font-size: ${settings.fontSize}px;
  text-align: center; /* <-- Change from left to center */
}
.quoted-text {
  color: ${colors.quote};
}
.italic-text {
  font-style: italic;
  color: ${colors.italic};
}
.attached-media {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 7px;
  border: 1px solid #444; /* Ensure border is only on the media */
  display: block;
  background: #181e24;
  box-sizing: border-box;
}
.msg-media, .media-resize-wrapper {
  /* Remove border from these wrappers if present */
  border: none !important;
  background: none !important;
  box-shadow: none !important;
}
.msg-media {
  position: relative;
  margin-bottom: 6px;
}
.remove-media-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  background: #a83333;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  font-size: 1em;
  cursor: pointer;
  opacity: 0.85;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, opacity 0.2s;
}
.remove-media-btn:hover {
  background: #e75480;
  opacity: 1;
}
.detach-media-btn {
  position: absolute;
  top: 2px;
  right: 30px;
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  font-size: 1em;
  cursor: pointer;
  opacity: 0.85;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, opacity 0.2s;
}
.detach-media-btn:hover {
  background: #0056b3;
  opacity: 1;
}
.pin-media-btn {
  position: absolute;
  top: 4px;
  right: 34px;
  background: #00b894;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  font-size: 1em;
  cursor: pointer;
  opacity: 0.85;
  z-index: 11;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, opacity 0.2s;
}
.pin-media-btn:hover {
  background: #00916e;
  opacity: 1;
}
`;
  let body = [`<h1>${escapeHTML(state.chatTitle || autoTitle.value)}</h1>`, `<div class="chat-container">`];
  for (const msg of state.messages) {
    let char = chars.find(c => c.name === msg.speaker);
    let portraitHtml = "";
    if (char && char.portraitData) {
      portraitHtml = `<img src="${char.portraitData}" alt="${escapeHTML(char.name)}" />`;
    } else {
      portraitHtml = escapeHTML(msg.speaker[0] || "?");
    }
    // MEDIA HTML
    let mediaHtml = "";
    if (msg.media && msg.media.type === "image") {
      mediaHtml = `<div class="msg-media"><div style="display:inline-block;position:relative;width:${msg.media.width||220}px;height:${msg.media.height||180}px;"><img src="${msg.media.data}" class="attached-media" alt="Attached" style="width:100%;height:100%;object-fit:contain;"/></div></div>`;
    } else if (msg.media && msg.media.type === "video") {
      mediaHtml = `<div class="msg-media"><div style="display:inline-block;position:relative;width:${msg.media.width||220}px;height:${msg.media.height||140}px;"><video src="${msg.media.data}" controls class="attached-media" style="width:100%;height:100%;object-fit:contain;"></video></div></div>`;
    }
    // Use formatText(msg.content, msg.speaker) to preserve styles
    body.push(`
      <div class="chat-message">
        <div class="portrait">${portraitHtml}</div>
        <div class="message-content">
          <div class="message-header">${escapeHTML(msg.speaker)}</div>
          <div class="message-text">${formatText(msg.content, msg.speaker)}</div>
          ${mediaHtml}
        </div>
      </div>
    `);
  }
  body.push("</div>");
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${escapeHTML(state.chatTitle || autoTitle.value)}</title>
<style>${css}</style>
</head>
<body>
${body.join('\n')}
</body>
</html>`;
}
function escapeHTML(s) {
  return s.replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

// Toast
const toast = ref("");
let toastTimer = null;
function showToast(msg) {
  toast.value = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.value = ""), 2000);
}

// Collapsible sidebar
const sidebarOpen = ref(true);

// Detached media state (for drag-and-drop)
const detachedMedia = reactive({
  media: null,
  position: { x: 200, y: 200 },
  size: { width: 320, height: 200 },
  visible: false,
  originIdx: null // <-- add this
});

function closeDetachedMedia() {
  detachedMedia.visible = false;
  detachedMedia.media = null;
}

// Resize logic
const resizingDetached = ref(false);
let resizeStart = {};
function startDetachedResize(e) {
  resizingDetached.value = true;
  resizeStart = {
    x: e.clientX,
    y: e.clientY,
    width: detachedMedia.size.width,
    height: detachedMedia.size.height
  };
  window.addEventListener('mousemove', doDetachedResize);
  window.addEventListener('mouseup', stopDetachedResize);
}
function doDetachedResize(e) {
  if (!resizingDetached.value) return;
  const dx = e.clientX - resizeStart.x;
  const dy = e.clientY - resizeStart.y;
  detachedMedia.size.width = Math.max(80, resizeStart.width + dx);
  detachedMedia.size.height = Math.max(60, resizeStart.height + dy);
}
function stopDetachedResize() {
  resizingDetached.value = false;
  window.removeEventListener('mousemove', doDetachedResize);
  window.removeEventListener('mouseup', stopDetachedResize);
}

// Move logic
const movingDetached = ref(false);
let moveStart = {};
function startDetachedMove(e) {
  movingDetached.value = true;
  moveStart = {
    x: e.clientX,
    y: e.clientY,
    left: detachedMedia.position.x,
    top: detachedMedia.position.y
  };
  window.addEventListener('mousemove', doDetachedMove);
  window.addEventListener('mouseup', stopDetachedMove);
}
function doDetachedMove(e) {
  if (!movingDetached.value) return;
  const dx = e.clientX - moveStart.x;
  const dy = e.clientY - moveStart.y;
  detachedMedia.position.x = moveStart.left + dx;
  detachedMedia.position.y = moveStart.top + dy;
}
function stopDetachedMove() {
  movingDetached.value = false;
  window.removeEventListener('mousemove', doDetachedMove);
  window.removeEventListener('mouseup', stopDetachedMove);
}

// Pin detached media back to message
function pinDetachedMedia() {
  const idx = detachedMedia.originIdx;
  if (
    typeof idx === 'number' &&
    state.messages[idx] &&
    !state.messages[idx].media &&
    detachedMedia.media
  ) {
    // Save current size to media object
    detachedMedia.media.width = detachedMedia.size.width;
    detachedMedia.media.height = detachedMedia.size.height;
    state.messages[idx].media = { ...detachedMedia.media };
    pushUndo();
    closeDetachedMedia();
  }
}

// 1. Define themes
const themes = [
  {
    name: "Default (Dark)",
    vars: {
      '--bg-main': '#181e24',
      '--bg-panel': '#212733',
      '--text-main': '#e0e3e7',
      '--accent': '#e75480',
      '--border': '#444',
      '--input-bg': '#232932'
    }
  },
  {
    name: "Light",
    vars: {
      '--bg-main': '#f6f7fa',
      '--bg-panel': '#fff',
      '--text-main': '#232932',
      '--accent': '#007bff',
      '--border': '#b0b7c3',
      '--input-bg': '#e9ecf2'
    }
  },
  {
    name: "Solarized Dark",
    vars: {
      '--bg-main': '#002b36',
      '--bg-panel': '#073642',
      '--text-main': '#93a1a1',
      '--accent': '#b58900',
      '--border': '#586e75',
      '--input-bg': '#073642'
    }
  },
  {
    name: "Dracula",
    vars: {
      '--bg-main': '#282a36',
      '--bg-panel': '#44475a',
      '--text-main': '#f8f8f2',
      '--accent': '#bd93f9',
      '--border': '#6272a4',
      '--input-bg': '#44475a'
    }
  }
];
const selectedThemeIdx = ref(0);

// 2. Apply theme on change
function applyTheme(idx) {
  const theme = themes[idx];
  if (!theme) return;
  Object.entries(theme.vars).forEach(([k, v]) => {
    document.documentElement.style.setProperty(k, v);
  });
}
watch(selectedThemeIdx, applyTheme, { immediate: true });

function toggleCharStyle(idx, style) {
  state.characters[idx].fontStyle[style] = !state.characters[idx].fontStyle[style];
  pushUndo();
}

function characterFontStyle(speaker) {
  const char = findChar(speaker);
  let style = {};
  if (char.fontStyle) {
    if (char.fontStyle.bold) style.fontWeight = 'bold';
    if (char.fontStyle.italic) style.fontStyle = 'italic';
    if (char.fontStyle.underline) style.textDecoration = 'underline';
  }
  if (char.fontColor) style.color = char.fontColor;
  if (char.fontFamily) style.fontFamily = char.fontFamily;
  style.fontSize = state.layout.fontSize + 'px';
  style.textAlign = 'center'; // <-- Change this line
  return style;
}

// New method for exporting chat as TXT
function exportChatTxt() {
  // Reconstruct chat text from messages
  const lines = state.messages.map(msg => `${msg.speaker}: ${msg.content}`);
  const text = lines.join('\n');
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  // Create a temporary link to trigger download
  const a = document.createElement('a');
  a.href = url;
  a.download = (state.chatTitle || "chat") + ".txt";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// New method for exporting chat as DOCX
function exportChatDocx() {
  // Build paragraphs for each message
  const paragraphs = state.messages.map(msg =>
    new Paragraph({
      children: [
        new TextRun({
          text: `${msg.speaker}: `,
          bold: true,
          color: "2E74B5"
        }),
        new TextRun({
          text: msg.content || "",
        })
      ]
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: state.chatTitle || autoTitle.value,
            heading: "Heading1"
          }),
          ...paragraphs
        ]
      }
    ]
  });

  Packer.toBlob(doc).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (state.chatTitle || "chat") + ".docx";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  });
}

// --- AI PRESET STATE ---
const aiPreset = reactive({
  textMemory: '',
  responseTokens: 256,
  contextTokens: 2048,
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  minP: 0.0,
  repetitionPenalty: 1.1,
  repetitionPenaltyRange: 128,
  multiLineBannedToken: '',
  systemPrompt: '',
  streaming: true,
  contextTemplate: '',
  instructTemplate: '',
  model: '',
  alwaysAddCharNames: true, // <-- Add this line
  generateonlyonelineperrequest: false,      // ON by default
  collapseconsecutivenewlines: true,       // on by default
  trimspaces: true,                         // ON by default
  trimincompletesentences: false,           // OFF by default
  separatorsasstopstrings: false,           // OFF by default
  namesasstopstrings: true,                 // on by default
  activationRegex: '',
  wrapSequencesWithNewline: true,        // ON by default
  replaceMacroInSequences: true,         // ON by default
  skipExampleDialoguesFormatting: false,  // OFF by default
  includeNames: 'Always',
  userMessagePrefix: '',
  userMessageSuffix: '',
  assistantMessagePrefix: '',
  assistantMessageSuffix: '',
  systemMessagePrefix: '',
  systemMessageSuffix: '',
  systemSameAsUser: false,
  systemPromptPrefix: '',
  systemPromptSuffix: '',
  firstAssistantPrefix: '',
  lastAssistantPrefix: '',
  firstUserPrefix: '',
  lastUserPrefix: '',
  systemInstructionPrefix: '',
  stopSequence: '',
  userFillerMessage: '',
  exampleSeparator: '',
  chatStart: '',
  jsonArrayOfStrings: '',
  replaceMacroInStopStrings: true,  
});

function getAIPresetConfig() {
  // Validate and cast values
  return {
    textMemory: String(aiPreset.textMemory || ''),
    responseTokens: Math.max(1, Math.min(4096, Number(aiPreset.responseTokens) || 256)),
    contextTokens: Math.max(1, Math.min(4096, Number(aiPreset.contextTokens) || 2048)),
    temperature: Math.max(0, Math.min(2, Number(aiPreset.temperature) || 0.7)),
    topK: Math.max(0, Math.min(100, Number(aiPreset.topK) || 40)),
    topP: Math.max(0, Math.min(1, Number(aiPreset.topP) || 0.95)),
    minP: Math.max(0, Math.min(1, Number(aiPreset.minP) || 0.0)),
    repetitionPenalty: Math.max(0, Math.min(5, Number(aiPreset.repetitionPenalty) || 1.1)),
    repetitionPenaltyRange: Math.max(0, Math.min(2048, Number(aiPreset.repetitionPenaltyRange) || 128)),
    multiLineBannedToken: String(aiPreset.multiLineBannedToken || ''),
    systemPrompt: String(aiPreset.systemPrompt || ''),
    streaming: !!aiPreset.streaming,
    contextTemplate: String(aiPreset.contextTemplate || ''),
    instructTemplate: String(aiPreset.instructTemplate || '')

  };
}
function insertContextTemplate() {
  if (!aiPreset.contextTemplate) {
    aiPreset.contextTemplate = "{{history}}\n{{memory}}\n{{instructions}}";
  }
}
function insertInstructTemplate() {
  if (!aiPreset.instructTemplate) {
    aiPreset.instructTemplate = "You are {{character}}. Respond in character.";
  }
}
// --- LLM GENERATION INTEGRATION ---
async function generateMessageForCharacter(speaker, idx, onDone, isRetry = false) {
  console.log('generateMessageForCharacter called with:', speaker, idx);
  if (isGenerating.value) return;

  isGenerating.value = true;
  abortController.value = new AbortController();

  try {
    // 1. Build character list with new format
    let charNames = state.characters.map(c => `{{${c.name}}}`).join(', ');

    const history = state.messages
      .slice(0, idx + 1)
      .map(m => `{{${m.speaker}}}: ${m.content}`)
      .join('\n');

    const preset = getAIPresetConfig();
    let prompt = '';

    if (aiPreset.alwaysAddCharNames && state.characters.length) {
      prompt += `[Characters]\n${charNames}\n\n`;
    }
    if (preset.systemPrompt) {
      prompt += `[System]\n${preset.systemPrompt}\n\n`;
    }
    if (preset.contextTemplate) {
      prompt += `[Context]\n${preset.contextTemplate}\n\n`;
    }
    if (preset.instructTemplate) {
      prompt += `[Instruct]\n${preset.instructTemplate}\n\n`;
    }
    if (preset.textMemory) {
      prompt += `[Memory]\n${preset.textMemory}\n\n`;
    }
    if (preset.postHistoryInstructions) {
      prompt += `[Post-History Instructions]\n${preset.postHistoryInstructions}\n\n`;
    }
    if (preset.postHistoryInstructions) {
      prompt += `[Post-History Instructions]\n${preset.postHistoryInstructions}\n\n`;
    }
    // Add checkbox-driven instructions to the prompt
    if (aiPreset.generateonlyonelineperrequest) {
      prompt += "[Instruction]\nGenerate only one line per request.\n\n";
    }
    if (aiPreset.collapseconsecutivenewlines) {
      prompt += "[Instruction]\nCollapse consecutive newlines in the output.\n\n";
    }
    if (aiPreset.trimspaces) {
      prompt += "[Instruction]\nTrim spaces from the output.\n\n";
    }
    if (aiPreset.trimincompletesentences) {
      prompt += "[Instruction]\nTrim incomplete sentences from the output.\n\n";
    }
    if (aiPreset.separatorsasstopstrings) {
      prompt += "[Instruction]\nTreat separators as stop strings.\n\n";
    }
    if (aiPreset.namesasstopstrings) {
      prompt += "[Instruction]\nTreat character names as stop strings.\n\n";
    }
    if (aiPreset.activationRegex) {
      prompt += `[Activation Regex]\n${aiPreset.activationRegex}\n\n`;
    }
    if (aiPreset.wrapSequencesWithNewline) {
      prompt += "[Instruction]\nWrap sequences with newline.\n\n";
    }
    if (aiPreset.replaceMacroInSequences) {
      prompt += "[Instruction]\nReplace macro in sequences.\n\n";
    }
    if (aiPreset.skipExampleDialoguesFormatting) {
      prompt += "[Instruction]\nSkip example dialogues formatting.\n\n";
    }
    if (aiPreset.includeNames) {
      prompt += `[Include Names]\n${aiPreset.includeNames}\n\n`;
    }
    if (aiPreset.userMessagePrefix) {
      prompt += `[User Message Prefix]\n${aiPreset.userMessagePrefix}\n\n`;
    }
    if (aiPreset.userMessageSuffix) {
      prompt += `[User Message Suffix]\n${aiPreset.userMessageSuffix}\n\n`;
    }
    if (aiPreset.assistantMessagePrefix) {
      prompt += `[Assistant Message Prefix]\n${aiPreset.assistantMessagePrefix}\n\n`;
    }
    if (aiPreset.assistantMessageSuffix) {
      prompt += `[Assistant Message Suffix]\n${aiPreset.assistantMessageSuffix}\n\n`;
    }
    if (aiPreset.systemMessagePrefix) {
      prompt += `[System Message Prefix]\n${aiPreset.systemMessagePrefix}\n\n`;
    }
    if (aiPreset.systemMessageSuffix) {
      prompt += `[System Message Suffix]\n${aiPreset.systemMessageSuffix}\n\n`;
    }
    if (aiPreset.systemSameAsUser) {
      prompt += `[System Same as User]\ntrue\n\n`;
    }
    if (aiPreset.systemPromptPrefix) {
      prompt += `[System Prompt Prefix]\n${aiPreset.systemPromptPrefix}\n\n`;
    }
    if (aiPreset.systemPromptSuffix) {
      prompt += `[System Prompt Suffix]\n${aiPreset.systemPromptSuffix}\n\n`;
    }
    if (aiPreset.firstAssistantPrefix) {
      prompt += `[First Assistant Prefix]\n${aiPreset.firstAssistantPrefix}\n\n`;
    }
    if (aiPreset.lastAssistantPrefix) {
      prompt += `[Last Assistant Prefix]\n${aiPreset.lastAssistantPrefix}\n\n`;
    }
    if (aiPreset.firstUserPrefix) {
      prompt += `[First User Prefix]\n${aiPreset.firstUserPrefix}\n\n`;
    }
    if (aiPreset.lastUserPrefix) {
      prompt += `[Last User Prefix]\n${aiPreset.lastUserPrefix}\n\n`;
    }
    if (aiPreset.systemInstructionPrefix) {
      prompt += `[System Instruction Prefix]\n${aiPreset.systemInstructionPrefix}\n\n`;
    }
    if (aiPreset.stopSequence) {
      prompt += `[Stop Sequence]\n${aiPreset.stopSequence}\n\n`;
    }
    if (aiPreset.userFillerMessage) {
      prompt += `[User Filler Message]\n${aiPreset.userFillerMessage}\n\n`;
    }
    if (aiPreset.userFillerMessage) {
      prompt += `[User Filler Message]\n${aiPreset.userFillerMessage}\n\n`;
    }
    if (aiPreset.exampleSeparator) {
      prompt += `[Example Separator]\n${aiPreset.exampleSeparator}\n\n`;
    }
    if (aiPreset.chatStart) {
      prompt += `[Chat Start]\n${aiPreset.chatStart}\n\n`;
    }
    if (aiPreset.jsonArrayOfStrings) {
      prompt += `[JSON Array of Strings]\n${aiPreset.jsonArrayOfStrings}\n\n`;
    }
    if (aiPreset.replaceMacroInStopStrings) {
      prompt += "[Instruction]\nReplace macro in stop strings.\n\n";
    }    
    // 3. Add history and next speaker in new format
    const char = state.characters.find(c => c.name === speaker);
    if (char?.role === 'user') {
      prompt += history + `\n{{${speaker}}}:`;
    } else {
      prompt += history + `\n<${speaker}>:`;
    }

    let banned_tokens = [];
    if (preset.multiLineBannedToken && preset.multiLineBannedToken.trim()) {
      banned_tokens = preset.multiLineBannedToken.split(',').map(t => t.trim()).filter(Boolean);
    }

    if (preset.streaming) {
      let msgRef;
      if (isRetry) {
        // Stream into the existing message/version
        msgRef = state.messages[idx];
        msgRef.content = "";
      } else {
        pushUndo();
        const newMsg = {
          speaker,
          content: '',
          media: null,
          direction: isRTL.value ? 'rtl' : 'ltr'
        };
        if (autoScroll.value) nextTick(scrollToBottom);
        state.messages.splice(idx + 1, 0, newMsg);
        msgRef = state.messages[idx + 1];
      }
      
      try {
        const response = await fetch(`${backendUrl.value}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: aiPreset.model, // <-- Use the active model name here
            messages: [
              { role: "system", content: preset.systemPrompt || "" },
              { role: "user", content: prompt }
            ],
            stream: true
          }),
          signal: abortController.value.signal
        });

        if (!response.body || typeof response.body.getReader !== 'function') {
          const data = await response.json();
          msgRef.content = data.results?.[0]?.text?.trim() || '';
          showToast('Message generated!');
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let lines = buffer.split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') break;
              try {
                const json = JSON.parse(data);
                const delta = json.choices?.[0]?.delta?.content || '';
                msgRef.content += delta;
                console.log('Streaming delta:', delta, 'Full content:', msgRef.content);
                // If this is a retry, also update the current version as it streams
              if (isRetry && msgRef.versions && typeof msgRef.currentVersionIdx === "number") {
                msgRef.versions[msgRef.currentVersionIdx].content = msgRef.content;
              }
              if (onDone) {
              onDone(msgRef.content, msgRef.direction || "ltr");
            }
            console.log('onDone called with:', msgRef.content);  
              } catch (e) {}
            }
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          showToast('Generation stopped.');
        } else {
          showToast('Error connecting to LLM.');
          console.error(err);
        }
      }
    } else {
      try {
        const response = await fetch('http://localhost:5001/api/v1/generate', {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            max_length: preset.responseTokens,
            context_length: preset.contextTokens,
            temperature: preset.temperature,
            top_k: preset.topK,
            top_p: preset.topP,
            min_p: preset.minP,
            repetition_penalty: preset.repetitionPenalty,
            repetition_penalty_range: preset.repetitionPenaltyRange,
            banned_tokens,
            system_prompt: preset.systemPrompt,
            stream: false
          }),
          signal: abortController.value.signal
        });
        
        const data = await response.json();
        const generated = data.results?.[0]?.text?.trim() || '';
        if (generated) {
          pushUndo();
          state.messages.splice(idx + 1, 0, {
            speaker,
            content: generated,
            media: null,
            direction: isRTL.value ? 'rtl' : 'ltr'
          });
          showToast('Message generated!');
               } else {
          showToast('No response from LLM.');
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          showToast('Generation stopped.');
        } else {
          showToast('Error connecting to LLM.');
          console.error(err);
        }
      }
    }
  } finally {
    isGenerating.value = false;
    abortController.value = null;
  }
}

function retryGenerateMessage(idx) {
  const msg = state.messages[idx];
  if (!msg) return;
  const char = state.characters.find(c => c.name === msg.speaker);
  if (!char || char.role === 'user') {
    showToast('Retry only works for AI messages.');
    return;
  }
  pushUndo();

  // Ensure versions array exists and save current version if needed
  if (!msg.versions) {
    msg.versions = [{ content: msg.content, direction: msg.direction || "ltr" }];
    msg.currentVersionIdx = 0;
  }

  // Add a new empty version for streaming
  msg.versions = msg.versions.slice(0, msg.currentVersionIdx + 1); // Discard any "future" versions
  msg.versions.push({ content: "", direction: msg.direction || "ltr" });
  msg.currentVersionIdx = msg.versions.length - 1;
  msg.content = ""; // Clear for streaming

  // Stream new LLM response into this version
  generateMessageForCharacter(char.name, idx, (newContent, newDirection) => {
    // Update the version and visible content as tokens stream in
    msg.versions[msg.currentVersionIdx].content = newContent;
    msg.versions[msg.currentVersionIdx].direction = newDirection || "ltr";
    msg.content = newContent;
    msg.direction = newDirection || "ltr";
  }, true); // true = isRetry
}

function onLeftArrow(idx) {
  const msg = state.messages[idx];
  if (!msg || !msg.versions || msg.currentVersionIdx === 0) return;
  msg.currentVersionIdx--;
  msg.content = msg.versions[msg.currentVersionIdx].content;
  msg.direction = msg.versions[msg.currentVersionIdx].direction || "ltr";
}
function onRightArrow(idx) {
  const msg = state.messages[idx];
  if (!msg || !msg.versions || msg.currentVersionIdx >= msg.versions.length - 1) return;
  msg.currentVersionIdx++;
  msg.content = msg.versions[msg.currentVersionIdx].content;
  msg.direction = msg.versions[msg.currentVersionIdx].direction || "ltr";
}

function stopGeneration() {
  if (abortController.value) {
    abortController.value.abort();
  }
  // Send stop signal to backend
  fetch('/api/stop', { method: 'POST' });
}

// Background image handling with validation and error handling
const bgFileInput = ref(null);
const bgImage = ref(''); // Ensure this is defined

function triggerBgFileInput() {
  if (bgFileInput.value) {
    bgFileInput.value.value = '';
    bgFileInput.value.click();
  }
}

function onBgImageChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    bgImage.value = evt.target.result;
    nextTick(() => {
      const main = document.querySelector('.main');
      if (main) {
        main.style.background = `url('${bgImage.value}') center center / cover no-repeat fixed`;
      }
    });
    localStorage.setItem('chatBgImage', bgImage.value);
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function removeBgImage() {
  bgImage.value = '';
  localStorage.removeItem('chatBgImage');
  
  // Remove background immediately
  const main = document.querySelector('.main');
  if (main) {
    main.style.background = '';
    main.style.backgroundColor = 'var(--bg-panel, #212733)';
  }
  showToast('Background removed.');
}

function onCloseChat() {
  // Show the close chat confirmation prompt
  closeChatPrompt.value = true;
}

function saveAndClose(type) {
  if (type === 'json') {
    exportChatJson();
  } else if (type === 'txt') {
    exportChatTxt();
  } else if (type === 'docx') {
    exportChatDocx();
  }
  closeChatPrompt.value = false;
  // Optionally, clear chat or reload page:
  // location.reload();
}

function closeWithoutSaving() {
  // Clear all chat data
  state.chatTitle = '';
  state.characters = [];
  state.messages = [];
  state.layout = { ...defaultLayout };
  state.colors = { ...defaultColors };

  // Clear background image
  bgImage.value = '';
  localStorage.removeItem('chatBgImage');
  // Remove background immediately from UI
  const main = document.querySelector('.main');
  if (main) {
    main.style.background = '';
    main.style.backgroundColor = 'var(--bg-panel, #212733)';
  }

  // Clear LLM Presets (reset aiPreset to defaults)
  Object.assign(aiPreset, {
    textMemory: '',
    responseTokens: 256,
    contextTokens: 2048,
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    minP: 0.0,
    repetitionPenalty: 1.1,
    repetitionPenaltyRange: 128,
    multiLineBannedToken: '',
    systemPrompt: '',
    streaming: true,
    contextTemplate: '',
    instructTemplate: '',
    model: '',
    alwaysAddCharNames: true,
    generateonlyonelineperrequest: false,
    collapseconsecutivenewlines: true,
    trimspaces: true,
    trimincompletesentences: false,
    separatorsasstopstrings: false,
    namesasstopstrings: true,
    activationRegex: '',
    wrapSequencesWithNewline: true,
    replaceMacroInSequences: true,
    skipExampleDialoguesFormatting: false,
    includeNames: 'Always',
    userMessagePrefix: '',
    userMessageSuffix: '',
    assistantMessagePrefix: '',
    assistantMessageSuffix: '',
    systemMessagePrefix: '',
    systemMessageSuffix: '',
    systemSameAsUser: false,
    systemPromptPrefix: '',
    systemPromptSuffix: '',
    firstAssistantPrefix: '',
    lastAssistantPrefix: '',
    firstUserPrefix: '',
    lastUserPrefix: '',
    systemInstructionPrefix: '',
    stopSequence: '',
    userFillerMessage: '',
    exampleSeparator: '',
    chatStart: '',
    jsonArrayOfStrings: '',
    replaceMacroInStopStrings: true,
    postHistoryInstructions: ''
  });

  closeChatPrompt.value = false;
}

// Restore background on mount
onMounted(() => {
  const savedBg = localStorage.getItem('chatBgImage');
  if (savedBg) {
    bgImage.value = savedBg;
    nextTick(() => {
      const main = document.querySelector('.main');
      if (main) {
        main.style.background = `url('${bgImage.value}') center center / cover no-repeat fixed`;
      }
    });
  }
});
</script>

<style>
/* 4. Use CSS variables for themeable properties */
.app-root {
  width: 100%;
  height: 100vh;
  min-height: 100vh;
  position: fixed;
  top: 0; left: 0;
  background: var(--bg-main, #181e24);
  color: var(--text-main, #e0e3e7);
  overflow: auto;
  box-sizing: border-box;
}

.main-row {
  display: flex;
  flex-direction: row;
  height: 100vh;
  width: 100%;
  box-sizing: border-box;
}

.sidebar {
  background: var(--bg-panel, #212733);
  border-radius: 0 8px 8px 0;
  padding: 18px 16px;
  flex-shrink: 0;
   box-shadow: 2px 3px 15px #0003;
  position: relative;
  z-index: 2;
  min-width: 300px;
  max-width: 400px;
  height: 100vh;
  transition: width 0.35s;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
   overflow-y: auto;      /* <-- Add this line */
  overflow-x: hidden;    /* <-- Optional: prevents horizontal scroll */
}
.sidebar-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.sidebar-collapsed {
  width: 24px;
  background: transparent;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  height: 100vh;
  min-width: 24px;
  z-index: 3;
}
.collapse-btn, .expand-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: var(--input-bg, #3a4a60);
  color: var(--text-main, #fff);
  border-radius: 6px;
  padding: 2px 8px;
  cursor: pointer;
  font-size: 1.3em;
  z-index: 10;
  box-shadow: 1px 2px 6px #0004;
}
.expand-btn {
  left: 0;
  right: auto;
  top: 10px;
  background: #212733;
}
.reset-btn {
  background: var(--input-bg, #2a3446);
  color: var(--text-main, #fff);
  border: none;
  border-radius: 3px;
  margin-left: 4px;
  padding: 0 8px;
  font-size: 1.1em;
  cursor: pointer;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.15s, background 0.15s;
}
.reset-btn:hover {
  background: #e75480;
  color: #fff;
  opacity: 1;
}
.main {
  flex: 1 1 0%;
  background: var(--bg-panel, #212733);
  border-radius: 8px;
  padding: 24px 24px 24px 18px;
  min-height: 640px;
  height: 100vh;
  box-shadow: 2px 3px 15px #0002;
  transition: width 0.35s, padding 0.3s;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  box-sizing: border-box;
  isolation: isolate;
  min-height: 100vh;
  background-color: var(--bg-panel, #212733);
}

/* Add a semi-transparent overlay for better text readability when bg image is present */
.main::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1;
  pointer-events: none;
  opacity: v-bind('bgImage ? 1 : 0');
  transition: opacity 0.3s ease;
}

/* Ensure content is above the overlay */
.main > * {
  position: relative;
  z-index: 2;
}

/* Style file input button */
.bg-file-input {
  display: none;
}

.bg-button {
  cursor: pointer;
  background: var(--bg-panel-hover);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  padding: 8px 16px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.bg-button:hover {
  background: var(--bg-hover);
}

/* Ensure modals and dropdowns are above background */
.modal, .dropdown {
  z-index: 100;
}

.section {
  margin-bottom: 20px;
}
.input {
  width: 90%;
  max-width: 100%;
  background: var(--input-bg, #232932);
  color: var(--text-main, #e0e3e7);
  border: 1px solid var(--border, #444);
  border-radius: 4px;
  padding: 5px 8px;
  margin-top: 4px;
  box-sizing: border-box;
}
.characters-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
   margin: 8px  0;
}
.character-edit {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.charname {
  width: 90px;
  font-size: 0.97em;
  padding: 2px 6px;
  height: 28px;
}
.portrait-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-right: 2px;
}
.portrait-thumb {
  width: 28px;
  height: 28px;
  font-size: 1em;
  margin-right: 2px;
}
.portrait-upload-btn {
  font-size: 1em;
  margin-left: 2px;
}
.add-msg-btn.small-btn,
.font-style-controls .small-btn {
  font-size: 0.95em;
  width: 24px;
  height: 24px;
  padding: 0 4px;
  min-width: 0;
  margin-left: 2px;
  margin-right: 2px;
}
.font-style-controls.inline-controls {
  flex-direction: row;
  gap: 2px;
  margin: 0 2px;
}
.font-color-input.small-color {
  width: 22px;
  height: 22px;
  padding: 0;
  margin-left: 2px;
  margin-right: 2px;
}
.font-family-select.small-select {
  height: 24px;
  font-size: 0.97em;
  padding: 0 2px;
  margin-left: 2px;
}
.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.color-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.color-value {
  font-size: 0.95em;
  color: #b0b7c3;
}
.export-btn {
  background: var(--input-bg, #3a4a60);
  color: var(--text-main, #fff);
  border: none;
  border-radius: 4px;
  padding: 6px 16px;
  cursor: pointer;
}
.chat-box {
  margin-top: 16px;
  min-height: 250px;
}
.msg-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 18px;
}
.msg-portrait {
  /* margin-right: 16px; */ /* Remove or comment this out */
  display: flex;
  align-items: center;
  justify-content: center;
}
.msg-portrait img, .msg-portrait span {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}
.msg-body {
  position: relative;
  border: 1px solid var(--accent, #e75480);
  background: rgba(38,46,52,0.4);
  border-radius: 8px;
  padding: 8px 14px;
  min-height: 40px;
  text-align: left;
  word-wrap: break-word;
  overflow-wrap: break-word;
  box-sizing: border-box;
}
.msg-header {
  font-weight: bold;
  margin-bottom: 4px;
  text-align: center; /* <-- Change from left to center */
  color: var(--accent, #e75480);
}
.msg-content {
  margin-bottom: 4px;
  min-height: 22px;
  word-break: break-word;
  text-align: left;
}
.left-align {
  text-align: left !important;
}
.msg-actions {
  background: transparent !important; /* Make the row background transparent again */
  border-radius: 8px;
  padding: 6px 8px;
  margin-top: 8px;
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}
.msg-char-avatars-inline {
  display: flex;
  flex-direction: row;
  gap: 6px;
  margin-left: 12px;
}
.msg-char-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #232932;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1em;
  cursor: pointer;
  border: 2px solid #8883;
  overflow: hidden;
  transition: border 0.2s, box-shadow 0.2s;
}
.msg-char-avatar:hover {
  border: 2px solid #e75480;
  box-shadow: 0 0 4px #e7548088;
}
.msg-char-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}
.msg-char-generate-inline {
  display: flex;
  flex-direction: row;
  gap: 6px;
  margin-left: 8px;
}
.small-gen-btn {
  font-size: 1em;
  padding: 2px 7px;
  border-radius: 50%;
  background: #232932;
  border: 1px solid #8883;
  cursor: pointer;
  transition: border 0.2s, background 0.2s;

 }
.small-gen-btn:hover {
  border: 1.5px solid #e75480;
  background: #2a2e38;
}
.font-style-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  background: #2a2e38;
}
.font-style-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 0;
  margin-bottom: 4px; /* Add a little space below */
}
.font-extra-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 0;
}
.font-style-controls button {
  border: 1px solid #b0b7c3;
  background: #f6f7fa;
  color: #232932;
  border-radius: 3px;
  width: 28px;
  height: 28px;
  font-size: 1em;
  cursor: pointer;
  opacity: 0.7;
  transition: background 0.15s, opacity 0.15s;
  padding: 0;
}
.font-style-controls button.active {
  background: #e75480;
  color: #fff;
  opacity: 1;
}
.font-style-controls button:hover {
  opacity: 1;
}
.font-color-input {
  border: none;
  background: none;
  cursor: pointer;
}
.font-family-select {
  margin-left: 6px;
  height: 28px;
  border-radius: 3px;
  border: 1px solid #b0b7c3;
  background: #f6f7fa;
  color: #232932;
  font-size: 1em;
  padding: 0 4px;
  cursor: pointer;
}
.wizard-modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.55);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wizard-box {
  background: var(--bg-panel, #212733);
  color: var(--text-main, #e0e3e7);
  border-radius: 10px;
  padding: 32px 28px;
  min-width: 320px;
  box-shadow: 0 4px 32px #000a;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.wizard-box input[type="number"], .wizard-box input[type="text"] {
  margin: 6px 0;
  padding: 6px 10px;
  border-radius: 4px;
  border:  1px solid #444;
  background: var(--input-bg, #232932);
  color: var(--text-main, #e0e3e7);
}
.wizard-box button {
  margin: 8px 4px 0 0;
  padding: 6px 16px;
  border-radius: 4px;
  border: none;
  background: var(--accent, #e75480);
  color: #fff;
  cursor: pointer;
}
.wizard-box img {
  vertical-align: middle;
  margin-left:  8px;
}
.scroll-arrow {
  position: fixed;


  z-index: 200;
  background: transparent;
  color: var(--accent, #e75480);
  border: none;
  border-radius: 0;
  width: auto;
  height: auto;
  font-size: 1.1em; /* Reduced from 2.2em to 1.1em */
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.7;
  box-shadow: none;
  padding: 0 6px;
  transition: color 0.2s, opacity 0.2s;
}
.scroll-arrow:hover {
  color: #bd93f9;
  opacity: 1;
  background: transparent;
}
.scroll-down {
  top: 18px;
  right: 24px;
}
.scroll-up {
  bottom: 24px;
  right: 24px;
}
.sidebar-separator {
  border: none;
  border-top:  1px solid #444;
  margin: 12px 0 16px 0;
}
.bordered-section {
  border: 1px solid #444;
  border-radius: 6px;
  padding: 12px 10px;
  margin-bottom: 18px;
  background: var(--input-bg, #232932);
}
.remove-media-btn,
.detach-media-btn,
.drag-media-btn,
.pin-media-btn,
.resize-media-btn {
  background: transparent !important;
  color: var(--accent, #e75480);
  border: none !important;
  border-radius: 50%;
  width: 22px !important;
  height: 22px !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: 22px !important;
  max-height: 22px !important;
  font-size: 1.1em;
  cursor: pointer;
  opacity: 0.85;
  z-index: 11;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s, opacity 0.2s;
  padding: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
}

.remove-media-btn:hover,
.detach-media-btn:hover,
.pin-media-btn:hover,
.resize-media-btn:hover {
  color: #bd93f9;
  opacity: 1;
}
.close-chat-btn-container {
  position: absolute;
  top: 14px;
  left: 18px;
  z-index: 30;
}
.close-chat-btn {
  background: transparent !important;
  color: var(--accent, #e75480);
  border: none !important;
  border-radius: 0 !important;
  width: auto !important;
  height: auto !important;
  font-size: 1.4em;
  cursor: pointer;
  opacity: 0.85;
  box-shadow: none !important;
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s, opacity 0.2s;
}
.close-chat-btn:hover {
  color: #bd93f9;
  opacity: 1;
  background: transparent !important;
}
.close-chat-modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.45);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.close-chat-box {
  background: var(--bg-panel, #212733);
  color: var(--text-main, #e0e3e7);
  border-radius: 10px;
  padding: 32px 28px;
  min-width: 320px;
  box-shadow: 0 4px 32px #000a;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}
.close-chat-box button {
  margin: 8px 4px 0 0;
  padding: 6px 16px;
  border-radius: 4px;
  border: none;
  background: var(--accent, #e75480);
  color: #fff;
  cursor: pointer;
}
.close-chat-box button:last-child {
  background: #444;
  color: #fff;
}
.close-chat-box button:hover {
  opacity: 0.9;
}
.bg-modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.45);
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bg-modal-box {
  background: var(--bg-panel, #212733);
  color: var(--text-main, #e0e3e7);
  border-radius: 10px;
  padding: 32px 28px;
  min-width: 320px;
  box-shadow: 0 4px 32px #000a;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}
.bg-modal-box input[type="file"] {
  margin-bottom: 12px;
}
.bg-modal-box button {
  margin: 4px 0;
  padding: 6px 16px;
  border-radius: 4px;
  border: none;
  background: var(--accent, #e75480);
  color: #fff;
  cursor: pointer;
}
.bg-modal-box button:last-child {
  background: #444;
  color: #fff;
}
.bg-modal-box button:hover {
  opacity: 0.9;
}
.small-action-btn {
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  max-width: 28px;
  max-height: 28px;
  font-size: 1em;
  padding: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #232932;
  border: 1px solid #8883;
  cursor: pointer;
  transition: border 0.2s, background 0.2s;
}
.small-action-btn:hover {
  border: 1.5px solid #e75480;
  background: #2a2e38;
}

/* Detached media box styles */
.detached-media-box {
  position: fixed;
  z-index: 9999;
  background: #181e24f2;
  border: 2px solid #e75480;
  border-radius: 10px;
  box-shadow: 0 4px 32px #000a;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: box-shadow 0.2s;
  /* left, top, width, height, transform are set inline via :style */
}
.drag-media-btn,
.move-handle {
  background: transparent !important;
  border: none !important;
  color: var(--accent, #e75480);
  border-radius: 0 !important;
  width: 22px !important;
  height: 22px !important;
  font-size: 1.1em;
  cursor: grab;
  opacity: 0.85;
  z-index: 11;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s, opacity 0.2s;
  padding: 0 !important;
  box-shadow: none !important;
}
.drag-media-btn:hover,
.move-handle:hover {
  color: #bd93f9;
  opacity: 1;
}
.media-resize-wrapper {
  position: relative;
  display: inline-block;
  /* Ensure the wrapper is only as big as the media */
}
.media-action-column {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  z-index: 20;
  /* Attach to the media, not the message box */
}
/* Horizontal controls for attached media */
.media-action-row {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 4px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-end;
  gap: 6px; /* Half the previous gap (was 12px or more) */
  z-index: 12;
  pointer-events: none; /* Let buttons be clickable, but row itself doesn't block */
}
.media-action-row > button {
  pointer-events: auto;
  margin: 0 2px;
}
.remove-media-btn,
.detach-media-btn,
.drag-media-btn,
.pin-media-btn {
  /* position: static; */
  margin: 0;
}
.resize-handle.corner {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #e75480;
  border-radius: 50%;
  z-index: 12;
  cursor: pointer;
  opacity: 0.8;
  border: 2px solid #fff;
}
.resize-handle.corner.top-left { top: -6px; left: -6px; cursor: nwse-resize; }
.resize-handle.corner.top-right { top: -6px; right: -6px; cursor: nesw-resize; }
.resize-handle.corner.bottom-left { bottom: -6px; left: -6px; cursor: nesw-resize; }
.resize-handle.corner.bottom-right { bottom: -6px; right: -6px; cursor: nwse-resize; }
.msg-edit {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  resize: none;
  border-radius: 8px;
  border: 1px solid var(--accent, #e75480);
  background: rgba(38,46,52,0.4);
  padding: 8px 14px;
  min-height: 40px;
  font-family: inherit;
  outline: none;
  font-size: inherit;
  color: inherit;
}

/* AI Preset styles */
.ai-preset-block {
  background: var(--bg-panel, #232932);
  border: 1px solid var(--border, #444);
  border-radius: 8px;
  padding: 12px 10px 8px 10px;
  margin-bottom: 12px;
}
.ai-preset-link-btn {
  background: transparent !important;
  border: none;
  color: var(--accent, #e75480);
  font-size: 1em;
  padding: 0 0 4px 0;
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.15s;
}
.ai-preset-link-btn:hover {
  color: #bd93f9;
  text-decoration: underline;
}
.ai-preset-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}
.ai-preset-row label {
  min-width: 160px;
  font-size: 0.98em;
  color: var(--text-main, #e0e3e7);
}
.ai-preset-input {
  flex: 1 1 0;
  min-width: 0;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--border, #444);
  background: var(--input-bg, #232932);
  color: var(--text-main, #e0e3e7);
}
.ai-preset-textarea {
  flex: 1 1 0;
  min-width: 0;
  min-height: 40px;
  max-height: 80px;
  resize: vertical;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--border, #444);
  background: var(--input-bg, #232932);
  color: var(--text-main, #e0e3e7);
}
.msg-action-btn,
.small-action-btn,
.small-gen-btn {
  background: transparent !important;   /* Light blue */
  border: 1px solid #d287c4;
  transition: background 0.15s, border 0.15s;
}
.msg-action-btn:hover,
.small-action-btn:hover,
.small-gen-btn:hover {
  background: #e3bfdc !important;   /* Slightly lighter blue on hover */
  border: 1.5px solid #e3bfdc;
}

/* Add styles for disabled state */
.msg-action-btn.disabled,
.small-action-btn.disabled,
.small-gen-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.msg-action-btn:disabled,
.small-action-btn:disabled,
.small-gen-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.type-label {
  display: inline-block;
  width: 18px;
  text-align: center;
  color: #e75480;
  font-size: 1em;
}

.ai-preset-row label {
  min-width: unset;
  width: auto;
  margin: 0;
  padding: 0;
}
.ai-preset-row.vertical {
  flex-direction: column;
  align-items: stretch;
}
.ai-preset-row.vertical label {
  margin-bottom: 2px;
}
.left-indent-btn {
  margin-left: 0px;
  display: block;
}
.bg-btn-blue {
  color: rgb(100, 181, 246) !important;
}
.preset-label-white {
  color: #fff !important;
  text-decoration: none !important;
}
</style>