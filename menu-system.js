/* ============================================================
   Doodle District — Extended Menu System v0.2.1
   - Persistent tabs (PLAY / LOADOUT / PROFILE / SETTINGS / CHANGELOG / CREDITS)
     rendered OUTSIDE the game panel as an overlay, so they survive every
     re-render of the menu and stay up on all menu screens (only hidden
     while a match is actually being played)
   - Solo setup: mode (Survival / Blitz / Juggernaut) + difficulty (Easy/Med/Hard)
   - Loadout: 52 weapons (13 rifle / 12 shotgun / 12 sniper / 12 blade / 3 rocket) with 3D preview
   - Profile: banner, emblem, level + XP earned from matches
   - Data-driven changelog, settings, credits, mobile support
   ============================================================ */
(function () {
'use strict';

/* Unlock the game's exposed API (game.js only exposes helpers when this exists) */
window.__game = window.__game || {};

var VERSION = '3.2.0';
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

/* ---------------- storage ---------------- */
var store = {
  get: function (k, d) {
    try {
      var v = localStorage.getItem(k);
      if (v === null || v === undefined) return d;
      if (typeof d === 'object') { try { return JSON.parse(v); } catch (e) { return d; } }
      if (typeof d === 'number') { var n = Number(v); return isNaN(n) ? d : n; }
      if (typeof d === 'boolean') return v === '1' || v === 'true';
      return v;
    } catch (e) { return d; }
  },
  set: function (k, v) {
    try {
      localStorage.setItem(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    } catch (e) {}
  }
};

/* ---------------- constants ---------------- */
var INK_NAMES = ['BLUE', 'RED', 'BLACK', 'ORANGE', 'GREEN', 'PINK'];
var INK_HEX = ['#1a30c0', '#d02030', '#23232e', '#e8801a', '#1d9e6c', '#e0609a'];

var MODES = {
  survival: { name: 'SURVIVAL', desc: 'Classic wave defense. Survive as long as you can.', icon: '✎' },
  blitz: { name: 'BLITZ', desc: 'Faster spawns, bigger crowds, weaker enemies. +25% score.', icon: '⚡' },
  jugg: { name: 'JUGGERNAUT', desc: 'Half as many enemies with DOUBLE health. 2× score.', icon: '☠' }
};
var DIFFS = {
  easy: { name: 'EASY', desc: 'Weaker, slower enemies. 150 HP, fast regen. 0.75× score.', icon: '☁' },
  medium: { name: 'MEDIUM', desc: 'The classic Doodle District experience.', icon: '✦' },
  hard: { name: 'HARD', desc: '1.6× enemy HP, 1.5× damage, 100 HP. 1.5× score.', icon: '❖' }
};

/* ---------------- weapons data (40) ----------------
   stats = exact fields consumed by the patched game (doodle_loadout_stats).
   bars  = [PWR, RTE, MAG, RNG] 0..100 for display.                     */
var WEAPONS = {
rifle: [
 { id: 'rifle_classic', name: 'CLASSIC RIFLE', hint: 'auto · put the red dot on them', desc: 'The trusty standard-issue scribbler. Balanced in every way.', ink: 0, scale: 1, bars: [55, 70, 60, 65],
   stats: { magSize: 35, reserve: 175, maxReserve: 350, interval: 0.0909, damage: 24, headMul: 2.6, pellets: 1, spread: 0.016, adsSpread: 0.0034, reloadDur: 1.45, auto: true, falloff: null, pvp: [19, 1.8, null] } },
 { id: 'rifle_smg', name: 'SCRIBBLER SMG', hint: 'bullet hose · hold the trigger', desc: 'Sprays ink at 900 scribbles per minute. Wild past mid range.', ink: 3, scale: 0.92, bars: [38, 98, 80, 35],
   stats: { magSize: 50, reserve: 250, maxReserve: 500, interval: 0.0667, damage: 15, headMul: 1.8, pellets: 1, spread: 0.024, adsSpread: 0.008, reloadDur: 1.6, auto: true, falloff: null, pvp: [12, 1.8, null] } },
 { id: 'rifle_dmr', name: 'LONGSHOT DMR', hint: 'semi · every line counts', desc: 'A designated margin rifle. Slow, heavy, brutally precise.', ink: 2, scale: 1.08, bars: [78, 30, 30, 92],
   stats: { magSize: 12, reserve: 60, maxReserve: 120, interval: 0.3, damage: 48, headMul: 3, pellets: 1, spread: 0.008, adsSpread: 0.001, reloadDur: 1.8, auto: false, falloff: null, pvp: [38, 2, null] } },
 { id: 'rifle_lmg', name: 'INKHOSE LMG', hint: '80-round drum · never stop', desc: 'An 80-round drum of pure margin-filling fury. Takes ages to reload.', ink: 4, scale: 1.1, bars: [48, 78, 100, 55],
   stats: { magSize: 80, reserve: 320, maxReserve: 480, interval: 0.0833, damage: 19, headMul: 2, pellets: 1, spread: 0.022, adsSpread: 0.006, reloadDur: 2.6, auto: true, falloff: null, pvp: [15, 1.6, null] } },
 { id: 'rifle_matrix', name: 'DOT MATRIX', hint: 'printer go brrr · headshot machine', desc: 'Prints neat little holes. Triple damage on headshots.', ink: 5, scale: 1, bars: [52, 55, 45, 80],
   stats: { magSize: 24, reserve: 144, maxReserve: 240, interval: 0.14, damage: 20, headMul: 3.4, pellets: 1, spread: 0.01, adsSpread: 0.002, reloadDur: 1.5, auto: true, falloff: null, pvp: [16, 2.4, null] } },
 { id: 'rifle_carbine', name: 'MARGIN SCRIBE', hint: 'light carbine · fast hands', desc: 'Light, quick to reload, easy to handle on the move.', ink: 0, scale: 0.95, bars: [50, 68, 55, 62],
   stats: { magSize: 30, reserve: 180, maxReserve: 300, interval: 0.1, damage: 21, headMul: 2.6, pellets: 1, spread: 0.013, adsSpread: 0.003, reloadDur: 1.2, auto: true, falloff: null, pvp: [17, 1.8, null] } },
 { id: 'rifle_heavy', name: 'REDACTOR', hint: 'heavy AR · censors everything', desc: 'Big censored bars of damage. Kicks like a red pen.', ink: 1, scale: 1.05, bars: [74, 52, 45, 60],
   stats: { magSize: 25, reserve: 125, maxReserve: 250, interval: 0.125, damage: 32, headMul: 2.4, pellets: 1, spread: 0.02, adsSpread: 0.004, reloadDur: 1.7, auto: true, falloff: null, pvp: [25, 1.8, null] } },
 { id: 'rifle_blueprint', name: 'BLUEPRINT', hint: 'laser-straight lines', desc: 'Drafted to perfection. Nearly zero spread, huge headshots.', ink: 0, scale: 1.02, bars: [62, 45, 40, 95],
   stats: { magSize: 20, reserve: 120, maxReserve: 200, interval: 0.16, damage: 28, headMul: 3.2, pellets: 1, spread: 0.006, adsSpread: 0.0012, reloadDur: 1.5, auto: true, falloff: null, pvp: [22, 2.4, null] } },
 { id: 'rifle_comic', name: 'COMIC SANS', hint: 'the forbidden font · 60 rounds', desc: 'Nobody respects it. Everybody fears the 60-round mag.', ink: 5, scale: 1, bars: [42, 72, 90, 50],
   stats: { magSize: 60, reserve: 300, maxReserve: 420, interval: 0.0909, damage: 16, headMul: 2.2, pellets: 1, spread: 0.02, adsSpread: 0.005, reloadDur: 2, auto: true, falloff: null, pvp: [13, 1.6, null] } },
 { id: 'rifle_fountain', name: 'FOUNTAINHEAD', hint: 'masterwork · smooth & deadly', desc: 'A fountain pen fit for a doodle master. Superb all-round.', ink: 2, scale: 1.06, bars: [70, 80, 65, 78],
   stats: { magSize: 40, reserve: 200, maxReserve: 400, interval: 0.0833, damage: 30, headMul: 3, pellets: 1, spread: 0.012, adsSpread: 0.0025, reloadDur: 1.4, auto: true, falloff: null, pvp: [24, 2, null] } },
 { id: 'rifle_golden', name: 'GOLDEN QUILL', hint: 'redeem-only · legendary scribe', desc: 'A legendary quill dipped in gold ink. Unlocked only by redeem code.', ink: 5, scale: 1.04, bars: [80, 82, 70, 82], special: true,
   stats: { magSize: 40, reserve: 240, maxReserve: 480, interval: 0.08, damage: 32, headMul: 3.2, pellets: 1, spread: 0.01, adsSpread: 0.002, reloadDur: 1.3, auto: true, falloff: null, pvp: [26, 2.2, null] } },
 { id: 'rifle_onepen', name: 'THE ONE PEN', hint: 'secret · one does not simply run dry', desc: 'Forged in the fires of detention. Legend says it never truly reloads. Easter-egg weapon, redeem-only.', ink: 2, scale: 1.1, bars: [85, 60, 90, 88], special: true,
   stats: { magSize: 45, reserve: 270, maxReserve: 450, interval: 0.075, damage: 34, headMul: 3, pellets: 1, spread: 0.008, adsSpread: 0.0015, reloadDur: 1.3, auto: true, falloff: null, pvp: [27, 2, null] } }
],
shotgun: [
 { id: 'shotgun_classic', name: 'CLASSIC SHOTGUN', hint: 'pump · devastating up close', desc: 'The classic pump-action page clearer. Ten pellets of nope.', ink: 0, scale: 1, bars: [80, 30, 40, 25],
   stats: { magSize: 6, reserve: 36, maxReserve: 72, interval: 0.78, damage: 19, headMul: 1.8, pellets: 10, spread: 0.062, adsSpread: 0.034, reloadDur: 0.45, auto: false, falloff: [11, 32, 0.22], cycleDur: 0.45, pvp: [16, 1.6, [9, 26, 0.15]] } },
 { id: 'rifle_dual', name: 'DUAL DOODLES', hint: 'two guns · double trouble', desc: 'Two scribblers taped together. Twice the ink, half the accuracy, all of the fun.', ink: 1, scale: 0.95, bars: [40, 100, 85, 30],
   stats: { magSize: 60, reserve: 300, maxReserve: 600, interval: 0.05, damage: 17, headMul: 1.8, pellets: 1, spread: 0.03, adsSpread: 0.01, reloadDur: 1.9, auto: true, falloff: null, pvp: [13, 1.8, null], dual: true } },
 { id: 'shotgun_double', name: 'DOUBLE DOODLE', hint: 'two barrels · double trouble', desc: 'Side-by-side sketch blaster. Two massive booms, then reload.', ink: 3, scale: 1.02, bars: [95, 18, 12, 22],
   stats: { magSize: 2, reserve: 40, maxReserve: 80, interval: 0.9, damage: 24, headMul: 1.8, pellets: 12, spread: 0.07, adsSpread: 0.04, reloadDur: 0.5, auto: false, falloff: [10, 28, 0.2], cycleDur: 0.5, pvp: [20, 1.6, [8, 24, 0.15]] } },
 { id: 'shotgun_auto', name: 'STREETSWEEPER', hint: 'FULL-AUTO · hold to delete', desc: 'A fully automatic hallway eraser. Ammo disappears fast.', ink: 1, scale: 1.05, bars: [65, 62, 70, 20],
   stats: { magSize: 12, reserve: 60, maxReserve: 120, interval: 0.5, damage: 12, headMul: 1.6, pellets: 8, spread: 0.07, adsSpread: 0.04, reloadDur: 2.2, auto: true, falloff: [9, 26, 0.2], cycleDur: 0.3, pvp: [10, 1.5, [8, 22, 0.15]] } },
 { id: 'shotgun_slug', name: 'TACK DRIVER', hint: 'single slug · sniper shotgun', desc: 'Fires one thumbtack the size of your thumb. Accurate to a fault.', ink: 2, scale: 1.08, bars: [90, 28, 35, 85],
   stats: { magSize: 5, reserve: 35, maxReserve: 70, interval: 0.9, damage: 95, headMul: 2.5, pellets: 1, spread: 0.004, adsSpread: 0.001, reloadDur: 0.5, auto: false, falloff: null, cycleDur: 0.7, pvp: [80, 2, null] } },
 { id: 'shotgun_confetti', name: 'CONFETTI', hint: '16 pellets · party time', desc: 'A party popper loaded with spite. Fills whole rooms with pellets.', ink: 5, scale: 0.98, bars: [70, 35, 50, 12],
   stats: { magSize: 8, reserve: 48, maxReserve: 96, interval: 0.7, damage: 10, headMul: 1.6, pellets: 16, spread: 0.1, adsSpread: 0.06, reloadDur: 0.4, auto: false, falloff: [8, 24, 0.18], cycleDur: 0.4, pvp: [9, 1.5, [7, 20, 0.12]] } },
 { id: 'shotgun_fast', name: 'SKETCH PUMP', hint: 'speed pump · rapid sketching', desc: 'A slick competition pump. Shuck it fast and keep moving.', ink: 0, scale: 0.95, bars: [68, 48, 45, 28],
   stats: { magSize: 7, reserve: 42, maxReserve: 84, interval: 0.6, damage: 16, headMul: 1.8, pellets: 9, spread: 0.058, adsSpread: 0.032, reloadDur: 0.4, auto: false, falloff: [11, 30, 0.22], cycleDur: 0.32, pvp: [14, 1.6, [9, 26, 0.15]] } },
 { id: 'shotgun_eraser', name: 'ERASER', hint: 'heavy gauge · removes mistakes', desc: 'You were a mistake. A tight, heavy pattern that deletes errors.', ink: 2, scale: 1.1, bars: [88, 22, 40, 35],
   stats: { magSize: 6, reserve: 36, maxReserve: 72, interval: 0.95, damage: 22, headMul: 2, pellets: 12, spread: 0.05, adsSpread: 0.028, reloadDur: 0.5, auto: false, falloff: [12, 34, 0.25], cycleDur: 0.55, pvp: [18, 1.8, [10, 28, 0.15]] } },
 { id: 'shotgun_light', name: 'PAPER CUT', hint: 'light & quick · stings', desc: 'Small, fast and surprisingly hurty. Like the name suggests.', ink: 4, scale: 0.9, bars: [55, 58, 60, 30],
   stats: { magSize: 10, reserve: 50, maxReserve: 100, interval: 0.55, damage: 13, headMul: 1.8, pellets: 8, spread: 0.055, adsSpread: 0.03, reloadDur: 0.35, auto: false, falloff: [10, 28, 0.2], cycleDur: 0.3, pvp: [11, 1.6, [8, 24, 0.15]] } },
 { id: 'shotgun_mid', name: 'MARGIN BLAST', hint: 'balanced boom · reliable', desc: 'A well-kept all-rounder. Tight enough for hallways, wide enough for crowds.', ink: 3, scale: 1, bars: [72, 34, 40, 32],
   stats: { magSize: 6, reserve: 42, maxReserve: 84, interval: 0.7, damage: 18, headMul: 1.8, pellets: 10, spread: 0.05, adsSpread: 0.028, reloadDur: 0.42, auto: false, falloff: [11, 32, 0.22], cycleDur: 0.4, pvp: [15, 1.6, [9, 26, 0.15]] } },
 { id: 'shotgun_fullstop', name: 'FULL STOP.', hint: 'ends sentences · and enemies', desc: 'The final word in close-range arguments. Fourteen pellets. Period.', ink: 1, scale: 1.12, bars: [100, 15, 25, 30],
   stats: { magSize: 4, reserve: 32, maxReserve: 64, interval: 1.1, damage: 26, headMul: 2, pellets: 14, spread: 0.045, adsSpread: 0.025, reloadDur: 0.55, auto: false, falloff: [12, 34, 0.25], cycleDur: 0.65, pvp: [22, 1.8, [10, 28, 0.15]] } },
 { id: 'shotgun_golden', name: 'GOLDEN BLUNDERBUSS', hint: 'redeem-only · legendary boom', desc: 'A ceremonial gold-plated boomstick. Unlocked only by redeem code.', ink: 5, scale: 1.08, bars: [92, 26, 35, 32], special: true,
   stats: { magSize: 6, reserve: 42, maxReserve: 84, interval: 0.75, damage: 22, headMul: 2, pellets: 12, spread: 0.055, adsSpread: 0.03, reloadDur: 0.45, auto: false, falloff: [12, 34, 0.24], cycleDur: 0.5, pvp: [19, 1.8, [10, 28, 0.15]] } },
 { id: 'shotgun_hallpass', name: 'HALL PASS', hint: 'secret · never questioned', desc: 'Rumored to let you go anywhere and delete anything without a second glance. Easter-egg weapon, redeem-only.', ink: 4, scale: 1.05, bars: [85, 40, 45, 30], special: true,
   stats: { magSize: 8, reserve: 56, maxReserve: 112, interval: 0.6, damage: 24, headMul: 2, pellets: 12, spread: 0.048, adsSpread: 0.026, reloadDur: 0.4, auto: false, falloff: [13, 36, 0.26], cycleDur: 0.38, pvp: [20, 1.8, [11, 30, 0.16]] } }
],
sniper: [
 { id: 'sniper_classic', name: 'CLASSIC SNIPER', hint: 'scoped bolt action · one shot, one erasure', desc: 'The classic scoped bolt-action. Patience rewarded with erasure.', ink: 0, scale: 1, bars: [95, 20, 30, 100],
   stats: { magSize: 5, reserve: 25, maxReserve: 50, interval: 0.2, damage: 150, headMul: 3, pellets: 1, spread: 0.075, adsSpread: 0.0004, reloadDur: 2.1, auto: false, falloff: null, cycleDur: 0.85, adsFov: 20, pvp: [150, 1.5, null] } },
 { id: 'sniper_pencil', name: 'PENCIL POINT', hint: 'quickscope friendly', desc: 'Short, sharp and quick to cycle. For aggressive doodlers.', ink: 3, scale: 0.95, bars: [75, 38, 50, 85],
   stats: { magSize: 8, reserve: 40, maxReserve: 80, interval: 0.15, damage: 110, headMul: 3, pellets: 1, spread: 0.05, adsSpread: 0.0004, reloadDur: 1.8, auto: false, falloff: null, cycleDur: 0.6, adsFov: 24, pvp: [110, 1.5, null] } },
 { id: 'sniper_ruler', name: 'RULER', hint: 'measures in one-shots', desc: 'A 12-inch instrument of precision. Deletes whatever it measures.', ink: 2, scale: 1.1, bars: [100, 12, 18, 100],
   stats: { magSize: 3, reserve: 21, maxReserve: 42, interval: 0.3, damage: 220, headMul: 3, pellets: 1, spread: 0.09, adsSpread: 0.0004, reloadDur: 2.6, auto: false, falloff: null, cycleDur: 1.2, adsFov: 16, pvp: [200, 1.5, null] } },
 { id: 'sniper_kid', name: 'CROSSHAIR KID', hint: '10 shots · pew pew', desc: 'A plucky little varmint rifle with a big magazine and bigger dreams.', ink: 4, scale: 0.92, bars: [60, 45, 60, 80],
   stats: { magSize: 10, reserve: 50, maxReserve: 100, interval: 0.12, damage: 90, headMul: 3, pellets: 1, spread: 0.04, adsSpread: 0.0004, reloadDur: 1.9, auto: false, falloff: null, cycleDur: 0.45, adsFov: 28, pvp: [90, 1.5, null] } },
 { id: 'sniper_marker', name: 'RED MARKER', hint: 'permanent · 4x headshots', desc: 'Permanent ink. Whatever it circles stays circled forever.', ink: 1, scale: 1.02, bars: [90, 20, 30, 98],
   stats: { magSize: 5, reserve: 25, maxReserve: 50, interval: 0.2, damage: 150, headMul: 4, pellets: 1, spread: 0.07, adsSpread: 0.0002, reloadDur: 2.1, auto: false, falloff: null, cycleDur: 0.85, adsFov: 18, pvp: [150, 2, null] } },
 { id: 'sniper_draftsman', name: 'DRAFTSMAN', hint: 'smooth operator', desc: 'A refined instrument for the gentleman eraser. Fast reload, silky bolt.', ink: 0, scale: 1, bars: [82, 30, 38, 92],
   stats: { magSize: 6, reserve: 30, maxReserve: 60, interval: 0.18, damage: 130, headMul: 3, pellets: 1, spread: 0.06, adsSpread: 0.0004, reloadDur: 1.8, auto: false, falloff: null, cycleDur: 0.7, adsFov: 22, pvp: [130, 1.5, null] } },
 { id: 'sniper_division', name: 'LONG DIVISION', hint: 'divides HP by zero', desc: 'Show your work: one shot, remainder zero. Heavy zoom, heavy damage.', ink: 5, scale: 1.08, bars: [92, 16, 25, 100],
   stats: { magSize: 4, reserve: 24, maxReserve: 48, interval: 0.25, damage: 170, headMul: 3, pellets: 1, spread: 0.08, adsSpread: 0.0003, reloadDur: 2.2, auto: false, falloff: null, cycleDur: 1, adsFov: 15, pvp: [170, 1.5, null] } },
 { id: 'sniper_stipple', name: 'STIPPLER', hint: 'semi-auto · dot dot dot', desc: 'Pointillism as a weapon. Rapid little dots that add up fast.', ink: 3, scale: 0.95, bars: [50, 70, 70, 70],
   stats: { magSize: 12, reserve: 60, maxReserve: 120, interval: 0.08, damage: 70, headMul: 2.5, pellets: 1, spread: 0.03, adsSpread: 0.001, reloadDur: 1.7, auto: false, falloff: null, cycleDur: 0.25, adsFov: 30, pvp: [70, 1.5, null] } },
 { id: 'sniper_calli', name: 'CALLIGRAPH', hint: 'elegant annihilation', desc: 'Every shot a flowing stroke ofexpensive ink. Beautiful and lethal.', ink: 2, scale: 1.04, bars: [88, 26, 30, 95],
   stats: { magSize: 5, reserve: 30, maxReserve: 60, interval: 0.18, damage: 160, headMul: 3, pellets: 1, spread: 0.065, adsSpread: 0.0003, reloadDur: 1.9, auto: false, falloff: null, cycleDur: 0.75, adsFov: 22, pvp: [160, 1.5, null] } },
 { id: 'sniper_headline', name: 'HEADLINE', hint: 'boss deleter · 260 dmg', desc: 'Front-page news: LOCAL BOSS ERASED. Slow, loud, final.', ink: 1, scale: 1.12, bars: [100, 10, 18, 100],
   stats: { magSize: 3, reserve: 18, maxReserve: 36, interval: 0.35, damage: 260, headMul: 3, pellets: 1, spread: 0.1, adsSpread: 0.0004, reloadDur: 2.8, auto: false, falloff: null, cycleDur: 1.4, adsFov: 14, pvp: [220, 1.5, null] } },
 { id: 'sniper_golden', name: 'GOLDEN LONGSHOT', hint: 'redeem-only · legendary scope', desc: 'A gilded masterpiece of a rifle. Unlocked only by redeem code.', ink: 5, scale: 1.05, bars: [96, 22, 30, 98], special: true,
   stats: { magSize: 5, reserve: 25, maxReserve: 50, interval: 0.19, damage: 165, headMul: 3.2, pellets: 1, spread: 0.06, adsSpread: 0.0003, reloadDur: 2, auto: false, falloff: null, cycleDur: 0.8, adsFov: 20, pvp: [165, 1.6, null] } },
 { id: 'sniper_hallmonitor', name: 'HALL MONITOR', hint: 'secret · sees everything', desc: 'Whispered about between classes. It never misses and it never forgets a face. Easter-egg weapon, redeem-only.', ink: 3, scale: 1.06, bars: [98, 18, 24, 100], special: true,
   stats: { magSize: 5, reserve: 25, maxReserve: 50, interval: 0.17, damage: 180, headMul: 3.4, pellets: 1, spread: 0.055, adsSpread: 0.0002, reloadDur: 1.9, auto: false, falloff: null, cycleDur: 0.75, adsFov: 18, pvp: [180, 1.6, null] } }
],
katana: [
 { id: 'katana_classic', name: 'CLASSIC KATANA', hint: 'slash · hold aim to block & return bullets', desc: 'The classic page slicer. Block bullets, return them with interest.', ink: 0, scale: 1, bars: [70, 65, 100, 15],
   stats: { damage: 75, slashDur: 0.27 } },
 { id: 'katana_boxcutter', name: 'BOX CUTTER', hint: 'fast flicks · opens anything', desc: 'Retractable fury. Slashes twice as fast as it should.', ink: 3, scale: 0.9, bars: [50, 100, 100, 12],
   stats: { damage: 55, slashDur: 0.2 } },
 { id: 'katana_nodachi', name: 'NODACHI', hint: 'huge blade · huge damage', desc: 'An oversized field sword. Slow sweeps that erase crowds.', ink: 2, scale: 1.15, bars: [95, 40, 100, 22],
   stats: { damage: 105, slashDur: 0.33 } },
 { id: 'katana_opener', name: 'LETTER OPENER', hint: 'quick & pointy', desc: 'For urgent correspondence. Fast stabs, decent slices.', ink: 5, scale: 0.92, bars: [55, 88, 100, 13],
   stats: { damage: 60, slashDur: 0.22 } },
 { id: 'katana_ruler', name: 'METAL RULER', hint: 'smack · 85 dmg discipline', desc: 'Strict, straight and unbending. Classroom justice.', ink: 0, scale: 1.02, bars: [78, 55, 100, 16],
   stats: { damage: 85, slashDur: 0.3 } },
 { id: 'katana_scissors', name: 'SCISSORS', hint: 'snip snip · beats paper', desc: 'Beats paper. Also beats grunts, rushers and heavies.', ink: 1, scale: 0.96, bars: [65, 75, 100, 14],
   stats: { damage: 70, slashDur: 0.24 } },
 { id: 'katana_glue', name: 'GLUE STICK', hint: 'bonk · surprisingly deadly', desc: 'Nobody expects the glue stick. Heavy bonks, slow swings.', ink: 4, scale: 1.05, bars: [85, 35, 100, 14],
   stats: { damage: 95, slashDur: 0.36 } },
 { id: 'katana_xacto', name: 'X-ACTO', hint: 'surgical flicks', desc: 'Surgical precision for delicate erasures. Very fast, very sharp.', ink: 2, scale: 0.9, bars: [60, 95, 100, 13],
   stats: { damage: 65, slashDur: 0.21 } },
 { id: 'katana_broad', name: 'DOODLE BROADSWORD', hint: 'legendary · 120 dmg', desc: 'Forged from a hundred broken pencils. The heaviest eraser.', ink: 1, scale: 1.18, bars: [100, 32, 100, 24],
   stats: { damage: 120, slashDur: 0.34 } },
 { id: 'katana_eraserblade', name: 'ERASERBLADE', hint: 'balanced soul of ink', desc: 'Half blade, half eraser. A duelist\'s perfect companion.', ink: 4, scale: 1, bars: [80, 68, 100, 16],
   stats: { damage: 90, slashDur: 0.26 } },
 { id: 'katana_golden', name: 'GOLDEN EDGE', hint: 'redeem-only · legendary blade', desc: 'A blade forged from pure gold ink. Unlocked only by redeem code.', ink: 5, scale: 1.05, bars: [88, 72, 100, 18], special: true,
   stats: { damage: 100, slashDur: 0.25 } },
 { id: 'katana_lightsaber', name: 'LIGHTSABER', hint: 'secret · an elegant weapon, for a more civilized doodle', desc: 'From a galaxy of margin doodles far, far away. A humming blade of pure light. Easter-egg weapon, redeem-only.', ink: 0, scale: 1.1, bars: [100, 90, 100, 20], special: true, saber: true,
   stats: { damage: 110, slashDur: 0.22 } }
],
rocket: [
 { id: 'rocket_classic', name: 'DOODLE BAZOOKA', hint: 'slot 5 · big boom + rocket jump', desc: 'The classic shoulder-fired eraser. One fat rocket, one huge boom. Fire at your feet to fly.', ink: 3, scale: 1, bars: [85, 25, 35, 60],
   stats: { magSize: 1, reserve: 4, maxReserve: 6, interval: 1.2, damage: 80, headMul: 1, pellets: 1, spread: 0.004, adsSpread: 0.001, reloadDur: 2.2, auto: false, falloff: null, blast: 1, pvp: [80, 1.5, null] } },
 { id: 'rocket_quad', name: 'QUAD SCRIBBLER', hint: '4 tubes · rocket hose', desc: 'Four barrels of rapid-fire bad decisions. Smaller booms, way more of them.', ink: 0, scale: 0.95, bars: [60, 75, 85, 40],
   stats: { magSize: 4, reserve: 8, maxReserve: 12, interval: 0.45, damage: 50, headMul: 1, pellets: 1, spread: 0.01, adsSpread: 0.004, reloadDur: 3, auto: false, falloff: null, blast: 0.65, pvp: [50, 1.2, null] } },
 { id: 'rocket_nuke', name: 'THE ERASER', hint: 'one shot · delete everything', desc: 'A forbidden weapon of mass erasure. Fire once, then admire the crater.', ink: 1, scale: 1.1, bars: [100, 10, 15, 70],
   stats: { magSize: 1, reserve: 2, maxReserve: 3, interval: 2.2, damage: 140, headMul: 1, pellets: 1, spread: 0.002, adsSpread: 0.0008, reloadDur: 3.4, auto: false, falloff: null, blast: 1.7, pvp: [140, 1.8, null] } }
]};

var SLOT_LABEL = { rifle: 'RIFLE', shotgun: 'SHOTGUN', sniper: 'SNIPER', katana: 'BLADE', rocket: 'ROCKET' };

/* ---------------- characters ---------------- */
var CHARACTERS = [
  { id: 'default', name: 'DOODLER', icon: '✎', desc: 'The standard scribbler. No bonuses, no penalties.', bonuses: 'Balanced · no modifiers' },
  { id: 'boom', name: 'BOOM', icon: '☠', desc: 'A walking explosion with a fuse for a fuse. Loves things that go boom.', bonuses: 'Rocket jump: 3% HP (was 7%) · +20% explosive damage', rocketDmgPct: 0.03, explosiveBuff: 1.2 }
];
function getCharacter() { return store.get('doodle_character', 'default'); }
function setCharacter(id) { store.set('doodle_character', id); }
function characterById(id) {
  for (var i = 0; i < CHARACTERS.length; i++) if (CHARACTERS[i].id === id) return CHARACTERS[i];
  return CHARACTERS[0];
}

function weaponById(slot, id) {
  var list = WEAPONS[slot] || [];
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return { def: list[i], index: i };
  return { def: list[0], index: 0 };
}

/* ---------------- changelog data ---------------- */
var CHANGELOG = [
  { v: '3.2.0', date: '2026-09-11', title: 'Party Pack Phase 1',
    items: [
      'PARTY tab: mutators, weather, ink gun-skins, challenges, field manual',
      'STATS tab: lifetime + session + per-weapon kill stats',
      'Kill streaks: radar ping (3), doodle airstrike (5), the Eraser volley (8)',
      'Death recap: killer, weapon, distance + a tip, every time you get erased',
      'Mutators: LOW GRAVITY + BIG HEADS (instant, you-only party FX)',
      'Client weather: day / dusk / night / rain / snow overlays',
      'GG emote (H): hop + chalk stamp · daily/weekly challenges with XP',
      'FIXED: FFA rocket kills now credit properly (pdead validator)',
      'Phase 2: KOTH / INFECTED / JUGGERNAUT, sketch-wall (B), hats, DUAL DOODLES rifle'
    ] },
  { v: '3.1.0', date: '2026-09-11', title: 'New Maps, Slot-5 Bazooka & Laser Sights',
    sections: {
      Added: [
        'NEW MAP — DOODLE ROOFS: a dusk city block with four rooftops linked by plank bridges, water towers, a billboard, a fire escape and a blinking antenna nest',
        'NEW MAP — DOODLE CASTLE: ramparts with wall walks and corner towers, a gatehouse, a moat, a haunted graveyard, a torch-lit keep and a waving flag',
        'The rocket launcher is a real 5th weapon now: press 5 (or scroll) for the DOODLE BAZOOKA, with ADS, reloading, ammo pickups and a proper 3D model — F still quick-fires it from any weapon',
        '3 rocket loadout variants: DOODLE BAZOOKA (classic), QUAD SCRIBBLER (4-tube rocket hose) and THE ERASER (one giant crater)',
        'Laser sights on every gun — a red beam and dot help you aim from the hip; press L to toggle',
        'Explosive barrels: orange barrels detonate when shot (or caught in a blast) and chain-react with each other',
        'Rockets and grenades now share one net-safe projectile system, so rocket hits, kills and the kill feed work in FFA without extra lag'
      ],
      Changed: [
        'Doodle Balloon retired — the game now has 5 maps: District, Jungle, Harbor, Roofs and Castle (old Balloon picks fall back to District)',
        'Barrels take a couple of shots to pop instead of one, since they explode now'
      ],
      Fixed: [
        'The loadout preview for the rocket slot showed a blade — it now shows the actual launcher',
        'Remote players holding the bazooka render a chunky tube instead of a rifle, and no longer strike the katana pose',
        'Rocket kills are labeled ROCKET in the kill feed instead of GRENADE'
      ]
    }
  },
  { v: '3.0.2', date: '2026-09-11', title: 'True Aim, Lightsaber & Rocket Fixes',
    sections: {
      Fixed: [
        'ADS sights finally agree with bullet impacts: loadout weapon size no longer breaks sight alignment (guns also render at their intended size again)',
        'Bullets now follow the true camera direction during recoil, and aimed shots kick the sight picture less — the red dot stays on the bullet line like the sniper scope',
        'A tiny center dot appears while aiming with non-scope guns, plus a bigger, actually visible rifle red-dot',
        'LIGHTSABER works in real matches now: the saber flag finally reaches the game, and the in-game model is a real glowing plasma blade (white core, colored glow, round tip, emitter hilt)',
        'Blade size picks from the loadout now apply in-game too',
        'Rockets work: they explode on walls (not just floors), damage enemies properly with kills/score, hurt FFA rivals, rocket-jump with proper self-damage, reset every match, and show an ammo counter (+ touch fire button)',
        'Pressing F fires a rocket without also triggering the melee swing (melee still on F when no rockets, always on V)',
        'Joining with a code now also finds lobbies hosted from localhost / LAN / dev builds and vice versa',
        'Hosting retries once when matchmaking is slow, and online failures show a concrete next step',
        'A glitching map can no longer leave you staring at an empty world — the game falls back to DOODLE DISTRICT, and one broken level animation can no longer freeze the game',
        'Frame safety net: every per-frame system (player, enemies, remote players, props, effects, HUD, audio) is guarded so one hitch can no longer black-screen a match — failures show as a small on-screen note instead',
        'Render watchdog: if drawing stalls mid-match, the current map reloads automatically',
        'Tutorial teaches the real keys: SPACE jumps, V swings, F rockets'
      ],
      Changed: [
        'Weapon sizes in the loadout are multipliers of each gun\'s designed size, as intended'
      ]
    }
  },
  { v: '3.0.1', date: '2026-09-11', title: 'Doodle Balloon, Blank Screen & Startup',
    sections: {
      Fixed: [
        'The game actually starts now: a stray bracket in the game code was a hard syntax error, so nothing ran at all and the page stayed empty',
        'NEW MAP - DOODLE BALLOON replaces Doodle Bounce: a giant inflatable water park. Big balloon houses with bulging roofs, flagged towers, gateway arches, slides, palm trees and a pool ringing the whole deck',
        'Trampolines actually bounce now - jump on a pad to get launched high. They never worked before: the pad mesh was never created, so nothing animated and nothing launched you',
        'DOODLE BALLOON works in SOLO too: 15 enemy spawns, 6 sniper perches and 10 pickups',
        'Multiplayer death camera now watches your killer for 3 seconds, then hands the camera back for the respawn prompt'
      ],
      Changed: [
        'The 3D engine and multiplayer library now ship with the game, so it loads offline and no longer depends on a CDN being reachable',
        'No loading screen: the game goes straight to the main menu',
        'No emoji anywhere in the UI, only flat line icons'
      ]
    }
  },
  { v: '3.0.0', date: '2026-09-10', title: 'Final Big Update',
    sections: {
      Added: [
        'Tutorial: guided practice arena with a dummy — learn movement, shooting, melee swings and rocket-jumping',
        'Persistent save sync (Supabase): cloud-backed saves for profile, loadout, unlocks and stats. Configure in Settings → Cloud Sync',
        'Leaderboard (RANKS tab): global solo and multiplayer K/D rankings',
        'New map: Doodle Bounce (replaces Skyline) — balloon houses and trampoline pads for big air (renamed Doodle Balloon and rebuilt in 3.0.1)',
        'Rocket Launcher: press F to fire explosive rockets. Rocket-jump by firing at the ground (costs HP)',
        'New character: Boom — reduces rocket-jump self-damage to 3% and buffs explosive damage +20%',
        'Multiplayer death camera: camera follows your killer for 3 seconds before respawn',
        'Doodle Harbor rebuilt with improved layout and visuals'
      ],
      Changed: [
        'Version numbering cleaned up to a sequential scheme (1.0.0 → 1.1.0 → 1.1.1 → 1.2.0 → 2.0.0 → 2.0.1 → 3.0.0)',
        'Game API now exposed on all hosts for better menu integration'
      ]
    }
  },
  { v: '2.0.1', date: '2026-09-10', title: 'Fix: Secret Weapons Look Different In-Game',
    sections: {
      Fixed: [
        'Blade-slot weapons (including LIGHTSABER, GOLDEN EDGE, and every katana skin) now correctly change appearance in real matches — previously the equipped skin/ink never reached the in-game 3D model, so every blade rendered identically no matter what you had equipped',
        'LIGHTSABER now renders in-game as a real glowing plasma blade: no crossguard, no blood groove, no wraps, and a longer/thinner blade — not just a recolor of the sketchy katana'
      ]
    }
  },
  { v: '2.0.0', date: '2026-09-10', title: 'Secret Weapons & the Lightsaber',
    sections: {
      Added: [
        'LIGHTSABER — a secret blade-slot weapon with a glowing plasma edge instead of ink. Redeem-only.',
        '3 more secret easter-egg weapons: THE ONE PEN (rifle), HALL PASS (shotgun) and HALL MONITOR (sniper) — each unlockable only via its own dedicated redeem code',
        'Redeem code reference table added to the changelog, listing every code and what it unlocks'
      ]
    }
  },
  { v: '1.2.0', date: '2026-09-10', title: 'Skyline, Golden Gear & Redeem Codes',
    sections: {
      Added: [
        'NEW MAP: Doodle Skyline — rooftop parkour across doodle skyscrapers, water tanks, billboards and neon signs (solo + online)',
        'Redeem code system: enter codes on the PROFILE tab to unlock special weapons, banners, pfps and bonus XP',
        'Profile photo upload — pick any image as your pfp, shown on your banner and the top-bar chip',
        '4 legendary "Golden" weapons (one per rifle/shotgun/sniper/blade slot), unlockable only via redeem codes',
        'Golden Doodle banner (redeem-only), Ace Doodler banner (Level 5) and Legend of the Page banner — a full illustrated artwork banner that unlocks at Level 12',
        '4 special pfp emblems (Ghost Doodle, Doodle Royalty, Grim Sketch, Hot Ink), unlockable via redeem codes'
      ],
      Improved: [
        'Special pfp emblems now use plain hand-drawn-style glyphs instead of full-color emoji, so they stay on-brand with the doodle art style across every device/font'
      ],
      Fixed: [
        'Curved katanas (and a few other crooked-looking blades) now sweep as one continuous, connected curve instead of two disjoint slabs glued together at an angle',
        'Credits now correctly attribute the game to Zwoz'
      ]
    } },
  { v: '1.1.1', date: '2026-09-10', title: 'Menu Tabs Stay Put',
    sections: {
      Fixed: [
        'Tab buttons finally respond — the bar was swallowing its own clicks before the buttons could see them, so no tab would open',
        'Tabs no longer disappear after playing a match: the bar now stays up on EVERY menu screen (main menu, PLAY ONLINE, lobby, PAUSED, ERASED, win screen) and only hides while you are actually playing',
        'Clicking the empty strip beside a tab no longer leaks through to the game and starts a run',
        '3D weapon preview can be dragged again and the sensitivity slider works (the old input shield blocked pointer events)',
        'If the game rebuilds its HUD/menu, the tabs re-attach instead of dying silently'
      ],
      Improved: [
        'Tab bar height is measured live, so the game menu never sits under it (phones where the bar wraps)',
        'The bar is stacked above every game layer, so nothing can cover or block it',
        'Profile numbers refresh the moment a match is scored; ESC closes an open tab'
      ]
    } },
  { v: '1.1.0', date: '2026-09-10', title: 'Loadouts, Harbor & Progression',
    sections: {
      Added: [
        'LOADOUT tab: 40 weapons — 10 rifles, 10 shotguns, 10 snipers, 10 blades, each with unique stats and a 3D model preview',
        'Solo setup screen: pick a MODE (Survival / Blitz / Juggernaut) and DIFFICULTY (Easy / Medium / Hard) before every run',
        'PROFILE tab: player banner, emblem, level & XP earned from every match',
        'NEW MAP: Doodle Harbor — docks, cranes, sailboats, a warehouse and a working lighthouse (solo + online)',
        'Score multipliers for difficulty & mode (up to 3× XP on Hard Juggernaut)',
        'Weapon ink tints applied in-game from your loadout picks'
      ],
      Improved: [
        'Menu tabs rebuilt as a persistent overlay — they no longer break the PLAY buttons or vanish forever',
        'Tabs hide during matches and return when you are back at the menu',
        'Loadout takes effect on every match start (solo + online)'
      ],
      Fixed: [
        'Fixed tabs disappearing permanently after playing a game',
        'Fixed tab switching destroying main-menu buttons (no more forced page reload)',
        'Fixed PLAY buttons not responding while menu tabs were active'
      ]
    } },
  { v: '1.0.0', date: '2026-09-10', title: 'Initial Release',
    sections: {
      Added: [
        'Credits system with proper attribution to Zwoz',
        'Graphics quality settings (Low, Medium, High)',
        'Anti-aliasing toggle, particle effects control, dynamic shadows toggle',
        'Mobile gameplay support with touch controls & virtual joystick',
        'Responsive design for all screen sizes',
        'In-game changelog viewer'
      ],
      Improved: [
        'Mobile HUD optimization',
        'Touch-friendly button sizing',
        'Performance adjustments for lower-end devices'
      ],
      Technical: [
        'Three.js v0.170.0 integration',
        'PeerJS v1.5.4 for multiplayer',
        'Full mobile browser support'
      ]
    } }
];

/* ---------------- profile / XP ---------------- */
var EMBLEMS = ['✎', '✦', '★', '⚡', '☠', '❖', '✚', '☀', '☾', '♞', '❂', '✜'];
/* Special emblems are cosmetic pfp icons that stay locked until redeemed
   via a code (see REDEEM_CODES) — same idea as the special banners/weapons.
   `icon` is a plain hand-lettered monogram (no emoji) so it always renders
   as flat black/white text in the doodle art style, on every device/font. */
var SPECIAL_EMBLEMS = [
  { id: 'ghost', icon: 'GH', name: 'Ghost Doodle' },
  { id: 'crown', icon: 'CR', name: 'Doodle Royalty' },
  { id: 'skull2', icon: 'GR', name: 'Grim Sketch' },
  { id: 'fire', icon: 'HI', name: 'Hot Ink' }
];
var BANNERS = [
  { id: 'b0', name: 'Ruled Paper', css: 'linear-gradient(135deg,#f6f3e6 0%,#e8e4d2 100%)', fg: '#1a30c0' },
  { id: 'b1', name: 'Blue Ink', css: 'linear-gradient(135deg,#1a30c0,#3f5ef0)', fg: '#f6f3e6' },
  { id: 'b2', name: 'Red Marker', css: 'linear-gradient(135deg,#d02030,#f0604d)', fg: '#fff6ec' },
  { id: 'b3', name: 'Harbor Sunset', css: 'linear-gradient(135deg,#e8801a,#d02030 55%,#5a1f8f)', fg: '#fff6ec' },
  { id: 'b4', name: 'Jungle', css: 'linear-gradient(135deg,#0d5c34,#1d9e6c)', fg: '#f2f7e6' },
  { id: 'b5', name: 'Midnight', css: 'linear-gradient(135deg,#14141f,#333a55)', fg: '#f6f3e6' },
  { id: 'b6', name: 'Bubblegum', css: 'linear-gradient(135deg,#e0609a,#f2a4c0)', fg: '#4a1030' },
  { id: 'b7', name: 'Gold Star', css: 'linear-gradient(135deg,#8a5a00,#e8b81a 60%,#f7e08a)', fg: '#3a2a00' },
  { id: 'b8', name: 'Ace Doodler', css: 'linear-gradient(135deg,#101018,#5a1f8f 45%,#1a30c0)', fg: '#f6f3e6', req: 5 },
  { id: 'b9', name: 'Golden Doodle', css: 'linear-gradient(135deg,#5a3a00,#f2c94c 55%,#fff6c8)', fg: '#3a2400', special: true },
  /* Custom illustrated-artwork banner: `img` points at a real image file instead of
     a CSS gradient. renderProfile()/bannerStyle() fall back to `css` as a color
     wash under the image (in case it fails to load) and as the swatch background
     on the small picker button. Unlocks automatically once you reach Level 12. */
  { id: 'b10', name: 'Legend of the Page', img: 'assets/banner-legend.jpg', css: 'linear-gradient(135deg,#2a2118,#6b3f12 55%,#c98d2c)', fg: '#fff6ec', req: 12 }
];
function bannerStyle(bn) {
  return bn.img
    ? 'background-image:linear-gradient(rgba(10,8,4,.15),rgba(10,8,4,.35)),url(' + bn.img + ');background-size:cover;background-position:center;'
    : 'background:' + bn.css + ';';
}

function defaultProfile() {
  return { xp: 0, matches: 0, kills: 0, bestScore: 0, bestWave: 0, wins: 0, emblem: 0, banner: 'b0', avatar: null, specialEmblem: null, title: null };
}
function getProfile() {
  var p = store.get('doodle_profile_v1', null);
  if (!p || typeof p !== 'object') { p = defaultProfile(); store.set('doodle_profile_v1', p); }
  return Object.assign(defaultProfile(), p);
}
function saveProfile(p) { store.set('doodle_profile_v1', p); }
function xpNeed(level) { return 120 + (level - 1) * 90; }
function levelForXP(total) {
  var lvl = 1, rest = Math.max(0, total | 0);
  while (rest >= xpNeed(lvl)) { rest -= xpNeed(lvl); lvl++; }
  return { level: lvl, cur: rest, need: xpNeed(lvl) };
}
function bannerById(id) {
  for (var i = 0; i < BANNERS.length; i++) if (BANNERS[i].id === id) return BANNERS[i];
  return BANNERS[0];
}
function playerName() {
  return (store.get('doodle_name', '') || '').slice(0, 14) || 'doodle';
}

var lastAwardKey = store.get('doodle_last_award', '');
function difficultyXpMul() {
  var d = store.get('doodle_difficulty', 'medium');
  return d === 'easy' ? 0.8 : d === 'hard' ? 1.5 : 1;
}
function modeXpMul() {
  var m = store.get('doodle_mode', 'survival');
  return m === 'blitz' ? 1.25 : m === 'jugg' ? 2 : 1;
}
function awardMatch(kind, info, key) {
  if (!key || key === lastAwardKey) return;
  lastAwardKey = key;
  store.set('doodle_last_award', key);
  var p = getProfile();
  var before = levelForXP(p.xp).level;
  var xp = 0;
  if (kind === 'solo') {
    xp = Math.round((info.kills * 12 + info.wave * 25 + info.score * 0.02) * difficultyXpMul() * modeXpMul());
    xp = Math.max(20, xp);
    p.matches++; p.kills += info.kills;
    if (info.score > p.bestScore) p.bestScore = info.score;
    if (info.wave > p.bestWave) p.bestWave = info.wave;
  } else {
    xp = Math.round((info.kills * 30 + (info.win ? 200 : 30) + info.deaths * 4) * 1);
    xp = Math.max(30, xp);
    p.matches++; p.kills += info.kills;
    if (info.win) p.wins++;
  }
  p.xp += xp;
  saveProfile(p);
  /* an open PROFILE / SETUP tab should show the new numbers right away */
  renderedFor = null;
  var after = levelForXP(p.xp);
  toast('+' + xp + ' XP  ·  ' + (kind === 'solo' ? ('WAVE ' + info.wave + ' · ' + info.kills + ' KILLS') : (info.kills + ' KILLS' + (info.win ? ' · VICTORY' : ''))));
  if (after.level > before) {
    setTimeout(function () { toast('★ LEVEL UP! You are now LEVEL ' + after.level + ' ★', 4); }, 1200);
  }
  refreshProfileChip();
  if (window.__ddSync) { try { window.__ddSync.submitMatchResult({ kind: kind, kills: info.kills, deaths: info.deaths || 0, wave: info.wave, score: info.score, win: info.win }); window.__ddSync.syncToCloud(); } catch (e) {} }
  setTimeout(function () { try { refreshChrome(); } catch (e) {} }, 0);
}

/* ---------------- redeem codes ---------------- */
/* Unlocks are stored separately from the profile so resetting profile progress
   never takes away something a code already granted. */
function defaultUnlocks() {
  return { weapons: [], banners: [], emblems: [], codes: [] };
}
function getUnlocks() {
  var u = store.get('doodle_unlocks_v1', null);
  return Object.assign(defaultUnlocks(), u || {});
}
function saveUnlocks(u) { store.set('doodle_unlocks_v1', u); }
function isWeaponUnlocked(def) {
  if (!def.special) return true;
  return getUnlocks().weapons.indexOf(def.id) !== -1;
}
function isBannerUnlocked(bn) {
  if (bn.special) return getUnlocks().banners.indexOf(bn.id) !== -1;
  if (bn.req) return levelForXP(getProfile().xp).level >= bn.req;
  return true;
}
function isEmblemUnlocked(id) {
  return getUnlocks().emblems.indexOf(id) !== -1;
}

/* Codes are case-insensitive and single-use per browser (localStorage). Each
   entry can grant any mix of weapons / banners / emblems / xp / other. */
var REDEEM_CODES = {
  'ZWOZGOLD': { xp: 500, weapons: ['rifle_golden', 'shotgun_golden', 'sniper_golden', 'katana_golden'], banners: ['b9'], desc: 'the full golden arsenal + Golden Doodle banner + 500 XP' },
  'DOODLEVIP': { banners: ['b9'], emblems: ['crown'], desc: 'Golden Doodle banner + Doodle Royalty emblem' },
  'GHOSTMODE': { emblems: ['ghost', 'skull2'], xp: 150, desc: 'Ghost Doodle + Grim Sketch emblems + 150 XP' },
  'FIRESTARTER': { emblems: ['fire'], weapons: ['katana_golden'], xp: 250, desc: 'Hot Ink emblem + Golden Edge katana + 250 XP' },
  'WELCOME2026': { xp: 300, desc: '300 XP, on the house' },
  'USETHEFORCE': { weapons: ['katana_lightsaber'], desc: 'the LIGHTSABER — an elegant weapon, for a more civilized doodle' },
  'DETENTION': { weapons: ['rifle_onepen'], desc: 'THE ONE PEN, secret rifle easter-egg' },
  'NORUNNING': { weapons: ['shotgun_hallpass'], desc: 'the HALL PASS, secret shotgun easter-egg' },
  'EYESEVERYWHERE': { weapons: ['sniper_hallmonitor'], desc: 'the HALL MONITOR, secret sniper easter-egg' }
};

function redeemCode(raw) {
  var code = String(raw || '').trim().toUpperCase();
  if (!code) return { ok: false, msg: 'Type a code first' };
  var grant = REDEEM_CODES[code];
  if (!grant) return { ok: false, msg: 'That code doesn\'t exist' };
  var u = getUnlocks();
  if (u.codes.indexOf(code) !== -1) return { ok: false, msg: 'Already redeemed that one' };
  u.codes.push(code);
  var got = [];
  (grant.weapons || []).forEach(function (id) {
    if (u.weapons.indexOf(id) === -1) { u.weapons.push(id); }
  });
  (grant.banners || []).forEach(function (id) {
    if (u.banners.indexOf(id) === -1) { u.banners.push(id); }
  });
  (grant.emblems || []).forEach(function (id) {
    if (u.emblems.indexOf(id) === -1) { u.emblems.push(id); }
  });
  saveUnlocks(u);
  if (grant.xp) {
    var p = getProfile();
    var before = levelForXP(p.xp).level;
    p.xp += grant.xp;
    saveProfile(p);
    got.push('+' + grant.xp + ' XP');
    var after = levelForXP(p.xp);
    if (after.level > before) {
      setTimeout(function () { toast('★ LEVEL UP! You are now LEVEL ' + after.level + ' ★', 4); }, 1400);
    }
  }
  if (grant.weapons && grant.weapons.length) got.push(grant.weapons.length + ' weapon' + (grant.weapons.length > 1 ? 's' : ''));
  if (grant.banners && grant.banners.length) got.push(grant.banners.length + ' banner' + (grant.banners.length > 1 ? 's' : ''));
  if (grant.emblems && grant.emblems.length) got.push(grant.emblems.length + ' emblem' + (grant.emblems.length > 1 ? 's' : ''));
  refreshProfileChip();
  return { ok: true, msg: 'Redeemed! ' + (grant.desc || got.join(' · ')) };
}

/* ---------------- loadout store ---------------- */
function defaultLoadout() {
  return { rifle: 'rifle_classic', shotgun: 'shotgun_classic', sniper: 'sniper_classic', katana: 'katana_classic', rocket: 'rocket_classic' };
}
function getLoadout() {
  var l = store.get('doodle_loadout', null);
  if (!l || typeof l !== 'object') { l = defaultLoadout(); setLoadout(l); }
  return Object.assign(defaultLoadout(), l);
}
function setLoadout(l) {
  store.set('doodle_loadout', l);
  /* Resolve full per-slot stats for the patched game to consume on match start */
  var stats = {};
  ['rifle', 'shotgun', 'sniper', 'katana', 'rocket'].forEach(function (slot) {
    var found = weaponById(slot, l[slot]);
    if (!found.def) return;
    var s = Object.assign({}, found.def.stats);
    s.name = found.def.name;
    s.hint = found.def.hint;
    s.ink = found.def.ink; s.scale = found.def.scale;
    /* the in-game blade reads s.saber to become a lightsaber — without this
       the flag never left the menu and every blade rendered as a katana */
    if (found.def.saber) s.saber = true;
    stats[slot] = s;
  });
  store.set('doodle_loadout_stats', stats);
}

/* ---------------- toast ---------------- */
var toastBox = null;
function toast(msg, dur) {
  if (!toastBox) return;
  var d = document.createElement('div');
  d.className = 'dd-toast';
  d.textContent = msg;
  toastBox.appendChild(d);
  while (toastBox.children.length > 3) toastBox.removeChild(toastBox.firstChild);
  setTimeout(function () { d.classList.add('out'); setTimeout(function () { d.remove(); }, 400); }, (dur || 2.5) * 1000);
}

/* ---------------- chrome (tabs + overlay) ---------------- */
var rootEl = null, tabsEl = null, overlayEl = null, panelEl = null;
var currentTab = 'play';
var setupOpen = false, setupWave = 1;
var renderedFor = null;

var TABS = [
  { id: 'play', label: 'PLAY' },
  { id: 'loadout', label: 'LOADOUT' },
  { id: 'leaderboard', label: 'RANKS' },
  { id: 'party', label: 'PARTY' },
  { id: 'stats', label: 'STATS' },
  { id: 'profile', label: 'PROFILE' },
  { id: 'settings', label: 'SETTINGS' },
  { id: 'changelog', label: 'CHANGELOG' },
  { id: 'credits', label: 'CREDITS' }
];

/* Our chrome lives outside the game's #hud, but the game still has window level
   listeners (audio unlock, ESC, mouse buttons). We only want to keep those from
   seeing our clicks — never block our own widgets. So everything that "shields"
   the game is registered in the BUBBLE phase on #dd-root (i.e. after the buttons
   inside it already handled the event). The previous capture-phase
   stopPropagation killed the tab buttons before they ever saw a click. */
function shield(e) { try { e.stopPropagation(); } catch (err) {} }

function buildChrome() {
  if (rootEl && rootEl.parentNode) return;
  rootEl = document.createElement('div');
  rootEl.id = 'dd-root';
  rootEl.innerHTML =
    '<div id="dd-tabs" hidden>' +
      '<div class="dd-tabs-inner">' +
        TABS.map(function (t) { return '<button type="button" class="dd-tab" data-tab="' + t.id + '">' + t.label + '</button>'; }).join('') +
        '<span class="dd-ver">v' + VERSION + '</span>' +
        '<span class="dd-chip" id="dd-chip" title="Your profile"></span>' +
      '</div>' +
    '</div>' +
    '<div id="dd-overlay" hidden><div class="dd-panel" id="dd-panel"></div></div>' +
    '<div id="dd-toasts"></div>';
  document.body.appendChild(rootEl);
  tabsBandDirty = true;
  tabsEl = $('#dd-tabs');
  overlayEl = $('#dd-overlay');
  panelEl = $('#dd-panel');
  toastBox = $('#dd-toasts');

  /* --- tab bar: delegate from the bar, in the bubble phase, no shielding --- */
  tabsEl.addEventListener('click', function (e) {
    var t = e.target;
    var b = t && t.closest ? t.closest('.dd-tab') : null;
    if (b) { switchTab(b.dataset.tab); return; }
    if (t && t.closest && t.closest('#dd-chip')) switchTab('profile');
  });
  /* keyboard access: the bar is just buttons, Enter/Space should work */
  tabsEl.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && (currentTab !== 'play' || setupOpen)) switchTab('play');
  });
  overlayEl.addEventListener('click', function (e) {
    if (e.target === overlayEl && !setupOpen) switchTab('play');
  });
  overlayEl.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (setupOpen) closeSetup(); else switchTab('play'); }
  });
  /* shield the game from anything that happened inside our chrome (bubble = safe) */
  ['pointerdown', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'wheel', 'keydown', 'keyup', 'keypress'].forEach(function (type) {
    rootEl.addEventListener(type, shield, false);
  });
  refreshProfileChip();
}

