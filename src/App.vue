<template>
  <div class="app-root" @keydown="handleDirShortcut" tabindex="0">
    <div class="main-row">
      <div class="sidebar-container" ref="sidebarArea" @click.stop>
        <transition name="sidebar">
          <SidebarPanel
            v-model:selectedThemeIdx="selectedThemeIdx"
            v-model:characterSelections="characterSelections"
            v-model:sidebarOpen="sidebarOpen"
            :themes="themes"
            :state="state"
            :aiPreset="aiPreset"
            v-model:autoScroll="autoScroll"
            :applyTheme="applyTheme"
            :openChatFile="openChatFile"
            :openAddUserModal="openAddUserModal"
            :openAddCharacterModal="openAddCharacterModal"
            :applyCharacterSelection="applyCharacterSelection"
            :onCharacterNameEdit="onCharacterNameEdit"
            :onPortraitUpload="onPortraitUpload"
            :triggerPortraitInput="triggerPortraitInput"
            :addMessageForCharacter="addMessageForCharacter"
            :toggleCharStyle="toggleCharStyle"
            :moveCharacterUp="moveCharacterUp"
            :moveCharacterDown="moveCharacterDown"
            :onLayoutChange="onLayoutChange"
            :resetLayout="resetLayout"
            :resetColor="resetColor"
            :exportHTML="makeExportHTML"
            :exportChatTxt="exportChatTxt"
            :exportChatDocx="exportChatDocx"
            :exportChatJson="exportChatJson"
            :triggerBgFileInput="triggerBgFileInput"
            :exportAIPreset="exportAIPreset"
            :triggerAIPresetImport="triggerAIPresetImport"
            :onAIPresetImport="onAIPresetImport"
            :triggerSystemPromptFileInput="triggerSystemPromptFileInput"
            :onSystemPromptFileChange="onSystemPromptFileChange"
            :triggerContextFileInput="triggerContextFileInput"
            :onContextFileChange="onContextFileChange"
            :triggerInstructFileInput="triggerInstructFileInput"
            :onInstructFileChange="onInstructFileChange"
            @importPersonaCard="onImportPersonaCard"
            @importCharacterCard="onImportCharacterCard"
          />
        </transition>
        <!-- collapsed sidebar button here if needed -->
      </div>
      <!-- Main Chat Area -->
      <div class="main" :class="{ 'sidebar-collapsed-main': !sidebarOpen }" ref="mainChatArea">
        <!-- Place this inside the .main div, before <h3> -->
        <!-- Sticky transparent top toolbar for right-hand panel -->
        <!-- NOTE: This toolbar is added non-destructively. Existing fixed-position controls remain in the template but are hidden via CSS to preserve event handlers and logic. The toolbar reuses existing methods so functionality is unchanged. -->
  <div class="right-top-toolbar" :style="toolbarInlineStyle" aria-hidden="false">
    <div class="right-top-toolbar-inner">
      <div class="toolbar-left">
            <!-- keep an exit control on the left (also present elsewhere) -->
            <button class="toolbar-btn close-chat-btn" @click="onCloseChat" title="Close Chat">✖</button>
          </div>
          <div class="toolbar-middle">
            <!-- centered chat title -->
            <h3 class="chat-title toolbar-title">{{ state.chatTitle || autoTitle }}</h3>
          </div>
          <div class="toolbar-right">
            <!-- search controls placed immediately to the left of the arrows -->
            <div class="search-wrapper">
              <input class="search-input toolbar-search" ref="toolbarSearchInput" v-model="searchQuery" placeholder="Search text..." @keydown.enter.prevent="nextHit" @keydown.shift.enter.prevent="prevHit" />
              <button class="search-clear" v-if="searchQuery" @click.prevent="clearSearch" title="Clear search">✖</button>
            </div>
            <button class="toolbar-btn search-label" @click="applySearchFilter" title="Search">Search</button>
            <span class="match-counter">{{ searchIndex.length ? (searchPos+1) + '/' + searchIndex.length : '0/0' }}</span>
            <button class="toolbar-btn prev-match" @click="prevHit" title="Previous match">◀</button>
            <button class="toolbar-btn next-match" @click="nextHit" title="Next match">▶</button>
            <!-- single slider controlling transparency/blur -->
            <input type="range" class="toolbar-slider" min="0" max="100" v-model="toolbarEffect" title="Transparency / Blur" aria-label="Toolbar transparency and blur" />
            <!-- bring the up arrow (previously bottom) next to down arrow -->
            <button class="toolbar-btn up-btn" @click="scrollToTop" title="Jump to top">⬆️</button>
            <!-- down arrow moved to far right -->
            <button class="toolbar-btn down-btn" @click="scrollToBottom" title="Jump to bottom">⬇️</button>
    <!-- enter/exit fullscreen toggle restored to top bar (far right) -->
    <button class="toolbar-btn fullscreen-toggle-top" @click="toggleFullscreen" :title="isFullscreen ? 'Exit full screen' : 'Enter full screen'">{{ isFullscreen ? '🗗' : '⛶' }}</button>
      </div>
    </div>
  </div>
          <div class="chat-box">
          <!-- Debug toggle: set useVirtual=false to render without virtualization for diagnosis -->
          <template v-if="useVirtual !== false">
          <DynamicScroller
            ref="scrollerRef"
            :items="state.messages"
            key-field="_vid"
            class="virtual-list"
            :min-item-size="80"
            :buffer="300"
          >
          <template #default="{ item: msg, index: idx, active }">
          <DynamicScrollerItem :item="msg" :active="active" :size-dependencies="[msg.content, msg.media?.width, msg.media?.height]">
          <div
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
              <div class="msg-body" :class="{ streaming: msg.streaming }" :style="msgBodyStyle">
              <div class="msg-header"
                :style="characterFontStyle(msg.speaker)">

                {{ msg.speaker }}
              </div>
              <div v-if="editIdx !== idx"
                class="msg-content"
                v-html="formatText(highlightSearch(getMessageVisibleText(msg), searchQuery), msg.speaker)"
                :dir="msg.direction || 'ltr'"
                :style="Object.assign({}, { textAlign: (msg.direction === 'rtl') ? 'right' : 'left' }, characterMessageStyle(msg.speaker))"
                @click="startEdit(idx, msg.content)"
              >
              </div>
              <textarea
                v-else
                v-model="editContent"
                class="msg-edit"
                :style="Object.assign({}, { fontSize: state.layout.fontSize + 'px', color: state.colors.text, textAlign: editDirection === 'rtl' ? 'right' : 'left' }, characterMessageStyle(msg.speaker))"
                :dir="editDirection"
                spellcheck="true"
                @input="(e) => onEditInput(idx, e)"
                @focus="autoGrow($event)"
                :ref="el => setEditAreaRef(el, idx)"
                @keydown="onEditKeyDown(idx, $event)"
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
                <div class="msg-actions-primary">
                  <!-- Edit controls -->
                  <button
                    class="msg-action-btn small-action-btn"
                    v-if="editIdx !== idx"
                    @click="startEdit(idx, msg.content)"
                    title="Edit"
                  >🖉</button>
                  <template v-else>
                    <button class="msg-action-btn small-action-btn" @click="saveEdit(idx)" title="Save">💾</button>
                    <button class="msg-action-btn small-action-btn" @click="cancelEdit" title="Cancel">✖</button>
                    <button class="msg-action-btn small-action-btn" @click="clickLocalUndo(idx)" title="Undo edit">↺</button>
                    <button class="msg-action-btn small-action-btn" @click="clickLocalRedo(idx)" title="Redo edit">↻</button>
                    <button
                      class="msg-action-btn delete-msg-btn small-action-btn"
                      @click="deleteMessage(idx)"
                      title="Delete this message"
                    >🗑️</button>
                  </template>

                  <!-- Insert menu (Attach, Emoji) -->
                  <div class="btn-with-menu">
                    <button class="msg-action-btn small-action-btn" @click="toggleInsertMenu(idx)" title="Insert">＋</button>
                    <div v-if="insertMenuOpen[idx]" class="menu-popover">
                      <button class="menu-item" @click="triggerMediaInput(idx); closeInsertMenu(idx)">📎 Attach media</button>
                      <button class="menu-item" @click="openCustomEmojiPicker(idx); closeInsertMenu(idx)">😊 Emoji</button>
                    </div>
                  </div>

                  <!-- Hidden file input for media upload -->
                  <input
                    type="file"
                    accept="image/*,video/*"
                    :ref="'mediaInput' + idx"
                    style="display:none"
                    @change="e => onMediaUpload(idx, e)"
                  />

                  <!-- AI default and menu removed as redundant -->

                  <!-- Character avatars: click = generate; right-click = insert empty -->
                  <div class="msg-char-avatars-inline">
                    <span
                      v-for="(char, cidx) in state.characters"
                      :key="'avatar-inline-' + char.name + '-' + idx"
                      class="msg-char-avatar"
                      :title="'Generate as ' + char.name + ' (Right-click: Insert empty)'"
                      @click="generateMessageForCharacter(char.name, idx)"
                      @contextmenu.prevent="insertEmptyMessageForCharacter(char.name, idx)"
                      :class="{ disabled: isGenerating }"
                      :aria-disabled="isGenerating"
                    >
                      <img v-if="char.portraitData" :src="char.portraitData" :alt="char.name" />
                      <span v-else>{{ char.name[0] }}</span>
                    </span>
                  </div>
                </div>

                <div class="msg-actions-secondary secondary">
                  <!-- Stop and Retry placed before Guide -->
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
                  <!-- Direction toggle -->
                  <button
                    class="msg-action-btn small-action-btn dir-toggle"
                    @click="toggleMessageDirection(idx)"
                    :title="'Toggle direction (current: ' + (msg.direction || 'ltr').toUpperCase() + ')'"
                    :aria-label="'Toggle direction (current: ' + (msg.direction || 'ltr').toUpperCase() + ')'"
                  >{{ (msg.direction || 'ltr') === 'ltr' ? 'L' : 'R' }}</button>

                  <!-- Per-message undo/redo via versions -->
                  <div v-if="msg.versions && msg.versions.length > 1" class="version-nav">
                    <button class="msg-action-btn small-action-btn" @click="messageUndo(idx)" :disabled="(msg.currentVersionIdx ?? 0) <= 0" title="Per-message undo">◀</button>
                    <span class="version-label">v{{ (msg.currentVersionIdx ?? 0) + 1 }}/{{ msg.versions.length }}</span>
                    <button class="msg-action-btn small-action-btn" @click="messageRedo(idx)" :disabled="(msg.currentVersionIdx ?? 0) >= (msg.versions.length - 1)" title="Per-message redo">▶</button>
                  </div>

                  <!-- Guidance menu -->
                  <div class="btn-with-menu">
                    <button class="msg-action-btn small-action-btn" @click="toggleGuideMenu(idx)" title="Guide">🧭</button>
                    <div v-if="guideMenuOpen[idx]" class="menu-popover">
                      <div class="menu-section-label">Guided response as…</div>
                      <button
                        v-for="char in state.characters"
                        :key="'guided-as-' + char.name + '-' + idx"
                        class="menu-item"
                        @click="openGuidanceForCharacter(idx, char.name)"
                      >{{ char.name }}</button>
                    </div>
                  </div>

                  <!-- Inline only when applicable -->
                  <button
                    v-if="state.messages[idx]?.extra?.lastGuidedAddition"
                    class="msg-action-btn small-action-btn"
                    title="Undo last guided addition"
                    @click="undoLastGuidedAddition(idx)"
                  >↩</button>
                  <button
                    v-if="state.messages[idx]?.extra?.originalForGuidedContinue"
                    class="msg-action-btn small-action-btn"
                    title="Revert to original"
                    @click="revertToOriginalGuidedContinue(idx)"
                  >⟲</button>
                </div>
              </div>
            </div>
          </div>
          </DynamicScrollerItem>
          </template>
          </DynamicScroller>
          </template>
          <!-- Non-virtualized fallback for debugging: renders the full list with v-for -->
          <template v-else>
            <div class="virtual-list">
              <div v-for="(msg, idx) in state.messages" :key="msg._vid">
                <div
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
                  <div class="msg-body" :class="{ streaming: msg.streaming }" :style="msgBodyStyle">
                    <div class="msg-header" :style="characterFontStyle(msg.speaker)">
                      {{ msg.speaker }}
                    </div>

                    <div v-if="editIdx !== idx"
                      class="msg-content"
                      v-html="formatText(highlightSearch(getMessageVisibleText(msg), searchQuery), msg.speaker)"
                      :dir="msg.direction || 'ltr'"
                      :style="Object.assign({}, { textAlign: (msg.direction === 'rtl') ? 'right' : 'left' }, characterMessageStyle(msg.speaker))"
                      @click="startEdit(idx, msg.content)"
                    >
                    </div>
                    <textarea
                      v-else
                      v-model="editContent"
                      class="msg-edit"
                      :style="Object.assign({}, { fontSize: state.layout.fontSize + 'px', color: state.colors.text, textAlign: editDirection === 'rtl' ? 'right' : 'left' }, characterMessageStyle(msg.speaker))"
                      :dir="editDirection"
                      spellcheck="true"
                      @input="(e) => onEditInput(idx, e)"
                      @focus="autoGrow($event)"
                      :ref="el => setEditAreaRef(el, idx)"
                      @keydown="onEditKeyDown(idx, $event)"
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
                      <div class="msg-actions-primary">
                        <!-- Edit controls -->
                        <button
                          class="msg-action-btn small-action-btn"
                          v-if="editIdx !== idx"
                          @click="startEdit(idx, msg.content)"
                          title="Edit"
                        >🖉</button>
                        <template v-else>
                          <button class="msg-action-btn small-action-btn" @click="saveEdit(idx)" title="Save">💾</button>
                          <button class="msg-action-btn small-action-btn" @click="cancelEdit" title="Cancel">✖</button>
                          <button class="msg-action-btn small-action-btn" @click="clickLocalUndo(idx)" title="Undo edit">↺</button>
                          <button class="msg-action-btn small-action-btn" @click="clickLocalRedo(idx)" title="Redo edit">↻</button>
                          <button
                            class="msg-action-btn delete-msg-btn small-action-btn"
                            @click="deleteMessage(idx)"
                            title="Delete this message"
                          >🗑️</button>
                        </template>

                        <!-- Insert menu (Attach, Emoji) -->
                        <div class="btn-with-menu">
                          <button class="msg-action-btn small-action-btn" @click="toggleInsertMenu(idx)" title="Insert">＋</button>
                          <div v-if="insertMenuOpen[idx]" class="menu-popover">
                            <button class="menu-item" @click="triggerMediaInput(idx); closeInsertMenu(idx)">📎 Attach media</button>
                            <button class="menu-item" @click="openCustomEmojiPicker(idx); closeInsertMenu(idx)">😊 Emoji</button>
                          </div>
                        </div>

                        <!-- Hidden file input for media upload -->
                        <input
                          type="file"
                          accept="image/*,video/*"
                          :ref="'mediaInput' + idx"
                          style="display:none"
                          @change="e => onMediaUpload(idx, e)"
                        />

                        <!-- Character avatars: click = generate; right-click = insert empty -->
                        <div class="msg-char-avatars-inline">
                          <span
                            v-for="(char, cidx) in state.characters"
                            :key="'avatar-inline-' + char.name + '-' + idx"
                            class="msg-char-avatar"
                            :title="'Generate as ' + char.name + ' (Right-click: Insert empty)'"
                            @click="generateMessageForCharacter(char.name, idx)"
                            @contextmenu.prevent="insertEmptyMessageForCharacter(char.name, idx)"
                            :class="{ disabled: isGenerating }"
                            :aria-disabled="isGenerating"
                          >
                            <img v-if="char.portraitData" :src="char.portraitData" :alt="char.name" />
                            <span v-else>{{ char.name[0] }}</span>
                          </span>
                        </div>
                      </div>

                      <div class="msg-actions-secondary secondary">
                        <!-- Stop and Retry placed before Guide -->
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
                        <!-- Direction toggle -->
                        <button
                          class="msg-action-btn small-action-btn dir-toggle"
                          @click="toggleMessageDirection(idx)"
                          :title="'Toggle direction (current: ' + (msg.direction || 'ltr').toUpperCase() + ')'"
                          :aria-label="'Toggle direction (current: ' + (msg.direction || 'ltr').toUpperCase() + ')'"
                        >{{ (msg.direction || 'ltr') === 'ltr' ? 'L' : 'R' }}</button>

                        <!-- Per-message undo/redo via versions -->
                        <div v-if="msg.versions && msg.versions.length > 1" class="version-nav">
                          <button class="msg-action-btn small-action-btn" @click="messageUndo(idx)" :disabled="(msg.currentVersionIdx ?? 0) <= 0" title="Per-message undo">◀</button>
                          <span class="version-label">v{{ (msg.currentVersionIdx ?? 0) + 1 }}/{{ msg.versions.length }}</span>
                          <button class="msg-action-btn small-action-btn" @click="messageRedo(idx)" :disabled="(msg.currentVersionIdx ?? 0) >= (msg.versions.length - 1)" title="Per-message redo">▶</button>
                        </div>

                        <!-- Guidance menu -->
                        <div class="btn-with-menu">
                          <button class="msg-action-btn small-action-btn" @click="toggleGuideMenu(idx)" title="Guide">🧭</button>
                          <div v-if="guideMenuOpen[idx]" class="menu-popover">
                            <div class="menu-section-label">Guided response as…</div>
                            <button
                              v-for="char in state.characters"
                              :key="'guided-as-' + char.name + '-' + idx"
                              class="menu-item"
                              @click="openGuidanceForCharacter(idx, char.name)"
                            >{{ char.name }}</button>
                          </div>
                        </div>

                        <!-- Inline only when applicable -->
                        <button
                          v-if="state.messages[idx]?.extra?.lastGuidedAddition"
                          class="msg-action-btn small-action-btn"
                          title="Undo last guided addition"
                          @click="undoLastGuidedAddition(idx)"
                        >↩</button>
                        <button
                          v-if="state.messages[idx]?.extra?.originalForGuidedContinue"
                          class="msg-action-btn small-action-btn"
                          title="Revert to original"
                          @click="revertToOriginalGuidedContinue(idx)"
                        >⟲</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
          <div v-if="!state.messages.length" class="empty-chat">
            <div style="text-align:center; opacity:0.9;">
              <h4 style="margin:6px 0 12px;">Get started</h4>
              <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button class="export-btn" @click="openAddUserModal">Add New User</button>
                <button class="export-btn" @click="openAddCharacterModal">Add New Character</button>
                <button class="export-btn" @click="openChatFile">Load Chat (.json)</button>
              </div>
              <div style="margin-top:10px; color:#b0b7c3;">
                Tip: Click a character avatar under any message to generate a reply.
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Fixed Arrow Buttons -->
      <button
        class="scroll-arrow fullscreen-toggle"
        @click="toggleFullscreen"
        :title="isFullscreen ? 'Exit full screen' : 'Enter full screen'"
      >{{ isFullscreen ? '🗗' : '⛶' }}</button>
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
        <!-- After your Export/Save buttons -->
        <button @click="saveChatAs" class="export-btn left-indent-btn">Save Chat As...</button>
      </div>
    </div>

    <!-- In-app search (top-right) -->
    <div class="search-box">
      <div class="search-wrapper">
        <input class="search-input" v-model="searchQuery" placeholder="Search text..." @keydown.enter.prevent="nextHit" @keydown.shift.enter.prevent="prevHit" />
        <button class="search-clear" v-if="searchQuery" @click.prevent="clearSearch" title="Clear search">✖</button>
      </div>
      <button class="small-action-btn" @click="applySearchFilter" title="Search">Search</button>
      <button class="small-action-btn" @click="prevHit" title="Previous match">◀</button>
      <button class="small-action-btn" @click="nextHit" title="Next match">▶</button>
      <span style="color:#b0b7c3; font-size:0.9em; min-width:48px; text-align:center;">{{ searchIndex.length ? (searchPos+1) + '/' + searchIndex.length : '0/0' }}</span>
      <div v-if="searchBusy" class="search-busy" aria-label="Searching"></div>
    </div>

    <!-- Help / shortcuts toggle -->
    <button class="scroll-arrow help-toggle" @click="showHelp=true" title="Shortcuts">?</button>

    <!-- Shortcuts modal -->
    <div v-if="showHelp" class="wizard-modal" @click.self="showHelp=false">
      <div class="wizard-box" style="max-width:560px; width:92%;">
        <h3>Keyboard Shortcuts</h3>
        <ul style="margin-left:18px;">
          <li>Save chat: Ctrl/Cmd + S</li>
          <li>Undo: Ctrl/Cmd + Z (global); in-editor undo/redo also supported</li>
          <li>Redo: Ctrl/Cmd + Y or Shift + Ctrl/Cmd + Z</li>
          <li>Edit message: Click a message; Save: Enter; Cancel: Esc</li>
          <li>Toggle message direction: Click the L/R button on a message</li>
        </ul>
        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <button class="export-btn" @click="showHelp=false">Close</button>
        </div>
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

    <!-- Emoji Picker Modal -->
    <div v-if="showEmojiPicker" class="emoji-picker-modal" @click.self="showEmojiPicker = false">
      <EmojiPicker @select="onEmojiSelect" />
    </div>
  </div>
  <!-- Name input modal for adding user/character -->
  <!-- Connectivity banner: hidden if offline mode enabled or dismissed -->
  <div
    v-if="!offlineMode && !hideConnBanner && !isBackendOnline"
    class="connectivity-banner"
  >
    <span>Can't reach the AI server. Retrying…</span>
    <button @click="() => { hideConnBanner = true; }" class="close-x" aria-label="Dismiss">✖</button>
    <button @click="() => { setOfflineMode(true); }">Work offline</button>
  </div>
  <div v-if="showNameModal" class="wizard-modal">
    <div class="wizard-box">
      <h3>Add New {{ newType === 'user' ? 'User' : 'Character' }}</h3>
      <input v-model="newName" placeholder="Enter name" @keyup.enter="confirmAddName" />
      <div>
        <button @click="confirmAddName">Add</button>
        <button @click="showNameModal = false">Cancel</button>
      </div>
    </div>
  </div>
  <!-- Guidance modal (expanded editor) -->
  <div v-if="guidanceModal.open" class="wizard-modal" @click.self="closeGuidanceModal">
    <div class="wizard-box" style="max-width:720px; width:92%;">
      <h3>Edit Guidance<span v-if="guidanceModal.character"> — {{ guidanceModal.character }}</span></h3>
      <textarea v-model="guidanceModal.text" rows="6" style="width:100%;"></textarea>
      <div style="margin-top:8px; display:flex; gap:8px; justify-content:flex-end; align-items:center; flex-wrap:wrap;">
        <div style="display:flex; gap:8px; margin-right:auto;">
          <button class="export-btn" :disabled="isGenerating" @click="guidanceModal.mode='swipe'; applyGuidanceModal()">🔁 Guided Swipe</button>
          <button class="export-btn" :disabled="isGenerating" @click="guidanceModal.mode='continue'; applyGuidanceModal()">➕ Guided Continue</button>
          <button class="export-btn" :disabled="isGenerating" @click="guidanceModal.mode='corrections'; applyGuidanceModal()">🛠 Corrections</button>
        </div>
        <button class="export-btn" @click="applyGuidanceModal">Apply</button>
        <button class="export-btn" @click="closeGuidanceModal">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import './style.css';
