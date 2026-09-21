(() => {
  "use strict";

  const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  const el = {
    fen: document.getElementById("fen"),
    depth: document.getElementById("depth"),
    multipv: document.getElementById("multipv"),
    threads: document.getElementById("threads"),
    hash: document.getElementById("hash"),
    analyze: document.getElementById("analyze"),
    stop: document.getElementById("stop"),
    startpos: document.getElementById("startpos"),
    clear: document.getElementById("clear"),
    status: document.getElementById("status"),
    bestmove: document.getElementById("bestmove"),
    evaluation: document.getElementById("evaluation"),
    currentDepth: document.getElementById("current-depth"),
    nodes: document.getElementById("nodes"),
    lines: document.getElementById("lines"),
    log: document.getElementById("log")
  };

  let worker = null;
  let initialized = false;
  let analyzing = false;
  let lastInfo = new Map();

  const setStatus = (text) => { el.status.textContent = text; };

  function addLog(line) {
    if (!line) return;
    el.log.textContent += line + "\n";
    el.log.scrollTop = el.log.scrollHeight;
  }

  function resetResults() {
    el.bestmove.textContent = "—";
    el.evaluation.textContent = "—";
    el.currentDepth.textContent = "—";
    el.nodes.textContent = "—";
    el.lines.innerHTML = "";
    lastInfo = new Map();
  }

  function parseInfo(line) {
    const tokens = line.trim().split(/\s+/);
    const result = {};
    const depthIndex = tokens.indexOf("depth");
    const multipvIndex = tokens.indexOf("multipv");
    const scoreIndex = tokens.indexOf("score");
    const pvIndex = tokens.indexOf("pv");
    const nodesIndex = tokens.indexOf("nodes");

    result.depth = depthIndex >= 0 ? Number(tokens[depthIndex + 1]) : null;
    result.multipv = multipvIndex >= 0 ? Number(tokens[multipvIndex + 1]) : 1;
    result.pv = pvIndex >= 0 ? tokens.slice(pvIndex + 1) : [];
    result.nodes = nodesIndex >= 0 ? Number(tokens[nodesIndex + 1]) : null;

    if (scoreIndex >= 0) {
      const type = tokens[scoreIndex + 1];
      const raw = Number(tokens[scoreIndex + 2]);
      const side = el.fen.value.trim().split(/\s+/)[1] || "w";

      if (type === "cp" && Number.isFinite(raw)) {
        const whiteCp = side === "b" ? -raw : raw;
        const value = (whiteCp / 100).toFixed(2);
        result.score = whiteCp >= 0 ? "+" + value : value;
      } else if (type === "mate" && Number.isFinite(raw)) {
        const whiteMate = side === "b" ? -raw : raw;
        result.score = "#" + whiteMate;
      }
    }

    return result;
  }

  function renderLines() {
    const rows = [...lastInfo.entries()].sort((a, b) => a[0] - b[0]).map(([mpv, info]) => {
      const line = document.createElement("div");
      line.className = "line";

      const no = document.createElement("span");
      no.textContent = String(mpv);

      const score = document.createElement("span");
      score.textContent = info.score || "—";

      const pv = document.createElement("span");
      pv.textContent = info.pv.join(" ");

      line.append(no, score, pv);
      return line;
    });

    el.lines.replaceChildren(...rows);
  }

  async function loadEngine() {
    try {
      const response = await fetch("./engine/stockfish11.js");
      if (!response.ok) throw new Error("Could not load engine payload (" + response.status + ")");

      const code = await response.text();
      const blob = new Blob([code], { type: "application/javascript" });
      worker = new Worker(URL.createObjectURL(blob));

      worker.onmessage = (event) => {
        const line = typeof event.data === "string" ? event.data : "";
        if (!line) return;

        if (line.startsWith("info")) {
          const info = parseInfo(line);
          if (Number.isFinite(info.depth)) el.currentDepth.textContent = String(info.depth);
          if (Number.isFinite(info.nodes)) el.nodes.textContent = info.nodes.toLocaleString();
          if (info.score) el.evaluation.textContent = info.score;
          lastInfo.set(info.multipv, info);
          renderLines();
          return;
        }

        if (line.startsWith("bestmove")) {
          el.bestmove.textContent = line.trim().split(/\s+/)[1] || "none";
          analyzing = false;
          el.analyze.disabled = false;
          el.stop.disabled = true;
          setStatus("Ready");
          return;
        }

        if (line === "uciok") {
          sendOptions();
          worker.postMessage("isready");
          return;
        }

        if (line === "readyok") {
          initialized = true;
          el.analyze.disabled = false;
          setStatus("Ready");
          return;
        }

        addLog(line);
      };

      worker.onerror = (event) => {
        addLog("ENGINE ERROR: " + (event.message || "unknown worker error"));
        setStatus("Engine error");
        initialized = false;
        analyzing = false;
        el.analyze.disabled = true;
        el.stop.disabled = true;
      };

      worker.postMessage("uci");
      setStatus("Initializing…");
    } catch (error) {
      setStatus("Failed to load engine");
      addLog(String(error));
    }
  }

  function sendOptions() {
    if (!worker) return;
    const multipv = Math.max(1, Math.min(10, Number(el.multipv.value) || 1));
    const threads = Math.max(1, Math.min(64, Number(el.threads.value) || 1));
    const hash = Math.max(1, Math.min(4096, Number(el.hash.value) || 128));

    worker.postMessage("setoption name MultiPV value " + multipv);
    worker.postMessage("setoption name Threads value " + threads);
    worker.postMessage("setoption name Hash value " + hash);
  }

  function analyze() {
    if (!initialized || !worker || analyzing) return;
    const fen = el.fen.value.trim();
    const depth = Math.max(1, Math.min(60, Number(el.depth.value) || 18));

    if (!fen) {
      setStatus("FEN is empty");
      return;
    }

    resetResults();
    sendOptions();
    addLog("position fen " + fen);

    analyzing = true;
    el.analyze.disabled = true;
    el.stop.disabled = false;
    setStatus("Analyzing…");

    worker.postMessage("stop");
    worker.postMessage("position fen " + fen);
    worker.postMessage("go depth " + depth);
  }

  function stop() {
    if (!worker || !analyzing) return;
    worker.postMessage("stop");
    analyzing = false;
    el.analyze.disabled = false;
    el.stop.disabled = true;
    setStatus("Stopped");
  }

  el.analyze.addEventListener("click", analyze);
  el.stop.addEventListener("click", stop);
  el.startpos.addEventListener("click", () => { el.fen.value = START_FEN; });
  el.clear.addEventListener("click", () => { resetResults(); el.log.textContent = ""; });

  loadEngine();
})();