function refreshProfileChip() {
  var chip = $('#dd-chip');
  if (!chip) return;
  var p = getProfile();
  var lv = levelForXP(p.xp);
  if (p.avatar) {
    chip.innerHTML = '<img src="' + p.avatar + '" alt="" class="dd-chip-img">' + ' Lv ' + lv.level;
  } else {
    var icon = p.specialEmblem ? (SPECIAL_EMBLEMS.filter(function (e) { return e.id === p.specialEmblem; })[0] || {}).icon || EMBLEMS[p.emblem] : EMBLEMS[p.emblem];
    chip.textContent = icon + ' Lv ' + lv.level;
  }
}

function gameScreen() { return $('#screen'); }
function gamePanel() { return $('#panel'); }
function screenVisible() {
  var s = gameScreen();
  return !!(s && s.classList.contains('show'));
}
function isMainMenu() {
  var p = gamePanel();
  return !!(p && p.querySelector('#soloBtn'));
}
/* True only while the player is actually controlling the doodler. The game
   shows #screen for every menu-ish page: main menu, PLAY ONLINE, lobby,
   PAUSED, ERASED, YOU WIN — that whole set is where our tabs must live. */
function inActiveMatch() {
  try {
    var g = window.__game, y = g && g.game;
    if (!y) return false;
    var st = y.state;
    return (st === 'play' || st === 'dying') && !y.menu;
  } catch (e) { return false; }
}
function chromeShouldShow() {
  /* "stay forever": previously the bar only existed on the main menu (it looked
     for #soloBtn), so it vanished for good on the match-over / online / lobby /
     pause screens. Any screen the game shows keeps the tabs alive. */
  if (!screenVisible()) return false;
  return !inActiveMatch();
}

