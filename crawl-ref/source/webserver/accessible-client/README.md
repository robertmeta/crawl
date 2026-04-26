# Accessible WebTiles Client

This is the experimental SolidJS client for the accessible WebTiles rewrite.
It builds static files into `../static/accessible/`, which are served by the
Python WebTiles server at `/accessible`.

## Commands

```sh
npm install
npm run typecheck
npm test
npm run build
```

Run the existing WebTiles server from `crawl-ref/source/` and open
`http://localhost:8080/accessible`.

On this macOS setup, use a WebTiles venv created from Python 3.11 or another
Python earlier than 3.13. The Homebrew `python3` default may be 3.14, where the
stdlib `crypt` module is gone and the fallback `crypt-r` package can require
system headers that are not available.

The first implementation keeps the current server, WebSocket endpoint, game
process handling, and DCSS command protocol. It replaces only the browser UI
surface.
