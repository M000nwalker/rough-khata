const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openPdfDialog: () => ipcRenderer.invoke('dialog:open-pdf'),
  saveFileDialog: (options) => ipcRenderer.invoke('dialog:save-file', options),
  getEnvKeys: () => ipcRenderer.invoke('ai:get-env-keys'),
  copyImageToClipboard: (dataUrl) => ipcRenderer.invoke('clipboard:copy-image', dataUrl),
  copyTextToClipboard: (text) => ipcRenderer.invoke('clipboard:copy-text', text),
  isElectron: true
});

