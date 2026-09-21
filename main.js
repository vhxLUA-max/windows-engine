const { app, BrowserWindow, ipcMain, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const net = require("net");
const { execFileSync } = require("child_process");

const PIPE_NAME = "\\\\.\\pipe\\cheezie-engine-v1";
const HOST_NAME = "com.vhx.cheezie.engine";
const EXTENSION_ID = "hkdkilknajblfabfcbdocgndhiajgkdg";

const isNativeHostInvocation = process.argv.some((arg) =>
  arg.startsWith("chrome-extension://")
);

if (isNativeHostInvocation) {
  require("./native-host");
} else {
  let mainWindow = null;
  let pipeServer = null;

  function logStartup(message) {
    try {
      const logPath = path.join(app.getPath("userData"), "startup.log");
      fs.appendFileSync(logPath, new Date().toISOString() + " " + message + "\n");
    } catch {}
  }

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
      execFileSync(
        "reg.exe",
        ["ADD", key, "/ve", "/t", "REG_SZ", "/d", manifestPath, "/f"],
        { windowsHide: true, stdio: "ignore" }
      );
      return true;
    } catch (error) {
      logStartup("Registry registration failed: " + error.message);
      return false;
    }
  }

  function registerNativeMessagingHost() {
    try {
      const manifestPath = hostManifestPath();

      fs.mkdirSync(path.dirname(manifestPath), { recursive: true });

      const manifest = {
        name: HOST_NAME,
        description: "Cheezie Engine live Chess.com bridge",
        path: process.execPath,
        type: "stdio",
        allowed_origins: ["chrome-extension://" + EXTENSION_ID + "/"]
      };

      fs.writeFileSync(
        manifestPath,
        JSON.stringify(manifest, null, 2),
        "utf8"
      );

      const roots = [
        "HKCU\\Software\\Google\\Chrome",
        "HKCU\\Software\\Microsoft\\Edge",
        "HKCU\\Software\\BraveSoftware\\Brave-Browser",
        "HKCU\\Software\\Chromium"
      ];

      const registered = roots.filter(registerBrowser).length;
      logStartup("Native host registered for " + registered + " browser roots.");
      return registered > 0;
    } catch (error) {
      logStartup("Native host registration error: " + error.stack);
      return false;
    }
  }

  function startPipeServer() {
    try {
      pipeServer = net.createServer((socket) => {
        let buffer = "";
        socket.setEncoding("utf8");

        socket.on("data", (chunk) => {
          buffer += chunk;

          while (true) {
            const newline = buffer.indexOf("\n");
            if (newline === -1) break;

            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            if (!line) continue;

            let message;
            try {
              message = JSON.parse(line);
            } catch {
              continue;
            }

            const id = message.id;
            const payload = message.payload;

            if (
              payload?.type === "position" &&
              typeof payload.fen === "string"
            ) {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send("cheezie-position", payload);
                mainWindow.webContents.send("cheezie-bridge-status", {
                  connected: true,
                  source: "Chess.com"
                });
              }

              socket.write(
                JSON.stringify({
                  id,
                  response: { type: "ack", accepted: true }
                }) + "\n"
              );
            } else {
              socket.write(
                JSON.stringify({
                  id,
                  response: { type: "ack", accepted: false }
                }) + "\n"
              );
            }
          }
        });
      });

      pipeServer.on("error", (error) => {
        logStartup("Named pipe error: " + error.stack);
      });

      pipeServer.listen(PIPE_NAME, () => {
        logStartup("Named pipe server started.");
      });
    } catch (error) {
      logStartup("Named pipe startup error: " + error.stack);
    }
  }

  function createWindow() {
    try {
      mainWindow = new BrowserWindow({
        width: 980,
        height: 760,
        minWidth: 760,
        minHeight: 600,
        show: false,
        backgroundColor: "#111318",
        title: "Cheezie Engine",
        webPreferences: {
          preload: path.join(__dirname, "preload.js"),
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: false
        }
      });

      mainWindow.once("ready-to-show", () => {
        mainWindow.show();
        logStartup("Main window ready.");
      });

      mainWindow.webContents.on("render-process-gone", (_event, details) => {
        logStartup("Renderer process gone: " + JSON.stringify(details));
      });

      mainWindow.webContents.on("did-fail-load", (_event, code, description) => {
        logStartup(
          "Page failed to load: " + code + " " + description
        );
      });

      mainWindow.loadFile(path.join(__dirname, "index.html")).catch((error) => {
        logStartup("loadFile failed: " + error.stack);
      });

      mainWindow.on("closed", () => {
        mainWindow = null;
      });

      return mainWindow;
    } catch (error) {
      logStartup("createWindow failed: " + error.stack);
      throw error;
    }
  }

  ipcMain.handle("get-engine-source", async () => {
    const enginePath = path.join(__dirname, "engine", "stockfish11.js");
    return fs.promises.readFile(enginePath, "utf8");
  });

  ipcMain.handle("open-extension-folder", async () => {
    const extensionPath = app.isPackaged
      ? path.join(process.resourcesPath, "extension")
      : path.join(__dirname, "extension");

    const result = await shell.openPath(extensionPath);
    if (result) throw new Error(result);
    return extensionPath;
  });

  process.on("uncaughtException", (error) => {
    logStartup("Uncaught exception: " + error.stack);
  });

  process.on("unhandledRejection", (reason) => {
    logStartup("Unhandled rejection: " + String(reason));
  });

  const gotLock = app.requestSingleInstanceLock();

  if (!gotLock) {
    app.quit();
  } else {
    app.whenReady().then(() => {
      logStartup("Application ready.");
      createWindow();

      registerNativeMessagingHost();
      startPipeServer();

      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow();
        }
      });
    });
  }

  app.on("window-all-closed", () => {
    if (pipeServer) {
      try {
        pipeServer.close();
      } catch {}
    }

    if (process.platform !== "darwin") app.quit();
  });
}
