# Doodle District — Base44 Dev Notes

## What this is
A static browser game ("Doodle District") built with vanilla HTML/CSS/JS + Three.js (vendored in `vendor/`, wired up via importmap) and PeerJS for multiplayer. No build step, no backend, no package manager.

## Running it
- `docker compose -f docker-compose.base44.yml up -d` — serves static files via nginx on port 3000.
- nginx runs as `user root;` (custom `nginx.base44.conf`) because the repo root dir has 700 permissions; the default nginx worker user cannot read it.
- No environment variables or secrets needed.
- three.js and PeerJS are vendored under `vendor/` and served locally, so the game boots with no internet access. Only Google Fonts is still remote, and it is loaded non-blocking (purely cosmetic).

## Files
- `index.html` — entry point (import map for three.js is injected by an inline
  snippet so the boot overlay can switch between the bundled copy and the
  jsdelivr/unpkg CDNs; localStorage `dd_cdn`, default `local`)
- `vendor/` — bundled three.js + PeerJS (with their licenses). Keep the paths
  in the index.html import map and the `?v=` in sync when upgrading.
- `boot.js` — boot watchdog + error overlay (classic script, runs first).
  There is deliberately no loading screen: it renders nothing during a normal
  load and builds its overlay lazily, only on failure. Diagnoses blank-page
  causes (file://, old browser, no WebGL2, engine files missing/blocked) and
  watchdogs `window.__DD_gameBooted`.
- `game.7LCERBLR.js` — the game engine (minified ES module, imports three).
  Sets `window.__DD_gameBooted=true` as its last step — do not remove.
- `menu-system.js` — extended menu UI (tabs, loadout, profile, settings)
- `style.A4A8BF44.css`, `menu-addon.css` — styles
- `assets/` — images (banner)
- `_vercel/insights/script.js.br` — only requested when hosted on a `*.vercel.app` domain, so it no longer 404s elsewhere

## Editing
Changes to any file are immediately visible on page reload — no build or restart needed. Call `reload_preview` after edits if live reload isn't showing.
