const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openPdfDialog: () => ipcRenderer.invoke('dialog:open-pdf'),
  saveFileDialog: (options) => ipcRenderer.invoke('dialog:save-file', options),
  isElectron: true
});
