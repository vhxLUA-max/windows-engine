const fs = require("fs");
const path = require("path");
const https = require("https");

const ENGINE_URL =
  "https://raw.githubusercontent.com/vhxLUA-max/cheeezie-engine/6969f1fec50caee0cfe7583d9d41f9447b759be3/lib/stockfish11.js";
const destination = path.join(__dirname, "..", "engine", "stockfish11.js");

function download(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      const status = response.statusCode || 0;

      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        response.resume();
        if (redirectsLeft <= 0) {
          reject(new Error("Too many redirects while downloading the engine."));
          return;
        }
        resolve(download(response.headers.location, redirectsLeft - 1));
        return;
      }

      if (status !== 200) {
        response.resume();
        reject(new Error("Engine download failed with HTTP " + status));
        return;
      }

      const chunks = [];
      let bytes = 0;

      response.on("data", (chunk) => {
        chunks.push(chunk);
        bytes += chunk.length;
      });

      response.on("end", () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length < 1000000) {
          reject(new Error("Downloaded engine payload is unexpectedly small."));
          return;
        }
        resolve(buffer);
      });
    });

    request.setTimeout(30000, () => {
      request.destroy(new Error("Engine download timed out."));
    });

    request.on("error", reject);
  });
}

(async () => {
  fs.mkdirSync(path.dirname(destination), { recursive: true });

  if (fs.existsSync(destination)) {
    const stat = fs.statSync(destination);
    if (stat.size >= 1000000) {
      console.log("Stockfish 11 already present: " + stat.size + " bytes");
      process.exit(0);
    }
  }

  console.log("Downloading pinned Stockfish 11 payload...");
  const buffer = await download(ENGINE_URL);
  fs.writeFileSync(destination, buffer);
  console.log("Saved Stockfish 11 payload: " + buffer.length + " bytes");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
