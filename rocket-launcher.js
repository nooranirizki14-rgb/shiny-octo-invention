/* ============================================================
   Doodle District — Rocket Launcher Ability v3.0
   - Press F to fire a rocket (explosive AoE damage)
   - Fire at the ground to rocket-jump (launches player up)
   - Self-damage: 7% of max HP (3% with Boom character)
   - Boom character: +20% explosive damage
   - 3 rockets per life, 2s cooldown
   ============================================================ */
(function () {
'use strict';

var ROCKET_SPEED = 60;
var ROCKET_RADIUS = 0.15;
var BLAST_RADIUS = 6;
var BLAST_DAMAGE = 80;
var ROCKET_JUMP_VEL = 28;
var COOLDOWN = 2.0;
var MAX_ROCKETS = 3;
var SELF_DAMAGE_DEFAULT = 0.07;
var SELF_DAMAGE_BOOM = 0.03;
var EXPLOSION_BUFF_BOOM = 1.2;

var state = {
  rockets: MAX_ROCKETS,
  cooldown: 0,
  active: false,
  projectiles: []
};

function getCharacter() {
  return localStorage.getItem('doodle_character') || 'default';
}

function isBoom() {
  return getCharacter() === 'boom';
}

function getSelfDamagePct() {
  return isBoom() ? SELF_DAMAGE_BOOM : SELF_DAMAGE_DEFAULT;
}

function getExplosionDamage() {
  return BLAST_DAMAGE * (isBoom() ? EXPLOSION_BUFF_BOOM : 1);
}

function init() {
  state.active = true;
  state.rockets = MAX_ROCKETS;
  state.cooldown = 0;
  state.projectiles = [];

  /* Hook into the game loop */
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

  /* Listen for key press (capture: runs before the game's own key handler).
     F also triggers the game's quick-melee, so only swallow the key when a
     rocket actually leaves the tube — otherwise melee still works on F. */
  document.addEventListener('keydown', function (e) {
    if (e.code === 'KeyF' && !e.repeat && canFire()) {
      e.preventDefault();
      e.stopPropagation();
      tryFire();
    }
  }, true);

  /* Listen for mobile button */
  document.addEventListener('dd-rocket-fire', function () {
    tryFire();
  });

  createHud();

  console.log('[DD Rocket] Rocket launcher ability initialized');
}

/* Ammo counter (+ touch fire button) so players can see and use rockets */
var hudEl = null, hudBtn = null, hudText = '';
function createHud() {
  try {
    if (document.getElementById('dd-rocket-hud')) return;
    hudEl = document.createElement('div');
    hudEl.id = 'dd-rocket-hud';
    hudEl.innerHTML = 'ROCKETS <span class="dd-rkt-count"></span>';
    document.body.appendChild(hudEl);
    /* Touch-only fire button (hidden on mouse/keyboard setups via CSS) */
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
    var t = state.cooldown > 0
      ? state.rockets + ' (wait ' + state.cooldown.toFixed(1) + 's)'
      : String(state.rockets);
    if (t !== hudText) {
      hudText = t;
      var c = hudEl.querySelector('.dd-rkt-count');
      if (c) c.textContent = t;
    }
  } catch (e) {}
}

function isInMatch() {
  try {
    var g = window.__game;
    if (!g || !g.game) return false;
    var s = g.game.state;
    return s === 'play' && !g.game.menu;
  } catch (e) { return false; }
}

function canFire() {
  if (!state.active || !isInMatch()) return false;
  if (state.cooldown > 0 || state.rockets <= 0) return false;
  var g = window.__game;
  if (!g || !g.player || !g.player.alive) return false;
  return true;
}

var threeNS = null;
function tryFire() {
  if (!canFire()) return;
  var g = window.__game;
  /* three.js is import-mapped to the vendored build; the module namespace
     is cached by the browser after the first import. */
  if (threeNS) { fireRocket(threeNS, g); return; }
  import('three').then(function (mod) {
    threeNS = mod;
    if (canFire()) fireRocket(mod, window.__game);
  }).catch(function () {});
}

function fireRocket(T, g) {
  if (state.cooldown > 0 || state.rockets <= 0) return;
  var B = g.player;
  var scene = g.ctx.scene;
  var effects = g.ctx.effects;
  var camera = g.ctx.camera;

  /* Create rocket mesh */
  var geo = new T.SphereGeometry(ROCKET_RADIUS, 8, 6);
  var mat = new T.MeshBasicMaterial({ color: 0xff4444 });
  var rocket = new T.Mesh(geo, mat);
  rocket.position.copy(B.eye);

  /* Direction: where the camera is looking */
  var dir = new T.Vector3();
  camera.getWorldDirection(dir);

  /* Velocity */
  var vel = dir.clone().multiplyScalar(ROCKET_SPEED);

  scene.add(rocket);
  state.projectiles.push({
    mesh: rocket,
    vel: vel,
    life: 3.0,
    damage: getExplosionDamage()
  });

  state.rockets--;
  state.cooldown = COOLDOWN;

  /* Muzzle flash (ink ids: 0 blue, 1 red, 2 black, 3 orange, 4 green, 5 pink) */
  if (effects && effects.strokeBurst) {
    effects.strokeBurst(B.eye, 3, 6, 4, { life: 0.15, size: 0.08 });
  }
  try {
    var audio = g.ctx && g.ctx.audio;
    if (audio && audio.shotgunFire) audio.shotgunFire();
  } catch (e) {}
}

var lastMatchState = null;
function resetForMatch() {
  state.rockets = MAX_ROCKETS;
  state.cooldown = 0;
  state.refillT = 0;
  try {
    var sc = window.__game && window.__game.ctx && window.__game.ctx.scene;
    state.projectiles.forEach(function (p) { if (sc) sc.remove(p.mesh); });
  } catch (e) {}
  state.projectiles = [];
}

function update(dt) {
  if (!state.active) return;
  state.cooldown = Math.max(0, state.cooldown - dt);
  updateHud();

  /* New match / run detection (the old dd-match-start event is never sent
     by the game, so watch the state machine instead). */
  try {
    var gs = window.__game && window.__game.game;
    var cur = gs ? gs.state : null;
    if (cur === 'play' && lastMatchState !== 'play') resetForMatch();
    lastMatchState = cur;
  } catch (e) {}

  /* Refill rockets on respawn */
  try {
    var g = window.__game;
    if (g && g.player && g.player.alive && state.rockets < MAX_ROCKETS && state.cooldown <= 0) {
      /* Refill one rocket every 5 seconds */
      state.refillT = (state.refillT || 0) + dt;
      if (state.refillT >= 5) {
        state.refillT = 0;
        state.rockets = Math.min(MAX_ROCKETS, state.rockets + 1);
      }
    }
  } catch (e) {}

  /* Update projectiles */
  var g = window.__game;
  if (!g) return;
  var scene = g.ctx.scene;
  var effects = g.ctx.effects;
  var world = g.ctx.world;
  var B = g.player;
  var enemies = g.enemies;
  var remote = g.remote;

  for (var i = state.projectiles.length - 1; i >= 0; i--) {
    var p = state.projectiles[i];
    p.life -= dt;

    /* Move rocket (remember where the step started for hit tests) */
    if (!p.prev) p.prev = p.mesh.position.clone();
    else p.prev.copy(p.mesh.position);
    p.vel.y -= 9.8 * dt * 0.3; /* slight gravity */
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.rotation.x += dt * 10;
    p.mesh.rotation.y += dt * 8;

    /* Trail */
    if (effects && effects.strokeBurst && Math.random() < 0.5) {
      effects.strokeBurst(p.mesh.position, 3, 3, 2, { life: 0.2, size: 0.05 });
    }

    var hit = false;
    var hitPos = null;

    /* Check wall / prop collision along the flown segment */
    if (!hit && world && world.raycast) {
      try {
        var seg = p.mesh.position.clone().sub(p.prev);
        var segLen = seg.length();
        if (segLen > 1e-6) {
          seg.divideScalar(segLen);
          var wall = world.raycast(p.prev, seg, segLen + 0.2);
          if (wall && wall.point) { hit = true; hitPos = wall.point.clone(); }
        }
      } catch (e) {}
    }

    /* Check ground collision (safety net under every map) */
    if (!hit && p.mesh.position.y <= 0.5) {
      hit = true;
      hitPos = p.mesh.position.clone();
      hitPos.y = 0.5;
    }

    /* Check enemy collision (proximity fuse) */
    if (!hit && enemies && enemies.enemies) {
      try {
        for (var j = 0; j < enemies.enemies.length; j++) {
          var enemy = enemies.enemies[j];
          if (!enemy || !enemy.alive) continue;
          if (enemy.center && p.mesh.position.distanceTo(enemy.center) < 1.2) {
            hit = true;
            hitPos = p.mesh.position.clone();
            break;
          }
        }
      } catch (e) {}
    }

    /* Check remote player collision (FFA) */
    if (!hit && remote) {
      try {
        remote.forEach(function (rp) {
          if (!rp.alive) return;
          if (rp.center && p.mesh.position.distanceTo(rp.center) < 1.0) {
            hit = true;
            hitPos = p.mesh.position.clone();
          }
        });
      } catch (e) {}
    }

    /* Expired */
    if (p.life <= 0) { hit = true; hitPos = p.mesh.position.clone(); }

    if (hit) {
      explode(hitPos, p.damage, effects, scene, B, enemies, remote, g);
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      state.projectiles.splice(i, 1);
    }
  }
}

function explode(pos, damage, effects, scene, B, enemies, remote, g) {
  /* Visual explosion + boom */
  if (effects) {
    if (effects.explosion) {
      effects.explosion(pos, BLAST_RADIUS, 2);
    }
    if (effects.strokeBurst) {
      effects.strokeBurst(pos, 3, 20, 8, { life: 0.5, size: 0.1 });
      effects.strokeBurst(pos, 1, 14, 6, { life: 0.7, size: 0.06, gravity: -2 });
    }
  }
  try {
    var audio = g.ctx && g.ctx.audio;
    if (audio && audio.explosion) audio.explosion(pos);
  } catch (e) {}

  /* Damage enemies in radius (through the real damage pipeline, so kills,
     hitmarkers, sounds and score all trigger correctly). */
  if (enemies && enemies.enemies && enemies.damage) {
    try {
      for (var i = 0; i < enemies.enemies.length; i++) {
        var enemy = enemies.enemies[i];
        if (!enemy || !enemy.alive || !enemy.center) continue;
        var dist = pos.distanceTo(enemy.center);
        if (dist < BLAST_RADIUS) {
          var falloff = 1 - (dist / BLAST_RADIUS) * 0.5;
          var dir = enemy.center.clone().sub(pos);
          dir.y = Math.abs(dir.y) + 0.4;
          dir.normalize();
          enemies.damage(enemy, damage * falloff, {
            point: enemy.center.clone(), dir: dir,
            part: 'torso', source: 'blast', crit: false
          });
        }
      }
    } catch (e) {}
  }

  /* Damage remote players in radius (FFA). 'grenade' is used as the damage
     source because it is the explosive type the netcode accepts. */
  if (remote && g.net && g.net.sendTo) {
    try {
      var fromArr = pos.toArray().map(function (v) { return +v.toFixed(1); });
      remote.forEach(function (rp, id) {
        if (!rp.alive) return;
        var dist = rp.center ? pos.distanceTo(rp.center) : 999;
        if (dist < BLAST_RADIUS) {
          var falloff = 1 - (dist / BLAST_RADIUS) * 0.5;
          g.net.sendTo(id, 'pdmg', {
            amount: Math.round(damage * falloff),
            from: fromArr, by: g.net.id, crit: false, src: 'grenade'
          });
        }
      });
    } catch (e) {}
  }

  /* Rocket jump: if player is close to the blast */
  if (B && B.alive && B.body) {
    var distToPlayer = pos.distanceTo(B.center || B.body.pos);
    if (distToPlayer < BLAST_RADIUS) {
      /* Apply upward velocity proportional to proximity */
      var proximity = 1 - (distToPlayer / BLAST_RADIUS);
      var jumpPower = ROCKET_JUMP_VEL * proximity;

      /* Direction: away from the blast (mostly upward) */
      var pushDir = new (pos.constructor)();
      if (B.center) pushDir.subVectors(B.center, pos); else pushDir.set(0, 1, 0);
      pushDir.y = Math.abs(pushDir.y) + 0.5;
      pushDir.normalize();
      B.body.vel.addScaledVector(pushDir, jumpPower);
      B.body.onGround = false;

      /* Self-damage through the real pipeline (hurt FX, shake, death) */
      var maxHP = 100;
      try { maxHP = B.maxHp || 100; } catch (e) {}
      var selfDmg = Math.round(maxHP * getSelfDamagePct());
      if (B.takeDamage) {
        B.takeDamage(selfDmg, pos);
      } else if (B.hp !== undefined) {
        B.hp -= selfDmg;
      }
    }
  }
}

/* Reset on new match (kept for compatibility; match starts are also
   detected by watching the game state in update()). */
window.addEventListener('dd-match-start', function () {
  resetForMatch();
});

/* Expose API */
window.__ddRocket = {
  init: init,
  getRockets: function () { return state.rockets; },
  getMaxRockets: function () { return MAX_ROCKETS; },
  getCooldown: function () { return state.cooldown; },
  isBoom: isBoom,
  getCharacter: getCharacter
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