/* bottom edge of the tab bar, in viewport px — clicks that fall in that band
   must never reach the game's full-screen "CLICK ANYWHERE TO PLAY" layer */
var tabsBandBottom = 0, tabsBandDirty = true;
function syncTabsOffset() {
  if (!tabsBandDirty) return;
  try {
    var inner = tabsEl && tabsEl.firstElementChild;
    var r = inner && inner.getBoundingClientRect ? inner.getBoundingClientRect() : null;
    var bottom = r && r.height ? Math.round(r.bottom) : 0;
    if (bottom > 0 && bottom < (window.innerHeight || 900) * 0.6) {
      tabsBandBottom = bottom + 8;
      document.documentElement.style.setProperty('--dd-tabs-h', (tabsBandBottom + 14) + 'px');
      tabsBandDirty = false;
    }
  } catch (e) {}
}

function refreshChrome() {
  if (!rootEl || !rootEl.parentNode) { rootEl = null; buildChrome(); }
  if (!tabsEl || !overlayEl) return;
  var show = chromeShouldShow();
  if (show !== !tabsEl.hidden) tabsBandDirty = true; /* just appeared → re-measure */
  tabsEl.hidden = !show;
  try { document.body.classList.toggle('dd-tabs-on', !!show); } catch (e) {}
  if (!show) {
    overlayEl.hidden = true;
    renderedFor = null;
    stopPreview();
    return;
  }
  syncTabsOffset();
  $$('.dd-tab', tabsEl).forEach(function (b) {
    b.classList.toggle('active', b.dataset.tab === (setupOpen ? 'play' : currentTab));
  });
  var wantOverlay = setupOpen || currentTab !== 'play';
  if (!wantOverlay) { overlayEl.hidden = true; renderedFor = null; stopPreview(); return; }
  overlayEl.hidden = false;
  var view = setupOpen ? 'setup' : currentTab;
  if (view === renderedFor) return; /* already showing this view — don't rebuild (keeps 3D + scroll state) */
  renderedFor = view;
  if (setupOpen) renderSetup();
  else if (currentTab === 'loadout') renderLoadout();
  else if (currentTab === 'leaderboard') renderLeaderboard();
  else if (currentTab === 'party') renderParty();
  else if (currentTab === 'stats') renderStats();
  else if (currentTab === 'profile') renderProfile();
  else if (currentTab === 'settings') renderSettings();
  else if (currentTab === 'changelog') renderChangelog();
  else if (currentTab === 'credits') renderCredits();
}