import { reactive, ref, computed, nextTick, getCurrentInstance, watch, onMounted, onBeforeUnmount } from 'vue';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import { ColorPicker } from 'vue3-colorpicker';
import 'vue3-colorpicker/style.css';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from "docx";
import EmojiPicker from 'vue3-emoji-picker'
import 'vue3-emoji-picker/css' // Import the styles
import SidebarPanel from './components/SidebarPanel.vue'
import { getCompressedHistory } from './llm_helpers/historyManager';
import { loadMemories, retrieveMemories, updateMemoriesFromMessage } from './llm_helpers/memoryManager';
import { loadScenario, getScenarioSummary, updateScenarioWithMessage } from './llm_helpers/scenarioManager';

// Export/Import LLM Preset logic
const aiPresetImportInput = ref(null);
const closeChatPrompt = ref(false);

const showNameModal = ref(false);
const newName = ref('');
const newType = ref('character'); // or 'user'

function openAddCharacterModal() {
  newType.value = 'character';
  newName.value = '';
  showNameModal.value = true;
}
function openAddUserModal() {
  newType.value = 'user';
  newName.value = '';
  showNameModal.value = true;
}
function confirmAddName() {
  const name = newName.value.trim();
  if (!name) {
    showToast('Please enter a name.');
    return;
  }
  if (state.characters.some(c => c.name === name)) {
    showToast((newType.value === 'user' ? 'User' : 'Character') + ' already exists!');
    return;
  }
  const obj = {
    name,
    portraitData: null,
    fontStyle: { bold: false, italic: false, underline: false },
    fontColor: '#A9B3C1',
    fontFamily: 'Segoe UI',
    role: newType.value,
    typeLabel: newType.value === 'user' ? 'U' : 'C'
  };
  state.characters.push(obj);
  pushUndo();
  showToast((newType.value === 'user' ? 'User' : 'Character') + ' added!');
  showNameModal.value = false;
}

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
      const j = JSON.parse(evt.target.result);

      // If the imported JSON looks like our own exported aiPreset (flat keys),
      // merge it directly into the reactive aiPreset and finish early.
      // Detect by checking for any top-level keys that match our aiPreset keys.
      try {
        const presetKeys = Object.keys(aiPreset || {});
        const importedKeys = Object.keys(j || {});
        const common = importedKeys.filter(k => presetKeys.includes(k));
        if (common.length > 0) {
          // Merge only known keys to avoid clobbering unrelated vendor blobs
          common.forEach(k => {
            try { aiPreset[k] = j[k]; } catch (e) {}
          });
          // Preserve full imported object for round-trip if desired
          aiPreset._vendor = aiPreset._vendor || j;
          showToast('LLM Preset imported!');
          return;
        }
      } catch (err) {
        // fall through to vendor mapping below
      }

  // Preserve full vendor JSON for round-trip
  aiPreset._vendor = j;

      // sysprompt
      if (j.sysprompt && typeof j.sysprompt.content === 'string') {
        aiPreset.systemPrompt = j.sysprompt.content;
      }

      // context
      if (j.context) {
        if (typeof j.context.story_string === 'string') aiPreset.contextTemplate = j.context.story_string;
        if ('example_separator' in j.context) aiPreset.exampleSeparator = j.context.example_separator || '';
        if ('chat_start' in j.context) aiPreset.chatStart = j.context.chat_start || '';
        if ('names_as_stop_strings' in j.context) aiPreset.namesasstopstrings = !!j.context.names_as_stop_strings;
        if ('single_line' in j.context) aiPreset.generateonlyonelineperrequest = !!j.context.single_line;
        if ('trim_sentences' in j.context) aiPreset.trimincompletesentences = !!j.context.trim_sentences;
        if ('use_stop_strings' in j.context) aiPreset.useStopStrings = !!j.context.use_stop_strings;
        if ('allow_jailbreak' in j.context) aiPreset.allowJailbreak = !!j.context.allow_jailbreak;
        if ('always_force_name2' in j.context) aiPreset.alwaysForceName2 = !!j.context.always_force_name2;
      }

      // instruct
      if (j.instruct) {
        const ins = j.instruct;
        aiPreset.inputSequence = ins.input_sequence || '';
        aiPreset.outputSequence = ins.output_sequence || '';
        aiPreset.firstInputSequence = ins.first_input_sequence || '';
        aiPreset.lastInputSequence = ins.last_input_sequence || '';
        aiPreset.systemSequence = ins.system_sequence || '';
        aiPreset.firstOutputSequence = ins.first_output_sequence || '';
        aiPreset.lastOutputSequence = ins.last_output_sequence || '';
        aiPreset.systemSequencePrefix = ins.system_sequence_prefix || '';
        aiPreset.systemSequenceSuffix = ins.system_sequence_suffix || '';
        aiPreset.inputSuffix = ins.input_suffix || '';
        aiPreset.outputSuffix = ins.output_suffix || '';
        aiPreset.systemSuffix = ins.system_suffix || '';
        aiPreset.stopSequence = ins.stop_sequence || aiPreset.stopSequence;
        aiPreset.wrapSequences = !!ins.wrap;
        aiPreset.replaceMacroInSequences = !!ins.macro;
        aiPreset.activationRegex = ins.activation_regex || '';
        aiPreset.systemSameAsUser = !!ins.system_same_as_user;
        if (ins.names_behavior) {
          aiPreset.includeNames = ins.names_behavior.toLowerCase() === 'always' ? 'Always'
            : (ins.names_behavior.toLowerCase().includes('group') ? 'Groups and Past Personas' : 'Never');
        }
        aiPreset.namesForceGroups = !!ins.names_force_groups;
        aiPreset.userFillerMessage = ins.user_alignment_message || aiPreset.userFillerMessage;
      }

      // preset (sampling & decoding)
      if (j.preset) {
        const p = j.preset;
        if ('temp' in p) aiPreset.temperature = Number(p.temp);
        if ('top_p' in p) aiPreset.topP = Number(p.top_p);
        if ('top_k' in p) aiPreset.topK = Number(p.top_k);
        if ('min_p' in p) aiPreset.minP = Number(p.min_p);
        if ('typical_p' in p) aiPreset.typicalP = Number(p.typical_p);
        if ('tfs' in p) aiPreset.tfs = Number(p.tfs);
        if ('top_a' in p) aiPreset.topA = Number(p.top_a);
        if ('epsilon_cutoff' in p) aiPreset.epsilonCutoff = Number(p.epsilon_cutoff);
        if ('eta_cutoff' in p) aiPreset.etaCutoff = Number(p.eta_cutoff);

        if ('rep_pen' in p) aiPreset.repetitionPenalty = Number(p.rep_pen);
        if ('rep_pen_range' in p) aiPreset.repetitionPenaltyRange = Number(p.rep_pen_range);
        if ('rep_pen_decay' in p) aiPreset.repetitionPenaltyDecay = Number(p.rep_pen_decay);
        if ('rep_pen_slope' in p) aiPreset.repetitionPenaltySlope = Number(p.rep_pen_slope);
        if ('encoder_rep_pen' in p) aiPreset.encoderRepetitionPenalty = Number(p.encoder_rep_pen);
        if ('freq_pen' in p) aiPreset.frequencyPenalty = Number(p.freq_pen);
        if ('presence_pen' in p) aiPreset.presencePenalty = Number(p.presence_pen);
        if ('penalty_alpha' in p) aiPreset.penaltyAlpha = Number(p.penalty_alpha);

        if ('genamt' in p) aiPreset.responseTokens = Number(p.genamt);
        if ('max_length' in p) aiPreset.maxLength = Number(p.max_length);
        if ('min_length' in p) aiPreset.minLength = Number(p.min_length);
        if ('num_beams' in p) aiPreset.numBeams = Number(p.num_beams);
        if ('length_penalty' in p) aiPreset.lengthPenalty = Number(p.length_penalty);
        if ('early_stopping' in p) aiPreset.earlyStopping = !!p.early_stopping;

        if ('dynatemp' in p) aiPreset.dynatemp = !!p.dynatemp;
        if ('min_temp' in p) aiPreset.minTemp = Number(p.min_temp);
        if ('max_temp' in p) aiPreset.maxTemp = Number(p.max_temp);
        if ('dynatemp_exponent' in p) aiPreset.dynatempExponent = Number(p.dynatemp_exponent);

        if ('dry_allowed_length' in p) aiPreset.dryAllowedLength = Number(p.dry_allowed_length);
        if ('dry_multiplier' in p) aiPreset.dryMultiplier = Number(p.dry_multiplier);
        if ('dry_base' in p) aiPreset.dryBase = Number(p.dry_base);
        if ('dry_sequence_breakers' in p) aiPreset.drySequenceBreakers = typeof p.dry_sequence_breakers === 'string' ? p.dry_sequence_breakers : JSON.stringify(p.dry_sequence_breakers || []);
        if ('dry_penalty_last_n' in p) aiPreset.dryPenaltyLastN = Number(p.dry_penalty_last_n);

        ['add_bos_token','ban_eos_token','ignore_eos_token','skip_special_tokens','spaces_between_special_tokens','speculative_ngram','do_sample']
          .forEach(k => { if (k in p) aiPreset[k] = !!p[k]; });

        if ('guidance_scale' in p) aiPreset.guidanceScale = Number(p.guidance_scale);
        if ('negative_prompt' in p) aiPreset.negativePrompt = String(p.negative_prompt || '');
        if ('grammar_string' in p) aiPreset.grammarString = String(p.grammar_string || '');
        if ('json_schema' in p) aiPreset.jsonSchema = JSON.stringify(p.json_schema || {}, null, 2);

        if ('logit_bias' in p) aiPreset.logitBias = JSON.stringify(p.logit_bias || [], null, 2);
        if ('sampler_priority' in p) aiPreset.samplerPriority = JSON.stringify(p.sampler_priority || []);
        if ('samplers' in p) aiPreset.samplers = JSON.stringify(p.samplers || []);
        if ('samplers_priorities' in p) aiPreset.samplersPriorities = JSON.stringify(p.samplers_priorities || []);
        if ('sampler_order' in p) aiPreset.samplerOrder = JSON.stringify(p.sampler_order || []);
      }

      showToast('LLM Preset imported!');
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

