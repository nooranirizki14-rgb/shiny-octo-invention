# Changelog

## [3.2.0] — Party Pack Phase 1: Streaks, Stats, Mutators & Challenges

### Added — party tab + stats tab
- **New PARTY tab**: match-mode picker, mutators, weather, ink gun-skins, challenges and a field manual — all in one place
- **New STATS tab**: lifetime (level/matches/kills/wins/K-D/best score+wave), session stats and an erasures-by-weapon table

### Added — kill streaks
- **3 streak: RADAR PING** — pulsing red markers over every hostile for 3.5s, even through walls
- **5 streak: DOODLE AIRSTRIKE** — three free cooked-variety grenades, real projectiles with full damage/netcode
- **8 streak (then every 4): THE ERASER** — a five-rocket free volley downrange with screen shake
- Streaks reset on death; fanfares + big announcements included

### Added — fun & progression
- **Death recap**: every death shows killer · weapon · distance + a rotating tip
- **Mutators (instant, you-only FX)**: LOW GRAVITY rides the engine's own `gravityScale`; BIG HEADS scales every rival/enemy cranium ×1.9
- **Client weather**: day / dusk / night (canvas dim + navy multiply) / rain / snow (2D particle overlay)
- **Ink gun-skins**: lasers + grip accent stripes follow each gun's ink color (toggleable, default on)
- **GG emote (H)**: happy hop + chalk GG! floor stamp (6s fade, 3s cooldown)
- **Daily + weekly challenges** (date-seeded, auto-tracked from the kill feed): kills, per-weapon erasures, streaks, headshots, FFA wins, solo waves — auto-grant XP with fanfare
- **Grapple (Q/E) and grenades (G) already shipped** in the engine — now documented in the field manual instead of rebuilt

### Fixed
- **FFA rocket kills now credit properly.** The `pdead` net validator's `how` allow-list was missing `rocket`, so rocket kills were rejected (no credit, and a violation strike against the victim). One-token bundle fix, `.mjs`-gated
- `dd-match-start` / `dd-match-end` are now actually dispatched (match watcher), which also repairs the rocket HUD's match reset listener

## [3.1.0] — New Maps, Slot-5 Bazooka & Laser Sights

### Added — maps
- **NEW MAP: DOODLE ROOFS** (`roofs`) — a dusk city block: four rooftops linked by plank bridges, water towers, a billboard, a two-flight fire escape, a blinking antenna nest, parked cars, street lamps and clotheslines. Solo + arena (FFA) support with 12 spawns, 5 sniper perches, 8 pickups, 14 arena spawns
- **NEW MAP: DOODLE CASTLE** (`castle`) — ramparts with walkable wall walks and four corner towers, a gatehouse with portcullis, a moat, a torch-lit keep with waving flag, a courtyard well, hay bales, weapon rack, banners, dead trees and a tiny graveyard. Same spawn/pickup counts as Roofs
- **Doodle Balloon retired** — the public list is now District / Jungle / Harbor / Roofs / Castle. Stored or remotely-sent `balloon` values fall back to District through the existing map guards (no protocol change)

### Added — rocket launcher as slot 5
- **The bazooka is a real 5th weapon**: press `5` or scroll to it — full ADS, reload animation, ammo HUD slot, ammo pickups and a chunky 3D tube model. **F still quick-fires a rocket from any weapon**, now spending the launcher's own mag/reserve
- **3 loadout variants**: DOODLE BAZOOKA (classic 1-tube), QUAD SCRIBBLER (4-round rocket hose, smaller blasts) and THE ERASER (one giant ×1.7 crater). New `blast` stat flows through `doodle_loadout_stats`
- Rockets ride the **grenade netcode path** (same projectile sim + owner-authority damage), so FFA hits, kills and the kill feed just work — no protocol bump (`Qt` untouched). New `rocket` entries in the damage validator, kill-feed labels and remote-player weapon visuals (remotes render a tube, keep gun pose)
- Kills by rocket are labeled **ROCKET** in the feed (was: GRENADE)

### Added — lasers & fun
- **Laser sights on every gun**: red emitter + beam + tip dot, on by default, **L toggles** (remembered in `localStorage`). The katana stays clean
- **Explosive barrels**: orange barrels detonate when shot or caught in a blast (bigger boom, enemy + self damage, prop kick) and **chain-react** with each other — on every client through the existing breakable sync
- Barrel HP raised 15 → 40 so a single stray bullet doesn't set them off

### Fixed
- Loadout preview for the rocket slot rendered a blade — now builds the actual launcher (distinct classic/quad/eraser models + thumbnails)
- Remote players with the bazooka equipped showed a rifle and struck the katana pose — fixed (tube model + gun pose)
- `rocket-launcher.js` slimmed from a parallel projectile sim into an integration layer (F quick-fire + HUD + reserve trickle) — no more double physics

## [3.0.2] — True Aim, Lightsaber & Rocket Fixes

### Fixed — aiming & sights
- **ADS sights finally agree with bullet impacts.** Loadout weapon size was overwriting each gun's designed scale instead of multiplying it, which blew guns up to ~2× size and pushed every red-dot/bead sight high off the bullet line. Sizes are multipliers again, so sights sit dead-center like the sniper scope
- **Bullets follow the true camera direction**, including the recoil springs — previously shots used the raw aim angles while the camera carried extra recoil motion, so impacts drifted off the crosshair/scope/dot right after firing
- **Aimed shots kick the sight picture less** (weapon-model kick ×0.45, camera kick ×0.75 while aiming), so the 3D sight stays glued near the bullet line during fire. Hip-fire feel is untouched
- **A tiny sniper-style center dot** now shows while aiming with non-scope guns (the HUD crosshair hides during ADS), giving an exact-center reference on every weapon
- **Rifle red-dot enlarged 3×** — it was ~2px wide and nearly invisible, so players aimed with the sight frame instead