function switchTab(id) {
  currentTab = id;
  setupOpen = false;
  renderedFor = null;
  stopPreview();
  refreshChrome();
}

/* ---------------- solo setup ---------------- */
function checkpoints() {
  var eo = store.get('doodle_checkpoint', 0);
  var out = [];
  for (var w = 5; w <= eo; w += 5) out.push(w);
  return out;
}
function openSetup(wave) {
  setupOpen = true;
  setupWave = wave || 1;
  refreshChrome();
}
function closeSetup() {
  setupOpen = false;
  refreshChrome();
}
function renderSetup() {
  stopPreview();
  var mode = store.get('doodle_mode', 'survival');
  var diff = store.get('doodle_difficulty', 'medium');
  var cps = checkpoints();
  var waves = [1].concat(cps.filter(function (w) { return w !== 1; }));
  if (waves.indexOf(setupWave) < 0) setupWave = 1;
  panelEl.innerHTML =
    '<h1>SOLO MISSION</h1>' +
    '<h2>configure your run, doodler</h2>' +
    '<div class="dd-sec-label">MODE</div>' +
    '<div class="dd-cards">' +
      Object.keys(MODES).map(function (k) {
        var m = MODES[k];
        return '<button type="button" class="dd-card' + (mode === k ? ' on' : '') + '" data-mode="' + k + '">' +
          '<span class="dd-ico">' + m.icon + '</span><b>' + m.name + '</b><i>' + m.desc + '</i></button>';
      }).join('') +
    '</div>' +
    '<div class="dd-sec-label">DIFFICULTY</div>' +
    '<div class="dd-cards dd-3">' +
      Object.keys(DIFFS).map(function (k) {
        var d = DIFFS[k];
        return '<button type="button" class="dd-card' + (diff === k ? ' on' : '') + '" data-diff="' + k + '">' +
          '<span class="dd-ico">' + d.icon + '</span><b>' + d.name + '</b><i>' + d.desc + '</i></button>';
      }).join('') +
    '</div>' +
    '<div class="dd-sec-label">START AT WAVE</div>' +
    '<div class="dd-waves">' +
      waves.map(function (w) {
        return '<button type="button" class="dd-wave' + (setupWave === w ? ' on' : '') + '" data-wave="' + w + '">' + (w === 1 ? 'WAVE 1' : 'WAVE ' + w) + '</button>';
      }).join('') +
    '</div>' +
    '<div class="dd-hint">harder runs earn more score &amp; XP · loadout &amp; map apply from the menu</div>' +
    '<div class="dd-sec-label">CHARACTER</div>' +
    '<div class="dd-cards">' +
      CHARACTERS.map(function (c) {
        var sel = getCharacter() === c.id;
        return '<button type="button" class="dd-card' + (sel ? ' on' : '') + '" data-char="' + c.id + '">' +
          '<span class="dd-ico">' + c.icon + '</span><b>' + c.name + '</b><i>' + c.bonuses + '</i></button>';
      }).join('') +
    '</div>' +
    '<div class="dd-row"><button type="button" class="dd-big" id="dd-launch">▶ &nbsp;START RUN</button>' +
    '<button type="button" class="dd-alt" id="dd-tut-btn">TUTORIAL</button>' +
    '<button type="button" class="dd-alt" id="dd-back">BACK</button></div>';

  $$('[data-mode]', panelEl).forEach(function (b) {
    b.addEventListener('click', function () { store.set('doodle_mode', b.dataset.mode); renderSetup(); });
  });
  $$('[data-diff]', panelEl).forEach(function (b) {
    b.addEventListener('click', function () { store.set('doodle_difficulty', b.dataset.diff); renderSetup(); });
  });
  $$('[data-wave]', panelEl).forEach(function (b) {
    b.addEventListener('click', function () { setupWave = Number(b.dataset.wave) || 1; renderSetup(); });
  });
  $$('[data-char]', panelEl).forEach(function (b) {
    b.addEventListener('click', function () { setCharacter(b.dataset.char); renderSetup(); });
  });
  $('#dd-back', panelEl).addEventListener('click', closeSetup);
  $('#dd-launch', panelEl).addEventListener('click', launchSolo);
  $('#dd-tut-btn', panelEl).addEventListener('click', function () {
    closeSetup();
    overlayEl.hidden = true;
    if (tabsEl) tabsEl.hidden = true;
    if (window.__ddTutorial) window.__ddTutorial.start();
  });
}
function launchSolo() {
  var wave = setupWave || 1;
  setupOpen = false;
  stopPreview();
  overlayEl.hidden = true;
  /* hide our chrome immediately so the game gets a clean click-to-lock */
  if (tabsEl) tabsEl.hidden = true;
  setTimeout(function () {
    try {
      var g = window.__game || {};
      if (wave > 1 && typeof g.beginAtWave === 'function') { g.beginAtWave(wave); return; }
      if (typeof g.begin === 'function') { g.begin(); return; }
    } catch (e) {}
    /* fallback: let the native button do it */
    try {
      window.__DDskipSetup = true;
      var b = $('#soloBtn');
      if (b) b.click();
    } catch (e2) {}
  }, 30);
}

