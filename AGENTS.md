# Doodle District — Base44 Dev Notes

## What this is
A static browser game ("Doodle District") built with vanilla HTML/CSS/JS + Three.js (vendored in `vendor/`, wired up via importmap) and PeerJS for multiplayer. No build step, no backend, no package manager.

As of **4.0.0** the repo deliberately runs the **classic build** — the same look and
gameplay as the original `doodleshooter.vercel.app` deployment (title panel, START /
PLAY ONLINE, two maps, four weapons). The later add-on layers (menu tabs, loadout,
profile/XP, party modes, streaks, tutorial, cloud sync) were removed; see the
`[4.0.0]` entry in `CHANGELOG.md` for what to restore if you want them back.

## Running it
- `docker compose -f docker-compose.base44.yml up -d` — serves static files via nginx on port 3000.
- nginx runs as `user root;` (custom `nginx.base44.conf`) because the repo root dir has 700 permissions; the default nginx worker user cannot read it.
- `python3 serve.py 3000` works too, and does the same `no-store` on `index.html`.
- No environment variables or secrets needed.
- three.js and PeerJS are vendored under `vendor/` and served locally, so the game boots with no internet access. Only Google Fonts is still remote, and it is loaded non-blocking (purely cosmetic).

## Files
- `index.html` — entry point. Plain static import map pointing three.js at
  the bundled copy in `vendor/` (vendored r170, the exact revision the classic
  build used to pull from the CDN). No loader, no loading screen: the page goes
  straight to the game's own main menu. Assets are cache-busted with `?v=`.
- `vendor/` — bundled three.js + PeerJS (with their licenses). Keep the paths
  in the index.html import map and the `?v=` in sync when upgrading.
- `game.7LCERBLR.js` — the game engine (minified ES module, imports three).
  Byte-identical to the original v0.1 upload, so it is unpatched: no addons and
  no `window.__DD_gameBooted` flag (that was introduced with the later builds).
- `style.A4A8BF44.css` — the classic styles (menu panel, HUD, crosshair, scope).
- `.base44/`, `nginx.base44.conf`, `docker-compose.base44.yml`, `serve.py` —
  static-serving infra only; nothing here affects how the game looks.
- `_vercel/insights/script.js.br` — only requested when hosted on a `*.vercel.app` domain, so it no longer 404s elsewhere

## Editing
Changes to any file are immediately visible on page reload — no build or restart needed. Call `reload_preview` after edits if live reload isn't showing.
Bump the `?v=` in `index.html` whenever you change a CSS/JS file, or cached copies
will keep showing the previous build.
