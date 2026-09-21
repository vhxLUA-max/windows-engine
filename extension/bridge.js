(() => {
  "use strict";

  function getGameObject() {
    if (window.game) return window.game;

    const legacyBoard = document.querySelector(".board");
    if (legacyBoard?.game) return legacyBoard.game;

    const modernBoard = document.querySelector("wc-chess-board");
    if (modernBoard?.game) return modernBoard.game;

    return null;
  }

  function readPosition() {
    const game = getGameObject();

    if (!game || typeof game.getFEN !== "function") {
      return null;
    }

    let fen;
    try {
      fen = game.getFEN();
    } catch {
      return null;
    }

    return {
      fen,
      isGameOver:
        typeof game.isGameOver === "function"
          ? !!game.isGameOver()
          : false,
      username: window?.context?.user?.username || null
    };
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data?.type !== "CHEEZIE_GET_FEN") return;

    const position = readPosition();
    if (!position) return;

    window.postMessage({
      type: "CHEEZIE_FEN",
      ...position
    }, "*");
  });
})();