/* ---------------- loadout ---------------- */
var loadoutSlot = 'rifle';
var THREE_NS = null, threeFailed = false;
var preview = null; /* {renderer, scene, camera, group, raf, w, h, rotX, rotY, tRotX, tRotY, dragging} */
var modelCache = {}; /* slot -> { id -> THREE.Group } */
var thumbRenderer = null, thumbScene = null, thumbCamera = null, thumbLights = false;

function ensureThree() {
  if (THREE_NS) return Promise.resolve(THREE_NS);
  if (threeFailed) return Promise.reject(new Error('3d unavailable'));
  return import('three').then(function (m) {
    THREE_NS = m;
    return m;
  }).catch(function (e) {
    threeFailed = true;
    throw e;
  });
}

function renderLoadout() {
  var loadout = getLoadout();
  var list = WEAPONS[loadoutSlot];
  var sel = weaponById(loadoutSlot, loadout[loadoutSlot]);
  panelEl.innerHTML =
    '<h1>LOADOUT</h1>' +
    '<h2>pick your instruments of erasure</h2>' +
    '<div class="dd-slots">' +
      ['rifle', 'shotgun', 'sniper', 'katana', 'rocket'].map(function (s) {
        return '<button type="button" class="dd-slot' + (loadoutSlot === s ? ' on' : '') + '" data-slot="' + s + '">' + SLOT_LABEL[s] + '</button>';
      }).join('') +
    '</div>' +
    '<div class="dd-lo-wrap">' +
      '<div class="dd-lo-list">' +
        list.map(function (w, i) {
          var on = sel.def.id === w.id;
          var locked = w.special && !isWeaponUnlocked(w);
          return '<button type="button" class="dd-gun' + (on ? ' on' : '') + (locked ? ' locked' : '') + '" data-gun="' + w.id + '"' + (locked ? ' data-locked="1"' : '') + '>' +
            '<span class="dd-thumb" data-thumb="' + w.id + '"><span class="dd-thumb-fallback">' + w.name.charAt(0) + '</span></span>' +
            '<span class="dd-gun-meta"><b>' + w.name + (w.special ? ' <i class="dd-tag">SPECIAL</i>' : '') + '</b>' +
            '<span class="dd-minibars">' + miniBars(w) + '</span></span>' +
            (locked ? '<span class="dd-locked">[X] REDEEM CODE</span>' : on ? '<span class="dd-equipped">EQUIPPED</span>' : '') +
          '</button>';
        }).join('') +
      '</div>' +
      '<div class="dd-lo-side">' +
        '<div class="dd-preview" id="dd-preview"><div class="dd-preview-hint">loading 3D…</div></div>' +
        '<div class="dd-detail">' +
          '<h3>' + sel.def.name + '</h3>' +
          '<div class="dd-hint2">' + sel.def.hint + '</div>' +
          '<p>' + sel.def.desc + '</p>' +
          statBars(sel.def) +
          '<div class="dd-statline">' + statLine(loadoutSlot, sel.def) + '</div>' +
          '<div class="dd-inkline">ink: <b style="color:' + INK_HEX[sel.def.ink] + '">' + INK_NAMES[sel.def.ink] + '</b></div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="dd-row"><button type="button" class="dd-alt" id="dd-lo-reset">RESET LOADOUT</button>' +
    '<span class="dd-hint">loadout applies when your next match starts</span></div>';

  $$('[data-slot]', panelEl).forEach(function (b) {
    b.addEventListener('click', function () { loadoutSlot = b.dataset.slot; renderLoadout(); });
  });
  $$('[data-gun]', panelEl).forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.locked) { toast('Locked — redeem a code to unlock this weapon (see PROFILE tab)', 3); return; }
      var l = getLoadout();
      l[loadoutSlot] = b.dataset.gun;
      setLoadout(l);
      renderLoadout();
    });
  });
  $('#dd-lo-reset', panelEl).addEventListener('click', function () {
    setLoadout(defaultLoadout());
    renderLoadout();
    toast('Loadout reset to classics');
  });
  startPreview(sel.def, sel.index);
  renderThumbs(list);
}

function miniBars(w) {
  var labels = ['P', 'R'];
  var out = '';
  for (var i = 0; i < 2; i++) {
    out += '<span class="dd-minibar"><i style="width:' + w.bars[i] + '%"></i></span>';
  }
  return out;
}
function statBars(w) {
  var labels = ['PWR', 'RTE', 'MAG', 'RNG'];
  return '<div class="dd-bars">' + labels.map(function (lb, i) {
    return '<div class="dd-bar-row"><span>' + lb + '</span><div class="dd-bar"><i style="width:' + w.bars[i] + '%"></i></div><b>' + w.bars[i] + '</b></div>';
  }).join('') + '</div>';
}
function statLine(slot, w) {
  if (slot === 'katana') return 'DMG <b>' + w.stats.damage + '</b> · SWING <b>' + w.stats.slashDur.toFixed(2) + 's</b>';
  var s = w.stats;
  var rof = s.interval ? Math.round(60 / s.interval) + '/min' : '—';
  if (slot === 'rocket') return 'BLAST <b>×' + s.blast + '</b> · MAG <b>' + s.magSize + '</b> · ROF <b>' + rof + '</b>';
  return 'DMG <b>' + s.damage + (s.pellets > 1 ? '×' + s.pellets : '') + '</b> · MAG <b>' + s.magSize + '</b> · ROF <b>' + rof + '</b>';
}

/* ----- 3D model builders ----- */
function mats(T) {
  return {
    body: new T.MeshStandardMaterial({ color: 0xdbe3f0, roughness: 0.75, metalness: 0.15 }),
    dark: new T.MeshStandardMaterial({ color: 0x333a55, roughness: 0.7, metalness: 0.3 }),
    wood: new T.MeshStandardMaterial({ color: 0xc98d4b, roughness: 0.85, metalness: 0 }),
    blade: new T.MeshStandardMaterial({ color: 0xe9edf6, roughness: 0.3, metalness: 0.65 }),
    glow: new T.MeshBasicMaterial({ color: 0xff2d2d }),
    line: new T.LineBasicMaterial({ color: 0x1a30c0, transparent: true, opacity: 0.5 })
  };
}
function accentMat(T, def) {
  return new T.MeshStandardMaterial({ color: INK_HEX[def.ink], roughness: 0.6, metalness: 0.2 });
}
function bx(T, g, mat, w, h, d, x, y, z, rx, ry, rz) {
  var m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (rx) m.rotation.x = rx; if (ry) m.rotation.y = ry; if (rz) m.rotation.z = rz;
  g.add(m); return m;
}
function cy(T, g, mat, rt, rb, h, x, y, z, rx, rz, seg) {
  var m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 14), mat);
  m.position.set(x, y, z);
  if (rx) m.rotation.x = rx; if (rz) m.rotation.z = rz;
  g.add(m); return m;
}
function outline(T, g, lineMat) {
  var add = [];
  g.traverse(function (o) {
    if (o.isMesh) add.push(o);
  });
  add.forEach(function (m) {
    try {
      var e = new T.LineSegments(new T.EdgesGeometry(m.geometry, 28), lineMat);
      e.position.copy(m.position); e.rotation.copy(m.rotation); e.scale.copy(m.scale);
      m.parent.add(e);
    } catch (err) {}
  });
}

function buildRifle(T, def, i, M) {
  var g = new T.Group(), acc = accentMat(T, def);
  var drum = (i === 3), smg = (i === 1), heavy = (i === 6 || i === 9);
  bx(T, g, M.body, 0.15, 0.16, 0.62, 0, 0, 0.08);
  bx(T, g, acc, 0.155, 0.05, 0.4, 0, 0.045, 0.05);
  var blen = 0.5 + (i % 4) * 0.07 + (heavy ? 0.1 : 0);
  cy(T, g, M.dark, 0.032, 0.032, blen, 0, 0.01, -0.32 - blen / 2, Math.PI / 2);
  bx(T, g, M.dark, 0.12, 0.12, 0.3, 0, -0.01, -0.3);
  cy(T, g, M.dark, 0.045, 0.045, 0.09, 0, 0.01, -0.32 - blen, Math.PI / 2);
  if (drum) { cy(T, g, acc, 0.13, 0.13, 0.12, 0, -0.2, 0.02, 0, Math.PI / 2); }
  else { bx(T, g, M.dark, 0.08, 0.2 + (i % 3) * 0.04, 0.11, 0, -0.18, 0.05, 0.18); }
  bx(T, g, M.dark, 0.07, 0.16, 0.09, 0, -0.15, 0.32, 0.35);
  if (i % 3 === 0) { bx(T, g, M.wood, 0.11, 0.18, 0.26, 0, -0.03, 0.5); }
  else if (i % 3 === 1) { bx(T, g, M.dark, 0.05, 0.05, 0.24, 0, 0.02, 0.48); bx(T, g, acc, 0.1, 0.16, 0.05, 0, -0.02, 0.6); }
  else { bx(T, g, acc, 0.12, 0.14, 0.2, 0, -0.04, 0.48); }
  if (i % 3 === 0) { bx(T, g, M.dark, 0.03, 0.09, 0.03, 0, 0.12, -0.5); cy(T, g, acc, 0.035, 0.035, 0.02, 0, 0.1, -0.62, Math.PI / 2); }
  else if (i % 3 === 1) { bx(T, g, M.dark, 0.05, 0.07, 0.1, 0, 0.11, 0.02); var dot = new T.Mesh(new T.SphereGeometry(0.02, 10, 8), M.glow); dot.position.set(0, 0.12, -0.02); g.add(dot); }
  else { bx(T, g, M.dark, 0.06, 0.05, 0.3, 0, 0.12, 0.1); }
  if (smg) { bx(T, g, M.dark, 0.06, 0.14, 0.07, 0, -0.14, -0.32); }
  if (heavy) { bx(T, g, M.wood, 0.13, 0.14, 0.2, 0, -0.02, -0.42); }
  if (def.dual) { var g2 = g.clone(true); g2.position.x = -0.34; g.add(g2); }
  outline(T, g, M.line);
  return g;
}
function buildShotgun(T, def, i, M) {
  var g = new T.Group(), acc = accentMat(T, def);
  var dbl = (i === 1), slug = (i === 3);
  bx(T, g, M.body, 0.16, 0.17, 0.55, 0, 0, 0.1);
  bx(T, g, acc, 0.165, 0.06, 0.34, 0, 0.03, 0.08);
  var blen = 0.62 + (i % 3) * 0.06;
  if (dbl) {
    cy(T, g, M.dark, 0.04, 0.04, blen, -0.045, 0.02, -0.28 - blen / 2, Math.PI / 2);
    cy(T, g, M.dark, 0.04, 0.04, blen, 0.045, 0.02, -0.28 - blen / 2, Math.PI / 2);
  } else {
    cy(T, g, M.dark, slug ? 0.035 : 0.048, slug ? 0.035 : 0.048, blen, 0, 0.03, -0.28 - blen / 2, Math.PI / 2);
    cy(T, g, acc, 0.032, 0.032, blen * 0.7, 0, -0.05, -0.28 - blen * 0.35, Math.PI / 2);
  }
  var pz = -0.35 - (i % 4) * 0.05;
  bx(T, g, M.wood, 0.13, 0.12, 0.24, 0, -0.03, pz);
  bx(T, g, M.dark, 0.05, 0.05, 0.05, 0, 0.12, -0.28 - blen + 0.06);
  var bead = new T.Mesh(new T.SphereGeometry(0.018, 10, 8), M.glow);
  bead.position.set(0, 0.14, -0.28 - blen + 0.06); g.add(bead);
  if (i % 2 === 0) { bx(T, g, M.wood, 0.12, 0.2, 0.3, 0, -0.04, 0.5); }
  else { bx(T, g, M.dark, 0.09, 0.16, 0.12, 0, -0.05, 0.42, 0.25); bx(T, g, acc, 0.11, 0.18, 0.06, 0, -0.03, 0.56); }
  bx(T, g, M.dark, 0.07, 0.15, 0.09, 0, -0.15, 0.3, 0.35);
  if (i === 2 || i === 9) { for (var s = 0; s < 3; s++) cy(T, g, acc, 0.022, 0.022, 0.07, 0.1, 0.02, 0.0 + s * 0.08, 0, Math.PI / 2); }
  outline(T, g, M.line);
  return g;
}
function buildSniper(T, def, i, M) {
  var g = new T.Group(), acc = accentMat(T, def);
  bx(T, g, M.body, 0.15, 0.16, 0.6, 0, 0, 0.1);
  bx(T, g, acc, 0.155, 0.04, 0.5, 0, -0.05, 0.05);
  var blen = 0.85 + (i % 4) * 0.08;
  cy(T, g, M.dark, 0.03, 0.034, blen, 0, 0.02, -0.3 - blen / 2, Math.PI / 2);
  if (i === 7) { cy(T, g, M.dark, 0.055, 0.055, 0.24, 0, 0.02, -0.3 - blen, Math.PI / 2); }
  else { cy(T, g, acc, 0.045, 0.045, 0.1, 0, 0.02, -0.3 - blen, Math.PI / 2); }
  cy(T, g, M.dark, 0.062, 0.062, 0.4, 0, 0.17, -0.05, Math.PI / 2);
  cy(T, g, M.dark, 0.075, 0.062, 0.09, 0, 0.17, -0.29, Math.PI / 2);
  cy(T, g, M.dark, 0.07, 0.062, 0.08, 0, 0.17, 0.17, Math.PI / 2);
  bx(T, g, M.dark, 0.05, 0.09, 0.05, 0, 0.1, -0.14);
  bx(T, g, M.dark, 0.05, 0.09, 0.05, 0, 0.1, 0.06);
  var lens = new T.Mesh(new T.CircleGeometry(0.055, 16), new T.MeshBasicMaterial({ color: 0x88ccff }));
  lens.position.set(0, 0.17, -0.336); lens.rotation.y = Math.PI; g.add(lens);
  var side = (i % 2 === 0) ? 1 : -1;
  cy(T, g, M.dark, 0.018, 0.018, 0.12, side * 0.12, 0.03, 0.18, 0, Math.PI / 2);
  var knob = new T.Mesh(new T.SphereGeometry(0.032, 10, 8), acc);
  knob.position.set(side * 0.18, 0.03, 0.18); g.add(knob);
  bx(T, g, M.dark, 0.07, 0.15, 0.09, 0, -0.15, 0.32, 0.3);
  if (i % 2 === 0) { bx(T, g, M.wood, 0.12, 0.19, 0.32, 0, -0.04, 0.52); bx(T, g, M.dark, 0.13, 0.07, 0.2, 0, 0.06, 0.5); }
  else { bx(T, g, acc, 0.12, 0.17, 0.3, 0, -0.05, 0.52); }
  bx(T, g, M.dark, 0.08, 0.16, 0.12, 0, -0.16, 0.1, 0.15);
  if (i % 2 === 0) {
    bx(T, g, M.dark, 0.03, 0.3, 0.03, -0.07, -0.28, -0.75, 0, 0, 0.3);
    bx(T, g, M.dark, 0.03, 0.3, 0.03, 0.07, -0.28, -0.75, 0, 0, -0.3);
  }
  outline(T, g, M.line);
  return g;
}
/* Builds a blade out of chained segments so curved swords stay perfectly
   connected (each segment starts exactly where the last one ended) instead
   of two disjoint boxes glued on top of each other at odd angles — that
   mismatch was what made some "katanas" look bent/broken. curveTotal is the
   total accumulated tilt (radians) across every segment; 0 = perfectly
   straight blade. */
