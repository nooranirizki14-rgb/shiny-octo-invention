# Doodle District — Base44 Dev Notes

## What this is
A static browser game ("Doodle District") built with vanilla HTML/CSS/JS + Three.js (loaded from CDN via importmap) and PeerJS for multiplayer. No build step, no backend, no package manager.

## Running it
- `docker compose -f docker-compose.base44.yml up -d` — serves static files via nginx on port 3000.
- nginx runs as `user root;` (custom `nginx.base44.conf`) because the repo root dir has 700 permissions; the default nginx worker user cannot read it.
- No environment variables or secrets needed. All dependencies (three.js, peerjs, Google Fonts) load from CDNs at runtime.

## Files
- `index.html` — entry point
- `game.7LCERBLR.js` — the game engine (minified ES module, imports three)
- `menu-system.js` — extended menu UI (tabs, loadout, profile, settings)
- `style.A4A8BF44.css`, `menu-addon.css` — styles
- `assets/` — images (banner)
- `_vercel/insights/script.js.br` — referenced in HTML but will 404; harmless (Vercel Analytics only works on Vercel)

## Editing
Changes to any file are immediately visible on page reload — no build or restart needed. Call `reload_preview` after edits if live reload isn't showing.