// Debug flag: set to false to temporarily disable virtualization for diagnosis
const useVirtual = ref(false);

const backendUrl = ref('http://localhost:3000'); // Change as needed

// Connectivity + offline mode state
const isBackendOnline = ref(true);
const offlineMode = ref(localStorage.getItem('offlineMode') === '1');
const hideConnBanner = ref(false);

// ...existing code...

function setOfflineMode(v) {
  offlineMode.value = !!v;
  localStorage.setItem('offlineMode', offlineMode.value ? '1' : '0');
}
async function probeBackend() {
  if (offlineMode.value) { isBackendOnline.value = false; return; }
  try {
    const r = await fetch(`${backendUrl.value}/api/health`, { method: 'GET', cache: 'no-store' });
    isBackendOnline.value = !!r.ok;
    if (r.ok) hideConnBanner.value = false;
  } catch {
    isBackendOnline.value = false;
  }
}
let probeTimer = null;
onMounted(() => {
  probeBackend();
  probeTimer = setInterval(probeBackend, 10000);
});
onBeforeUnmount(() => { if (probeTimer) clearInterval(probeTimer); });

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Note: collapsing the sidebar on outside click was removed per user request.
const sidebarArea = ref(null);

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
// stable keys for virtualization
watch(() => state.messages, (arr) => {
  arr.forEach((m, i) => { if (!m._vid) m._vid = `${Date.now()}-${i}-${Math.random().toString(36).slice(2,7)}`; });
}, { deep: true, immediate: true });
const estimatedRowHeight = 120; // retained for reference
// In-app search state and filter
const showHelp = ref(false);
const searchQuery = ref('');
const toolbarSearchInput = ref(null)

