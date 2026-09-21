const { app, BrowserWindow, ipcMain, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const net = require("net");
const { execFileSync } = require("child_process");

const PIPE_NAME = "\\\\.\\pipe\\cheezie-engine-v1";
const HOST_NAME = "com.vhx.cheezie.engine";
const EXTENSION_ID = "hkdkilknajblfabfcbdocgndhiajgkdg";

if (process.argv.includes("--native-host")) {
  require("./native-host");
} else {
  let mainWindow = null;
  let pipeServer = null;
  let pipeBuffer = "";

  function hostManifestPath() {
    return path.join(
      app.getPath("localAppData"),
      "CheezieEngine",
      "native-host.json"
    );
  }

  function registerBrowser(registryRoot) {
    const manifestPath = hostManifestPath();
    const key = registryRoot + "\\NativeMessagingHosts\\" + HOST_NAME;

    try {
      execFileSync("reg.exe", [
        "ADD",
        key,
        "/ve",
        "/t",
        "REG_SZ",
        "/d",
        manifestPath,
        "/f"
      ], { windowsHide: true, stdio: "ignore" });

      return true;
    } catch {
      return false;
    }
  }

  function registerNativeMessagingHost() {
    const manifestPath = hostManifestPath();

    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });

    const manifest = {
      name: HOST_NAME,
      description: "Cheezie Engine live Chess.com bridge",
      path: process.execPath,
      type: "stdio",
      allowed_origins: ["chrome-extension://" + EXTENSION_ID + "/"]
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

    const roots = [
      "HKCU\\Software\\Google\\Chrome",
      "HKCU\\Software\\Microsoft\\Edge",
      "HKCU\\Software\\BraveSoftware\\Brave-Browser",
      "HKCU\\Software\\Chromium"
    ];

    return roots.filter(registerBrowser).length > 0;
  }

  function startPipeServer() {
    pipeServer = net.createServer((socket) => {
      socket.setEncoding("utf8");

      pipeBuffer = "";

      socket.on("data", (chunk) => {
        pipeBuffer += chunk;

        while (true) {
          const newline = pipeBuffer.indexOf("\n");
          if (newline === -1) break;

          const line = pipeBuffer.slice(0, newline).trim();
          pipeBuffer = pipeBuffer.slice(newline + 1);
          if (!line) continue;

          let message;
          try {
            message = JSON.parse(line);
          } catch {
            continue;
          }

          const id = message.id;
          const payload = message.payload;

          if (payload?.type === "position" && typeof payload.fen === "string") {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("cheezie-position", payload);
              mainWindow.webContents.send("cheezie-bridge-status", {
                connected: true,
                source: "Chess.com"
              });
            }

            socket.write(JSON.stringify({
              id,
              response: { type: "ack", accepted: true }
            }) + "\n");
          } else {
            socket.write(JSON.stringify({
              id,
              response: { type: "ack", accepted: false }
            }) + "\n");
          }
        }
      });
    });

    pipeServer.on("error", (error) => {
      console.error("Native bridge pipe error:", error);
    });

    pipeServer.listen(PIPE_NAME);
  }

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 980,
      height: 760,
      minWidth: 760,
      minHeight: 600,
      backgroundColor: "#111318",
      title: "Cheezie Engine",
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    });

    mainWindow.loadFile(path.join(__dirname, "index.html"));

    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  }

  ipcMain.handle("get-engine-source", async () => {
    const enginePath = path.join(__dirname, "engine", "stockfish11.js");
    return fs.promises.readFile(enginePath, "utf8");
  });

  ipcMain.handle("open-extension-folder", async () => {
    const extensionPath = path.join(process.resourcesPath, "extension");
    await shell.openPath(extensionPath);
    return extensionPath;
  });

  app.whenReady().then(() => {
    registerNativeMessagingHost();
    startPipeServer();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (pipeServer) {
      try { pipeServer.close(); } catch {}
    }

    if (process.platform !== "darwin") app.quit();
  });
}
