# Changelog

## [2.3.2] - 2026-09-10 — Fix: secret weapons now actually look different in-game

### Fixed
- **Root cause of "the code doesn't work":** redeeming a code and equipping the new
  weapon always worked — but blade-slot weapons (katana) never sent their
  skin/ink/appearance data into the real in-game 3D model. Every blade, no matter
  which one was equipped (including the old GOLDEN EDGE), rendered identically in
  a match. Only the menu preview looked right.
- LIGHTSABER now renders in-game as a solid glowing plasma blade (colored to its
  ink), not the plain sketchy katana. Fixed for all blade skins going forward.
- LIGHTSABER's held 3D model now goes further than a recolor: in a real match it
  drops the crossguard, blood groove and grip wraps, and stretches into a longer,
  thinner blade — so it reads as its own weapon, not a reskinned katana.

## [2.3] - 2026-09-10 — Secret Weapons & the Lightsaber

### Added
- **LIGHTSABER** — a new secret blade-slot weapon. Instead of the usual sketchy
  ink blade it renders a plain glowing plasma edge (colored to its ink slot)
  with a simple hilt. Unlocked only by its own dedicated redeem code.
- **3 more easter-egg / secret weapons**, each unlockable only via its own
  dedicated redeem code (never bundled with anything else):
  - `THE ONE PEN` — secret rifle
  - `HALL PASS` — secret shotgun
  - `HALL MONITOR` — secret sniper
- **Redeem code table** (below) — the full, current list of every redeem code
  in the game and what it grants.

### Redeem code list

| Code | Unlocks | Description |
|---|---|---|
| `ZWOZGOLD` | Weapons: Golden Quill, Golden Blunderbuss, Golden Longshot, Golden Edge · Banner: Golden Doodle · +500 XP | The full golden arsenal + Golden Doodle banner + 500 XP |
| `DOODLEVIP` | Banner: Golden Doodle · Emblem: Doodle Royalty | Golden Doodle banner + Doodle Royalty emblem |
| `GHOSTMODE` | Emblems: Ghost Doodle, Grim Sketch · +150 XP | Ghost Doodle + Grim Sketch emblems + 150 XP |
| `FIRESTARTER` | Emblem: Hot Ink · Weapon: Golden Edge (katana) · +250 XP | Hot Ink emblem + Golden Edge katana + 250 XP |
| `WELCOME2026` | +300 XP | 300 XP, on the house |
| `USETHEFORCE` | Weapon: **Lightsaber** (blade, secret) | An elegant weapon, for a more civilized doodle |
| `DETENTION` | Weapon: **The One Pen** (rifle, secret) | Forged in the fires of detention |
| `NORUNNING` | Weapon: **Hall Pass** (shotgun, secret) | Never questioned, never denied |
| `EYESEVERYWHERE` | Weapon: **Hall Monitor** (sniper, secret) | Sees everything, forgets nothing |

## [2.2] - 2026-09-10 — Skyline, Golden Gear & Redeem Codes

### Added
- **New map: Doodle Skyline** (solo + online) — a rooftop-hopping map built from
  doodle skyscrapers of varying heights, connected by orange plank bridges and
  paper-stair fire escapes. Comes with water towers, roof vents, neon billboards,
  a central weathervane, orbiting paper planes/birds, and full FFA arena-spawn
  support. Shows up automatically in the in-game map picker alongside District,
  Jungle and Harbor.
- **Redeem code system**: a new REDEEM CODE box on the PROFILE tab. Codes are
  case-insensitive, single-use per browser, and can grant any mix of special
  weapons, special banners, special pfp emblems and bonus XP.
- **Profile photo upload**: pick any image from your device as your pfp. It's
  downscaled/cropped client-side and stored locally, shown on your profile banner
  and the top tab-bar chip. A "REMOVE PHOTO" button reverts to your emblem.
- **4 legendary "Golden" weapons** — Golden Quill (rifle), Golden Blunderbuss
  (shotgun), Golden Longshot (sniper), Golden Edge (katana) — one per weapon
  category, all redeem-code-only and shown locked in the LOADOUT list until unlocked.
- **3 new banners**: Ace Doodler (unlocks automatically at Level 5), Golden
  Doodle (redeem-code-only), and **Legend of the Page** — a full illustrated
  ink-and-paper artwork banner that unlocks automatically at Level 12.
- **4 new special pfp emblems**: Ghost Doodle, Doodle Royalty, Grim Sketch and
  Hot Ink — all redeem-code-only, shown locked in the emblem picker until unlocked.

### Improved
- Special pfp emblems now use plain hand-drawn-style glyphs instead of
  full-color emoji, so they stay on-brand with the doodle art style and render
  consistently across every device and font.

