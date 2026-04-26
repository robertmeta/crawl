# Repository Guidelines

## Project Structure & Module Organization

This repository is the Dungeon Crawl Stone Soup source tree. Core C++ game code
lives in `crawl-ref/source/`; data, Lua, and map definitions live under
`crawl-ref/source/dat/`. Tiles and image assets are in `crawl-ref/source/rltiles/`
and `crawl-ref/source/dat/tiles/`. WebTiles server code is in
`crawl-ref/source/webserver/`. The new accessible SolidJS client lives in
`crawl-ref/source/webserver/accessible-client/src/`; its production output is
generated into `crawl-ref/source/webserver/static/accessible/`. C++ unit tests
are in `crawl-ref/source/catch2-tests/`; scripted regression and stress tests
are in `crawl-ref/source/test/`.

## Build, Test, and Development Commands

Run Crawl build commands from `crawl-ref/source/`.

- `make -j4` builds the console game as `./crawl`.
- `make WEBTILES=y -j4` builds a WebTiles-capable binary.
- `make test` runs the scripted stress suite.
- `make catch2-tests` builds and runs Catch2 unit tests.
- `python3 webserver/server.py` starts the local WebTiles server; activate the
  project venv first when one is in use.
- `npm run dev`, `npm run build`, `npm test`, and `npm run typecheck` run from
  `crawl-ref/source/webserver/accessible-client/` for the Solid client.

## Coding Style & Naming Conventions

Follow `crawl-ref/docs/develop/coding_conventions.md`: spaces only, 4-space
indentation, Unix line endings, final newline, and short lines near 80 columns
for C++/Lua. C++ braces go on their own lines. For Solid/TypeScript, prefer
typed protocol/state helpers, Solid signals/stores, and semantic markup. Do not
hand-edit generated files in `static/accessible/`; rebuild them with Vite.

## Testing Guidelines

Add focused Catch2 tests in `catch2-tests/test_*.cc` for C++ behavior and
scripted tests under `test/` for gameplay regressions. For the accessible client,
use Vitest for protocol/state/UI logic and Playwright or axe checks for browser
and accessibility coverage. Verify screen-reader-critical flows with NVDA or
VoiceOver plus Chrome, Firefox, and Safari when practical.

## Commit & Pull Request Guidelines

Use short imperative commit titles under 72 characters, matching history such as
`Fix tile variation duplicate detection`. Add a body when the reason or risk is
not obvious. PRs should describe behavior changes, link issues, list test
results, and include screenshots or tile previews for visual changes.

## Accessible WebTiles Notes

Preserve existing Crawl keybindings. Do not add an “out of game” keyboard mode;
unknown client-only shortcuts should announce `Not implemented: feature X`.
Live-region output should be minimal and tactical: preserve Crawl messages,
announce mode changes and useful enemy-relative positions, and avoid repeating
ordinary floor or movement details.
