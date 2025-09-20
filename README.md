Talk — Local roleplay & AI chat sandbox
=======================================

Tagline
-------
A beautiful, offline-first chat and roleplay and story-writing sandbox with rich character cards, LLM preset import/export, scene memory, media attachments, and powerful per-message editing controls.

Overview
--------
Talk is a fast, desktop-ready chat sandbox built with Vue and Electron that’s purpose-built for roleplay, creative writing, and controlled LLM-driven conversations. Add users and characters, upload avatars, import persona/character cards and AI presets, compose messages (including images/video), and generate or continue replies using flexible LLM settings — all while keeping full control over style, layout, and export formats (HTML, TXT, DOCX, JSON). Designed for hobbyists and storytellers but packed with advanced controls for power users.

The Program is packed with features, here are some of them (A demo video will follow):
--------------------------------------------------------------------------------------
- Desktop app built with Electron + Vue 3 (runs locally).
- Virtualized scrolling for very long chats (vue-virtual-scroller).
- Add and manage Users and Characters with portraits and per-character font styles.
- Import/export Persona & Character cards (JSON) and AI presets.
- Scene "Plot" field that feeds persistent context to the LLM.
- Local memory and scenario management (localStorage-backed) to keep the model coherent across turns.
- Per-message editing, versioning, undo/redo, streaming, stop and retry controls, user guided continue and rewrite.
- Media attachments (image/video) with preview, detach, resize and pin back functionality.
- Inline character avatar generation and right-click to insert empty character messages.
- Export as HTML, TXT, DOCX, and JSON.
- Advanced AI preset controls (temperature, top-k/top-p, sampling, logit bias, grammar & JSON schema, etc.).
- In-app search, keyboard shortcuts, and helpful UI affordances.

Installation:
-------------
1. Install Git (so you can clone the repo, otherwise click on the dropdown "<> Code" and download the zip file.)
2. Install Node.js (LTS).
3. In the drive/directory where you want to install the program, open a PowerShell window and type: git clone https://github.com/ialhabbal/Talk.git
4. Still inside the PowerShell, run the following command: npm install, wait until all packages' installation complete.
5. Exit the PowerShell, go inside the project folder if you are not there already, double-click: build.bat, this will create a "dist" folder in the program folder.
6. Run the program, double-click on Talk.bat

## Installation Video

[![Watch the video](https://img.youtube.com/vi/wXSQHGZXUbM/0.jpg)](https://youtu.be/wXSQHGZXUbM)


Step-by-step basic usage (friendly)
-----------------------------------
IMPORTANT: If you plan to use a Large Language Model (LLM) for AI enabled chat/story writing, then make sure you run Koboldcpp with your preferred LLM model, ensure Koboldcpp is connected to port 5001.

Start the program
1. Open the project folder and double-click on "Talk.bat".
2. The Talk window opens. If a connectivity banner appears, click "Work offline" to continue without a backend.

Add user and characters
1. Click "Add New User" to create a user (recommended to add only one user).
2. Click "Add New Character(s)" to create characters. Use the sidebar to rename, reorder, and upload portraits.

Add persona/character cards
1. Use the sidebar buttons "Import Persona Card" or "Import Character Card" to import JSON files. Imported cards are automatically included in prompts. (The program can import SillyTavern cards)

Import LLM settings
1. In the sidebar, under AI Settings, click the import icon to load a preset JSON file. Use Basic or Advanced to toggle which fields are shown. (The program can import SillyTavern LLM presets)

Add your first message
1. Use the "Add message" button next to a character in the sidebar or click in the main area to create a message.
2. Type and press Enter to save, or click Save in the edit UI.

Formatting messages and avatars
- Per-character font-style controls are available in the sidebar (bold/italic/underline, color, font family).
- Upload portraits from the sidebar; portraits show in message rows and in avatar toolbars.

Message-row functions (bottom row)
- Edit, Save, Cancel, Undo, Redo, Delete.
- Insert menu: Attach media or open emoji picker.
- Inline avatars (click to generate, right-click to add empty message for character).
- Stop/Retry generation, Direction toggle (L/R), Per-message version navigation.
- Guidance menu for guided responses: "Guided Swipe", "Guided Continue", "Corrections".

Exports
- Export as HTML, TXT, DOCX, and JSON from sidebar or close-chat dialog.

Advanced & notes
- Local keys used for memories and scenario data are stored in `localStorage` (see `src/llm_helpers`).

License: MIT
------------

This project is developed by: ialhabbal