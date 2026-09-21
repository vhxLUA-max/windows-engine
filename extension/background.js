const HOST_NAME = "com.vhx.cheezie.engine";
let port = null;
let reconnectTimer = null;

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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
