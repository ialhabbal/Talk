# Talk: Visual Chat Story Editor

**Talk** is a vibe-coded (Vscode/GPT4.1), fully functional, user-friendly visual chat story editor for writers, and roleplayers. It allows you to create, edit, and export chat-based stories with rich formatting, character management, media attachments, and advanced AI integration for generating dialogue.

---

**IMPORTANT:** A fully functional "Packaged for Production" stripped down version is available here too. Just download the small-sized folder "Dist", uzip it, and run the "Talk_Dist" batch file (no installation or pre-requisites required). If you want to use the LLM with it, run Koboldcpp loading your preferred model there. Ensure Koboldcpp's port is 5001.

---

## Features

### 🧑‍🤝‍🧑 Character & User Management
- Add unlimited **Characters** and **Users** with custom names.
- Assign avatars (portraits) to each character/user.
- Customize font style (bold, italic, underline), font color, and font family per character.
- Easily edit character names and avatars at any time.

### 💬 Chat Editing
- **Manual message editing**: Click any message to edit inline.
- **Insert empty messages** for any character at any point in the chat.
- **Undo/Redo** support for all chat and character changes.
- **Delete messages** or entire chats with confirmation prompts.
- **Direction control**: Set message direction (LTR/RTL) per message.

### 📁 File Import & Export
- **Import chat files**: Supports `.txt`, `.docx`, and `.json` formats.
- **Export chat** as:
  - **HTML** (with all formatting and media)
  - **Plain Text (.txt)**
  - **Word Document (.docx)**
  - **JSON** (for re-import and backup)

### 🎨 Layout & Theme Customization
- **Theme selector**: Choose from Default (Dark), Light, Solarized Dark, and Dracula themes.
- **Layout controls**:
  - Message box width
  - Font size
  - Portrait size and shape (Circle, Rounded Square, Rounded Rectangle)
  - Message blur effect
- **Color pickers** for text, quote/border, and italic/name colors.
- **Auto-scroll** toggle for chat area.

### 🖼️ Media Attachments
- Attach **images or videos** to any message.
- **Resize** media (attached or detached).
- **Detach** media from messages for floating previews.
- **Drag and move** detached media anywhere on the screen.
- **Pin** detached media back to its original message.
- **Media Files Retrieval** When chat file exported as .json, the media files pinned to messages are exported with it and retrieved and the same chat is imported again.

### 🏞️ Chat Backgrounds
- Set a **custom background image** for the chat area.
- Remove or change the background at any time.

### 🤖 AI/LLM Integration (Presets & Generation)
- **LLM Preset Editor**: Configure all parameters for AI text generation, including:
  - Memory/context, response/context tokens, temperature, top-k/p, repetition penalty, banned tokens, and more.
  - System prompt, context template, instruct template, and post-history instructions.
  - Sequence and macro options for advanced prompt engineering.
- **Import/Export LLM presets** as JSON.
- **Generate messages** as any character using your configured LLM backend.
- **Streaming** support for real-time AI message generation.
- **Retry, stop, and version navigation** for AI-generated messages.

### 🛠️ Advanced Features
- **Undo/Redo** for all actions.
- **Multi-version message history**: Navigate between different AI generations for each message.
- **Keyboard shortcuts** for quick navigation and editing (see below).

---

## Prerequisites & Dependencies

### Node.js & npm
- [Node.js](https://nodejs.org/) (v16 or newer recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Required npm Packages
- `vue@3` (Vue.js 3)
- `vue3-colorpicker`
- `mammoth` (for `.docx` import)
- `docx` (for `.docx` export)

### LLM Backend (Optional, for AI features)
- A compatible LLM backend server (e.g., OpenAI-compatible API, or your own local LLM server).
- Default backend URL is `http://localhost:3000/generate` (configurable in code).

---

## Setup Instructions

### 1. Clone the Repository to any place your disk.

```sh
git clone https://github.com/ialhabbal/Talk.git
cd Talk
```

### 2. Install Dependencies

```sh
npm install
```

### 3. Run the Application

```sh
npm run dev
```

- The app will be available at `http://localhost:5173` (or as indicated in your terminal).

### 4. (Optional) Set Up LLM Backend

- For AI message generation, you need a backend server that accepts POST requests at `/generate`.
- By default, the app expects the backend at `http://localhost:3000/generate`.
- You can change this URL in the `backendUrl` variable in [src/App.vue](src/App.vue).
- I tested with Koboldcpp on it's port 5001.

---

In the project folder, run "Talk.bat"

---

## Usage Guide

### Starting a New Chat

1. **Add Characters/Users**: Click "Add New Character" or "Add New User" and enter a name.
2. **Customize**: Click the avatar to upload a portrait, and adjust font/color settings as desired.
3. **Add Messages**: Use the "+" button next to a character to add a message, or click avatars inline to insert messages anywhere.
4. **Edit Messages**: Click any message to edit. Press Enter to save.

### Importing Existing Chats

- Click "Load Existing Chat File" and select a `.txt`, `.docx`, or `.json` file.
- For `.txt`/`.docx`, select detected characters and click "Add Characters to Chat".
  *note* In my testing: You can import .txt chats exported from SillyTavern and add characters and users but the LLM won't differentiate between them. However creating, saving/export, re-importing chats with this program doesn't have this issue.

### Exporting Chats

- Use the export buttons in the sidebar to save your chat as HTML, TXT, DOCX, or JSON.

### Customizing Layout & Theme

- Use the "Theme" dropdown to switch themes.
- Adjust sliders for message width, font size, portrait size/shape, and blur.
- Pick custom colors for text, quotes, and names.

### Attaching & Managing Media

- Click the paperclip 📎 on a message to attach an image or video.
- Use the resize handles to adjust media size.
- Detach media for floating previews, drag to move, and pin back to messages.

### Setting Chat Background

- Click "Set Chat Background" to upload an image.
- Remove or change the background at any time.

### Using AI/LLM Features

1. **Configure LLM Presets**: Fill out the LLM Preset section in the sidebar.
2. **Export/Import Presets**: Use the ⬆️/⬇️ buttons to save/load your settings.
3. **Generate Messages**: Click the 🤖 button next to a character to generate a message using the LLM.
4. **Streaming**: Watch messages appear in real-time if streaming is enabled.
5. **Retry/Stop/Version**: Use 🔁 to retry, ⏹️ to stop, and ⬅️/➡️ to navigate message versions.

---

## Keyboard Shortcuts

- **Edit Message**: Click message or press Enter when focused.
- **Save Edit**: Press Enter.
- **Cancel Edit**: Press Escape.
- **Undo/Redo**: Use the ↺ and ↻ buttons.

---

## Troubleshooting

- If you encounter issues with AI generation, ensure your backend server is running and accessible at the configured URL.
- For `.docx` import/export, ensure the required npm packages are installed.

---

## License

MIT License

---

## Credits

- Built with [Vue 3](https://vuejs.org/), [vue3-colorpicker](https://github.com/caohenghu/vue3-colorpicker), [mammoth.js](https://github.com/mwilliamson/mammoth.js), and [docx](https://github.com/dolanmiu/docx).
- Developed by [ialhabbal].

---

## Contributing

Pull requests and feature suggestions are welcome! Please open an issue or submit a PR.