function clearSearch() {
  searchQuery.value = ''
  try { toolbarSearchInput.value && toolbarSearchInput.value.focus() } catch (e) {}
}
// default to text search only
const searchIndex = ref([]); // array of { idx, ranges: [ [start,end], ... ] }
const searchPos = ref(0);
const searchBusy = ref(false);
// whether the user explicitly requested a search (clicking Search)
const searchRequested = ref(false);
const filteredMessages = ref(state.messages); // deprecated for full-list search
function applySearchFilter() {
  // Mark that this search was explicitly requested by the user so we can auto-jump
  searchRequested.value = true;
  rebuildFilteredMessagesDebounced();
}
// Keep filtered list in sync with loaded chats when no search is active
watch(() => state.messages, (arr) => {
  if (!arr) return;
  const q = (searchQuery.value || '').trim();
  if (!q) filteredMessages.value = arr;
});
let filterTimer = null;
function rebuildFilteredMessagesDebounced() {
  if (filterTimer) clearTimeout(filterTimer);
  filterTimer = setTimeout(rebuildFilteredMessages, 150);
}
function rebuildFilteredMessages() {
  // We no longer hide messages; just rebuild the index/highlights
  searchBusy.value = true;
  buildSearchIndexDebounced();
}
// Build index of match positions in visible messages (debounced to avoid UI freeze)
let buildTimer = null;
function buildSearchIndexDebounced() {
  if (buildTimer) clearTimeout(buildTimer);
  buildTimer = setTimeout(buildSearchIndex, 250);
}
function buildSearchIndex() {
  searchBusy.value = true;
  const q = (searchQuery.value || '').trim();
  searchIndex.value = [];
  searchPos.value = 0;
  if (!q) return;
  const lcq = q.toLowerCase();
  // Only index over filteredMessages to reduce work on large chats
  const list = state.messages;
  // Chunked processing to keep UI responsive
  const batchSize = 300; // messages per chunk
  let i = 0;
  function processBatch() {
    const end = Math.min(i + batchSize, list.length);
    for (; i < end; i++) {
      const msg = list[i];
      const text = getMessageVisibleText(msg) || '';
      const lct = text.toLowerCase();
      let start = 0;
      while (true) {
        const at = lct.indexOf(lcq, start);
        if (at === -1) break;
        // push each occurrence as a separate entry
        searchIndex.value.push({ idx: i, start: at, end: at + q.length });
        start = at + q.length;
        // cap per-message occurrences for performance
        if (start > 100000) break;
      }
    }
    if (i < list.length) {
      setTimeout(processBatch, 0);
    } else {
      searchBusy.value = false;
      if (searchIndex.value.length) {
        searchPos.value = 0;
        // Only auto-jump if it was an explicit user-initiated Search
        if (searchRequested.value) {
          searchRequested.value = false;
          nextTick(scrollToSearchPos);
        }
      }
    }
  }
  setTimeout(processBatch, 0);
}
function nextHit() {
  if (!searchIndex.value.length) return;
  searchPos.value = (searchPos.value + 1) % searchIndex.value.length;
  scrollToSearchPos();
}
function prevHit() {
  if (!searchIndex.value.length) return;
  searchPos.value = (searchPos.value - 1 + searchIndex.value.length) % searchIndex.value.length;
  scrollToSearchPos();
}
function scrollToSearchPos() {
  const entry = searchIndex.value[searchPos.value];
  if (!entry) return;
  // Use full message list; we no longer filter/hide
  const msg = state.messages[entry.idx];
  const vid = msg && msg._vid;
  if (!vid) return;
  // Let DynamicScroller scroll to item by key
  try {
    const el = document.querySelector(`[data-virtual-scroller-item][data-key="${vid}"]`);
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Fallback: coarse scroll by finding the index and using native scrollTop
    if (!el) {
      const idx = state.messages.findIndex(m => m && m._vid === vid);
      if (idx >= 0) {
        const container = document.querySelector('.main');
        if (container && container.scrollTo) container.scrollTo({ top: idx * 120, behavior: 'smooth' });
      }
    }
    // Open the message in edit mode and select the exact occurrence so user can edit immediately
    const globalIdx = entry.idx;
    const visibleText = getMessageVisibleText(state.messages[globalIdx]) || '';
    startEdit(globalIdx, visibleText);
    nextTick(() => {
      const ta = editAreaRefs.value[globalIdx];
      if (ta && typeof entry.start === 'number' && typeof entry.end === 'number') {
        try {
          ta.focus();
          ta.setSelectionRange(entry.start, entry.end);
        } catch {}
      }
    });
  } catch {}
}
const characterList = computed(() => state.characters.map(c => c.name));
const currentSpeaker = ref(""); // <-- Add this line
// Example sequence object for use in your code
const sequence = {
  messages: [],
  characterList: characterList.value,
  get currentSpeaker() { return currentSpeaker.value; }
};
const characterSelections = ref([]);
// Add this line to track the current chat file path
const currentChatPath = ref(null);
// Debounced auto-save when a chat file is already chosen
const autoSaveTimer = ref(null);
watch(state, () => {
  if (!currentChatPath.value) return;
  if (autoSaveTimer.value) clearTimeout(autoSaveTimer.value);
  autoSaveTimer.value = setTimeout(() => {
    autoSaveIfPath();
  }, 1200);
}, { deep: true });
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
        // Use Electron API to load the chat file
        const result = await window.electronAPI.loadChat(file.path);
        if (result.success) {
          const chatData = JSON.parse(result.content);
          importChatJson(chatData);
          currentChatPath.value = file.path; // <-- Add this line
          showToast('Chat imported!');
        } else {
          showToast('Failed to load chat: ' + result.error);
        }
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
async function openChatFile() {
  const result = await window.electronAPI.showOpenDialog({
    title: 'Open chat file',
    filters: [{ name: 'Chat Files', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths || !result.filePaths[0]) return;

  const filePath = result.filePaths[0];
  const loadResult = await window.electronAPI.loadChat(filePath);
  if (loadResult.success) {
    const chatData = JSON.parse(loadResult.content);
    importChatJson(chatData);
    currentChatPath.value = filePath;
    showToast('Chat imported!');
  } else {
    showToast('Failed to load chat: ' + loadResult.error);
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
    // Reset search filters to show messages on new import
    searchQuery.value = '';
    searchIndex.value = [];
    searchPos.value = 0;
    searchBusy.value = false;
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

// Fullscreen toggle
const isFullscreen = ref(false);

// toolbar transparency/blur control (0..100)
const toolbarEffect = ref(40); // default mid transparency

const toolbarInlineStyle = computed(() => {
  // map 0..100 so 0 => opaque (alpha ~0.95), 100 => fully transparent (alpha 0)
  const alpha = Math.max(0, Math.min(0.95, (1 - toolbarEffect.value / 100) * 0.95));
  // map blur to increase with transparency (optional): 0..8px
  const blur = Math.round(toolbarEffect.value / 100 * 8);
  return {
    '--toolbar-alpha': String(alpha),
    '--toolbar-blur': `${blur}px`
  };
});

// Persist toolbarEffect to localStorage and restore on mount
watch(toolbarEffect, (val) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('talk.toolbarEffect', String(val));
    }
  } catch (e) {
    // ignore storage failures
  }
});

onMounted(() => {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('talk.toolbarEffect');
      if (saved !== null) {
        const n = Number(saved);
        if (!Number.isNaN(n)) toolbarEffect.value = n;
      }
    }
  } catch (e) {
    // ignore
  }
});

function updateFullscreenState() {
  if (typeof document !== 'undefined') {
    // consider both document fullscreen and BrowserWindow fullscreen
    const docFs = !!document.fullscreenElement;
    // electronAPI may not exist in non-electron envs
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.getFullscreen) {
      window.electronAPI.getFullscreen().then(winFs => {
        isFullscreen.value = docFs || !!winFs;
      }).catch(() => { isFullscreen.value = docFs; });
    } else {
      isFullscreen.value = docFs;
    }
  }
}

function toggleFullscreen() {
  if (typeof document === 'undefined') return;
  // Prefer to toggle the BrowserWindow fullscreen via Electron when available
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.setFullscreen) {
    // determine desired state: if either document or window is fullscreen, we will exit both; otherwise enter
    const currentlyDocFs = !!document.fullscreenElement;
    window.electronAPI.getFullscreen().then(winFs => {
      const currentlyWinFs = !!winFs;
      const wantEnter = !(currentlyDocFs || currentlyWinFs);
      // If entering, first request document fullscreen if available, then set window fullscreen
      if (wantEnter) {
        const target = document.documentElement;
        if (target && target.requestFullscreen) target.requestFullscreen().catch(()=>{});
        window.electronAPI.setFullscreen(true).catch(()=>{});
      } else {
        // exiting: exit document fullscreen if active, and ask main to clear BrowserWindow fullscreen
        if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});
        window.electronAPI.setFullscreen(false).catch(()=>{});
      }
    }).catch(() => {
      // fallback to document fullscreen only
      if (!document.fullscreenElement) {
        const target = document.documentElement;
        if (target && target.requestFullscreen) target.requestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    });
  } else {
    // Non-electron fallback: toggle document fullscreen
    if (!document.fullscreenElement) {
      const target = document.documentElement;
      if (target && target.requestFullscreen) target.requestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('fullscreenchange', updateFullscreenState);
    updateFullscreenState();
    document.addEventListener('click', handleGlobalClick);
    // listen for BrowserWindow fullscreen events from main via preload
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.onWindowFullscreenChanged) {
      window.electronAPI.onWindowFullscreenChanged((val) => {
        // val is boolean
        updateFullscreenState();
      });
    }
  }
});

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('fullscreenchange', updateFullscreenState);
    document.removeEventListener('click', handleGlobalClick);
  }
});

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
  background: "var(--blur-overlay, rgba(38,46,52,0.4))",
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
const editAreaRefs = ref({});
  // Per-message live edit history (undo/redo inside editor)
  const messageEditHistory = reactive({}); // { [idx]: { stack: string[], pointer: number } }

