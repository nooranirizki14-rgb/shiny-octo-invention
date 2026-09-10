# Changelog

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
