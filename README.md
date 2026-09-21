# Cheezie Engine for Windows

Standalone Windows build of the Cheezie Engine analysis core. The Chess.com browser extension is distributed separately.

## Windows EXE

The app:
- runs as a portable Windows executable
- bundles the Stockfish 11 JavaScript engine into the packaged application
- accepts FEN directly
- supports depth, MultiPV, threads, and hash
- displays best move, evaluation, depth, nodes, and principal variations
- has no chessboard UI
- does not require a localhost HTTP API
- does not bundle the browser extension

## Live Chess.com analysis

The live architecture is still:

Chess.com board -> separate browser extension -> Native Messaging -> Cheezie Engine EXE -> Stockfish

The extension only reads the current Chess.com position and sends FEN updates. The EXE performs the engine analysis.

The EXE registers the Native Messaging host for Chrome, Edge, Brave, and Chromium under the current Windows user account when it starts. The extension can therefore be installed independently and does not need to be copied into the EXE directory.

## Installation

### 1. Install the Windows EXE

Download the latest successful artifact named **Cheezie-Engine-Windows** from GitHub Actions and extract the EXE.

Run the EXE once. This starts the desktop analyzer and registers the Native Messaging host.

### 2. Install the separate extension

Download the latest successful artifact named **Cheezie-Engine-Extension**.

Extract the ZIP.

In Chrome/Edge/Brave:
1. Open the extensions page.
2. Enable Developer mode.
3. Select **Load unpacked**.
4. Select the extracted extension folder.
5. Open or refresh a Chess.com game.

### 3. Use live mode

Open Cheezie Engine and click **Live: OFF** so it becomes **Live: ON**.

The FEN field should update automatically as the Chess.com position changes, and the engine will analyze the new position.

## Local development

Requirements:
- Node.js 20+
- npm

Run:

```text
npm install
npm start
```

Build the portable Windows executable:

```text
npm run dist
```

The EXE is written to `dist/`.

## Extension source

The extension source remains under `extension/` only as the source for the separate extension build artifact. It is **not** copied into the Windows app.

A dedicated extension repository can use these same four files:
- `extension/manifest.json`
- `extension/background.js`
- `extension/content.js`
- `extension/bridge.js`

## Source relationship

This repository is a standalone desktop rework of the engine-analysis portion of `vhxLUA-max/cheeezie-engine`. Browser-extension UI and unrelated browser automation features are intentionally excluded from the desktop core.