### Fixed
- **Crooked katanas fixed.** Curved blades (a handful of katana models) used to be
  built from two disjointed box segments glued together at an angle, which could
  render as visibly bent/broken swords. Blades are now built from a chain of
  segments that each start exactly where the previous one ended, so curved
  blades sweep smoothly and straight blades render exactly as before.
- Credits now correctly attribute the game to **Zwoz**.

## [0.2.1] - 2026-09-10 — Menu Tabs Stay Put

### Fixed
- **Menu tabs now actually open.** The tab bar was stopping the click event in the
  capture phase, so it never reached the tab buttons (and never bubbled back to the
  bar's own delegated handler). Every tab — LOADOUT / PROFILE / SETTINGS /
  CHANGELOG / CREDITS — was dead. Delegation now runs in the bubble phase; the
  game is still shielded, but only *after* our own widgets handled the event.
- **Tabs no longer disappear after a match.** They used to require `#soloBtn` in
  the game panel, so they were visible only on the main menu. The bar now lives on
  every screen the game shows: main menu, PLAY ONLINE, lobby, PAUSED, ERASED and
  the online win screen — and comes back by itself the moment a match ends.
  It is hidden only while you are actually playing, so it never eats mouse input
  or pointer lock mid-match.
- Clicks in the transparent strip beside the tab bar fell through to the game's
  full-screen "click anywhere to play" layer and started/restarted a run. That
  band is now swallowed by the tab bar's guard.
- The 3D weapon preview could not be drag-rotated and the sensitivity slider could
  not be dragged: a capture-phase `pointerdown` shield blocked the events before
  they reached those elements.
- If the game rebuilds its HUD/menu nodes the addon kept observing the detached
  elements; observers now re-attach to the live nodes (plus a 1.5s re-assert).

### Improved
- Tab bar height is measured live and published as `--dd-tabs-h`, so the game menu
  is never hidden under a wrapped tab bar on phones.
- The bar/overlay/toasts are stacked above every game layer (`.board` used to sit at
  `z-index: 1000`).
- `ESC` closes an open tab or the solo setup screen.
- Profile/level numbers refresh as soon as a match is scored.

## [0.2.0] - 2026-09-10 — Loadouts, Harbor & Progression

### Added
- **Loadout tab**: 40 weapons — 10 rifles, 10 shotguns, 10 snipers, 10 blades
  - Every weapon has unique stats (damage, magazine, fire rate, spread, reload…)
  - 3D model preview with drag-to-rotate + auto-spin, and 3D thumbnails on every card
  - Weapon ink tints carry into the match; loadout applies on every match start (solo + online)
- **Solo setup screen**: pick before every run
  - **Mode**: Survival (classic) / Blitz (faster spawns, bigger crowds, +25% score) / Juggernaut (half the enemies, DOUBLE health, 2× score)
  - **Difficulty**: Easy (150 HP, weaker enemies, 0.75× score) / Medium (classic) / Hard (1.6× enemy HP, 1.5× damage, 100 HP, 1.5× score)
  - Start at wave 1 or any unlocked checkpoint
- **Profile tab**: callsign, emblem picker, 8 unlockable-style banners
  - **Level & XP system**: earn XP from every match (kills, waves, score, wins)
  - Harder modes/difficulties multiply XP; level-up celebrations in-game
  - Tracks matches, kills, best score, best wave, online wins
- **New map: Doodle Harbor** (solo + online)
  - Working lighthouse with rotating beam, 2 climbable cranes with grapple hooks
  - Sailboats, warehouse with roof access, container yard, docks, buoys, breakable crates & pushable props
  - Custom sunset ink style, gulls, paper planes, full arena-spawn support for FFA

### Improved
- Menu tabs rebuilt as a persistent overlay — PLAY buttons keep working, no page reloads
- Tabs hide during matches and return automatically at the menu
- Score multipliers for difficulty & mode

### Fixed
- Fixed menu tabs disappearing permanently after playing a game
- Fixed tab switching destroying main-menu buttons (no more forced `location.reload()`)
- Fixed PLAY buttons not responding while menu tabs were active
- Fixed menu system racing the game boot (tabs now wait for the real menu)

## [0.1.0] - 2026-09-10

### Added
- **Credits System**: Added Credits tab accessible from main menu
- **Graphics Settings**: New graphics quality options (Low, Medium, High)
  - Shadow quality adjustments
  - Anti-aliasing toggle
  - Particle effects control
- **Mobile Gameplay Support**: Full touch controls for mobile devices
  - Virtual joystick for movement
  - Touch-based aiming and firing
  - Gesture controls for special abilities
- **Credits to Zwoz**: Added proper attribution to Zwoz in credits
- **Changelog**: Implemented comprehensive changelog system

### Improved
- HUD layout optimized for mobile screens
- Better responsive design for various screen sizes
- Touch-friendly button sizes and spacing

### Technical
- Initial release (v0.1.0)