function setEditAreaRef(el, idx) {
  if (el) {
    editAreaRefs.value[idx] = el;
  }
}
  function ensureEditHistory(idx, initialValue = '') {
    if (!messageEditHistory[idx]) {
      messageEditHistory[idx] = { stack: [initialValue], pointer: 0, lastPushAt: 0 };
    }
  }
  function pushEditHistory(idx, value, force = false) {
    ensureEditHistory(idx, value);
    const hist = messageEditHistory[idx];
    const now = Date.now();
    // Throttle pushes to avoid flooding: 300ms debounce unless forced
    if (!force && now - hist.lastPushAt < 300) {
      hist.stack[hist.pointer] = value;
      return;
    }
    // Drop redo tail
    hist.stack = hist.stack.slice(0, hist.pointer + 1);
    hist.stack.push(value);
    // Cap history length
    if (hist.stack.length > 200) hist.stack.shift();
    hist.pointer = hist.stack.length - 1;
    hist.lastPushAt = now;
  }
  function localUndoEdit(idx) {
    const hist = messageEditHistory[idx];
    if (!hist) return null;
    if (hist.pointer <= 0) return hist.stack[hist.pointer] ?? '';
    hist.pointer -= 1;
    return hist.stack[hist.pointer] ?? '';
  }
  function localRedoEdit(idx) {
    const hist = messageEditHistory[idx];
    if (!hist) return null;
    if (hist.pointer >= hist.stack.length - 1) return hist.stack[hist.pointer] ?? '';
    hist.pointer += 1;
    return hist.stack[hist.pointer] ?? '';
  }
  function onEditInput(idx, e) {
    autoGrow(e);
    pushEditHistory(idx, e.target.value);
  }
  function onEditKeyDown(idx, e) {
    // Ctrl/Cmd + Z / Y (or Shift+Ctrl+Z) inside the textarea should apply local edit undo/redo only
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const ctrl = isMac ? e.metaKey : e.ctrlKey;
    if (!ctrl) return;
    if (e.key.toLowerCase() === 'z') {
      e.preventDefault();
      const val = localUndoEdit(idx);
      if (val !== null && val !== undefined) editContent.value = val;
    } else if (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z')) {
      e.preventDefault();
      const val = localRedoEdit(idx);
      if (val !== null && val !== undefined) editContent.value = val;
    }
  }
  function clickLocalUndo(idx) {
    const val = localUndoEdit(idx);
    if (val !== null && val !== undefined) editContent.value = val;
    const ta = editAreaRefs.value[idx];
    if (ta) nextTick(() => { ta.focus(); });
  }
  function clickLocalRedo(idx) {
    const val = localRedoEdit(idx);
    if (val !== null && val !== undefined) editContent.value = val;
    const ta = editAreaRefs.value[idx];
    if (ta) nextTick(() => { ta.focus(); });
  }
  // UI menus state per message
  const insertMenuOpen = reactive({});
  const guideMenuOpen = reactive({});

  function closeAllMenus(idx) {
    insertMenuOpen[idx] = false;
    guideMenuOpen[idx] = false;
  }
  function toggleInsertMenu(idx) {
    insertMenuOpen[idx] = !insertMenuOpen[idx];
    if (insertMenuOpen[idx]) {
      aiMenuOpen[idx] = false;
      guideMenuOpen[idx] = false;
    }
  }
  function closeInsertMenu(idx) { insertMenuOpen[idx] = false; }
  // AI menu removed
  function toggleGuideMenu(idx) {
    guideMenuOpen[idx] = !guideMenuOpen[idx];
    if (guideMenuOpen[idx]) {
      insertMenuOpen[idx] = false;
      aiMenuOpen[idx] = false;
    }
  }
  function closeGuideMenu(idx) { guideMenuOpen[idx] = false; }

  // Toggle message text direction
  function toggleMessageDirection(idx) {
    const msg = state.messages[idx];
    if (!msg) return;
    const next = (msg.direction || 'ltr') === 'ltr' ? 'rtl' : 'ltr';
    msg.direction = next;
    pushUndo();
  }

  // Per-message undo/redo using versions
  function messageUndo(idx) {
    const msg = state.messages[idx];
    if (!msg || !msg.versions) return;
    const cur = msg.currentVersionIdx ?? 0;
    if (cur <= 0) return;
    msg.currentVersionIdx = cur - 1;
    msg.content = msg.versions[msg.currentVersionIdx].content;
    msg.direction = msg.versions[msg.currentVersionIdx].direction || 'ltr';
  }
  function messageRedo(idx) {
    const msg = state.messages[idx];
    if (!msg || !msg.versions) return;
    const cur = msg.currentVersionIdx ?? 0;
    if (cur >= msg.versions.length - 1) return;
    msg.currentVersionIdx = cur + 1;
    msg.content = msg.versions[msg.currentVersionIdx].content;
    msg.direction = msg.versions[msg.currentVersionIdx].direction || 'ltr';
  }

  // Click-away handler to close all open menus when clicking outside
  function closeAllMenusAll() {
    // Close for every visible message index to be safe
    state.messages.forEach((_, i) => {
      insertMenuOpen[i] = false;
      // aiMenuOpen removed
      guideMenuOpen[i] = false;
    });
  }
  function handleGlobalClick(e) {
    const target = e.target;
    // If click is inside any menu or its trigger button, do nothing
    const withinMenu = target && (target.closest && (target.closest('.menu-popover') || target.closest('.btn-with-menu')));
    if (!withinMenu) {
      closeAllMenusAll();
    }
  }
function startEdit(idx, content) {
  editIdx.value = idx;
  editContent.value = content;
  editDirection.value = state.messages[idx].direction || 'ltr';
    // initialize local edit history with current content
    ensureEditHistory(idx, content || '');
  nextTick(() => {
    const ta = editAreaRefs.value[idx];
    if (ta) {
      ta.focus();
      nextTick(() => {
        autoGrow({ target: ta });
      });
    }
  });
}
async function saveEdit(idx) {
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
    // reset local edit history for this index after save
    delete messageEditHistory[idx];
  if (justInsertedIdx.value === idx) justInsertedIdx.value = null;
  await exportChatJson();
}
function cancelEdit() {
  if (justInsertedIdx.value === editIdx.value) justInsertedIdx.value = null;
    editIdx.value = null;
  editContent.value = "";
    // discard local edit history
    if (typeof editIdx.value === 'number') delete messageEditHistory[editIdx.value];
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
  // Inherit direction from the message at afterIdx if it exists, else fallback to layout
  let inheritDirection = 'ltr';
  if (typeof afterIdx === 'number' && state.messages[afterIdx] && state.messages[afterIdx].direction) {
    inheritDirection = state.messages[afterIdx].direction;
  } else if (state.layout && state.layout.portraitShape === 'RTL') {
    inheritDirection = 'rtl';
  }
  const newMsg = {
    speaker,
    content: "",
    media: null,
    direction: inheritDirection,
    versions: [{ content: "", direction: inheritDirection }],
    currentVersionIdx: 0
  };
  state.messages.splice(afterIdx + 1, 0, newMsg);
  if (autoScroll.value) nextTick(scrollToBottom);
  editIdx.value = afterIdx + 1;
  justInsertedIdx.value = afterIdx + 1;
  editContent.value = "";
  editDirection.value = newMsg.direction; // <-- ensure editDirection is set
  nextTick(() => {
    const ta = editAreaRefs.value[afterIdx + 1];
    if (ta) ta.focus();
  });
    // initialize local edit history for new message
    ensureEditHistory(afterIdx + 1, "");
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
    const ta = editAreaRefs.value[editIdx.value];
    if (ta) ta.focus();
});
    // initialize local edit history for new message
    ensureEditHistory(editIdx.value, "");
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
    .replace(/\n/g, '<br>')
    .replace(/\u0001/g, '<mark>')
    .replace(/\u0002/g, '</mark>');
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

// Highlight current search query in message text, preserving existing inline formatting
function highlightSearch(text, qref) {
  const q = (qref && qref.value ? qref.value : '').trim();
  if (!text || !q) return text;
  try {
    // Use sentinel tokens so escaping in formatText won't break highlights
    const START = '\u0001';
    const END = '\u0002';
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return text.replace(re, (m) => `${START}${m}${END}`);
  } catch {
    return text;
  }
}

