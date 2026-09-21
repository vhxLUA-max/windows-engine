const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cheezie", {
  getEngineSource: () => ipcRenderer.invoke("get-engine-source"),
  onPosition: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("cheezie-position", listener);
    return () => ipcRenderer.removeListener("cheezie-position", listener);
  },
  onBridgeStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("cheezie-bridge-status", listener);
    return () => ipcRenderer.removeListener("cheezie-bridge-status", listener);
  },
  openExtensionFolder: () => ipcRenderer.invoke("open-extension-folder")
});