function bladeChain(T, g, mat, totalLen, width, thick, startY, startZ, curveTotal, segs, taper) {
  var y = startY, z = startZ, angle = 0;
  var angleStep = curveTotal / segs;
  var segLen = totalLen / segs;
  for (var s = 0; s < segs; s++) {
    var dz = -Math.cos(angle), dy = Math.sin(angle);
    var cy2 = y + dy * segLen / 2, cz2 = z + dz * segLen / 2;
    var w = width * (taper ? (1 - 0.35 * (s / segs)) : 1);
    var m = bx(T, g, mat, w, thick, segLen + 0.002, 0, cy2, cz2, angle, 0, 0);
    y += dy * segLen; z += dz * segLen;
    angle += angleStep;
  }
  return { endY: y, endZ: z };
}
function buildBlade(T, def, i, M) {
  if (def.saber) return buildSaber(T, def, i, M);
  var g = new T.Group(), acc = accentMat(T, def);
  var blen = 0.95 + (i % 5) * 0.09 + (i === 2 || i === 8 ? 0.15 : 0);
  var bw = 0.05 + (i % 3) * 0.012 + (i === 8 ? 0.03 : 0);
  var curve = (i === 0 || i === 2 || i === 8);
  var curveTotal = curve ? -0.42 : 0; /* gentle continuous sweep toward the tip, like a real katana */
  bladeChain(T, g, M.blade, blen, bw, 0.028, 0.01, -0.1, curveTotal, curve ? 7 : 1, true);
  bladeChain(T, g, M.glow, blen * 0.7, bw * 0.2, 0.03, 0.01, -0.15, curveTotal * 0.7, curve ? 5 : 1, false);
  /* blood-groove line running the spine of the blade, always straight relative
     to its own segment so it never looks like it "snaps" off the blade */
  bladeChain(T, g, M.dark, blen * 0.92, bw * 0.14, 0.006, 0.024, -0.12, curveTotal * 0.92, curve ? 7 : 1, true);
  if (i % 3 === 0) { cy(T, g, M.dark, 0.09, 0.09, 0.035, 0, 0, -0.06, Math.PI / 2); cy(T, g, acc, 0.045, 0.045, 0.04, 0, 0, -0.06, Math.PI / 2); }
  else if (i % 3 === 1) { bx(T, g, M.dark, 0.2, 0.035, 0.05, 0, 0, -0.06); }
  else { bx(T, g, acc, 0.16, 0.03, 0.04, 0, 0, -0.06); bx(T, g, M.dark, 0.05, 0.05, 0.05, 0, 0, -0.06); }
  cy(T, g, M.dark, 0.032, 0.036, 0.34, 0, 0, 0.14, Math.PI / 2);
  for (var r = 0; r < 4; r++) cy(T, g, acc, 0.037, 0.037, 0.025, 0, 0, 0.03 + r * 0.075, Math.PI / 2);
  var pom = new T.Mesh(new T.SphereGeometry(0.04, 10, 8), M.dark);
  pom.position.set(0, 0, 0.33); g.add(pom);
  outline(T, g, M.line);
  return g;
}
/* Plain glowing cylinder blade + simple hilt for the lightsaber easter-egg
   weapon — deliberately skips the sketchy ink-blade look (no groove, no
   guard, no wraps) so it reads as a distinct sci-fi weapon, colored by the
   weapon's ink slot. */
function buildSaber(T, def, i, M) {
  var g = new T.Group();
  var glowColor = INK_HEX[def.ink] || '#1a30c0';
  var core = new T.MeshBasicMaterial({ color: 0xffffff });
  var glow = new T.MeshBasicMaterial({ color: glowColor });
  var blen = 1.05;
  cy(T, g, glow, 0.026, 0.026, blen, 0, 0.02, -0.16 - blen / 2, Math.PI / 2, 0, 16);
  cy(T, g, core, 0.011, 0.011, blen * 0.98, 0, 0.02, -0.16 - blen / 2, Math.PI / 2, 0, 16);
  var tip = new T.Mesh(new T.SphereGeometry(0.026, 12, 10), glow);
  tip.position.set(0, 0.02, -0.16 - blen); g.add(tip);
  cy(T, g, M.dark, 0.034, 0.034, 0.34, 0, 0, 0.12, Math.PI / 2, 0, 16);
  var accentRing = new T.MeshStandardMaterial({ color: glowColor, roughness: 0.4, metalness: 0.5 });
  cy(T, g, accentRing, 0.038, 0.038, 0.03, 0, 0, -0.06, Math.PI / 2, 0, 16);
  cy(T, g, accentRing, 0.038, 0.038, 0.03, 0, 0, 0.02, Math.PI / 2, 0, 16);
  for (var r = 0; r < 3; r++) cy(T, g, M.body, 0.036, 0.036, 0.02, 0, 0, 0.18 + r * 0.05, Math.PI / 2, 0, 16);
  var pom = new T.Mesh(new T.SphereGeometry(0.036, 10, 8), M.dark);
  pom.position.set(0, 0, 0.3); g.add(pom);
  outline(T, g, M.line);
  return g;
}
function buildRocket(T, def, i, M) {
  var g = new T.Group(), acc = accentMat(T, def);
  var quad = (i === 1), big = (i === 2);
  var rad = big ? 0.13 : 0.1;
  if (quad) {
    for (var qx = -1; qx <= 1; qx += 2) for (var qy = -1; qy <= 1; qy += 2)
      cy(T, g, M.dark, 0.055, 0.055, 0.85, qx * 0.07, qy * 0.07, -0.08, Math.PI / 2);
    bx(T, g, acc, 0.3, 0.3, 0.1, 0, 0, -0.48);
    bx(T, g, acc, 0.3, 0.3, 0.1, 0, 0, 0.3);
    cy(T, g, M.glow, 0.02, 0.05, 0.1, -0.07, 0.07, -0.55, Math.PI / 2);
  } else {
    cy(T, g, M.body, rad, rad, 1.0, 0, 0, -0.08, Math.PI / 2);
    cy(T, g, M.dark, rad + 0.015, rad + 0.015, 0.1, 0, 0, -0.56, Math.PI / 2);
    cy(T, g, M.dark, rad + 0.02, rad + 0.02, 0.16, 0, 0, 0.38, Math.PI / 2);
    bx(T, g, acc, 0.06, 0.05, 0.5, 0, rad + 0.01, -0.08);
    cy(T, g, acc, rad + 0.004, rad + 0.004, 0.06, 0, 0, -0.28, Math.PI / 2);
    cy(T, g, acc, rad + 0.004, rad + 0.004, 0.06, 0, 0, 0.12, Math.PI / 2);
    cy(T, g, M.glow, 0.018, rad * 0.7, 0.16, 0, 0, -0.64, Math.PI / 2);
  }
  bx(T, g, M.dark, 0.07, 0.15, 0.09, 0, -0.17, 0.12, 0.3);
  bx(T, g, M.wood, 0.1, 0.1, 0.24, 0, -0.1, 0.44);
  var topY = quad ? 0.2 : rad + 0.04;
  bx(T, g, M.dark, 0.04, 0.08, 0.1, 0, topY, -0.32);
  var dot = new T.Mesh(new T.SphereGeometry(0.02, 10, 8), M.glow);
  dot.position.set(0, topY + 0.03, -0.32); g.add(dot);
  outline(T, g, M.line);
  return g;
}
function buildModel(T, slot, def, idx) {
  var M = mats(T);
  var g = slot === 'rifle' ? buildRifle(T, def, idx, M)
    : slot === 'shotgun' ? buildShotgun(T, def, idx, M)
    : slot === 'sniper' ? buildSniper(T, def, idx, M)
    : slot === 'rocket' ? buildRocket(T, def, idx, M)
    : buildBlade(T, def, idx, M);
  g.scale.setScalar(def.scale || 1);
  return g;
}
function cachedModel(T, slot, def, idx) {
  modelCache[slot] = modelCache[slot] || {};
  if (!modelCache[slot][def.id]) modelCache[slot][def.id] = buildModel(T, slot, def, idx);
  return modelCache[slot][def.id];
}

/* ----- preview ----- */
function stopPreview() {
  if (preview && preview.raf) cancelAnimationFrame(preview.raf);
  if (preview && preview.renderer) {
    try {
      var el = preview.renderer.domElement;
      if (el && el.parentNode) el.parentNode.removeChild(el);
      preview.renderer.dispose();
    } catch (e) {}
  }
  preview = null;
}
function frameCamera(T, camera, group, dir) {
  var box = new T.Box3().setFromObject(group);
  var center = box.getCenter(new T.Vector3());
  var size = box.getSize(new T.Vector3()).length();
  var dist = Math.max(0.8, size * 1.35);
  var d = dir || new T.Vector3(0.62, 0.34, 0.72).normalize();
  camera.position.copy(center).addScaledVector(d, dist);
  camera.lookAt(center);
  return { center: center, dist: dist };
}
function startPreview(def, idx) {
  stopPreview();
  var box = $('#dd-preview');
  if (!box) return;
  ensureThree().then(function (T) {
    if (!document.body.contains(box)) return;
    box.innerHTML = '';
    var W = Math.max(280, box.clientWidth || 420), H = 300;
    var renderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      box.innerHTML = '<div class="dd-preview-hint">3D unavailable on this device</div>';
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    box.appendChild(renderer.domElement);
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(38, W / H, 0.05, 60);
    scene.add(new T.HemisphereLight(0xffffff, 0x8a8fb0, 1.15));
    var key = new T.DirectionalLight(0xffffff, 1.7); key.position.set(3, 5, 4); scene.add(key);
    var fill = new T.DirectionalLight(0xbfd0ff, 0.55); fill.position.set(-3, 2, -2); scene.add(fill);
    var group = cachedModel(T, loadoutSlot, def, idx);
    var holder = new T.Group();
    holder.add(group);
    scene.add(holder);
    var shadow = new T.Mesh(new T.CircleGeometry(0.9, 28),
      new T.MeshBasicMaterial({ color: 0x1a30c0, transparent: true, opacity: 0.1 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.52; scene.add(shadow);
    var fr = frameCamera(T, camera, holder);
    preview = { renderer: renderer, scene: scene, camera: camera, holder: holder, tRotY: 0.6, rotY: 0.6, tRotX: 0, rotX: 0, dragging: false, lastX: 0, lastY: 0, idle: 0 };
    holder.position.sub(fr.center);
    shadow.position.y = -fr.dist * 0.32;
    var cv = renderer.domElement;
    cv.style.touchAction = 'pan-y';
    cv.addEventListener('pointerdown', function (e) { preview.dragging = true; preview.lastX = e.clientX; preview.lastY = e.clientY; preview.idle = 0; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', function (e) {
      if (!preview || !preview.dragging) return;
      preview.tRotY += (e.clientX - preview.lastX) * 0.012;
      preview.tRotX += (e.clientY - preview.lastY) * 0.008;
      preview.tRotX = Math.max(-0.7, Math.min(0.7, preview.tRotX));
      preview.lastX = e.clientX; preview.lastY = e.clientY; preview.idle = 0;
    });
    var end = function () { if (preview) preview.dragging = false; };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    var t0 = performance.now();
    var loop = function () {
      if (!preview || preview.renderer !== renderer) return;
      preview.raf = requestAnimationFrame(loop);
      var t = (performance.now() - t0) / 1000;
      preview.idle += 1 / 60;
      if (!preview.dragging && preview.idle > 2.5) preview.tRotY += 0.008;
      preview.rotY += (preview.tRotY - preview.rotY) * 0.12;
      preview.rotX += (preview.tRotX - preview.rotX) * 0.12;
      holder.rotation.y = preview.rotY;
      holder.rotation.x = preview.rotX;
      holder.position.y = -fr.center.y + Math.sin(t * 1.4) * 0.02;
      renderer.render(scene, camera);
    };
    loop();
  }).catch(function () {
    box.innerHTML = '<div class="dd-preview-hint">3D unavailable (needs network for three.js)</div>';
  });
}

/* ----- thumbnails ----- */
function renderThumbs(list) {
  ensureThree().then(function (T) {
    if (!document.body.contains(panelEl)) return;
    if (!thumbRenderer) {
      thumbRenderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
      thumbRenderer.setSize(132, 88);
      thumbScene = new T.Scene();
      thumbCamera = new T.PerspectiveCamera(36, 132 / 88, 0.05, 60);
      thumbScene.add(new T.HemisphereLight(0xffffff, 0x8a8fb0, 1.2));
      var k = new T.DirectionalLight(0xffffff, 1.6); k.position.set(3, 5, 4); thumbScene.add(k);
    }
    list.forEach(function (w, i) {
      var slot = $('.dd-thumb[data-thumb="' + w.id + '"]');
      if (!slot || slot.querySelector('img')) return;
      try {
        var holder = new T.Group();
        /* build a dedicated thumb instance so preview parenting is untouched */
        holder.add(buildModel(T, loadoutSlot, w, i));
        thumbScene.add(holder);
        frameCamera(T, thumbCamera, holder);
        holder.rotation.y = 0.55;
        thumbRenderer.render(thumbScene, thumbCamera);
        var url = thumbRenderer.domElement.toDataURL('image/png');
        thumbScene.remove(holder);
        var img = document.createElement('img');
        img.src = url; img.alt = w.name; img.draggable = false;
        slot.innerHTML = '';
        slot.appendChild(img);
      } catch (e) { /* keep fallback letter */ }
    });
  }).catch(function () {});
}

/* ---------------- profile ---------------- */
function renderProfile() {
  stopPreview();
  var p = getProfile();
  var lv = levelForXP(p.xp);
  var b = bannerById(p.banner);
  var pct = Math.round(100 * lv.cur / lv.need);
  var unlocks = getUnlocks();
  var avatarInner = p.avatar
    ? '<img src="' + p.avatar + '" alt="avatar">'
    : (p.specialEmblem ? SPECIAL_EMBLEMS.filter(function (e) { return e.id === p.specialEmblem; })[0].icon : EMBLEMS[p.emblem]);
  panelEl.innerHTML =
    '<h1>PROFILE</h1>' +
    '<div class="dd-banner" style="' + bannerStyle(b) + 'color:' + b.fg + '">' +
      '<span class="dd-pfp' + (p.avatar ? ' has-img' : '') + '" id="dd-pfp">' + avatarInner + '</span>' +
      '<span class="dd-pname">' + escapeHtml(playerName()) + '</span>' +
      '<span class="dd-level">LEVEL ' + lv.level + '</span>' +
    '</div>' +
    '<div class="dd-xpbar"><i style="width:' + pct + '%"></i><span>' + lv.cur + ' / ' + lv.need + ' XP</span></div>' +
    '<div class="dd-pgrid">' +
      '<div><b>' + p.matches + '</b><span>matches</span></div>' +
      '<div><b>' + p.kills + '</b><span>kills</span></div>' +
      '<div><b>' + p.bestScore + '</b><span>best score</span></div>' +
      '<div><b>' + p.bestWave + '</b><span>best wave</span></div>' +
      '<div><b>' + p.wins + '</b><span>online wins</span></div>' +
    '</div>' +
    '<div class="dd-sec-label">CALLSIGN</div>' +
    '<div class="dd-row"><input type="text" id="dd-name" maxlength="14" value="' + escapeHtml(playerName()) + '" autocomplete="off" spellcheck="false">' +
    '<span class="dd-hint">applies on next refresh</span></div>' +
    '<div class="dd-sec-label">PROFILE PHOTO</div>' +
    '<div class="dd-row">' +
      '<button type="button" class="dd-alt" id="dd-pfp-upload">UPLOAD PHOTO</button>' +
      (p.avatar ? '<button type="button" class="dd-alt" id="dd-pfp-clear">REMOVE PHOTO</button>' : '') +
      '<input type="file" id="dd-pfp-file" accept="image/*" hidden>' +
      '<span class="dd-hint">square images look best · stored on this device only</span>' +
    '</div>' +
    '<div class="dd-sec-label">EMBLEM</div>' +
    '<div class="dd-emblems">' + EMBLEMS.map(function (e, i) {
      return '<button type="button" class="dd-emb' + (!p.avatar && !p.specialEmblem && p.emblem === i ? ' on' : '') + '" data-emb="' + i + '">' + e + '</button>';
    }).join('') +
    SPECIAL_EMBLEMS.map(function (e) {
      var unlocked = isEmblemUnlocked(e.id);
      var on = !p.avatar && p.specialEmblem === e.id;
      return '<button type="button" class="dd-emb dd-emb-special' + (on ? ' on' : '') + (unlocked ? '' : ' locked') + '" data-semb="' + e.id + '" title="' + e.name + (unlocked ? '' : ' — redeem code required') + '">' + (unlocked ? e.icon : '[X]') + '</button>';
    }).join('') + '</div>' +
    '<div class="dd-sec-label">BANNER</div>' +
    '<div class="dd-banners">' + BANNERS.map(function (bn) {
      var unlocked = isBannerUnlocked(bn);
      var lockNote = bn.req ? ('Requires Level ' + bn.req) : (bn.special ? 'Redeem code required' : '');
      return '<button type="button" class="dd-bn' + (bn.img ? ' dd-bn-img' : '') + (p.banner === bn.id ? ' on' : '') + (unlocked ? '' : ' locked') + '" data-bn="' + bn.id + '"' + (unlocked ? '' : ' data-locked="1"') + ' style="' + bannerStyle(bn) + '" title="' + bn.name + (lockNote ? ' — ' + lockNote : '') + '">' +
        '<span style="color:' + bn.fg + '">' + bn.name + (unlocked ? '' : ' [X]') + '</span>' +
        (lockNote && !unlocked ? '<i class="dd-bn-req">' + lockNote + '</i>' : '') +
      '</button>';
    }).join('') + '</div>' +
    '<div class="dd-sec-label">REDEEM CODE</div>' +
    '<div class="dd-row"><input type="text" id="dd-redeem" maxlength="24" placeholder="enter code here" autocomplete="off" spellcheck="false">' +
    '<button type="button" class="dd-alt" id="dd-redeem-btn">REDEEM</button></div>' +
    '<div class="dd-hint">codes can unlock special weapons, banners, pfps, XP and more · one-time use</div>' +
    '<div class="dd-row"><button type="button" class="dd-alt" id="dd-p-reset">RESET PROGRESS</button>' +
    '<span class="dd-hint">earn XP from every match · harder runs earn more</span></div>';

  $('#dd-name', panelEl).addEventListener('input', function (e) {
    var v = e.target.value.trim().slice(0, 14);
    store.set('doodle_name', v);
  });
  $$('[data-emb]', panelEl).forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pp = getProfile(); pp.emblem = Number(btn.dataset.emb); pp.avatar = null; pp.specialEmblem = null; saveProfile(pp);
      refreshProfileChip(); renderProfile();
    });
  });
  $$('[data-semb]', panelEl).forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!isEmblemUnlocked(btn.dataset.semb)) { toast('Locked — redeem a code to unlock this emblem', 3); return; }
      var pp = getProfile(); pp.specialEmblem = btn.dataset.semb; pp.avatar = null; saveProfile(pp);
      refreshProfileChip(); renderProfile();
    });
  });
  $$('[data-bn]', panelEl).forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.dataset.locked) { toast('Locked banner — ' + (btn.title.split(' — ')[1] || 'not unlocked yet'), 3); return; }
      var pp = getProfile(); pp.banner = btn.dataset.bn; saveProfile(pp);
      renderProfile();
    });
  });
  $('#dd-pfp-upload', panelEl).addEventListener('click', function () {
    $('#dd-pfp-file', panelEl).click();
  });
  $('#dd-pfp-file', panelEl).addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast('Please choose an image file'); return; }
    if (file.size > 4 * 1024 * 1024) { toast('Image too big — please use something under 4MB'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      /* Downscale through a canvas so huge phone photos don't bloat localStorage */
      var img = new Image();
      img.onload = function () {
        var size = 256;
        var canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        var ctx = canvas.getContext('2d');
        var scale = Math.max(size / img.width, size / img.height);
        var w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        var dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        var pp = getProfile(); pp.avatar = dataUrl; saveProfile(pp);
        refreshProfileChip(); renderProfile();
        toast('Profile photo updated');
      };
      img.onerror = function () { toast('Could not read that image'); };
      img.src = reader.result;
    };
    reader.onerror = function () { toast('Could not read that file'); };
    reader.readAsDataURL(file);
  });
  var clearBtn = $('#dd-pfp-clear', panelEl);
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      var pp = getProfile(); pp.avatar = null; saveProfile(pp);
      refreshProfileChip(); renderProfile();
    });
  }
  $('#dd-redeem-btn', panelEl).addEventListener('click', function () {
    var input = $('#dd-redeem', panelEl);
    var res = redeemCode(input.value);
    toast(res.msg, res.ok ? 3.5 : 2.5);
    if (res.ok) { input.value = ''; renderProfile(); }
  });
  $('#dd-redeem', panelEl).addEventListener('keydown', function (e) {
    if (e.key === 'Enter') $('#dd-redeem-btn', panelEl).click();
  });
  $('#dd-p-reset', panelEl).addEventListener('click', function () {
    if (confirm('Reset all profile progress (XP, stats)?')) {
      saveProfile(defaultProfile());
      refreshProfileChip(); renderProfile();
      toast('Progress reset');
    }
  });
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
}

