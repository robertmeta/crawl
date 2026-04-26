# Accessible WebTiles Handoff

## Repository State

- Working directory: `/Users/rmelton/projects/robertmeta/crawl`
- Active branch: `master`
- Fork remote: `origin https://github.com/robertmeta/crawl.git`
- Upstream remote: `upstream https://github.com/crawl/crawl.git`
- Accessible client source: `crawl-ref/source/webserver/accessible-client/`
- Built accessible bundle: `crawl-ref/source/webserver/static/accessible/`

The current work replaces the WebTiles front end with a SolidJS client that aims
to look close to existing WebTiles while exposing the game, menus, messages, and
modal prompts through accessible HTML and live regions. The original Crawl
keybindings should remain authoritative; client-side behavior should avoid
introducing an out-of-game keyboard mode.

## Current Implementation

- SolidJS accessible client receives Crawl WebSocket messages and stores them in
  typed state helpers.
- Tile map, player stats, message log, inventory, menus, item descriptions, and
  text areas render in the new UI.
- Menu rows support keyboard hover, click activation, search/stash routing, and
  auto-scroll selected items into view.
- Message announcements batch multi-message updates so screen readers do not
  lose intermediate lines.
- Ordinary movement avoids noisy floor spam, while game messages and important
  state changes are preserved.
- Text-input protocol messages (`init_input`, `update_input`, `close_input`,
  and `title_prompt`) now open a centered modal. Enter submits to Crawl; Escape
  cancels and returns focus to the game surface.
- Generated static assets are checked in under `static/accessible/`; rebuild
  with Vite instead of editing them directly.

## Development Commands

Run Solid client commands from
`crawl-ref/source/webserver/accessible-client/`.

```sh
npm run dev
npm test
npm run typecheck
npm run build
```

Recent local ports used for testing:

- Accessible backend: `http://127.0.0.1:6080/`
- Vite HMR client: `http://127.0.0.1:6173/`
- Existing WebTiles comparison UI: `http://127.0.0.1:8080/`

Test account used locally: username `test`, password `test`.

## Verification Completed

- `npm test` passes: 38 Vitest tests.
- `npm run typecheck` passes.
- `npm run build` passes and refreshes `static/accessible/app.css` and
  `static/accessible/app.js`.
- Playwright smoke logged in as `test/test`, entered the running game, pressed
  `Ctrl-F`, and confirmed the focused modal text input appeared with the
  backend prompt.

## Next Work

- Continue side-by-side visual parity checks against existing WebTiles.
- Improve enemy-relative announcements without spamming ordinary movement.
- Expand history view support so blind users can reliably reread recent output.
- Ensure every backend menu/dialog path is represented in Solid state, even if
  the first pass only logs unsupported messages.
- Add broader Playwright coverage for inventory, store, search routing, history,
  and modal prompt flows.
