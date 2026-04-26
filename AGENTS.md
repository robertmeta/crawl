# Repository Guidelines

## Project Structure & Module Organization

This repository is the Dungeon Crawl Stone Soup source tree. Most active work
lives in `crawl-ref/source/`. Core game code is C++ in that directory, with
generated data and definitions under `crawl-ref/source/dat/`. Lua game and map
logic lives in `dat/clua/`, `dat/dlua/`, and `dat/des/`. Tiles and image assets
are in `crawl-ref/source/rltiles/` and `crawl-ref/source/dat/tiles/`. Tests are
split between Catch2 unit tests in `crawl-ref/source/catch2-tests/` and scripted
stress/regression tests in `crawl-ref/source/test/`. WebTiles server/client code
is under `crawl-ref/source/webserver/`.

## Build, Test, and Development Commands

Run build commands from `crawl-ref/source/`.

- `make -j4` builds the console game binary as `./crawl`.
- `make -j4 TILES=y` builds the SDL tiles version.
- `make debug` or `make debug-lite` builds with debug settings.
- `make test` runs the canned stress test suite.
- `make catch2-tests` builds and runs the Catch2 unit tests.
- `make docs` regenerates generated documentation.
- `make clean` removes build products.

If bundled dependencies are needed, run `git submodule update --init` at the
repository root before building.

## Coding Style & Naming Conventions

Follow `crawl-ref/docs/develop/coding_conventions.md`. Use spaces only, 4-space
indentation, Unix line endings, one final newline, and keep lines near 80
columns. C++ uses braces on their own lines. New Lua should also use 4-space
indentation, even where older files differ. Use descriptive names consistent
with nearby code. Before publishing, run `crawl-ref/source/util/checkwhite` or
install the provided git hooks from `crawl-ref/docs/develop/git/`.

## Testing Guidelines

Add focused Catch2 tests in `crawl-ref/source/catch2-tests/test_*.cc` for C++
logic when practical. Use `crawl-ref/source/test/*.lua` or `test/stress/*.rc`
for game-behavior and regression coverage. Run the narrowest relevant test
first, then `make test` or `make catch2-tests` before submitting changes with a
larger blast radius.

## Commit & Pull Request Guidelines

History uses short imperative commit titles such as `Fix tile variation duplicate detection`.
Keep titles specific and under 72 characters; add a body explaining why when
the title is not enough. Reference GitHub issues as `#1234` and credit reporters
when relevant. Open PRs against the upstream `crawl/crawl` repository with a
clear description, linked issues, test results, and screenshots or tile previews
for visual changes. Discuss large gameplay changes in `#crawl-dev` before
investing heavily.
