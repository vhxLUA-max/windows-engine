# Cheezie Engine for Windows

Standalone Windows version of the Cheezie Engine analysis core.

This first desktop build:
- runs as a portable Windows executable
- embeds the Stockfish 11 JavaScript engine payload inside the app package
- accepts FEN directly
- supports depth, MultiPV, threads, and hash
- displays best move, evaluation, depth, nodes, and principal variations
- does not require Chrome
- does not require a browser extension
- does not run a localhost API
- does not render a chessboard

Local build:
1. Install Node.js 20 or newer.
2. Run npm install.
3. Run npm run dist.
4. The portable EXE appears in dist/.

The Windows app is a standalone rework of the engine-analysis portion of vhxLUA-max/cheeezie-engine. Browser-extension UI and browser-only APIs are intentionally excluded.
