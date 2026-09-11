/* ============================================================
   Doodle District — Rocket Launcher integration v3.1
   - The rocket launcher is a real engine weapon now (slot 5): the game
     owns the model, firing, reload, ammo, physics, damage and netcode.
   - This file only wires the EXTRAS around it:
     * F quick-fires a rocket from ANY weapon (swallows the key only
       when a rocket actually leaves the tube, so F-melee still works
       when dry — V always melees)
     * an ammo counter + touch fire button (same HUD as before)
     * a slow reserve trickle (+1 rocket every 8s while alive)
   - Self-damage / Boom buffs are handled by the engine (Boom takes
     ~half self-damage and deals +20% explosive damage).
   ============================================================ */
(function () {
'use strict';

var REFILL_SECS = 8;

var state = {
  active: false,
  refillT: 0
};

function game() { return window.__game || null; }

function isInMatch() {
  try {
    var g = game();
    if (!g || !g.game) return false;
    return g.game.state === 'play' && !g.game.menu;
  } catch (e) { return false; }
}

/* The engine keeps the launcher at index 4 (slot 5). */
function rocketWeapon() {
  try {
    var g = game();
    var w = g && g.player && g.player.weapons && g.player.weapons[4];
    return w && w.isGun && w.kind === 'rocket' ? w : null;
  } catch (e) { return null; }
}

function ammoText() {
  var w = rocketWeapon();
  return w ? (w.mag + '/' + w.reserve) : '—';
}

function canFire() {
  if (!state.active || !isInMatch()) return false;
  var g = game();
  if (!g || !g.player || !g.player.alive) return false;
  if (typeof g.player.throwRocket !== 'function') return false;
  var w = rocketWeapon();
  if (!w) return false;
  return (w.mag + w.reserve) > 0;
}

function tryFire() {
  if (!canFire()) return false;
  try {
    /* consume=true: spends mag first, then reserve; dry-fires empty-click */
    return game().player.throwRocket(null, true) === true;
  } catch (e) { return false; }
}

/* ---------------- HUD: ammo counter + touch button ---------------- */
var hudEl = null, hudBtn = null, hudText = '';
function createHud() {
  try {
    if (document.getElementById('dd-rocket-hud')) {
      hudEl = document.getElementById('dd-rocket-hud');
    } else {
      hudEl = document.createElement('div');
      hudEl.id = 'dd-rocket-hud';
      hudEl.innerHTML = 'ROCKETS <span class="dd-rkt-count"></span>';
      document.body.appendChild(hudEl);
    }
    if (document.getElementById('dd-rocket-btn')) return;
    hudBtn = document.createElement('button');
    hudBtn.type = 'button';
    hudBtn.id = 'dd-rocket-btn';
    hudBtn.textContent = 'FIRE ROCKET';
    hudBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      tryFire();
    });
    document.body.appendChild(hudBtn);
  } catch (e) {}
}

function updateHud() {
  if (!hudEl) return;
  try {
    var show = isInMatch();
    hudEl.style.display = show ? 'block' : 'none';
    if (hudBtn) hudBtn.style.display = show ? '' : 'none';
    if (!show) return;
    var t = ammoText();
    if (t !== hudText) {
      hudText = t;
      var c = hudEl.querySelector('.dd-rkt-count');
      if (c) c.textContent = t;
    }
  } catch (e) {}
}

/* ---------------- main ---------------- */
function update(dt) {
  if (!state.active) return;
  updateHud();
  /* slow reserve trickle while alive in a match */
  try {
    var w = rocketWeapon();
    var g = game();
    if (w && g && g.player && g.player.alive && isInMatch() && w.reserve < w.maxReserve) {
      state.refillT += dt;
      if (state.refillT >= REFILL_SECS) {
        state.refillT = 0;
        w.reserve = Math.min(w.maxReserve, w.reserve + 1);
      }
    } else {
      state.refillT = 0;
    }
  } catch (e) {}
}

function init() {
  if (state.active) return;
  state.active = true;
  state.refillT = 0;

  var lastTime = performance.now();
  function loop() {
    if (!state.active) return;
    requestAnimationFrame(loop);
    var now = performance.now();
    var dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    update(dt);
  }
  loop();

  /* F quick-fire (capture: runs before the game's own key handler).
     Only swallow the key when a rocket actually fires — otherwise the
     game's quick-melee on F still works. */
  document.addEventListener('keydown', function (e) {
    if (e.code === 'KeyF' && !e.repeat && canFire()) {
      e.preventDefault();
      e.stopPropagation();
      tryFire();
    }
  }, true);

  document.addEventListener('dd-rocket-fire', function () {
    tryFire();
  });

  createHud();
  try { console.log('[DD Rocket] launcher integration ready (slot 5 + F quick-fire)'); } catch (e) {}
}

/* Reset the trickle timer on match start (ammo itself is reset by the
   engine loadout). Kept as a listener for compatibility. */
window.addEventListener('dd-match-start', function () {
  state.refillT = 0;
});

/* Expose API (same shape as before where it still makes sense) */
window.__ddRocket = {
  init: init,
  fire: tryFire,
  canFire: canFire,
  getRockets: function () {
    var w = rocketWeapon();
    return w ? (w.mag + w.reserve) : 0;
  },
  getMaxRockets: function () {
    var w = rocketWeapon();
    return w ? (w.magSize + w.maxReserve) : 0;
  },
  getCooldown: function () {
    var w = rocketWeapon();
    return w ? Math.max(0, w.fireT || 0) : 0;
  },
  isBoom: function () {
    try { return localStorage.getItem('doodle_character') === 'boom'; }
    catch (e) { return false; }
  },
  getCharacter: function () {
    try { return localStorage.getItem('doodle_character') || 'default'; }
    catch (e) { return 'default'; }
  }
};

/* Auto-init when game is ready */
function autoInit() {
  if (window.__game && window.__game.game) {
    init();
  } else {
    setTimeout(autoInit, 1000);
  }
}
autoInit();
})();