/* ---------------- settings ---------------- */
function defaultSettings() {
  return { sens: 100, invert: false, trackpad: false, music: true, graphicsQuality: 'high', antiAlias: true, particles: true, shadows: true, mobileControls: true, virtualJoystick: true };
}
function getSettings() {
  var s = store.get('doodle_settings_v0.1', null);
  return Object.assign(defaultSettings(), s || {});
}
function renderSettings() {
  stopPreview();
  var st = getSettings();
  panelEl.innerHTML =
    '<h1>SETTINGS</h1>' +
    '<h2>look &amp; feel</h2>' +
    '<div class="dd-set">' +
      '<label>look sensitivity <input type="range" id="dd-sens" min="25" max="250" step="5" value="' + st.sens + '"><b id="dd-sensv">' + st.sens + '%</b></label>' +
      '<label><input type="checkbox" id="dd-inv"' + (st.invert ? ' checked' : '') + '> invert vertical look</label>' +
      '<label><input type="checkbox" id="dd-track"' + (st.trackpad ? ' checked' : '') + '> trackpad mode</label>' +
      '<label><input type="checkbox" id="dd-mus"' + (st.music ? ' checked' : '') + '> music (M)</label>' +
    '</div>' +
    '<h2>graphics</h2>' +
    '<div class="dd-set">' +
      '<label>quality: <select id="dd-gq">' +
        ['low', 'medium', 'high'].map(function (q) { return '<option value="' + q + '"' + (st.graphicsQuality === q ? ' selected' : '') + '>' + q[0].toUpperCase() + q.slice(1) + '</option>'; }).join('') +
      '</select></label>' +
      '<label><input type="checkbox" id="dd-aa"' + (st.antiAlias ? ' checked' : '') + '> anti-aliasing</label>' +
      '<label><input type="checkbox" id="dd-pt"' + (st.particles !== false ? ' checked' : '') + '> particle effects</label>' +
      '<label><input type="checkbox" id="dd-sh"' + (st.shadows !== false ? ' checked' : '') + '> dynamic shadows</label>' +
    '</div>' +
    '<h2>mobile</h2>' +
    '<div class="dd-set">' +
      '<label><input type="checkbox" id="dd-mc"' + (st.mobileControls ? ' checked' : '') + '> enable touch controls</label>' +
      '<label><input type="checkbox" id="dd-vj"' + (st.virtualJoystick ? ' checked' : '') + '> virtual joystick</label>' +
    '</div>' +
    '<h2>cloud sync (Supabase)</h2>' +
    '<div class="dd-set">' +
      '<label>Supabase URL <input type="text" id="dd-sb-url" placeholder="https://xxx.supabase.co" value="' + escapeHtml(store.get('dd_supabase_url', '')) + '"></label>' +
      '<label>Supabase anon key <input type="text" id="dd-sb-key" placeholder="eyJhbGci..." value="' + escapeHtml(store.get('dd_supabase_anon_key', '')) + '"></label>' +
      '<div class="dd-hint">enter your Supabase project URL and anon key to enable cloud saves and global ranks · get them from your Supabase dashboard → Settings → API</div>' +
    '</div>' +
    '<div class="dd-row"><button type="button" class="dd-big" id="dd-save">SAVE SETTINGS</button></div>' +
    '<div class="dd-hint">settings apply on next refresh · the main menu sliders apply instantly</div>';

  $('#dd-sens', panelEl).addEventListener('input', function (e) { $('#dd-sensv', panelEl).textContent = e.target.value + '%'; });
  $('#dd-save', panelEl).addEventListener('click', function () {
    var nst = {
      sens: Number($('#dd-sens', panelEl).value) || 100,
      invert: $('#dd-inv', panelEl).checked,
      trackpad: $('#dd-track', panelEl).checked,
      music: $('#dd-mus', panelEl).checked,
      graphicsQuality: $('#dd-gq', panelEl).value,
      antiAlias: $('#dd-aa', panelEl).checked,
      particles: $('#dd-pt', panelEl).checked,
      shadows: $('#dd-sh', panelEl).checked,
      sbUrl: ($('#dd-sb-url', panelEl).value || '').trim(),
      sbKey: ($('#dd-sb-key', panelEl).value || '').trim(),
      mobileControls: $('#dd-mc', panelEl).checked,
      virtualJoystick: $('#dd-vj', panelEl).checked
    };
    store.set('doodle_settings_v0.1', nst);
    /* mirror look settings into the game's own keys so they apply live */
    store.set('doodle_sens', nst.sens);
    store.set('doodle_invert', nst.invert ? '1' : '0');
    store.set('doodle_trackpad', nst.trackpad ? '1' : '0');
    store.set('doodle_music', nst.music ? '1' : '0');
    /* Save Supabase config */
    if (nst.sbUrl) store.set('dd_supabase_url', nst.sbUrl); else localStorage.removeItem('dd_supabase_url');
    if (nst.sbKey) store.set('dd_supabase_anon_key', nst.sbKey); else localStorage.removeItem('dd_supabase_anon_key');
    if (nst.sbUrl && nst.sbKey && window.__ddSync) {
      toast('Connecting to Supabase…');
      window.__ddSync.init().then(function (ok) { toast(ok ? 'Cloud sync enabled!' : 'Supabase connection failed — check URL and key', 3.5); });
    }
    toast('Settings saved');
  });
}

/* ---------------- changelog ---------------- */
function renderChangelog() {
  stopPreview();
  panelEl.innerHTML = '<h1>CHANGELOG</h1><h2>every update, doodled down</h2>' +
    '<div class="dd-cl">' + CHANGELOG.map(function (e) {
      return '<div class="dd-cl-entry"><h3>v' + e.v + ' — ' + e.title + ' <span>(' + e.date + ')</span></h3>' +
        Object.keys(e.sections).map(function (sec) {
          return '<strong>' + sec + '</strong><ul>' +
            e.sections[sec].map(function (li) { return '<li>' + li + '</li>'; }).join('') + '</ul>';
        }).join('') + '</div>';
    }).join('') + '</div>';
}

/* ---------------- party ---------------- */
function partyMode() { return store.get('doodle_party_mode', 'ffa'); }
function renderParty() {
  stopPreview();
  var P = window.__ddParty || null;
  if (!P) {
    panelEl.innerHTML = '<h1>PARTY</h1><div class="dd-party"><div class="dd-note">Party pack is still loading&hellip; reopen this tab in a few seconds.</div></div>';
    return;
  }
  var muts = P.getMutators();
  var wx = P.getWeather();
  var skins = P.isInkSkins();
  var mode = partyMode();
  var modesLive = !!window.__ddModes;
  var chal = P.challenges();
  function mbtn(id, label, live) {
    return '<button class="dd-choice' + (mode === id ? ' on' : '') + '" data-mode="' + id + '"' +
      (live ? '' : ' disabled') + '>' + label + '</button>';
  }
  function tgl(kind, label, on) {
    return '<button class="dd-toggle' + (on ? ' on' : '') + '" data-mut="' + kind + '">' +
      '<span class="dd-dot"></span>' + label + '</button>';
  }
  function wxbtn(id, label) {
    return '<button class="dd-choice' + (wx === id ? ' on' : '') + '" data-wx="' + id + '">' + label + '</button>';
  }
  function chalRow(c, tag) {
    var pct = c.target ? Math.round(100 * Math.min(c.cur, c.target) / c.target) : 0;
    return '<div class="dd-chal' + (c.done ? ' done' : '') + '"><div class="dd-cdesc">' +
      (c.done ? '&#9733; ' : '') + escapeHtml(c.desc) + '</div>' +
      '<div class="dd-cbar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="dd-cmeta">' + tag + ' &middot; ' + c.cur + '/' + c.target + ' &middot; +' + c.xp + ' XP' +
      (c.done ? ' &middot; DONE' : '') + '</div></div>';
  }
  var hatLib = window.__ddHats || null;
  var curHat = hatLib ? hatLib.get() : 'none';
  var hatBtns = hatLib ? hatLib.list().map(function (h) {
    return '<button class="dd-choice' + (curHat === h.id ? ' on' : '') + '" data-hat="' + h.id + '"' +
      (h.locked ? ' disabled' : '') + '>' + escapeHtml(h.label) + (h.locked ? ' \uD83D\uDD12' : '') + '</button>';
  }).join('') : '<span class="dd-note">Hats loading&hellip;</span>';
  var html = '<h1>PARTY</h1><div class="dd-party">' +
    '<h2>MATCH MODE (online)</h2><div class="dd-row">' +
    mbtn('ffa', 'FFA', true) +
    mbtn('koth', 'KING OF THE HILL', modesLive) +
    mbtn('infected', 'INFECTED', modesLive) +
    mbtn('jugg', 'JUGGERNAUT', modesLive) +
    '</div><div class="dd-note">The host&apos;s pick rules online matches. Solo supports FFA + KOTH-vs-waves.</div>' +
    '<h2>MUTATORS (instant, you-only FX)</h2><div class="dd-row">' +
    tgl('lowgrav', 'LOW GRAVITY', muts.lowgrav) +
    tgl('bighead', 'BIG HEADS', muts.bighead) +
    '</div><div class="dd-note">Pure party chaos, visible only to you. Great for clips.</div>' +
    '<h2>WEATHER (you-only FX)</h2><div class="dd-row">' +
    wxbtn('day', 'DAY') + wxbtn('dusk', 'DUSK') + wxbtn('night', 'NIGHT') + wxbtn('rain', 'RAIN') + wxbtn('snow', 'SNOW') +
    '</div>' +
    '<h2>INK GUN-SKINS</h2><div class="dd-row">' +
    '<button class="dd-toggle' + (skins ? ' on' : '') + '" data-skins="1"><span class="dd-dot"></span>INK LASERS + ACCENTS</button>' +
    '</div><div class="dd-note">Lasers and grip stripes follow each gun&apos;s ink color.</div>' +
    '<h2>HAT (seen by others online)</h2><div class="dd-row">' + hatBtns + '</div>' +
    '<h2>CHALLENGES</h2>' +
    chal.daily.map(function (c) { return chalRow(c, 'DAILY'); }).join('') +
    chalRow(chal.weekly, 'WEEKLY') +
    '<h2>FIELD MANUAL</h2><div class="dd-note">' +
    'G grenade (hold to cook) &middot; Q / E grapple &middot; F rocket &middot; L laser sights &middot; H GG emote<br>' +
    '1&ndash;5 / wheel weapons &middot; R reload &middot; V melee &middot; X dash &middot; B sketch-wall &middot; host picks modes in PARTY' +
    '</div></div>';
  panelEl.innerHTML = html;
  function each(sel, fn) {
    var n = panelEl.querySelectorAll(sel);
    for (var i = 0; i < n.length; i++) fn(n[i]);
  }
  each('[data-mut]', function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-mut');
      P.setMutator(k, !P.getMutators()[k]);
      renderParty();
    });
  });
  each('[data-wx]', function (b) {
    b.addEventListener('click', function () { P.setWeather(b.getAttribute('data-wx')); renderParty(); });
  });
  each('[data-mode]', function (b) {
    b.addEventListener('click', function () { store.set('doodle_party_mode', b.getAttribute('data-mode')); renderParty(); });
  });
  each('[data-hat]', function (b) {
    b.addEventListener('click', function () { if (hatLib) hatLib.set(b.getAttribute('data-hat')); renderParty(); });
  });
  var sk = panelEl.querySelector('[data-skins]');
  if (sk) sk.addEventListener('click', function () { P.setInkSkins(!P.isInkSkins()); renderParty(); });
}

