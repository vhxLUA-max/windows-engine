const net = require("net");
const { spawn } = require("child_process");

const PIPE_NAME = "\\\\.\\pipe\\cheezie-engine-v1";

let pipe = null;
let pipeBuffer = "";
let connecting = false;
let inputBuffer = Buffer.alloc(0);
let nextId = 1;
const pending = new Map();

function writeNativeMessage(value) {
  const data = Buffer.from(JSON.stringify(value), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(data.length, 0);
  process.stdout.write(Buffer.concat([header, data]));
}

function log(message) {
  process.stderr.write("[Cheezie Native Host] " + message + "\n");
}

function connectPipe() {
  if (pipe || connecting) return;
  connecting = true;

  const socket = net.connect(PIPE_NAME);
  socket.setEncoding("utf8");

  socket.on("connect", () => {
    connecting = false;
    pipe = socket;
    log("Connected to Cheezie Engine.");

    for (const [id, item] of pending) {
      socket.write(JSON.stringify({ id, payload: item.payload }) + "\n");
    }
  });

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

      if (message.id == null || !pending.has(message.id)) continue;

      pending.delete(message.id);
      writeNativeMessage(message.response || { type: "ack", id: message.id });
    }
  });

  socket.on("error", () => {
    connecting = false;
    if (pipe === socket) pipe = null;
    setTimeout(connectPipe, 250);
  });

  socket.on("close", () => {
    connecting = false;
    if (pipe === socket) pipe = null;
    setTimeout(connectPipe, 250);
  });
}

function launchGui() {
  try {
    const child = spawn(process.execPath, [], {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.unref();
    log("Launched Cheezie Engine GUI.");
  } catch (error) {
    log("Failed to launch GUI: " + error.message);
  }
}

function sendToGui(payload) {
  const id = nextId++;
  pending.set(id, { payload });

  let attempts = 0;

  const attempt = () => {
    if (pipe) {
      pipe.write(JSON.stringify({ id, payload }) + "\n");
      return;
    }

    attempts++;
    if (attempts === 8) launchGui();

    if (attempts < 40) {
      connectPipe();
      setTimeout(attempt, 250);
    } else {
      pending.delete(id);
      writeNativeMessage({
        type: "error",
        error: "Cheezie Engine GUI could not be reached."
      });
    }
  };

  connectPipe();
  attempt();
}

function handleMessage(message) {
  if (!message || typeof message !== "object") return;

  if (message.type === "position") {
    sendToGui(message);
  } else if (message.type === "ping") {
    writeNativeMessage({ type: "pong" });
  }
}

process.stdin.on("data", (chunk) => {
  inputBuffer = Buffer.concat([inputBuffer, chunk]);

  while (inputBuffer.length >= 4) {
    const length = inputBuffer.readUInt32LE(0);

    if (length > 4 * 1024 * 1024) {
      log("Rejected oversized message.");
      process.exit(1);
      return;
    }

    if (inputBuffer.length < length + 4) return;

    const body = inputBuffer.subarray(4, length + 4);
    inputBuffer = inputBuffer.subarray(length + 4);

    try {
      handleMessage(JSON.parse(body.toString("utf8")));
    } catch (error) {
      log("Invalid message: " + error.message);
    }
  }
});

process.stdin.resume();
connectPipe();
