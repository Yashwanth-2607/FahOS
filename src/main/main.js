const { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, nativeImage, session, desktopCapturer, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile, exec, spawn } = require('child_process');
try { exec('chcp 65001 >nul 2>&1'); } catch (_) {}
const { loadConfig } = require('./config');
const { runAction, createProvider } = require('./features/ai/router');
const { getTranscriber } = require('./features/voice/localWhisper');
const whisperService = require('./features/voice/whisperService');
const historyService = require('./features/history/historyService');
const nativeStt = require('./features/voice/nativeStt');
const visualAgent = require('./features/vision/visualAgent');

// Configure in-memory screen capturer (zero disk storage, 100% ephemeral)
visualAgent.setScreenCapturer(async () => {
  const primary = screen.getPrimaryDisplay();
  const { width, height } = primary.bounds;
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height }
  });
  if (sources.length > 0) {
    return sources[0].thumbnail.toJPEG(75).toString('base64');
  }
  return null;
});

// Single Instance Lock: Prevents duplicate processes from conflicting
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[FahOS] Another instance is already running. Exiting.');
  app.quit();
  process.exit(0);
}

const isDev = process.argv.includes('--dev');

// Disable hardware acceleration to eliminate Windows DWM black rectangular backing surface
app.disableHardwareAcceleration();

let cfg = loadConfig();
let win = null;
let tray = null;
let hookProc = null;
let lastShowTime = 0;

function createWindow() {
  const primary = screen.getPrimaryDisplay();
  const areaW = primary.workAreaSize.width;
  const WIN_W = 470;
  const WIN_H = 265;

  win = new BrowserWindow({
    title: 'FahOS',
    width: WIN_W,
    height: WIN_H,
    minWidth: WIN_W,
    maxWidth: WIN_W,
    minHeight: 200,
    maxHeight: 920,
    x: Math.round((areaW - WIN_W) / 2),
    y: 40,
    frame: false,
    transparent: true,
    hasShadow: false, // Disables native rectangular OS drop shadow
    backgroundColor: '#00000000',
    resizable: true,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.loadFile(path.join(__dirname, '..', 'renderer', 'overlay', 'index.html'));
  win.setAlwaysOnTop(true);

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      if ((input.control || input.meta) && input.code === 'Space') {
        event.preventDefault();
        console.log('[FahOS] Ctrl+Space caught in webContents before-input-event');
        toggleOverlay();
      } else if (input.code === 'Escape') {
        event.preventDefault();
        hideOverlay();
      }
    }
  });

  win.webContents.on('did-finish-load', () => {
    console.log('[FahOS] Smooth luxury popup loaded.');
    win.webContents.send('fahos:appear');
    win.webContents.send('fahos:focusInput');
  });

  if (isDev) win.webContents.openDevTools({ mode: 'detach' });
}

let snipWindow = null;