/* ---------------- stats ---------------- */
var STAT_WLABELS = { rifle: 'RIFLE', shotgun: 'SHOTGUN', sniper: 'SNIPER', revolver: 'REVOLVER', blade: 'BLADE', grenade: 'GRENADE', rocket: 'ROCKET', fall: 'FALL', unknown: 'OTHER' };
function renderStats() {
  stopPreview();
  var p = getProfile();
  var lv = levelForXP(p.xp);
  var P = window.__ddParty || null;
  var s = P ? P.session : { kills: 0, deaths: 0, streak: 0, best: 0, headshots: 0, matches: 0, wins: 0 };
  var lw = (P && P.lifeWeapons) || {};
  var ok = p.onlineKills || 0, od = p.onlineDeaths || 0;
  var kd = od ? (ok / od).toFixed(2) : '&mdash;';
  var names = Object.keys(lw).sort(function (a, b) { return (lw[b] || 0) - (lw[a] || 0); });
  var wrows = names.length ? names.map(function (k) {
    return '<tr><td>' + escapeHtml(STAT_WLABELS[k] || k.toUpperCase()) + '</td><td>' + (lw[k] || 0) + '</td></tr>';
  }).join('') : '<tr><td colspan="2">No erasures tracked yet — go draw some blood.</td></tr>';
  panelEl.innerHTML = '<h1>STATS</h1><div class="dd-stats">' +
    '<h2>LIFETIME</h2><div class="dd-sgrid">' +
    '<div><b>' + lv.level + '</b><span>level</span></div>' +
    '<div><b>' + p.matches + '</b><span>matches</span></div>' +
    '<div><b>' + p.kills + '</b><span>kills</span></div>' +
    '<div><b>' + (p.wins || 0) + '</b><span>ffa wins</span></div>' +
    '<div><b>' + ok + ' / ' + od + '</b><span>online k / d</span></div>' +
    '<div><b>' + kd + '</b><span>online k/d</span></div>' +
    '<div><b>' + p.bestScore + '</b><span>best score</span></div>' +
    '<div><b>' + p.bestWave + '</b><span>best wave</span></div>' +
    '</div>' +
    '<h2>THIS SESSION</h2><div class="dd-sgrid">' +
    '<div><b>' + s.kills + '</b><span>kills</span></div>' +
    '<div><b>' + s.deaths + '</b><span>deaths</span></div>' +
    '<div><b>' + s.best + '</b><span>best streak</span></div>' +
    '<div><b>' + s.headshots + '</b><span>headshots</span></div>' +
    '<div><b>' + s.matches + '</b><span>matches</span></div>' +
    '<div><b>' + s.wins + '</b><span>wins</span></div>' +
    '</div>' +
    '<h2>ERASURES BY WEAPON</h2><table class="dd-wtable">' + wrows + '</table>' +
    '</div>';
}

/* ---------------- credits ---------------- */
function renderCredits() {
  stopPreview();
  panelEl.innerHTML =
    '<h1>CREDITS</h1>' +
    '<div class="dd-credits">' +
      '<h3>Game Development</h3><p><span>Creator:</span> Zwoz</p>' +
      '<h3>Technologies</h3>' +
      '<p><span>3D Engine:</span> Three.js v0.170.0</p>' +
      '<p><span>Multiplayer:</span> PeerJS v1.5.4</p>' +
      '<p><span>Fonts:</span> Patrick Hand, Caveat (Google Fonts)</p>' +
      '<h3>Version</h3><p>Doodle District v' + VERSION + '</p>' +
      '<h3>Contact</h3><p><a href="https://github.com/nooranirizki14-rgb/shiny-octo-invention">View Repository</a></p>' +
    '</div>';
}

/* ---------------- leaderboard ---------------- */
function renderLeaderboard() {
  stopPreview();
  var sync = window.__ddSync;
  var configured = sync && sync.isConfigured();
  var connected = sync && sync.isConnected();
  panelEl.innerHTML =
    '<h1>RANKS</h1>' +
    '<h2>global doodler standings</h2>' +
    (configured ? '' : '<div class="dd-hint" style="margin-bottom:12px">Connect Supabase in SETTINGS to enable cloud ranks. Showing local stats for now.</div>') +
    '<div class="dd-lb-tabs">' +
      '<button type="button" class="dd-lb-tab on" data-lb="solo">SOLO</button>' +
      '<button type="button" class="dd-lb-tab" data-lb="mp">MULTIPLAYER</button>' +
    '</div>' +
    '<div id="dd-lb-body"><div class="dd-hint">loading…</div></div>' +
    '<div class="dd-row"><button type="button" class="dd-alt" id="dd-lb-refresh">REFRESH</button>' +
    '<span class="dd-hint">ranks update after each match</span></div>';

  var lbMode = 'solo';
  function loadLb(mode) {
    lbMode = mode;
    var body = $('#dd-lb-body', panelEl);
    if (!body) return;
    body.innerHTML = '<div class="dd-hint">loading…</div>';
    if (!configured) {
      /* Show local stats */
      var p = getProfile();
      var lv = levelForXP(p.xp);
      if (mode === 'solo') {
        body.innerHTML = '<table class="dd-lb-table"><tr><th>#</th><th>DOODLER</th><th>LVL</th><th>SCORE</th><th>WAVE</th><th>KILLS</th></tr>' +
          '<tr class="me"><td>1</td><td>' + escapeHtml(playerName()) + '</td><td>' + lv.level + '</td><td>' + (p.bestScore || 0) + '</td><td>' + (p.bestWave || 0) + '</td><td>' + (p.kills || 0) + '</td></tr></table>';
      } else {
        var kd = p.onlineDeaths ? ((p.onlineKills || 0) / p.onlineDeaths).toFixed(2) : '—';
        body.innerHTML = '<table class="dd-lb-table"><tr><th>#</th><th>DOODLER</th><th>LVL</th><th>KILLS</th><th>DEATHS</th><th>K/D</th><th>WINS</th></tr>' +
          '<tr class="me"><td>1</td><td>' + escapeHtml(playerName()) + '</td><td>' + lv.level + '</td><td>' + (p.onlineKills || 0) + '</td><td>' + (p.onlineDeaths || 0) + '</td><td>' + kd + '</td><td>' + (p.wins || 0) + '</td></tr></table>';
      }
      return;
    }
    sync.getLeaderboard(mode).then(function (rows) {
      if (!rows || !rows.length) { body.innerHTML = '<div class="dd-hint">no entries yet — play a match to appear!</div>'; return; }
      var myId = sync.getDeviceId();
      if (mode === 'solo') {
        body.innerHTML = '<table class="dd-lb-table"><tr><th>#</th><th>DOODLER</th><th>LVL</th><th>SCORE</th><th>WAVE</th><th>KILLS</th></tr>' +
          rows.map(function (r, i) {
            return '<tr' + '><td>' + (i + 1) + '</td><td>' + escapeHtml(r.callsign || 'doodle') + '</td><td>' + (r.level || 1) + '</td><td>' + (r.best_score || 0) + '</td><td>' + (r.best_wave || 0) + '</td><td>' + (r.total_kills || 0) + '</td></tr>';
          }).join('') + '</table>';
      } else {
        body.innerHTML = '<table class="dd-lb-table"><tr><th>#</th><th>DOODLER</th><th>LVL</th><th>KILLS</th><th>DEATHS</th><th>K/D</th><th>WINS</th></tr>' +
          rows.map(function (r, i) {
            var kd = r.online_deaths ? ((r.online_kills || 0) / r.online_deaths).toFixed(2) : '—';
            return '<tr><td>' + (i + 1) + '</td><td>' + escapeHtml(r.callsign || 'doodle') + '</td><td>' + (r.level || 1) + '</td><td>' + (r.online_kills || 0) + '</td><td>' + (r.online_deaths || 0) + '</td><td>' + kd + '</td><td>' + (r.online_wins || 0) + '</td></tr>';
          }).join('') + '</table>';
      }
    }).catch(function () { body.innerHTML = '<div class="dd-hint">failed to load — check your connection</div>'; });
  }

  $$('[data-lb]', panelEl).forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.dd-lb-tab', panelEl).forEach(function (t) { t.classList.remove('on'); });
      b.classList.add('on');
      loadLb(b.dataset.lb);
    });
  });
  $('#dd-lb-refresh', panelEl).addEventListener('click', function () { loadLb(lbMode); });
  loadLb('solo');
}

/* ---------------- match-end detection (XP) ---------------- */
function parseEndScreens() {
  try {
    var p = gamePanel();
    if (!p || !screenVisible()) return;
    var h1 = $('h1', p);
    if (!h1) return;
    var title = h1.textContent.trim();
    if (title === 'ERASED') {
      var stats = $('.stats', p);
      if (!stats) return;
      var bs = $$('b', stats);
      if (bs.length < 3) return;
      var wave = parseInt(bs[0].textContent, 10) || 0;
      var kills = parseInt(bs[1].textContent, 10) || 0;
      var score = parseInt(bs[2].textContent, 10) || 0;
      awardMatch('solo', { wave: wave, kills: kills, score: score }, 'solo|' + score + '|' + kills + '|' + wave);
    } else if (title === 'YOU WIN' || /WINS$/.test(title)) {
      var me = $('.scoreboard .me', p);
      if (!me) return;
      var spans = $$('span', me);
      if (spans.length < 2) return;
      var m = spans[1].textContent.match(/(\d+)\s*K\s*·\s*(\d+)\s*D/);
      if (!m) return;
      var k = Number(m[1]) || 0, d = Number(m[2]) || 0;
      awardMatch('ffa', { kills: k, deaths: d, win: title === 'YOU WIN' }, 'ffa|' + k + '|' + d + '|' + title + '|' + (spans[0].textContent || ''));
    }
  } catch (e) {}
}

/* ---------------- observers ----------------
   The bar is driven off the game's own DOM (#screen / #panel). If the game ever
   rebuilds those nodes, the old observers would point at detached elements and
   the tabs would freeze or stay hidden — so node identity is re-checked
   continuously and the observers are re-attached. */
var observedNodes = { hud: null, panel: null, screen: null };
var observers = [];
function ensureObservers() {
  var hud = $('#hud'), panel = $('#panel'), screen = $('#screen');
  if (!hud || !panel || !screen) return false;
  if (observedNodes.hud === hud && observedNodes.panel === panel && observedNodes.screen === screen) return true;
  observers.forEach(function (o) { try { o.disconnect(); } catch (e) {} });
  observers = [];
  observedNodes = { hud: hud, panel: panel, screen: screen };
  var bump = function (withEnd) {
    return new MutationObserver(function () {
      ensureObservers();
      refreshChrome();
      if (withEnd) parseEndScreens();
    });
  };
  observers.push((function () { var o = bump(true); o.observe(panel, { childList: true, subtree: true }); return o; })());
  /* #screen.show on/off = "menu up" vs "in match" — this is what keeps the bar alive */
  observers.push((function () { var o = bump(true); o.observe(screen, { attributes: true, attributeFilter: ['class'] }); return o; })());
  observers.push((function () { var o = bump(false); o.observe(hud, { attributes: true, childList: true, subtree: false, attributeFilter: ['class'] }); return o; })());
  return true;
}

function watchGame() {
  if (!ensureObservers()) { setTimeout(watchGame, 300); return; }
  window.addEventListener('resize', function () { tabsBandBottom = 0; tabsBandDirty = true; refreshChrome(); });
  refreshChrome();
  /* safety net: re-assert the bar periodically so it can never stay hidden
     because an observer missed a mutation */
  setInterval(function () { ensureObservers(); refreshChrome(); parseEndScreens(); }, 1500);
}

/* intercept solo start → open setup instead */
function armSoloIntercept() {
  document.addEventListener('click', function (e) {
    try {
      if (e.target.closest && e.target.closest('#dd-root')) return;
      if (window.__DDskipSetup) { window.__DDskipSetup = false; return; }
      var sb = e.target.closest ? e.target.closest('#soloBtn') : null;
      if (sb) { e.preventDefault(); e.stopPropagation(); openSetup(1); return; }
      var cp = e.target.closest ? e.target.closest('.checkpoints button') : null;
      if (cp) { e.preventDefault(); e.stopPropagation(); openSetup(Number(cp.dataset.cp) || 1); return; }
    } catch (err) {}
  }, true);
}

/* The game's menu layer (#screen) is a full-viewport "click anywhere and play"
   surface. Our tab bar floats on top of it, but the transparent strip around the
   bar is not a click target, so a click that misses a tab by a few pixels used to
   drop through and start (or restart) a match — which is exactly what made the
   tabs look broken: you clicked, the game ate it and the bar went away. */
function armTabBandGuard() {
  document.addEventListener('click', function (e) {
    try {
      if (!tabsBandBottom || !tabsEl || tabsEl.hidden) return;
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('#dd-root')) return;                 /* our own UI */
      /* real controls always keep working — only the dead backdrop is swallowed */
      if (t.closest('button, input, select, textarea, a, label')) return;
      var scr = gameScreen();
      if (!scr || !scr.contains(t)) return;              /* not the game's click-to-play layer */
      if (e.clientY > 0 && e.clientY <= tabsBandBottom) { e.stopPropagation(); e.preventDefault(); }
    } catch (err) {}
  }, true);
}

/* ---------------- mobile support (light) ---------------- */
function setupMobile() {
  try {
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) return;
    document.body.classList.add('mobile-device');
    var st = getSettings();
    if (st.virtualJoystick && !$('#dd-joystick')) {
      var j = document.createElement('div');
      j.id = 'dd-joystick';
      j.innerHTML = '<div id="dd-jthumb"></div>';
      document.body.appendChild(j);
      var thumb = $('#dd-jthumb');
      var active = false;
      var move = function (t) {
        var r = j.getBoundingClientRect();
        var cx = r.width / 2, cyy = r.height / 2;
        var x = t.clientX - r.left - cx, y = t.clientY - r.top - cyy;
        var dist = Math.sqrt(x * x + y * y), max = r.width / 2 - 25;
        if (dist > max) { var a = Math.atan2(y, x); x = Math.cos(a) * max; y = Math.sin(a) * max; }
        thumb.style.transform = 'translate(calc(-50% + ' + x + 'px), calc(-50% + ' + y + 'px))';
      };
      j.addEventListener('touchstart', function (e) { active = true; move(e.touches[0]); }, { passive: true });
      j.addEventListener('touchmove', function (e) { if (active) move(e.touches[0]); }, { passive: true });
      j.addEventListener('touchend', function () { active = false; thumb.style.transform = 'translate(-50%,-50%)'; });
    }
  } catch (e) {}
}

/* ---------------- boot ---------------- */
function init() {
  buildChrome();
  armSoloIntercept();
  armTabBandGuard();
  setupMobile();
  setLoadout(getLoadout()); /* ensure derived stats exist for the game */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchGame);
  } else {
    watchGame();
  }
}

/* init Supabase sync on startup */
if (window.__ddSync) {
  window.__ddSync.init().then(function () {
    if (window.__ddSync.isConnected()) {
      window.__ddSync.syncFromCloud().then(function () { try { refreshProfileChip(); } catch (e) {} });
    }
  });
}

init();

/* public API for external modules (tutorial, rocket launcher, supabase sync) */
window.__ddMenu = {
  toast: toast,
  levelForXP: levelForXP,
  getProfile: getProfile,
  store: store,
  VERSION: VERSION,
  CHARACTERS: CHARACTERS,
  getCharacter: getCharacter,
  refreshProfileChip: refreshProfileChip
};

/* legacy export */
window.GameMenuSystem = {
  version: VERSION,
  init: init,
  switchTab: switchTab,
  refresh: refreshChrome,
  isMainMenu: isMainMenu,
  tabsVisible: function () { return !!(tabsEl && !tabsEl.hidden); },
  getProfile: getProfile,
  levelForXP: levelForXP,
  getLoadout: getLoadout,
  setLoadout: setLoadout,
  getSettings: getSettings,
  CHANGELOG: CHANGELOG,
  WEAPONS: WEAPONS
};

})();