// Helper: get the text that is actually visible for a message
function getMessageVisibleText(msg) {
  if (!msg) return '';
  // If versions exist, use the current visible version content, else fallback to msg.content
  if (msg.versions && typeof msg.currentVersionIdx === 'number' && msg.versions[msg.currentVersionIdx]) {
    return msg.versions[msg.currentVersionIdx].content || '';
  }
  return msg.content || '';
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
async function exportChatJson() {
  const data = {
    chatTitle: state.chatTitle,
    characters: state.characters,
    messages: state.messages,
    layout: state.layout,
    colors: state.colors,
    aiPreset: aiPreset,
    bgImage: bgImage.value
  };

  // If we have a path, save directly
  if (currentChatPath.value) {
    const result = await window.electronAPI.saveChat(currentChatPath.value, JSON.stringify(data, null, 2));
    if (result && result.success === false) {
      showToast('Error saving: ' + result.error);
    } else {
      showToast('Chat saved!');
    }
    return;
  }

  // Otherwise, show save dialog
  const { filePath } = await window.electronAPI.showSaveDialog();
  if (filePath) {
    currentChatPath.value = filePath;
    const result = await window.electronAPI.saveChat(filePath, JSON.stringify(data, null, 2));
    if (result && result.success === false) {
      showToast('Error saving: ' + result.error);
    } else {
      showToast('Chat saved!');
    }
  }
}
// Save silently only if we already have a chosen path
async function autoSaveIfPath() {
  const data = {
    chatTitle: state.chatTitle,
    characters: state.characters,
    messages: state.messages,
    layout: state.layout,
    colors: state.colors,
    aiPreset: aiPreset,
    bgImage: bgImage.value
  };
  if (!currentChatPath.value) return;
  const result = await window.electronAPI.saveChat(currentChatPath.value, JSON.stringify(data, null, 2));
  if (result && result.success === false) {
    showToast('Error saving: ' + result.error);
  }
}
async function saveChatAs() {
  const data = {
    chatTitle: state.chatTitle,
    characters: state.characters,
    messages: state.messages,
    layout: state.layout,
    colors: state.colors,
    aiPreset: aiPreset,
    bgImage: bgImage.value
  };
  const { filePath } = await window.electronAPI.showSaveDialog();
  if (filePath) {
    currentChatPath.value = filePath;
    const result = await window.electronAPI.saveChat(filePath, JSON.stringify(data, null, 2));
    if (result && result.success === false) {
      showToast('Error saving: ' + result.error);
    } else {
      showToast('Chat saved!');
    }
  }
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

  // Character reordering (updates avatars immediately due to v-for order)
  function moveCharacterUp(idx) {
    if (idx <= 0) return;
    pushUndo();
    const temp = state.characters[idx - 1];
    state.characters[idx - 1] = state.characters[idx];
    state.characters[idx] = temp;
  }
  function moveCharacterDown(idx) {
    if (idx >= state.characters.length - 1) return;
    pushUndo();
    const temp = state.characters[idx + 1];
    state.characters[idx + 1] = state.characters[idx];
    state.characters[idx] = temp;
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
  // style.textAlign = 'center'; // Remove forced center
  return style;
}

// Helper to get character style for message content
function characterMessageStyle(speaker) {
  const char = findChar(speaker);
  let style = {};
  if (char && char.role === 'character') {
    if (char.fontStyle) {
      if (char.fontStyle.bold) style.fontWeight = 'bold';
      if (char.fontStyle.italic) style.fontStyle = 'italic';
      if (char.fontStyle.underline) style.textDecoration = 'underline';
    }
    if (char.fontColor) style.color = char.fontColor;
    if (char.fontFamily) style.fontFamily = char.fontFamily;
  }
  style.fontSize = state.layout.fontSize + 'px';
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
  const now = new Date();
  const dateStr = now.toISOString().slice(0,10);
  const timeStr = now.toTimeString().slice(0,8).replace(/:/g, '-');
  const safeTitle = (state.chatTitle || "chat").replace(/[\\/:*?"<>|]/g, '_');
  a.download = `${safeTitle}_${dateStr}_${timeStr}.txt`;
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
    const now = new Date();
    const dateStr = now.toISOString().slice(0,10);
    const timeStr = now.toTimeString().slice(0,8).replace(/:/g, '-');
    const safeTitle = (state.chatTitle || "chat").replace(/[\\/:*?"<>|]/g, '_');
    a.download = `${safeTitle}_${dateStr}_${timeStr}.docx`;
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
  // Client-side macro replacement
  clientSideMacroReplacement: false,
  // Instruct sequences (vendor mapping)
  inputSequence: '',
  outputSequence: '',
  firstInputSequence: '',
  lastInputSequence: '',
  systemSequence: '',
  firstOutputSequence: '',
  lastOutputSequence: '',
  systemSequencePrefix: '',
  systemSequenceSuffix: '',
  inputSuffix: '',
  outputSuffix: '',
  systemSuffix: '',
  wrapSequences: false,
  namesForceGroups: false,
  // Context options (vendor mapping)
  useStopStrings: false,
  allowJailbreak: false,
  alwaysForceName2: false,
  // Sampling (advanced)
  typicalP: 1,
  tfs: 1,
  topA: 0,
  epsilonCutoff: 0,
  etaCutoff: 0,
  encoderRepetitionPenalty: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  penaltyAlpha: 0,
  // Length & beams
  maxLength: 0,
  minLength: 0,
  numBeams: 1,
  lengthPenalty: 1,
  earlyStopping: false,
  // Dynamic temperature
  dynatemp: false,
  minTemp: 0.5,
  maxTemp: 3,
  dynatempExponent: 5.77,
  // Dryness controls
  dryAllowedLength: 0,
  dryMultiplier: 0,
  dryBase: 0,
  drySequenceBreakers: '[]',
  dryPenaltyLastN: 0,
  // Special toggles
  add_bos_token: true,
  ban_eos_token: false,
  ignore_eos_token: false,
  skip_special_tokens: false,
  spaces_between_special_tokens: false,
  speculative_ngram: false,
  // Guidance/grammar/schema
  guidanceScale: 1,
  negativePrompt: '',
  grammarString: '',
  jsonSchema: '{}',
  // Sampler config (store as JSON strings for now)
  samplerPriority: '[]',
  samplers: '[]',
  samplersPriorities: '[]',
  samplerOrder: '[]',
  logitBias: '[]',
  // Raw vendor blob for round-trip
  _vendor: null,
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

function applyMacros(template, speaker, history, memory) {
  try {
    const user = state.characters.find(c => c.typeLabel === 'U')?.name || 'User';
    const character = speaker || '';
    const replacements = {
      '{{user}}': user,
      '{{character}}': character,
      '{{history}}': history || '',
      '{{memory}}': memory || '',
      '{{instructions}}': '',
    };
    let out = String(template);
    for (const [k, v] of Object.entries(replacements)) {
      out = out.split(k).join(v);
    }
    return out;
  } catch {
    return template;
  }
}
// --- LLM GENERATION INTEGRATION ---
async function generateMessageForCharacter(speaker, idx, onDone, isRetry = false, guidance = '', addAsNew = true) {
  console.log('generateMessageForCharacter called with:', speaker, idx);
  if (isGenerating.value) return;

  isGenerating.value = true;
  abortController.value = new AbortController();

  try {
    // 1. Build character list with new format
    let charNames = state.characters.map(c => `<${c.name}>`).join(', ');
    const history = getCompressedHistory(state.messages.slice(0, idx + 1), { windowSize: 12, maxChars: 4000 });
    const preset = getAIPresetConfig();
    let prompt = '';

    // Scenario + Memory blocks
    const scenarioBlock = getScenarioSummary(chatId.value, 900);
    // retrieve memories most relevant to the recent history for the current speaker
    const memMap = retrieveMemories(chatId.value, [speaker], history, 6);
    const speakerMems = memMap[speaker] || [];

    if (aiPreset.alwaysAddCharNames && state.characters.length) {
      prompt += `[Characters]\n${charNames}\n\n`;
    }
    prompt += `[Scenario Summary]\n${scenarioBlock || 'N/A'}\n\n`;
    if (speakerMems.length) {
      prompt += `[Character Memory for ${speaker}]\n${speakerMems.join('\n')}\n\n`;
    }
    const char = state.characters.find(c => c.name === speaker);
    if (char) {
      if (char.personaCard) {
        prompt += `[Persona Card for ${char.name}]\n${JSON.stringify(char.personaCard, null, 2)}\n\n`;
      } else {
        prompt += `[Persona Card for ${char.name}]\nNo persona card imported.\n\n`;
      }
      if (char.characterCard) {
        prompt += `[Character Card for ${char.name}]\n${JSON.stringify(char.characterCard, null, 2)}\n\n`;
      } else {
        prompt += `[Character Card for ${char.name}]\nNo character card imported.\n\n`;
      }
    }
    if (preset.systemPrompt) {
      const sys = aiPreset.clientSideMacroReplacement ? applyMacros(preset.systemPrompt, speaker, history, preset.textMemory) : preset.systemPrompt;
      prompt += `[System]\n${sys}\n\n`;
    }
    if (preset.contextTemplate) {
      const ctx = aiPreset.clientSideMacroReplacement ? applyMacros(preset.contextTemplate, speaker, history, preset.textMemory) : preset.contextTemplate;
      prompt += `[Context]\n${ctx}\n\n`;
    }
    if (preset.instructTemplate) {
      const inst = aiPreset.clientSideMacroReplacement ? applyMacros(preset.instructTemplate, speaker, history, preset.textMemory) : preset.instructTemplate;
      prompt += `[Instruct]\n${inst}\n\n`;
    }
    if (preset.textMemory) {
      prompt += `[Memory]\n${preset.textMemory}\n\n`;
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
    // One-off guidance for this action
    if (guidance && guidance.trim()) {
      prompt += `[Instruction]\n${guidance.trim()}\n\n`;
    }
    // 3. Add history and next speaker in new format
    prompt += history + `\n<${speaker}>:`;

    let banned_tokens = [];
    if (preset.multiLineBannedToken && preset.multiLineBannedToken.trim()) {
      banned_tokens = preset.multiLineBannedToken.split(',').map(t => t.trim()).filter(Boolean);
    }

    // Always stream into the text area for all actions
    let msgRef;
    if (isRetry || !addAsNew) {
      msgRef = state.messages[idx];
      msgRef.content = "";
      msgRef.streaming = true;
    } else {
      pushUndo();
      const newMsg = {
        speaker,
        content: '',
        media: null,
        direction: isRTL.value ? 'rtl' : 'ltr',
        streaming: true
      };
      if (autoScroll.value) nextTick(scrollToBottom);
      state.messages.splice(idx + 1, 0, newMsg);
      msgRef = state.messages[idx + 1];
    }

    // Build stop sequences: all character names except the current speaker
    const stopSequences = state.characters
      .filter(c => c.name !== speaker)
      .map(c => `<${c.name}>:`);

    const response = await fetch(`${backendUrl.value}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGenerationRequestBody({ prompt, stopSequences })),
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
    let result = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });

      result += chunk;
      msgRef.content += chunk; // Append chunk as it arrives
      if (onDone) onDone(msgRef.content, msgRef.direction || "ltr");
    }
    // --- TRIM THE FINAL MESSAGE ---
    msgRef.content = msgRef.content.trim();
    msgRef.streaming = false;
    if (onDone) onDone(msgRef.content, msgRef.direction || "ltr");
  } catch (err) {
    if (err.name === 'AbortError') {
      showToast('Generation stopped.');
    } else if (err.message && err.message.includes('Failed to fetch')) {
      showToast('Could not connect to the server. Please check your internet or server status.');
    } else {
      showToast('An unexpected error occurred.');
      console.error(err);
    }
  } finally {
    isGenerating.value = false;
    abortController.value = null;
  }
}

  function retryGenerateMessage(idx, guidance = '') {
  const msg = state.messages[idx];
  if (!msg) return;
  const char = state.characters.find(c => c.name === msg.speaker);
  if (!char) {
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
  msg.streaming = true;

  // Stream new LLM response into this version
  generateMessageForCharacter(char.name, idx, (newContent, newDirection) => {
    // Update the version and visible content as tokens stream in
    msg.versions[msg.currentVersionIdx].content = newContent;
    msg.versions[msg.currentVersionIdx].direction = newDirection || "ltr";
    msg.content = newContent;
    msg.direction = newDirection || "ltr";
  }, true, guidance, false); // isRetry + replace in-place
}

// Construct request body for backend from aiPreset
function buildGenerationRequestBody({ prompt, stopSequences }) {
  const body = {
    prompt,
    max_tokens: aiPreset.responseTokens || 256,
    stream: true,
    stop_sequences: stopSequences,
    // Core sampling
    temperature: aiPreset.temperature,
    top_p: aiPreset.topP,
    top_k: aiPreset.topK,
    min_p: aiPreset.minP,
    // Advanced sampling
    typical_p: aiPreset.typicalP,
    tfs: aiPreset.tfs,
    top_a: aiPreset.topA,
    epsilon_cutoff: aiPreset.epsilonCutoff,
    eta_cutoff: aiPreset.etaCutoff,
    // Penalties
    repetition_penalty: aiPreset.repetitionPenalty,
    repetition_penalty_range: aiPreset.repetitionPenaltyRange,
    encoder_rep_pen: aiPreset.encoderRepetitionPenalty,
    freq_pen: aiPreset.frequencyPenalty,
    presence_pen: aiPreset.presencePenalty,
    penalty_alpha: aiPreset.penaltyAlpha,
    // Length & beams
    max_length: aiPreset.maxLength,
    min_length: aiPreset.minLength,
    num_beams: aiPreset.numBeams,
    length_penalty: aiPreset.lengthPenalty,
    early_stopping: aiPreset.earlyStopping,
    // Dynamic temperature
    dynatemp: aiPreset.dynatemp,
    min_temp: aiPreset.minTemp,
    max_temp: aiPreset.maxTemp,
    dynatemp_exponent: aiPreset.dynatempExponent,
    // Dryness controls
    dry_allowed_length: aiPreset.dryAllowedLength,
    dry_multiplier: aiPreset.dryMultiplier,
    dry_base: aiPreset.dryBase,
    dry_sequence_breakers: safeParseJson(aiPreset.drySequenceBreakers, []),
    dry_penalty_last_n: aiPreset.dryPenaltyLastN,
    // Special toggles
    add_bos_token: !!aiPreset.add_bos_token,
    ban_eos_token: !!aiPreset.ban_eos_token,
    ignore_eos_token: !!aiPreset.ignore_eos_token,
    skip_special_tokens: !!aiPreset.skip_special_tokens,
    spaces_between_special_tokens: !!aiPreset.spaces_between_special_tokens,
    speculative_ngram: !!aiPreset.speculative_ngram,
    // Guidance/grammar/schema
    guidance_scale: aiPreset.guidanceScale,
    negative_prompt: aiPreset.negativePrompt,
    grammar_string: aiPreset.grammarString,
    json_schema: safeParseJson(aiPreset.jsonSchema, {}),
    // Samplers (leave as-is if JSON parse fails)
    sampler_priority: safeParseJson(aiPreset.samplerPriority, undefined),
    samplers: safeParseJson(aiPreset.samplers, undefined),
    samplers_priorities: safeParseJson(aiPreset.samplersPriorities, undefined),
    sampler_order: safeParseJson(aiPreset.samplerOrder, undefined),
    logit_bias: safeParseJson(aiPreset.logitBias, undefined)
  };
  // Remove undefined to keep payload tidy
  Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);
  return body;
}

function safeParseJson(src, fallback) {
  try {
    if (typeof src === 'string') return JSON.parse(src);
    return src ?? fallback;
  } catch { return fallback; }
}
// --- Guided features state and handlers ---
const guidanceInputs = reactive({}); // per-message guidance text buffer
  const guidanceModal = reactive({ open: false, idx: null, text: '', character: null, mode: 'apply' });

function openGuidanceModal(idx) {
    guidanceModal.idx = idx;
    guidanceModal.text = guidanceInputs[idx] || '';
    guidanceModal.character = null;
    guidanceModal.mode = 'apply';
    guidanceModal.open = true;
}
function closeGuidanceModal() {
  guidanceModal.open = false;
}
function applyGuidanceModal() {
    if (guidanceModal.idx === null || guidanceModal.idx === undefined) return;
    const idx = guidanceModal.idx;
    const text = (guidanceModal.text || '').trim();
    guidanceInputs[idx] = text;
    // Execute based on mode
    if (guidanceModal.mode === 'swipe') {
      onGuidedSwipe(idx);
    } else if (guidanceModal.mode === 'continue') {
      onGuidedContinue(idx);
    } else if (guidanceModal.mode === 'corrections') {
      onCorrections(idx);
    } else {
      // Default apply: guided response for selected character or message speaker
      const charName = guidanceModal.character || state.messages[idx]?.speaker;
      if (charName) onGuidedResponse(charName, idx);
    }
    closeGuidanceModal();
}
  function openGuidanceForCharacter(idx, charName) {
    guidanceModal.idx = idx;
    guidanceModal.text = guidanceInputs[idx] || '';
    guidanceModal.character = charName;
    guidanceModal.mode = 'apply';
    guidanceModal.open = true;
    closeGuideMenu(idx);
  }

// Guided Response: generate next message for selected character using guidance
function onGuidedResponse(speaker, idx) {
  const g = (guidanceInputs[idx] || '').trim();
  if (!g) { showToast('Enter guidance first.'); return; }
  // Replace current message instead of adding a new box
  generateMessageForCharacter(speaker, idx, null, true, g, false);
  guidanceInputs[idx] = '';
}

// Guided Swipe: retry current message with guidance
function onGuidedSwipe(idx) {
  const g = (guidanceInputs[idx] || '').trim();
  if (!g) { showToast('Enter guidance first.'); return; }
  retryGenerateMessage(idx, g);
  guidanceInputs[idx] = '';
}

// Stream continuation into the same message (append)
async function generateContinuationForMessage(speaker, idx, guidance = '') {
  const msgRef = state.messages[idx];
  if (!msgRef) return;

  if (isGenerating.value) return;
  isGenerating.value = true;
  abortController.value = new AbortController();

  try {
    // Build preamble similar to generateMessageForCharacter
    let charNames = state.characters.map(c => `<${c.name}>`).join(', ');
    const history = getCompressedHistory(state.messages.slice(0, idx + 1), { windowSize: 12, maxChars: 4000 });
    const preset = getAIPresetConfig();
    let prompt = '';

    const scenarioBlock = getScenarioSummary(chatId.value, 900);
    const memMap = retrieveMemories(chatId.value, [speaker], history, 6);
    const speakerMems = memMap[speaker] || [];

    if (aiPreset.alwaysAddCharNames && state.characters.length) {
      prompt += `[Characters]\n${charNames}\n\n`;
    }
    prompt += `[Scenario Summary]\n${scenarioBlock || 'N/A'}\n\n`;
    if (speakerMems.length) {
      prompt += `[Character Memory for ${speaker}]\n${speakerMems.join('\n')}\n\n`;
    }
    const char = state.characters.find(c => c.name === speaker);
    if (char) {
      if (char.personaCard) {
        prompt += `[Persona Card for ${char.name}]\n${JSON.stringify(char.personaCard, null, 2)}\n\n`;
      } else {
        prompt += `[Persona Card for ${char.name}]\nNo persona card imported.\n\n`;
      }
      if (char.characterCard) {
        prompt += `[Character Card for ${char.name}]\n${JSON.stringify(char.characterCard, null, 2)}\n\n`;
      } else {
        prompt += `[Character Card for ${char.name}]\nNo character card imported.\n\n`;
      }
    }
    if (preset.systemPrompt) {
      const sys = aiPreset.clientSideMacroReplacement ? applyMacros(preset.systemPrompt, speaker, history, preset.textMemory) : preset.systemPrompt;
      prompt += `[System]\n${sys}\n\n`;
    }
    if (preset.contextTemplate) {
      const ctx = aiPreset.clientSideMacroReplacement ? applyMacros(preset.contextTemplate, speaker, history, preset.textMemory) : preset.contextTemplate;
      prompt += `[Context]\n${ctx}\n\n`;
    }
    if (preset.instructTemplate) {
      const inst = aiPreset.clientSideMacroReplacement ? applyMacros(preset.instructTemplate, speaker, history, preset.textMemory) : preset.instructTemplate;
      prompt += `[Instruct]\n${inst}\n\n`;
    }
    if (preset.textMemory) prompt += `[Memory]\n${preset.textMemory}\n\n`;
    if (aiPreset.postHistoryInstructions) prompt += `[Post-History Instructions]\n${aiPreset.postHistoryInstructions}\n\n`;
    if (aiPreset.generateonlyonelineperrequest) prompt += "[Instruction]\nGenerate only one line per request.\n\n";
    if (aiPreset.collapseconsecutivenewlines) prompt += "[Instruction]\nCollapse consecutive newlines in the output.\n\n";
    if (aiPreset.trimspaces) prompt += "[Instruction]\nTrim spaces from the output.\n\n";
    if (aiPreset.trimincompletesentences) prompt += "[Instruction]\nTrim incomplete sentences from the output.\n\n";
    if (aiPreset.separatorsasstopstrings) prompt += "[Instruction]\nTreat separators as stop strings.\n\n";
    if (aiPreset.namesasstopstrings) prompt += "[Instruction]\nTreat character names as stop strings.\n\n";
    if (aiPreset.activationRegex) prompt += `[Activation Regex]\n${aiPreset.activationRegex}\n\n`;
    if (aiPreset.wrapSequencesWithNewline) prompt += "[Instruction]\nWrap sequences with newline.\n\n";
    if (aiPreset.replaceMacroInSequences) prompt += "[Instruction]\nReplace macro in sequences.\n\n";
    if (aiPreset.skipExampleDialoguesFormatting) prompt += "[Instruction]\nSkip example dialogues formatting.\n\n";
    if (aiPreset.includeNames) prompt += `[Include Names]\n${aiPreset.includeNames}\n\n`;
    if (aiPreset.userMessagePrefix) prompt += `[User Message Prefix]\n${aiPreset.userMessagePrefix}\n\n`;
    if (aiPreset.userMessageSuffix) prompt += `[User Message Suffix]\n${aiPreset.userMessageSuffix}\n\n`;
    if (aiPreset.assistantMessagePrefix) prompt += `[Assistant Message Prefix]\n${aiPreset.assistantMessagePrefix}\n\n`;
    if (aiPreset.assistantMessageSuffix) prompt += `[Assistant Message Suffix]\n${aiPreset.assistantMessageSuffix}\n\n`;
    if (aiPreset.systemMessagePrefix) prompt += `[System Message Prefix]\n${aiPreset.systemMessagePrefix}\n\n`;
    if (aiPreset.systemMessageSuffix) prompt += `[System Message Suffix]\n${aiPreset.systemMessageSuffix}\n\n`;
    if (aiPreset.systemSameAsUser) prompt += `[System Same as User]\ntrue\n\n`;
    if (aiPreset.systemPromptPrefix) prompt += `[System Prompt Prefix]\n${aiPreset.systemPromptPrefix}\n\n`;
    if (aiPreset.systemPromptSuffix) prompt += `[System Prompt Suffix]\n${aiPreset.systemPromptSuffix}\n\n`;
    if (aiPreset.firstAssistantPrefix) prompt += `[First Assistant Prefix]\n${aiPreset.firstAssistantPrefix}\n\n`;
    if (aiPreset.lastAssistantPrefix) prompt += `[Last Assistant Prefix]\n${aiPreset.lastAssistantPrefix}\n\n`;
    if (aiPreset.firstUserPrefix) prompt += `[First User Prefix]\n${aiPreset.firstUserPrefix}\n\n`;
    if (aiPreset.lastUserPrefix) prompt += `[Last User Prefix]\n${aiPreset.lastUserPrefix}\n\n`;
    if (aiPreset.systemInstructionPrefix) prompt += `[System Instruction Prefix]\n${aiPreset.systemInstructionPrefix}\n\n`;
    if (aiPreset.stopSequence) prompt += `[Stop Sequence]\n${aiPreset.stopSequence}\n\n`;
    if (aiPreset.userFillerMessage) prompt += `[User Filler Message]\n${aiPreset.userFillerMessage}\n\n`;
    if (aiPreset.exampleSeparator) prompt += `[Example Separator]\n${aiPreset.exampleSeparator}\n\n`;
    if (aiPreset.chatStart) prompt += `[Chat Start]\n${aiPreset.chatStart}\n\n`;
    if (aiPreset.jsonArrayOfStrings) prompt += `[JSON Array of Strings]\n${aiPreset.jsonArrayOfStrings}\n\n`;
    if (aiPreset.replaceMacroInStopStrings) prompt += "[Instruction]\nReplace macro in stop strings.\n\n";
    // add continuation guidance
    if (guidance && guidance.trim()) {
      prompt += `[Instruction]\nContinue the current message. ${guidance.trim()}\n\n`;
    } else {
      prompt += `[Instruction]\nContinue the current message.\n\n`;
    }
    prompt += history + `\n<${speaker}>:`;

    const stopSequences = state.characters
      .filter(c => c.name !== speaker)
      .map(c => `<${c.name}>:`);

    const response = await fetch(`${backendUrl.value}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGenerationRequestBody({ prompt, stopSequences })),
      signal: abortController.value.signal
    });

    if (!response.body || typeof response.body.getReader !== 'function') {
      const data = await response.json();
      const txt = data.results?.[0]?.text?.trim() || '';
      if (txt) msgRef.content = (msgRef.content || '') + txt;
      showToast('Message updated.');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      msgRef.content += chunk; // stream into text area
    }
    msgRef.content = (msgRef.content || '').trim();
    msgRef.streaming = false;
  } catch (err) {
    if (err.name === 'AbortError') {
      showToast('Generation stopped.');
    } else if (err.message && err.message.includes('Failed to fetch')) {
      showToast('Could not connect to the server. Please check your internet or server status.');
    } else {
      showToast('An unexpected error occurred.');
      console.error(err);
    }
  } finally {
    isGenerating.value = false;
    abortController.value = null;
  }
}

function onGuidedContinue(idx) {
  const msg = state.messages[idx];
  if (!msg) return;
  const g = (guidanceInputs[idx] || '').trim();
  msg.extra = msg.extra || {};
  if (msg.extra.originalForGuidedContinue === undefined) {
    msg.extra.originalForGuidedContinue = msg.content || '';
  }
  const before = msg.content || '';
  generateContinuationForMessage(msg.speaker, idx, g).then(() => {
    const after = msg.content || '';
    msg.extra.lastGuidedAddition = after.startsWith(before) ? after.slice(before.length) : '';
    guidanceInputs[idx] = '';
  });
}

function undoLastGuidedAddition(idx) {
  const msg = state.messages[idx];
  if (!msg?.extra?.lastGuidedAddition) return;
  const add = msg.extra.lastGuidedAddition;
  msg.content = (msg.content || '').slice(0, -add.length);
  delete msg.extra.lastGuidedAddition;
}

function revertToOriginalGuidedContinue(idx) {
  const msg = state.messages[idx];
  if (!msg?.extra?.originalForGuidedContinue) return;
  msg.content = msg.extra.originalForGuidedContinue;
  delete msg.extra.originalForGuidedContinue;
  delete msg.extra.lastGuidedAddition;
}

// Corrections: rewrite message with instruction; default current version; Alt-click = original
async function onCorrections(idx, event) {
  const msg = state.messages[idx];
  if (!msg) return;
  const g = (guidanceInputs[idx] || '').trim();
  if (!g) { showToast('Enter correction instruction first.'); return; }

  const useOriginal = !!(event && event.altKey);
  const sourceText = useOriginal
    ? (msg.versions?.[0]?.content ?? msg.content)
    : (msg.versions?.[msg.currentVersionIdx ?? 0]?.content ?? msg.content);

  // Prepare versioning like retry
  if (!msg.versions) {
    msg.versions = [{ content: msg.content, direction: msg.direction || 'ltr' }];
    msg.currentVersionIdx = 0;
  }
  msg.versions = msg.versions.slice(0, (msg.currentVersionIdx ?? 0) + 1);
  msg.versions.push({ content: '', direction: msg.direction || 'ltr' });
  msg.currentVersionIdx = msg.versions.length - 1;
  msg.content = '';

  const speaker = msg.speaker;
  let charNames = state.characters.map(c => `<${c.name}>`).join(', ');
  const history = getCompressedHistory(state.messages.slice(0, idx), { windowSize: 12, maxChars: 4000 });
  const preset = getAIPresetConfig();
  let prompt = '';

  const scenarioBlock = getScenarioSummary(chatId.value, 900);
  const memMap = retrieveMemories(chatId.value, [speaker], history, 6);
  const speakerMems = memMap[speaker] || [];

  if (aiPreset.alwaysAddCharNames && state.characters.length) prompt += `[Characters]\n${charNames}\n\n`;
  prompt += `[Scenario Summary]\n${scenarioBlock || 'N/A'}\n\n`;
  if (speakerMems.length) prompt += `[Character Memory for ${speaker}]\n${speakerMems.join('\n')}\n\n`;
  const char = state.characters.find(c => c.name === speaker);
  if (char) {
    if (char.personaCard) prompt += `[Persona Card for ${char.name}]\n${JSON.stringify(char.personaCard, null, 2)}\n\n`;
    else prompt += `[Persona Card for ${char.name}]\nNo persona card imported.\n\n`;
    if (char.characterCard) prompt += `[Character Card for ${char.name}]\n${JSON.stringify(char.characterCard, null, 2)}\n\n`;
    else prompt += `[Character Card for ${char.name}]\nNo character card imported.\n\n`;
  }
  if (preset.systemPrompt) {
    const sys = aiPreset.clientSideMacroReplacement ? applyMacros(preset.systemPrompt, speaker, history, preset.textMemory) : preset.systemPrompt;
    prompt += `[System]\n${sys}\n\n`;
  }
  if (preset.contextTemplate) {
    const ctx = aiPreset.clientSideMacroReplacement ? applyMacros(preset.contextTemplate, speaker, history, preset.textMemory) : preset.contextTemplate;
    prompt += `[Context]\n${ctx}\n\n`;
  }
  if (preset.instructTemplate) {
    const inst = aiPreset.clientSideMacroReplacement ? applyMacros(preset.instructTemplate, speaker, history, preset.textMemory) : preset.instructTemplate;
    prompt += `[Instruct]\n${inst}\n\n`;
  }
  if (preset.textMemory) prompt += `[Memory]\n${preset.textMemory}\n\n`;
  if (aiPreset.postHistoryInstructions) prompt += `[Post-History Instructions]\n${aiPreset.postHistoryInstructions}\n\n`;
  prompt += `[MessageToRework]\n${(sourceText || '').trim()}\n\n`;
  prompt += `[Instruction]\nRewrite the message to reflect: ${g}\nOnly make the requested changes.\n\n`;
  prompt += history + `\n<${speaker}>:`;

  try {
    isGenerating.value = true;
    abortController.value = new AbortController();

    const stopSequences = state.characters
      .filter(c => c.name !== speaker)
      .map(c => `<${c.name}>:`);

    const response = await fetch(`${backendUrl.value}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGenerationRequestBody({ prompt, stopSequences })),
      signal: abortController.value.signal
    });

    if (!response.body || typeof response.body.getReader !== 'function') {
      const data = await response.json();
      const txt = data.results?.[0]?.text?.trim() || '';
      msg.versions[msg.currentVersionIdx].content = txt;
      msg.content = txt;
      showToast('Corrections applied.');
      guidanceInputs[idx] = '';
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      // stream into both version and visible message
      msg.versions[msg.currentVersionIdx].content += chunk;
      msg.content += chunk;
    }
    msg.streaming = false;
    msg.streaming = false;
    msg.versions[msg.currentVersionIdx].content = msg.versions[msg.currentVersionIdx].content.trim();
    msg.content = (msg.content || '').trim();
    guidanceInputs[idx] = '';
  } catch (err) {
    if (err.name === 'AbortError') {
      showToast('Generation stopped.');
    } else if (err.message && err.message.includes('Failed to fetch')) {
      showToast('Could not connect to the server. Please check your internet or server status.');
    } else {
      showToast('An unexpected error occurred.');
      console.error(err);
    }
  } finally {
    isGenerating.value = false;
    abortController.value = null;
  }
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
  // Disassociate from any file first to prevent auto-save overwriting an existing file
  if (autoSaveTimer.value) clearTimeout(autoSaveTimer.value);
  currentChatPath.value = null;

  // Close the confirmation modal
  closeChatPrompt.value = false;

  // Clear in-memory chat data (closes the chat in UI without touching any file)
  state.chatTitle = '';
  state.characters = [];
  state.messages = [];
  state.layout = { ...defaultLayout };
  state.colors = { ...defaultColors };

  // Reset search state completely on close
  searchQuery.value = '';
  searchIndex.value = [];
  searchPos.value = 0;
  searchBusy.value = false;

  // Clear background image
  bgImage.value = '';
  localStorage.removeItem('chatBgImage');
  // Remove background immediately from UI
  const main = document.querySelector('.main');
  if (main) {
    main.style.background = '';
    main.style.backgroundColor = 'var(--bg-panel, #212733)';
  }

  // Clear LLM Presets (reset aiPreset to defaults in-memory only)
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
  // Global click-away to close open menus
  // Capture phase to ensure we see the click before it gets stopped in child components
  window.addEventListener('click', handleGlobalClick, true);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', handleGlobalClick, true);
});

// Open Windows Emoji Panel (Win + .)
function openWindowsEmojiPanel() {
  // This will only work on Windows and in Electron/desktop apps, not in browsers
  // Try to use the execCommand fallback for browsers, but show a tip
  try {
    // Focus the active element (should be the textarea or input)
    if (document.activeElement) {
      document.activeElement.blur();
      document.activeElement.focus();
    }
    // Try to trigger the emoji panel (Win + .)
    // This is not possible from browser JS for security reasons, but we can show a tip
    showToast('Press Win + . (Windows key + period) to open the emoji panel.');
  } catch (e) {
    showToast('Press Win + . (Windows key + period) to open the emoji panel.');
  }
}

const showEmojiPicker = ref(false);
const emojiPickerIdx = ref(null);

function onEmojiSelect(emoji) {
  const selected = typeof emoji === 'string' ? emoji : emoji.i;
  if (typeof emojiPickerIdx.value === 'number') {
    if (editIdx.value === emojiPickerIdx.value) {
      const ta = editAreaRefs.value[editIdx.value];
      if (ta) {
        const value = ta.value;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        // Insert emoji at cursor
        const newValue = value.slice(0, start) + selected + value.slice(end);
        editContent.value = newValue;
        // Restore cursor after emoji
        nextTick(() => {
          ta.focus();
          ta.selectionStart = ta.selectionEnd = start + selected.length;
        });
      }
    }
  }
  showEmojiPicker.value = false;
  emojiPickerIdx.value = null;
}

function openCustomEmojiPicker(idx) {
  showEmojiPicker.value = true;
  emojiPickerIdx.value = idx;
  nextTick(() => {
    // Focus the textarea if editing
    if (editIdx.value === idx) {
      const ta = editAreaRefs.value[idx];
      if (ta) ta.focus();
    }
  });
}

// Import Persona and Character cards
function onImportPersonaCard(json) {
  if (!json.name) {
    showToast('Persona card missing name.');
    return;
  }
  const char = state.characters.find(c => c.name === json.name);
  if (!char) {
    showToast(`No character named "${json.name}" found. Add the character first.`);
    return;
  }
  if (char.personaCard) {
    // Prompt user for action
    if (confirm(`Persona card for "${json.name}" already exists. Merge fields? (Cancel = Overwrite)`)) {
      char.personaCard = { ...char.personaCard, ...json };
      showToast(`Persona card for "${json.name}" merged!`);
      return;
    }
  }
  char.personaCard = json;
  showToast(`Persona card for "${json.name}" imported!`);
}

function onImportCharacterCard(json) {
  if (!json.name) {
    showToast('Character card missing name.');
    return;
  }
  const char = state.characters.find(c => c.name === json.name);
  if (!char) {
    showToast(`No character named "${json.name}" found. Add the character first.`);
    return;
  }
  if (char.characterCard) {
    // Prompt user for action
    if (!confirm(`Character card for "${json.name}" already exists. Overwrite?`)) {
      showToast('Import cancelled.');
      return;
    }
  }
  char.characterCard = json;
  showToast(`Character card for "${json.name}" imported!`);
}

const chatId = computed(() => currentChatPath.value || state.chatTitle || 'default');

loadMemories(chatId.value);
loadScenario(chatId.value);
</script>