# Changelog

## [3.0.1] — Fix: Slow & Failing Loading Screen

### Fixed
- **Loading no longer fails on most networks.** The 3D engine and the multiplayer library now ship with the game instead of being downloaded from third-party CDNs on every visit. Ad-blockers, firewalls, school/work networks and plain old offline no longer stop the game from starting — the loading screen used to sit for 20 seconds and then always fail with "download failed"
- **The loading screen appears instantly.** It now paints as soon as the page starts, instead of waiting for every other script to download first
- **Failures are reported in a fraction of a second, not 20 seconds.** Problems the loader can detect immediately (opening the file directly, no WebGL2, an outdated browser) are shown right away, and a failed download is explained the moment it happens instead of at the end of a fixed timeout
- Much less to download: the engine is now the minified build and is served gzipped — about 167 KB over the wire instead of ~1.3 MB
- Reloading is near-instant: bundled libraries are cached by the browser for 30 days instead of being re-fetched every time
- Web fonts no longer hold up the game — they load in the background, so a slow or blocked font server can't stall the loading screen
- Stopped requesting the Vercel Analytics script on hosts that aren't Vercel, where it was a guaranteed 404 on every single page load

### Changed
- The engine source can still be switched with one click if a file is ever missing — now between the bundled copy (default), jsDelivr and unpkg. The bundled copy needs no internet at all
- The game can now be played fully offline

### Kept
- The plain-language error overlay from the original blank-screen fix: the game still can never fail silently to a blank page, and still diagnoses `file://`, missing WebGL2 and outdated browsers

## [3.0.0] — Final Big Update

### Added
- **Tutorial**: A guided practice arena with a stationary dummy — learn movement (WASD), shooting, melee swings, and rocket-jumping step by step. Access it from the SOLO MISSION screen.
- **Persistent save sync (Supabase)**: Cloud-backed saves for your profile, loadout, unlocks, and stats. Enter your Supabase URL and anon key in SETTINGS → Cloud Sync to enable. Falls back to localStorage when not configured.
- **Leaderboard (RANKS tab)**: Global rankings for solo (best score, best wave, total kills) and multiplayer (kills, deaths, K/D ratio, online wins). Toggle between SOLO and MULTIPLAYER views.
- **New map: Doodle Bounce** (replaces Doodle Skyline): A playful map of oversized balloon houses and trampoline pads. Jump on a trampoline to launch high into the air. Balloon houses float and sway. Supports solo and online FFA.
- **Rocket Launcher**: A new explosive weapon — press F in a match to fire a rocket. Deals AoE damage to enemies. Fire at the ground to rocket-jump (launches you upward at the cost of 7% HP). 3 rockets per life, refills over time.
- **New character: Boom**: A walking explosion. Select Boom before a match to reduce rocket-jump self-damage to 3% (from 7%) and gain +20% explosive damage. Character select appears on the SOLO MISSION screen.
- **Multiplayer death camera**: In online FFA, when you're eliminated the camera flies to the player who killed you and watches them for 3 seconds before respawn.
- **Doodle Harbor rebuilt**: Redesigned with improved layout, better cover, and enhanced visuals.

### Changed
- **Version numbering cleaned up**: Renumbered all past versions to a clean sequential scheme (1.0.0 → 1.1.0 → 1.1.1 → 1.2.0 → 2.0.0 → 2.0.1 → 3.0.0). No more jumps.
- Game API now exposed on all hosts (was localhost-only), improving menu system integration.

## [2.0.1] — Fix: Secret Weapons Look Different In-Game

### Fixed
- Blade-slot weapons (including LIGHTSABER, GOLDEN EDGE, and every katana skin) now correctly change appearance in real matches — previously the equipped skin/ink never reached the in-game 3D model, so every blade rendered identically no matter what you had equipped
- LIGHTSABER now renders in-game as a real glowing plasma blade: no crossguard, no blood groove, no wraps, and a longer/thinner blade — not just a recolor of the sketchy katana

## [2.0.0] — Secret Weapons & the Lightsaber

