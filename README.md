# ✦ FahOS — The Voice-First AI Operating Layer for Windows

[![Windows 11 Ready](https://img.shields.io/badge/Windows-11%20%7C%2010-0078D6?logo=windows&logoColor=white)](https://microsoft.com/windows)
[![Electron 31](https://img.shields.io/badge/Electron-31.0.0-47848F?logo=electron&logoColor=white)](https://electronjs.org)
[![Gemini 3.1 Flash-Lite](https://img.shields.io/badge/Google%20Gemini-3.1%20Flash--Lite-4285F4?logo=google&logoColor=white)](https://ai.google.dev)
[![Qwen 3.8 / Groq](https://img.shields.io/badge/LLM-Qwen%203.8%20(Groq)-F55036?logo=groq&logoColor=white)](https://groq.com)
[![Transformers.js](https://img.shields.io/badge/Local%20Whisper-Transformers.js-FFD21E)](https://huggingface.co/docs/transformers.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **FahOS** is an intelligent, voice-first desktop operating layer that sits quietly on top of Windows. It perceives your screen, listens to your natural voice commands, executes deep Windows PowerShell automations, and autonomously navigates the web inside a dedicated large-screen AI browser — all without ever leaving your workflow.

---

## 🌟 Key Highlights & Demo Features

| Feature | Description |
| :--- | :--- |
| **🌐 Unified AI Browser** | Large-screen (94% display) browser with live step HUD, persistent profile logins, and real-time DOM extraction for YouTube, Wikipedia, Amazon, and Google. |
| **🎙️ Triple Voice Engine** | Windows 11 WinRT native speech recognition, offline local Whisper pipeline (`@xenova/transformers`), and Win+H voice typing injector. |
| **🧠 Multi-Provider AI Router** | Natural language intent extraction and command synthesis powered by **Qwen 3.8 (Groq)** and **Google Gemini 3.1 Flash-Lite**. |
| **👁️ Screen Vision Snipper** | Interactive region snipper with in-memory desktop capture (100% ephemeral, zero disk footprint) analyzed via Gemini Multimodal Vision. |
| **💻 Deep Windows Automation** | Direct PowerShell execution with 3-tier security guard (volume, media controls, app launching, file creation, and recycle bin restore). |
| **📱 Local Phonebook & WhatsApp** | Local encrypted contact directory with 1-click WhatsApp chat deep-linking and Gmail web compose automation. |
| **🎨 Luxury Frosted Glass UI** | Obsidian frosted glassmorphism (`rgba(14, 16, 23, 0.90)`, `24px` blur) with unified design tokens shared between the popup and browser. |

---

## 🏛️ Modular Project Architecture

FahOS is organized into clean, enterprise-grade feature directories:

```
fahos/
├── src/
│   ├── main/
│   │   ├── main.js                  # Master application lifecycle & window manager
│   │   ├── config.js                # App configuration loader (env > json)
│   │   ├── preload.js               # Secure contextBridge IPC surface
│   │   │
│   │   └── features/                # 📦 MODULAR FEATURE ENGINES
│   │       ├── browser/             # [FEATURE: AUTONOMOUS BROWSER]
│   │       │   ├── agentBrowserWindow.js      # Large-screen BrowserWindow manager
│   │       │   ├── agentBrowserPreload.js     # Dedicated browser IPC bridge
│   │       │   ├── agentBrowserController.js  # Autonomous DOM navigation & Gemini synthesis
│   │       │   └── browserService.js          # Background service controller
│   │       │
│   │       ├── ai/                  # [FEATURE: AI CORE & INTENT ROUTING]
│   │       │   ├── router.js                  # Natural language command router
│   │       │   ├── prompts.js                 # System prompts & few-shot instructions
│   │       │   └── providers/                 # Swappable providers (Gemini, Groq, Ollama, Mock)
│   │       │
│   │       ├── voice/               # [FEATURE: VOICE-TO-TEXT & SPEECH]
│   │       │   ├── nativeStt.js               # Windows 11 WinRT Speech Recognition
│   │       │   ├── whisperService.js          # Offline local Whisper service
│   │       │   ├── localWhisper.js            # Transformers.js Whisper pipeline
│   │       │   ├── FahOSSpeech.exe / .cs      # High-performance C# WinRT worker
│   │       │   └── TriggerVoiceTyping.exe     # Win+H voice typing injector
│   │       │
│   │       ├── vision/              # [FEATURE: SCREEN PERCEPTION]
│   │       │   └── visualAgent.js             # Ephemeral screen capture & Gemini Vision
│   │       │
│   │       ├── system/              # [FEATURE: WINDOWS AUTOMATION]
│   │       │   ├── systemActions.js           # Volume, media, app launcher, file operations
│   │       │   ├── actionRouter.js            # Intent-to-PowerShell dispatcher
│   │       │   └── FahOSHook.exe              # Low-level Windows keyboard hook
│   │       │
│   │       ├── contacts/            # [FEATURE: DIRECTORY & SOCIAL]
│   │       │   └── contactsService.js         # Local encrypted contacts directory
│   │       │
│   │       └── history/             # [FEATURE: LOCAL CHAT HISTORY]
│   │           └── historyService.js          # Local-first persistent chat history
│   │
│   └── renderer/                    # 🎨 PRESENTATION & VIEWS
│       ├── overlay/                 # Floating FahOS Popup (index.html, overlay.js, styles.css)
│       ├── browser/                 # Unified Browser Window (agentBrowser.html, agentBrowser.css, agentBrowser.js)
│       ├── snipper/                 # Interactive Region Snipper (snip.html, snip.js)
│       ├── shared/                  # Design tokens & utilities (theme.css, markdown.js, assets/)
│       └── services/                # Speech recognition renderer services
│
├── setup-and-run.bat                # 1-Click Automated Setup & Launcher
├── run-fahos.bat                    # Instant Launch Script
├── fahos.config.example.json        # Template configuration file
└── package.json                     # Project manifest & dependencies
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Operating System**: Windows 10 or Windows 11 (x64)
- **Node.js**: v18+ or v20+ LTS installed from [nodejs.org](https://nodejs.org/)
- **Browser**: Google Chrome installed at default Windows path

### 1-Click Setup (Easiest)
1. Clone or download this repository:
   ```bash
   git clone https://github.com/Yashwanth-2607/FahOS.git
   cd FahOS
   ```
2. Double-click **`setup-and-run.bat`**:
   - Automatically checks for Node.js.
   - Installs dependencies (`npm install`).
   - Copies `fahos.config.example.json` to `fahos.config.json` if missing.
   - Launches FahOS on your desktop!

### Manual Setup
```bash
# 1. Install dependencies
npm install

# 2. Configure API keys
copy fahos.config.example.json fahos.config.json

# 3. Start FahOS
npm start
```

---

## ⚙️ Configuration (`fahos.config.json`)

FahOS is designed with a pluggable provider abstraction. Edit `fahos.config.json`:

```json
{
  "shortcut": "Control+Space",
  "aiProvider": "openaiCompatible",
  "geminiApiKey": "YOUR_GEMINI_API_KEY",
  "providers": {
    "openaiCompatible": {
      "baseUrl": "https://api.groq.com/openai/v1",
      "apiKey": "YOUR_GROQ_API_KEY",
      "model": "qwen/qwen3.8-27b"
    },
    "gemini": {
      "apiKey": "YOUR_GEMINI_API_KEY",
      "model": "gemini-3.1-flash-lite"
    },
    "ollama": {
      "baseUrl": "http://localhost:11434",
      "model": "llama3.1",
      "visionModel": "llava"
    }
  }
}
```

> **API Key Tips:**
> - Get a free Groq API key: [console.groq.com](https://console.groq.com/)
> - Get a free Google Gemini API key: [aistudio.google.com](https://aistudio.google.com/)
> - `fahos.config.json` is strictly git-ignored so your private keys are never committed.

---

## ⌨️ Global Shortcuts & Controls

| Shortcut / Action | Function |
| :--- | :--- |
| **`Ctrl + Space`** or **`Alt + Space`** | **Summon / Dismiss** the FahOS popup overlay anywhere in Windows. |
| **`Esc`** | Instantly dismiss the overlay or cancel screen snipping. |
| **Globe Icon (`🌐`)** | Opens the **FahOS Unified Browser** in manual mode (login to Google, GitHub, etc.). |
| **Scissors Icon (`✂`)** | Activates the **Screen Snipper** to select any region for AI visual analysis. |
| **Mic Icon (`🎙`)** | Toggle continuous speech-to-text voice input. |
| **Stop Button (`■`)** | Immediately cancels any autonomous browser agent task. |

---

## 🧪 Demo Prompts (Try These Live!)

### 1. Autonomous Web Exploration & Extraction
- `"Search Google for history of artificial intelligence"`
- `"Open YouTube, search for Interstellar Main Theme, and tell me the channel name of the first video"`
- `"Go to Wikipedia, search for Alan Turing, and tell me the year he died"`
- `"Search Amazon for wireless mechanical keyboards under 5000"`

### 2. Windows OS & Productivity Automation
- `"Turn the volume up"` / `"Mute volume"`
- `"Pause media"` / `"Play next track"`
- `"Create a folder named FinalDemo on Desktop"`
- `"Open Calculator"` / `"Launch Notepad"`

### 3. Communications & Contacts
- `"Send WhatsApp message to John saying I'm running 5 minutes late"`
- `"Compose an email to support@example.com with subject Project Update"`

### 4. Multimodal Screen Vision
- Click the **✂ (Scissors)** button on the popup.
- Drag to highlight any diagram, code block, or question on your screen.
- FahOS perceives the pixels in memory and answers your question instantly.

---

## 🛡️ Security & Privacy Guardrails

1. **Zero Secret Leakage**: API keys live exclusively in the Node.js main process. The renderer process has zero access to environment variables or filesystem secrets.
2. **Ephemeral Vision**: Screen snipping captures are held strictly in memory buffers during the request lifecycle. No screenshot files are saved to disk.
3. **3-Tier Permission Guard**:
   - **SAFE**: Non-destructive operations (volume, web searches, app opens) run instantly.
   - **CONFIRM**: Significant modifications (file creation, email composition) display visual previews.
   - **DANGEROUS**: Destructive actions (permanent file deletion) require explicit interactive confirmation.
4. **Persistent Profile Partitioning**: Browser sessions use `persist:fahos_user_profile` so users stay securely logged into their Google or GitHub accounts without storing credentials in plaintext.

---

## 📄 License

This project is licensed under the **MIT License**. Built with precision for NextWave.

