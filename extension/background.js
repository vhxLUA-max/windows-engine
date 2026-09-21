const HOST_NAME = "com.vhx.cheezie.engine";
let port = null;
let reconnectTimer = null;
const injectedTabs = new Set();

function connect() {
  if (port) return;

  try {
    port = chrome.runtime.connectNative(HOST_NAME);

    port.onDisconnect.addListener(() => {
      port = null;
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, 1000);
      }
    });

    port.onMessage.addListener(() => {});
  } catch {
    port = null;
  }
}

async function injectBridge(tabId) {
  if (injectedTabs.has(tabId)) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      files: ["bridge.js"]
    });
    injectedTabs.add(tabId);
  } catch {}
}

chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "CHEEZIE_INIT" && sender.tab?.id != null) {
    injectBridge(sender.tab.id).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type !== "CHEEZIE_POSITION") return;

  connect();

  if (!port) {
    sendResponse({ ok: false });
    return true;
  }

  try {
    port.postMessage({
      type: "position",
      fen: message.fen,
      isGameOver: !!message.isGameOver,
      username: message.username || null
    });
    sendResponse({ ok: true });
  } catch {
    sendResponse({ ok: false });
  }

  return true;
});

connect();
