# Cheezie Engine for Windows

Standalone Windows version of the Cheezie Engine analysis core with an optional live Chess.com bridge.

## Desktop analyzer

The app:
- runs as a portable Windows executable
- bundles the Stockfish 11 JavaScript engine into the packaged application
- accepts FEN directly
- supports depth, MultiPV, threads, and hash
- displays best move, evaluation, depth, nodes, and principal variations
- does not require a localhost HTTP API
- does not render a chessboard

## Live Chess.com analysis

Pipeline:

Chess.com board -> small browser bridge extension -> Native Messaging -> Cheezie Engine EXE -> Stockfish

Chess.com documents FEN as the notation for a single position, including side to move, castling rights, and move information. citeturn805548search0turn655414search6

The bridge extension only reads the current position. It does not contain an engine and does not automate moves.

Native Messaging is used instead of a localhost server. Chromium browsers launch the registered native host and communicate over stdin/stdout; on Windows the host is registered through the current-user registry. citeturn351273search1turn459835search1

## Using live mode

1. Download the latest successful GitHub Actions artifact named "Cheezie-Engine-Windows".
2. Extract the ZIP and run Cheezie Engine.exe once.
3. Click "Open Bridge Folder" in the app.
4. In your Chromium browser, open the extensions page and enable Developer mode.
5. Choose "Load unpacked".
6. Select the extension folder that the app opened.
7. Open or refresh a Chess.com game.
8. In Cheezie Engine, click "Live: OFF" so it becomes "Live: ON".
9. The FEN field should update automatically when the Chess.com position changes, and the engine will analyze the new position.

The bridge is currently designed around Chess.com's page-side game object and FEN access, using the same basic page-world approach already used by the source Cheezie/ChessHv3 code.

## Local development

Requirements:
- Node.js 20+
- npm

Commands:

npm install
npm start

Build the portable Windows executable:

npm run dist

The EXE is written to dist/.

## Source relationship

This repository is a standalone desktop rework of the engine-analysis portion of vhxLUA-max/cheeezie-engine. Browser-extension UI and unrelated browser automation features are intentionally excluded from the desktop core.
