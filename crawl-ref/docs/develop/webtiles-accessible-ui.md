# Accessible WebTiles UI Goals

## Purpose

Build a new WebTiles game interface that can replace the current browser UI
while using the existing DCSS webserver, WebSocket connection, game process
management, and game command model. The first priority is full usability by
blind players with screen readers. Visual presentation remains important, but
no game-critical state or action may be available only through canvas, colour,
mouse interaction, or spatial visual inspection.

## Primary Goals

1. Make the complete web interface usable with screen readers.
2. Preserve the existing DCSS keyboard command set wherever possible.
3. Reuse the existing WebTiles backend and WebSocket protocol rather than
   replacing server-side game support.
4. Treat the game's text stream as the main accessibility surface, while
   improving structure, focus management, and announcements around it.
5. Keep visual and accessible views synchronized from the same protocol state.
6. Make accessibility testable during development, not a late audit item.

## Target Support

The required assistive technology and browser targets are NVDA, VoiceOver,
Chrome, Firefox, and Safari. The UI should be a single high-quality interface
for all players, not a separate screen-reader-only client. Accessibility must
come from semantic structure, stable focus, useful labels, keyboard-compatible
controls, and disciplined announcements rather than from a parallel mode.

## Scope

The replacement UI must cover everything required to play on WebTiles: lobby,
login/account flows, game selection, RC editor, the in-game client, chat,
watching/spectating, reconnect and close states, and save/quit flows. The
in-game client includes messages, prompts, menus, inventory, targeting, map
review, stats, monster list, modal descriptions, text input, and connection
state.

## Existing Surfaces To Reuse

The current server lives in `crawl-ref/source/webserver/`. The Tornado app and
WebSocket handling are in `webtiles/`, while the current version-specific game
UI is in `game_data/templates/game.html` and `game_data/static/`. The current
client already receives structured messages such as game messages, text-area
updates, menus, input prompts, player stats, monster lists, map/view updates,
and option changes. The new UI should start by wrapping those protocol events
in a clearer client-side state model, then render accessible DOM from that
state.

## Accessibility Requirements

- Screen-reader users must be able to start, play, save, quit, recover from
  disconnects, and handle prompts without sighted assistance.
- The active prompt, mode, and expected input must always be programmatically
  exposed.
- Game messages should be available as a stable log and announced through a
  controlled live region, with throttling to avoid speech flooding.
- Menus and dialogs must use semantic DOM, predictable focus movement, labels,
  and explicit selected/current states.
- Canvas may be used for sighted presentation, but equivalent text or semantic
  DOM must expose all necessary state.
- Colour-coded status must also have text labels.
- Pointer-only controls must have keyboard and screen-reader equivalents.
- Focus must never be lost silently during redraws, mode switches, reconnects,
  or `--more--` prompts.

## Map Accessibility

Crawl already has strong text-first foundations: keyboard exploration, tile and
feature descriptions, targeting feedback, message history, and structured menus.
The first version should expose those existing capabilities reliably through the
web UI. A friendlier web-side map summary and full-map description layer is
desirable, but can be a second milestone after the core play loop is accessible.

## Keyboard Compatibility

The UI should pass existing DCSS key commands through to the game with minimal
translation. Browser-level conflicts should be documented individually before
adding any new bindings. New UI-specific shortcuts, if unavoidable, should be
optional, discoverable, and must not shadow core Crawl commands during play.

## Planned Frontend Stack

Use a new TypeScript frontend built with Vite and SolidJS, tested with Vitest,
Solid Testing Library, Testing Library user-event, Playwright, and axe-core.
Use Kobalte or Ark UI for complex accessible primitives after a small proof of
concept compares their behavior in the WebTiles context.

Rationale:

- TypeScript gives the WebSocket protocol adapter explicit message and state
  types, which should reduce accidental accessibility regressions.
- Vite can build static assets that fit the current Tornado/WebTiles serving
  model without requiring server-side rendering or a Node production service.
- Solid's fine-grained reactivity maps well to WebTiles protocol updates:
  appended messages, stat changes, prompt changes, focused menu items, cursor
  movement, monster-list changes, and individual map cells can update without
  treating the whole interface as dirty.
- Solid stores/signals should represent the client-side game state produced by
  the protocol adapter; renderers should subscribe only to the state slices they
  need.
- Kobalte or Ark UI should be used for complex widgets such as dialogs, menus,
  tabs, popovers, and listbox-like controls; native HTML should remain the
  default when it is sufficient.
- Testing Library encourages tests based on accessible roles and names, which
  aligns with the actual contract screen-reader users depend on.
- Playwright can cover Chrome, Firefox, and WebKit/Safari-like behavior and can
  run axe checks inside real browser flows.

Avoid SolidStart or another full app framework at first. The existing Python
server already owns routing, accounts, game process management, and WebSocket
setup. The new stack should produce static bundles that can be mounted beside
or instead of the current RequireJS/jQuery client.

## Architecture Direction

Create a protocol adapter that consumes existing WebSocket messages and updates
an explicit client-side game state in Solid stores/signals. Build renderers on
top of that state: semantic DOM for accessible interaction and optional visual
renderers for map, tiles, minimap, and status presentation. Avoid making the
canvas renderer the source of truth. Prefer progressive replacement so existing
server behavior can continue to run while the new UI is developed and compared
against the old one.

## Testing Strategy

Automated checks should include unit tests for protocol-to-state transforms,
keyboard event forwarding, focus behavior, and message announcement throttling.
Browser tests should cover start-game flow, prompts, menus, message log, and
disconnect/reconnect behavior across Chrome, Firefox, and WebKit. Accessibility
checks should combine Solid Testing Library role/name assertions, axe scans,
and manual NVDA and VoiceOver passes, because automated tools cannot prove
playability for blind users.

## Open Questions

1. How much map information must be announced automatically each turn versus
   available on demand through review commands?
2. What announcement verbosity should be default for messages, stat changes,
   nearby monsters, damage, prompts, and targeting feedback?
3. Do we need compatibility with older hosted game versions, or only current
   trunk and future releases?
4. What is the preferred acceptance test for "blind-playable": a scripted
   checklist, named screen-reader/browser combinations, or review by blind DCSS
   players?
5. Which lobby/admin surfaces, if any, can be deferred without blocking a
   playable public beta?
6. Which Solid accessible primitive library, Kobalte or Ark UI, best handles
   Crawl's menu, dialog, popover, and focus-management requirements?

## First Milestones

1. Inventory the existing WebSocket message types and identify which ones
   already contain enough text or structure for accessible rendering.
2. Create a Vite/Solid/TypeScript static bundle mounted beside the existing
   client without changing server-side game process behavior.
3. Build a minimal alternate game client that connects to the existing server,
   forwards keys, renders messages, prompts, and stats semantically, and can
   complete a simple start/save/quit flow.
4. Add accessible lobby/login, game selection, and RC editor flows.
5. Add accessible menu and text-input handling.
6. Add map, targeting, monster, and status review surfaces.
7. Run manual screen-reader play sessions and feed the findings back into the
   state model and announcement rules.
