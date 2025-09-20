const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showOpenDialog: (options) => ipcRenderer.invoke('showOpenDialog', options),
  loadChat: (filepath) => ipcRenderer.invoke('load-chat', filepath),
  showSaveDialog: () => ipcRenderer.invoke('showSaveDialog'),
  saveChat: (filepath, content) => ipcRenderer.invoke('save-chat', filepath, content),
  // Fullscreen helpers
  getFullscreen: () => ipcRenderer.invoke('get-fullscreen'),
  setFullscreen: (v) => ipcRenderer.invoke('set-fullscreen', v),
  // Event bridge
  onWindowFullscreenChanged: (cb) => {
    ipcRenderer.on('window-fullscreen-changed', (event, val) => cb(val));
  }
});