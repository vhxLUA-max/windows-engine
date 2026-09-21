(() => {
  "use strict";

  let lastFen = "";

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

  chrome.runtime.sendMessage({ type: "CHEEZIE_INIT" }, () => {
    setTimeout(requestFen, 150);
  });

  setInterval(requestFen, 350);
})();