### Added
- LIGHTSABER — a secret blade-slot weapon with a glowing plasma edge instead of ink. Redeem-only.
- 3 more secret easter-egg weapons: THE ONE PEN (rifle), HALL PASS (shotgun) and HALL MONITOR (sniper) — each unlockable only via its own dedicated redeem code
- Redeem code reference table added to the changelog, listing every code and what it unlocks

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

## [1.2.0] — Skyline, Golden Gear & Redeem Codes

### Added
- NEW MAP: Doodle Skyline — rooftop parkour across doodle skyscrapers, water tanks, billboards and neon signs (solo + online)
- Redeem code system: enter codes on the PROFILE tab to unlock special weapons, banners, pfps and bonus XP
- Profile photo upload — pick any image as your pfp, shown on your banner and the top-bar chip
- 4 legendary "Golden" weapons (one per rifle/shotgun/sniper/blade slot), unlockable only via redeem codes
- Golden Doodle banner (redeem-only), Ace Doodler banner (Level 5) and Legend of the Page banner — a full illustrated artwork banner that unlocks at Level 12
- 4 special pfp emblems (Ghost Doodle, Doodle Royalty, Grim Sketch, Hot Ink), unlockable via redeem codes

### Improved
- Special pfp emblems now use plain hand-drawn-style glyphs instead of full-color emoji, so they stay on-brand with the doodle art style across every device/font

### Fixed
- Curved katanas (and a few other crooked-looking blades) now sweep as one continuous, connected curve instead of two disjoint slabs glued together at an angle
- Credits now correctly attribute the game to Zwoz

## [1.1.1] — Menu Tabs Stay Put

### Fixed
- Tab buttons finally respond — the bar was swallowing its own clicks before the buttons could see them, so no tab would open
- Tabs no longer disappear after playing a match: the bar now stays up on EVERY menu screen (main menu, PLAY ONLINE, lobby, PAUSED, ERASED, win screen) and only hides while you are actually playing
- Clicking the empty strip beside a tab no longer leaks through to the game and starts a run
- 3D weapon preview can be dragged again and the sensitivity slider works (the old input shield blocked pointer events)
- If the game rebuilds its HUD/menu, the tabs re-attach instead of dying silently

### Improved
- Tab bar height is measured live, so the game menu never sits under it (phones where the bar wraps)
- The bar is stacked above every game layer, so nothing can cover or block it
- Profile numbers refresh the moment a match is scored; ESC closes an open tab

## [1.1.0] — Loadouts, Harbor & Progression

### Added
- LOADOUT tab: 40 weapons — 10 rifles, 10 shotguns, 10 snipers, 10 blades, each with unique stats and a 3D model preview
- Solo setup screen: pick a MODE (Survival / Blitz / Juggernaut) and DIFFICULTY (Easy / Medium / Hard) before every run
- PROFILE tab: player banner, emblem, level & XP earned from every match
- NEW MAP: Doodle Harbor — docks, cranes, sailboats, a warehouse and a working lighthouse (solo + online)
- Score multipliers for difficulty & mode (up to 3× XP on Hard Juggernaut)
- Weapon ink tints applied in-game from your loadout picks

### Improved
- Menu tabs rebuilt as a persistent overlay — they no longer break the PLAY buttons or vanish forever
- Tabs hide during matches and return when you are back at the menu
- Loadout takes effect on every match start (solo + online)

### Fixed
- Fixed tabs disappearing permanently after playing a game
- Fixed tab switching destroying main-menu buttons (no more forced page reload)
- Fixed PLAY buttons not responding while menu tabs were active

## [1.0.0] — Initial Release

### Added
- Credits system with proper attribution to Zwoz
- Graphics quality settings (Low, Medium, High)
- Anti-aliasing toggle, particle effects control, dynamic shadows toggle
- Mobile gameplay support with touch controls & virtual joystick
- Responsive design for all screen sizes
- In-game changelog viewer

### Improved
- Mobile HUD optimization
- Touch-friendly button sizing
- Performance adjustments for lower-end devices

### Technical
- Three.js v0.170.0 integration
- PeerJS v1.5.4 for multiplayer
- Full mobile browser support
