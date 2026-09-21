(() => {
  "use strict";

  let injected = false;
  let lastFen = "";

  function injectBridge() {
    if (injected) return;
    injected = true;

    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("bridge.js");
    script.async = false;

    const root = document.head || document.documentElement;
    root.appendChild(script);

    script.addEventListener("load", () => script.remove(), { once: true });
  }

  function requestFen() {
    window.postMessage({ type: "CHEEZIE_GET_FEN" }, "*");
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    const data = event.data;
    if (!data || data.type !== "CHEEZIE_FEN") return;
    if (!data.fen || data.fen === lastFen) return;

    lastFen = data.fen;

    chrome.runtime.sendMessage({
      type: "CHEEZIE_POSITION",
      fen: data.fen,
      isGameOver: !!data.isGameOver,
      username: data.username || null
    });
  });

  injectBridge();
  requestFen();
  setInterval(requestFen, 350);
})();