### Fixed — lightsaber & weapon models
- **LIGHTSABER actually works in matches now.** The saber flag never left the loadout menu (`doodle_loadout_stats` didn't include it), so every blade rendered as a plain katana — now the flag is saved and the saber engages
- **In-game saber rebuilt as a real plasma blade** (new `dd-fixes.js` runtime patch): white-hot core, colored additive glow shell, round tip and emitter hilt, with the glow color following your blade ink — instead of a slightly fatter flat katana blade
- **Blade size picks now apply in-game** (they were ignored; scale is a multiplier of the base like guns)

### Fixed — rocket launcher
- Rockets **explode on walls and props** (segment raycast along the flight path), not just on the floor
- Rockets **damage enemies through the real damage pipeline** (was: silently did nothing — wrong enemy list + direct HP poking), so kills, hitmarkers, sounds and score all work
- **FFA rivals take rocket damage** again (uses the explosive damage type the netcode accepts)
- **Rocket-jump self-damage** goes through the real pipeline (correct max-HP scaling, hurt FX, death handling) and matches the documented 7%/3%(Boom) values
- Rockets **reset every match** (the reset event was never sent) and refill over time as before
- **New rocket ammo counter HUD** (+ touch-only FIRE ROCKET button on mobile) — previously the styled HUD element was never created
- **F fires a rocket without also triggering quick-melee** (melee still fires on F when no rocket is available, and always on V)

### Fixed — multiplayer
- **Joining by code now also finds lobbies hosted from localhost/LAN/dev builds** (and vice versa) — the peer-ID prefix used to make those lobbies invisible to each other
- **Hosting retries once automatically** when the signalling handshake times out, instead of failing outright
- **Online failures now show an actionable hint** (same-version check, code validity, network/NAT guidance) appended to the status line

### Fixed — maps & stability
- **A failing map builder can no longer strand you in an empty world**: level loads (and the very first boot level) fall back to DOODLE DISTRICT with a notice instead of a blank scene
- **One broken level animation can no longer freeze the whole game**: level-animated hooks run guarded and a failing one is disabled with a console warning
- **Frame safety net**: every per-frame system (player, enemies, remote players, props, effects, HUD, audio, menu camera) is guarded, so a single hitch can no longer stop rendering and black-screen a match — failures surface as a small on-screen note (and in `window.__ddFixes.errors`) instead of silence
- **Render watchdog**: if drawing stalls for 3s mid-match, the current map reloads automatically (with a notice); it backs off instead of looping forever
- **Tutorial teaches the real keys**: SPACE jumps, V swings, F rockets (was: SPACE swung, nothing jumped)

## [3.0.1] — Doodle Balloon, Blank Screen & Startup

### Added
- **NEW MAP: DOODLE BALLOON** (replaces Doodle Bounce). A giant inflatable water park built to match the reference art: oversized balloon houses with bulging roofs and corner bumpers, blue towers with red cone caps and waving flags, gateway arches, run-down slides, palm trees, and a pool ringing the whole floating deck
- **Trampolines actually bounce.** Jump on a pad and you get launched high. They never worked before — the pad mesh was never created, so nothing animated and nothing ever launched you

### Fixed — maps & gameplay
- **The old map rendered nothing.** The balloon houses crashed the level builder partway through, so the level came out completely empty — this was the "new map shows nothing"
- **DOODLE BALLOON works in SOLO.** 15 enemy spawns, 6 sniper perches and 10 pickups, so waves have somewhere to come from
- **Multiplayer death camera** now watches your killer for 3 seconds and then hands the camera back, instead of holding it for the whole respawn timer

### Removed
- **The loading screen is gone completely.** No spinner, no status text, no error screens — nothing between you and the game. The page now goes straight to the main menu. The engine ships with the game, so there is nothing left to wait for

### Fixed — startup
- **The game actually starts now.** A stray bracket in the game bundle was a hard syntax error, so the whole game script failed to run and the page stayed empty no matter what. This was the real cause of the blank screen
- **Loading no longer fails on most networks.** The 3D engine and the multiplayer library now ship with the game instead of being downloaded from third-party CDNs on every visit. Ad-blockers, firewalls, school/work networks and plain old offline no longer stop the game from starting — startup used to sit for 20 seconds and then always fail with "download failed"
- **No more 20-second wait.** Startup used to stall on a fixed 20-second timer before giving up; that timer is gone entirely
- Much less to download: the engine is now the minified build and is served gzipped — about 167 KB over the wire instead of ~1.3 MB
- Reloading is near-instant: bundled libraries are cached by the browser for 30 days instead of being re-fetched every time
- Web fonts no longer hold up the game — they load in the background, so a slow or blocked font server can't stall startup
- Stopped requesting the Vercel Analytics script on hosts that aren't Vercel, where it was a guaranteed 404 on every single page load

### Changed
- The game can now be played fully offline
- **No emoji anywhere in the UI** — the lock emoji is gone and the remaining symbols (stars, emblems, arrows) are forced to render as flat line icons in the page's ink colour, never as colour emoji

### Already in place (verified, not re-built)
- **Tutorial**, **Supabase save sync**, **RANKS leaderboard**, **Doodle Harbor rebuild**, **Doodle Skyline replaced by Doodle Bounce**, **Rocket Launcher** (F key, 7% self-damage) and the **Boom character** (3% self-damage, +20% explosive) all already existed and were checked working rather than rewritten
- Version numbering is already clean and sequential (1.0.0 → 3.0.1) and matches between the in-game changelog and this file

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
