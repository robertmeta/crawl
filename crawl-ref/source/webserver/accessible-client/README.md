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
`http://localhost:6080/accessible`.

## Hot Reload

For UI development without rebuilding static assets, start Vite:

```sh
npm run dev
```

Then either open `http://127.0.0.1:6173/` directly, or set this in
`webserver/config.py` or a local config override and restart the Python
WebTiles server:

```py
accessible_client_dev_server = "http://127.0.0.1:6173"
```

When opened directly through Vite, `/socket`, `/gamedata`, and `/static` proxy
to `http://127.0.0.1:6080` by default. Override that with
`VITE_CRAWL_PROXY_TARGET=http://127.0.0.1:9090 npm run dev` if the WebTiles
server is on another port.

When opened through `http://localhost:6080/accessible`, the page still connects
to the normal WebTiles `/socket`, but Solid modules and CSS are loaded from Vite
with HMR. Most UI/CSS edits update in place without logging out or restarting
the game.

On this macOS setup, use a WebTiles venv created from Python 3.11 or another
Python earlier than 3.13. The Homebrew `python3` default may be 3.14, where the
stdlib `crypt` module is gone and the fallback `crypt-r` package can require
system headers that are not available.

The first implementation keeps the current server, WebSocket endpoint, game
process handling, and DCSS command protocol. It replaces only the browser UI
surface.
