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

  /* Listen for key press */
  document.addEventListener('keydown', function (e) {
    if (e.code === 'KeyF' && !e.repeat) {
      e.preventDefault();
      tryFire();
    }
  }, true);

  /* Listen for mobile button */
  document.addEventListener('dd-rocket-fire', function () {
    tryFire();
  });

  console.log('[DD Rocket] Rocket launcher ability initialized');
}

function isInMatch() {
  try {
    var g = window.__game;
    if (!g || !g.game) return false;
    var s = g.game.state;
    return s === 'play' && !g.game.menu;
  } catch (e) { return false; }
}

function tryFire() {
  if (!state.active || !isInMatch()) return;
  if (state.cooldown > 0 || state.rockets <= 0) return;

  var g = window.__game;
  if (!g || !g.player || !g.player.alive) return;

  var B = g.player;
  var THREE = window.__game.ctx && window.__game.ctx.scene ? null : null;
  /* Access three via import (it's already loaded by the game) */
  var T = null;
  try {
    /* The game imports three as a module, but we can access it via the game's objects */
    var anyMesh = g.ctx.scene.children[0];
    if (anyMesh && anyMesh.geometry) T = anyMesh.geometry.constructor.constructor; /* hacky but works */
  } catch (e) {}

  /* Use the game's three namespace from the import map */
  if (!T) {
    import('three').then(function (mod) { fireRocket(mod, g); }).catch(function () {});
    return;
  }
  fireRocket(T, g);
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

  /* Muzzle flash */
  if (effects && effects.strokeBurst) {
    effects.strokeBurst(B.eye, { r: 0.9, g: 0.3, b: 0.1 }, 6, 4, { life: 0.15, size: 0.08 });
  }
}

function update(dt) {
  if (!state.active) return;
  state.cooldown = Math.max(0, state.cooldown - dt);

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

    /* Move rocket */
    p.vel.y -= 9.8 * dt * 0.3; /* slight gravity */
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.rotation.x += dt * 10;
    p.mesh.rotation.y += dt * 8;

    /* Trail */
    if (effects && effects.strokeBurst && Math.random() < 0.5) {
      effects.strokeBurst(p.mesh.position, { r: 0.8, g: 0.4, b: 0.1 }, 3, 2, { life: 0.2, size: 0.05 });
    }

    var hit = false;
    var hitPos = null;

    /* Check ground collision */
    if (p.mesh.position.y <= 0.5) {
      hit = true;
      hitPos = p.mesh.position.clone();
      hitPos.y = 0.5;
    }

    /* Check wall collision (via world raycast) */
    if (!hit && world) {
      try {
        var down = new (p.mesh.position.constructor)(0, -1, 0);
        var result = world.raycast ? world.raycast(p.mesh.position, down, 1) : null;
        if (result) { hit = true; hitPos = p.mesh.position.clone(); }
      } catch (e) {}
    }

    /* Check enemy collision */
    if (!hit && enemies) {
      try {
        for (var j = 0; j < enemies.list.length; j++) {
          var enemy = enemies.list[j];
          if (!enemy.alive) continue;
          if (enemy.center && p.mesh.position.distanceTo(enemy.center) < 1.0) {
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
  /* Visual explosion */
  if (effects) {
    if (effects.explosion) {
      effects.explosion(pos, BLAST_RADIUS, { r: 0.9, g: 0.4, b: 0.1 });
    }
    if (effects.strokeBurst) {
      effects.strokeBurst(pos, { r: 1, g: 0.5, b: 0.1 }, 20, 8, { life: 0.5, size: 0.1 });
      effects.strokeBurst(pos, { r: 0.5, g: 0.2, b: 0.05 }, 14, 6, { life: 0.7, size: 0.06, gravity: -2 });
    }
  }

  /* Damage enemies in radius */
  if (enemies) {
    try {
      for (var i = 0; i < enemies.list.length; i++) {
        var enemy = enemies.list[i];
        if (!enemy.alive) continue;
        var dist = enemy.center ? pos.distanceTo(enemy.center) : 999;
        if (dist < BLAST_RADIUS) {
          var falloff = 1 - (dist / BLAST_RADIUS) * 0.5;
          var dmg = damage * falloff;
          if (enemy.takeDamage) {
            enemy.takeDamage(dmg);
          } else if (enemy.hp !== undefined) {
            enemy.hp -= dmg;
          }
        }
      }
    } catch (e) {}
  }

  /* Damage remote players in radius (FFA) */
  if (remote && g.net) {
    try {
      remote.forEach(function (rp, id) {
        if (!rp.alive) return;
        var dist = rp.center ? pos.distanceTo(rp.center) : 999;
        if (dist < BLAST_RADIUS) {
          var falloff = 1 - (dist / BLAST_RADIUS) * 0.5;
          var dmg = damage * falloff;
          if (g.net.sendTo) {
            g.net.sendTo(id, 'pdmg', { amount: Math.round(dmg), from: pos.toArray(), by: g.net.id, crit: false, src: 'rocket' });
          }
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

      /* Self-damage */
      var maxHP = 100; /* default max HP */
      try { maxHP = B.maxHP || 100; } catch (e) {}
      var selfDmg = Math.round(maxHP * getSelfDamagePct());
      if (B.takeDamage) {
        B.takeDamage(selfDmg, pos);
      } else if (B.hp !== undefined) {
        B.hp -= selfDmg;
      }

      /* Screen shake */
      try { if (g.input && g.input.rumble) g.input.rumble(0.8, 0.5, 200); } catch (e) {}
    }
  }
}

/* Reset on new match */
window.addEventListener('dd-match-start', function () {
  state.rockets = MAX_ROCKETS;
  state.cooldown = 0;
  state.projectiles.forEach(function (p) {
    try { window.__game.ctx.scene.remove(p.mesh); } catch (e) {}
  });
  state.projectiles = [];
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