function createSnipWindow() {
  if (snipWindow && !snipWindow.isDestroyed()) {
    snipWindow.show();
    snipWindow.focus();
    return snipWindow;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;

  snipWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width,
    height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  snipWindow.loadFile(path.join(__dirname, '..', 'renderer', 'snipper', 'snip.html'));
  snipWindow.setAlwaysOnTop(true, 'screen-saver');
  snipWindow.on('closed', () => {
    snipWindow = null;
  });
  return snipWindow;
}

function showOverlay() {
  if (!win) return;
  lastShowTime = Date.now();
  if (win.isMinimized()) win.restore();
  win.show();
  win.setAlwaysOnTop(true, 'screen-saver');
  win.moveTop();
  win.focus();
  win.webContents.send('fahos:appear');
  win.webContents.send('fahos:focusInput');
  console.log('[FahOS] Overlay summoned smoothly to front');
}

function hideOverlay() {
  if (!win || !win.isVisible()) return;
  // Send prepareHide to let renderer play the smooth twinkle exit animation
  win.webContents.send('fahos:prepareHide');
  setTimeout(() => {
    if (win && !win.isDestroyed()) {
      win.hide();
      console.log('[FahOS] Overlay hidden smoothly');
    }
  }, 180);
}

function toggleOverlay() {
  if (!win) return;
  const now = Date.now();
  if (now - lastShowTime < 200) return; // Debounce rapid key bounce
  lastShowTime = now;

  if (win.isVisible() && !win.isMinimized()) {
    console.log('[FahOS] Hotkey toggle: hiding overlay');
    hideOverlay();
  } else {
    console.log('[FahOS] Hotkey toggle: showing overlay');
    showOverlay();
  }
}

// When a second instance tries to run, summon existing overlay smoothly
app.on('second-instance', () => {
  console.log('[FahOS] Second instance requested. Summoning overlay...');
  showOverlay();
});

app.whenReady().then(() => {
  app.setName('FahOS');

  // Auto-grant microphone permissions so Web Speech and getUserMedia work seamlessly
  try {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      if (permission === 'media') return callback(true);
      callback(true);
    });
    session.defaultSession.setPermissionCheckHandler(() => true);
  } catch (err) {
    console.warn('[FahOS] Permission handler notice:', err.message);
  }

  createWindow();

  // Pre-warm local Whisper model in background
  try {
    getTranscriber().catch((e) => console.warn('[FahOS] Whisper pre-warm warning:', e));
  } catch (_) {}

  // Create System Tray Icon
  try {
    const iconPath = path.join(__dirname, '..', 'renderer', 'assets', 'logo.png');
    const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(trayIcon);
    tray.setToolTip('FahOS — Voice AI (Ctrl + Space to summon)');
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Open FahOS (Ctrl+Space)', click: () => showOverlay() },
      { type: 'separator' },
      { label: 'Quit FahOS', click: () => app.quit() }
    ]);
    
    tray.setContextMenu(contextMenu);
    tray.on('click', () => toggleOverlay());
  } catch (e) {
    console.warn('[FahOS] Could not create system tray:', e.message);
  }

  // Clear any existing shortcuts first
  globalShortcut.unregisterAll();

  // Primary: Ctrl+Space (CommandOrControl+Space)
  let regPrimary = false;
  try {
    regPrimary = globalShortcut.register('CommandOrControl+Space', () => {
      console.log('[FahOS] Global Hotkey [Ctrl+Space] triggered');
      toggleOverlay();
    });
  } catch (e) {
    console.warn('[FahOS] Ctrl+Space registration notice:', e.message);
  }

  // Backup 1: Alt+Space (Spotlight / PowerToys standard)
  let regAlt = false;
  try {
    regAlt = globalShortcut.register('Alt+Space', () => {
      console.log('[FahOS] Global Hotkey [Alt+Space] triggered');
      toggleOverlay();
    });
  } catch (e) {
    console.warn('[FahOS] Alt+Space registration notice:', e.message);
  }

  // Backup 2: Ctrl+Shift+Space
  let regShift = false;
  try {
    regShift = globalShortcut.register('CommandOrControl+Shift+Space', () => {
      console.log('[FahOS] Global Hotkey [Ctrl+Shift+Space] triggered');
      toggleOverlay();
    });
  } catch (e) {
    console.warn('[FahOS] Ctrl+Shift+Space registration notice:', e.message);
  }

  // Native Low-Level Keyboard Hook (Direct OS Queue Listener - Zero Conflict)
  const hookExe = path.join(__dirname, 'features', 'system', 'FahOSHook.exe');
  if (fs.existsSync(hookExe)) {
    try {
      hookProc = spawn(hookExe, [], { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
      hookProc.stdout.on('data', (chunk) => {
        if (chunk.toString().includes('TOGGLE')) {
          console.log('[FahOS Low-Level Hook] Global Hotkey [Ctrl+Space / Alt+Space] triggered!');
          toggleOverlay();
        }
      });
      hookProc.on('error', (err) => console.warn('[FahOS Hook] Warning:', err.message));
    } catch (e) {
      console.warn('[FahOS Hook] Spawn notice:', e.message);
    }
  }

  console.log('================================================');
  console.log(' FahOS Smooth Luxury Pop-up Ready');
  console.log(' Primary [Ctrl  + Space]:', (regPrimary || hookProc) ? 'REGISTERED SUCCESSFULLY' : 'UNAVAILABLE');
  console.log(' Backup  [Alt   + Space]:', (regAlt || hookProc) ? 'REGISTERED SUCCESSFULLY' : 'UNAVAILABLE');
  console.log(' Backup  [Ctrl+Shift+Sp]:', regShift ? 'REGISTERED SUCCESSFULLY' : 'UNAVAILABLE');
  console.log('================================================');

  // ---- IPC Handlers ----
  ipcMain.handle('fahos:runAction', async (_event, payload) => {
    const action = (payload && payload.action) || 'ask';
    const text = (payload && payload.text) || '';
    if (!text.trim()) return { ok: false, provider: createProvider(cfg).name, error: 'Empty request.' };
    return runAction({ cfg, action, text });
  });

  ipcMain.handle('fahos:getInfo', async () => ({
    provider: createProvider(cfg).name,
    shortcut: 'Ctrl+Space',
    version: app.getVersion()
  }));

  // Local-First History IPC Handlers
  ipcMain.handle('fahos:getHistory', async () => {
    return historyService.loadHistory();
  });

  ipcMain.handle('fahos:addHistory', async (_event, item) => {
    return historyService.addEntry(item);
  });

  ipcMain.handle('fahos:clearHistory', async () => {
    return historyService.clearHistory();
  });

  // Local-First Phonebook (Contacts) IPC Handlers
  const contactsService = require('./features/contacts/contactsService');
  const systemActions = require('./features/system/systemActions');
  ipcMain.handle('fahos:getContacts', async () => {
    return contactsService.getAllContacts();
  });

  ipcMain.handle('fahos:saveContact', async (_event, payload) => {
    return contactsService.saveContact(payload.name, payload.phone, payload.email);
  });

  ipcMain.handle('fahos:composeEmail', async (_event, payload) => {
    const target = payload && (payload.contactOrEmail || payload.target || payload.email || payload.name);
    return systemActions.composeEmail(target, payload && payload.subject, payload && payload.body);
  });

  ipcMain.handle('fahos:deleteContact', async (_event, name) => {
    return contactsService.deleteContact(name);
  });

  ipcMain.handle('fahos:openContactChat', async (_event, name, message = '') => {
    if (message && message.trim()) {
      return systemActions.openWhatsAppChat(name, message);
    }
    const contact = contactsService.getPhoneForContact(name);
    if (contact && contact.phone) {
      const url = `whatsapp://send?phone=${contact.phone}`;
      console.log('[FahOS Main] Opening WhatsApp via native shell.openExternal:', url);
      await shell.openExternal(url);
      return { ok: true, command: url, description: `Opened WhatsApp chat with **${name}**.` };
    }
    return systemActions.openWhatsAppChat(name);
  });

  // Dynamic Window Resize for History / Chat views
  ipcMain.handle('fahos:setHeight', async (_event, targetHeight) => {
    if (win && !win.isDestroyed()) {
      const [w] = win.getSize();
      win.setSize(w, Math.round(targetHeight));
    }
    return { ok: true };
  });

  // Interactive Screen Region Snipper Handlers
  ipcMain.handle('fahos:startSnipper', async () => {
    if (win && !win.isDestroyed()) win.hide();
    createSnipWindow();
    return { ok: true };
  });

  ipcMain.on('fahos:cancelSnip', () => {
    if (snipWindow && !snipWindow.isDestroyed()) {
      snipWindow.close();
      snipWindow = null;
    }
    if (win && !win.isDestroyed()) {
      win.show();
      win.focus();
    }
  });

  ipcMain.on('fahos:confirmSnip', async (_event, bounds) => {
    if (snipWindow && !snipWindow.isDestroyed()) {
      snipWindow.close();
      snipWindow = null;
    }

    try {
      console.log('[FahOS Snipper] Cropping screen region in-memory:', bounds);
      const croppedBase64 = await visualAgent.cropScreenRegion(bounds);

      // Restore main window & send cropped image to renderer
      if (win && !win.isDestroyed()) {
        win.show();
        win.focus();
        win.webContents.send('fahos:imageSnipped', {
          image: croppedBase64,
          bounds: bounds
        });
      }
    } catch (err) {
      console.error('[FahOS Snipper] Crop error:', err);
      if (win && !win.isDestroyed()) {
        win.show();
        win.focus();
      }
    }
  });

  ipcMain.handle('fahos:analyzeAttachedImage', async (_event, payload) => {
    const gemKey = cfg.geminiApiKey || (cfg.providers && cfg.providers.gemini && cfg.providers.gemini.apiKey);
    if (!gemKey) {
      return { ok: false, error: 'Gemini API key is not configured in FahOS settings.' };
    }
    const imageBase64 = payload && payload.image;
    const userPrompt = (payload && payload.prompt) || '';
    if (!imageBase64) {
      return { ok: false, error: 'No image attached.' };
    }
    try {
      console.log('[FahOS Vision] Analyzing attached image with prompt:', userPrompt || '(default)');
      const analysis = await visualAgent.analyzeImageWithPrompt(imageBase64, userPrompt, gemKey);
      return { ok: true, output: analysis };
    } catch (err) {
      console.error('[FahOS Vision] Analysis error:', err);
      return { ok: false, error: err.message || String(err) };
    }
  });

  // High-Accuracy Whisper Transcription
  ipcMain.handle('fahos:transcribeAudio', async (_event, payload) => {
    try {
      let audioBuffer;
      let float32Fallback = null;

      if (payload && payload.wav) {
        audioBuffer = Buffer.from(payload.wav);
        if (payload.float32) {
          float32Fallback = new Float32Array(payload.float32);
        }
      } else if (Buffer.isBuffer(payload)) {
        audioBuffer = payload;
      } else if (payload instanceof Uint8Array) {
        audioBuffer = Buffer.from(payload);
      } else if (payload && typeof payload === 'object') {
        const len = payload.length || Object.keys(payload).filter(k => !isNaN(k)).length;
        if (len > 0) {
          const arr = new Uint8Array(len);
          for (let i = 0; i < len; i++) arr[i] = payload[i] || 0;
          audioBuffer = Buffer.from(arr);
        } else if (payload.buffer) {
          audioBuffer = Buffer.from(payload.buffer);
        }
      }
      if (!audioBuffer || audioBuffer.length < 100) {
        return { ok: false, error: 'Audio buffer empty or too small' };
      }
      console.log('[FahOS Whisper] Transcribing', audioBuffer.length, 'bytes of audio (WAV PCM)');
      return await whisperService.transcribeAudio(audioBuffer, float32Fallback);
    } catch (err) {
      console.error('[FahOS] transcribeAudio IPC error:', err);
      return { ok: false, error: err.message };
    }
  });

  // Windows 11 Official Voice Typing (Win + H)
  ipcMain.handle('fahos:toggleVoiceTyping', async () => {
    const triggerExe = path.join(__dirname, 'features', 'voice', 'TriggerVoiceTyping.exe');
    execFile(triggerExe, [], (err) => {
      if (err) console.warn('[FahOS] Voice Typing trigger error:', err);
    });
    return { ok: true };
  });

  // Native Speech-to-Text IPC Handlers
  ipcMain.handle('fahos:startSpeech', async () => {
    nativeStt.startListening({
      onText: (data) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('fahos:speechText', data);
        }
      },
      onError: (err) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('fahos:speechError', err);
        }
      }
    });
    return { ok: true };
  });

  ipcMain.handle('fahos:stopSpeech', async () => {
    nativeStt.stopListening();
    return { ok: true };
  });

  // Autonomous Browser Control IPC Handlers
  const agentBrowserWindow = require('./features/browser/agentBrowserWindow');
  ipcMain.handle('fahos:openBrowserWindow', async (_event, url) => {
    agentBrowserWindow.createAgentBrowserWindow(url || 'https://www.google.com');
    return { ok: true };
  });

  const browserService = require('./features/browser/browserService');
  ipcMain.handle('fahos:browserTask', async (_event, payload) => {
    const taskText = (payload && payload.task) || '';
    return agentBrowserWindow.runAgentTask(taskText);
  });

  ipcMain.handle('fahos:cancelBrowserTask', async () => {
    const agentController = require('./features/browser/agentBrowserController');
    agentController.cancel();
    return { ok: true };
  });

  ipcMain.on('fahos:hide', () => {
    if (win) win.hide();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    showOverlay();
  });
});

app.on('window-all-closed', () => { /* keep running in background */ });
app.on('will-quit', () => {
  if (hookProc) {
    try { hookProc.kill(); } catch (_) {}
  }
  globalShortcut.unregisterAll();
  nativeStt.killWorker();
  const browserService = require('./features/browser/browserService');
  browserService.cancelActiveBrowserTask().catch(() => {});
});
