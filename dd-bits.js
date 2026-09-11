/* ============================================================
   Doodle District — Party Pack Phase 3b (dd-bits.js)
   Interactive world bits + parkour + spar bots:
     §1 PARKOUR (park map): checkpoints, timer, bests, pacifist
     §2 SCHOOL BELL: tolls your kill streaks
     §3 RC BUDDY: a tiny car that follows you everywhere
     §4 SKYWRITER PLANE: flies over your airstrikes
     §5 CASTLE PORTCULLIS: pressure-plate slam trap
     §6 SPAR BOTS (solo): named rifle bots instead of waves
   ============================================================ */
(function () {
'use strict';

/* ---------------- §0 utils ---------------- */
var booted = false;
var T = null;
try { import('three').then(function (m) { T = m; }).catch(function () {}); } catch (e) {}

function log() { try { console.log.apply(console, ['[DD Bits]'].concat([].slice.call(arguments))); } catch (e) {} }
function $(id) { try { return document.getElementById(id); } catch (e) { return null; } }
function game() { return window.__game || null; }
function storeGet(k, fb) { try { var v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch (e) { return fb; } }
function storeSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function toast(msg, secs) {
  try {
    if (window.__ddMenu && typeof window.__ddMenu.toast === 'function') { window.__ddMenu.toast(msg, secs || 3); return; }
  } catch (e) {}
}
function emit(name, detail) { try { window.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); } catch (e) {} }
function inMatch() {
  try { var g = game(); return !!(g && g.game && g.game.state === 'play'); } catch (e) { return false; }
}
function isOnline() {
  try { var n = game().net; return !!(n && n.active); } catch (e) { return false; }
}
function mapKey() {
  try { var g = game(); return (g && g.level && g.level.key) || ''; } catch (e) { return ''; }
}
var AC = null;
function tone(freq, dur, delay, gain) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    var t = AC.currentTime + (delay || 0);
    var o = AC.createOscillator(), gn = AC.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(freq, t);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(gain || 0.14, t + 0.02);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn); gn.connect(AC.destination);
    o.start(t); o.stop(t + dur + 0.05);
  } catch (e) {}
}
function bellToll(n) {
  for (var i = 0; i < n; i++) {
    tone(523, 1.1, i * 0.55, 0.12);
    tone(784, 0.9, i * 0.55 + 0.02, 0.07);
  }
}
function beepBeep() { tone(740, 0.09, 0, 0.1); tone(740, 0.09, 0.13, 0.1); }

/* ---------------- §1 PARKOUR ---------------- */
var park = { active: false, idx: 1, t0: 0, done: false, best: 0 };
function parkReset() {
  park.active = mapKey() === 'park';
  park.idx = 1;
  park.t0 = performance.now();
  park.done = false;
  park.best = storeGet('doodle_park_best', 0) || 0;
  var hud = $('dd-park-hud');
  if (hud) hud.style.display = park.active ? 'block' : 'none';
  if (park.active) toast('⏱ PARKOUR — race the clock! Falls return you to the last ring.');
}
function parkPoll() {
  if (!park.active || !inMatch()) return;
  try {
    var g = game(), P = g && g.player;
    if (!P || !P.alive || !P.center) return;
    /* pacifist time-trials: no waves on the course (solo) */
    if (!isOnline()) {
      try { if (g.game && g.game.queue) g.game.queue.length = 0; } catch (e) {}
    }
    var cps = (g.level && g.level.parkCp) || [];
    if (!cps.length) return;
    if (park.done) {
      /* back at the start ring → new run */
      var s0 = cps[0];
      var dd = Math.hypot(P.center.x - s0.x, P.center.z - s0.z);
      if (dd < 3) { park.done = false; park.idx = 1; park.t0 = performance.now(); }
      parkHud();
      return;
    }
    if (park.idx < cps.length) {
      var c = cps[park.idx];
      var d = Math.hypot(P.center.x - c.x, P.center.z - c.z);
      if (d < 3.5 && Math.abs(P.center.y - c.y) < 4) {
        try { g.level.playerStart.set(c.x, c.y, c.z); } catch (e) {}
        try { P.hp = P.maxHp; } catch (e2) {}
        toast('✓ CHECKPOINT ' + (park.idx + 1) + '/' + cps.length);
        tone(660, 0.12, 0, 0.12); tone(990, 0.16, 0.1, 0.12);
        park.idx++;
      }
    } else {
      /* past the last ring: the finish pad */
      if (Math.abs(P.center.x + 1.5) < 3.4 && P.center.z < -51 && P.center.y > 3) {
        parkFinish();
      }
    }
    parkHud();
  } catch (e) {}
}
function parkFinish() {
  try {
    park.done = true;
    var ms = Math.round(performance.now() - park.t0);
    var isBest = !park.best || ms < park.best;
    if (isBest) { park.best = ms; storeSet('doodle_park_best', ms); }
    try {
      var p = storeGet('doodle_profile_v1', null) || {};
      p.xp = (p.xp || 0) + 100;
      storeSet('doodle_profile_v1', p);
    } catch (e) {}
    toast('🏁 FINISH ' + fmtMs(ms) + (isBest ? ' — NEW BEST! +100 XP' : ' · best ' + fmtMs(park.best)), 5);
    tone(523, 0.12, 0, 0.12); tone(659, 0.12, 0.1, 0.12); tone(784, 0.12, 0.2, 0.12); tone(1046, 0.3, 0.3, 0.14);
    emit('dd-park-finish', { ms: ms, best: isBest });
    parkHud();
  } catch (e) {}
}
function fmtMs(ms) {
  var s = Math.floor(ms / 1000), m = Math.floor(s / 60);
  return m + ':' + ('0' + (s % 60)).slice(-2) + '.' + Math.floor((ms % 1000) / 100);
}
function parkHud() {
  try {
    var hud = $('dd-park-hud');
    if (!hud) { hud = document.createElement('div'); hud.id = 'dd-park-hud'; document.body.appendChild(hud); }
    if (!park.active || !inMatch()) { hud.style.display = 'none'; return; }
    hud.style.display = 'block';
    var cps = (game().level && game().level.parkCp) || [];
    var txt = park.done
      ? '🏁 ' + fmtMs(park.best || 0) + ' · back to start to re-run'
      : '⏱ ' + fmtMs(performance.now() - park.t0) + ' · ◉ ' + Math.min(park.idx + 1, cps.length + 1 - 1) + '/' + cps.length +
        (park.best ? ' · ★ ' + fmtMs(park.best) : '');
    if (hud._last !== txt) { hud._last = txt; hud.innerHTML = txt; }
  } catch (e) {}
}

/* ---------------- §3 RC BUDDY ---------------- */
var car = null, carHop = 0;
function rcOn() {
  var v = storeGet('doodle_rcbuddy', null);
  return v == null ? true : !!v;
}
function carEnsure() {
  if (car || !T) return;
  try {
    var g = game();
    if (!g || !g.ctx || !g.ctx.scene) return;
    var grp = new T.Group();
    var red = new T.MeshBasicMaterial({ color: 0xe33d2e });
    var blue = new T.MeshBasicMaterial({ color: 0x2b6cff });
    var dark = new T.MeshBasicMaterial({ color: 0x22222a });
    var body = new T.Mesh(new T.BoxGeometry(0.7, 0.32, 1.1), red);
    body.position.y = 0.32;
    var cab = new T.Mesh(new T.BoxGeometry(0.5, 0.28, 0.5), blue);
    cab.position.set(0, 0.6, 0.1);
    grp.add(body); grp.add(cab);
    var wg = new T.CylinderGeometry(0.16, 0.16, 0.12, 10);
    wg.rotateZ(Math.PI / 2);
    carWheels = [];
    [[-0.36, 0.35], [0.36, 0.35], [-0.36, -0.35], [0.36, -0.35]].forEach(function (w) {
      var m = new T.Mesh(wg, dark);
      m.position.set(w[0], 0.16, w[1]);
      grp.add(m); carWheels.push(m);
    });
    var ant = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.5, 6), dark);
    ant.position.set(0.25, 0.85, -0.35);
    var tip = new T.Mesh(new T.SphereGeometry(0.06, 8, 6), new T.MeshBasicMaterial({ color: 0xffd94d }));
    tip.position.set(0.25, 1.12, -0.35);
    grp.add(ant); grp.add(tip);
    var P = g.player;
    if (P && P.center) grp.position.set(P.center.x + 2, (P.body && P.body.pos && P.body.pos.y) || 0, P.center.z + 2);
    grp.visible = false;
    g.ctx.scene.add(grp);
    car = grp;
  } catch (e) { car = null; }
}
var carWheels = [];
function carTick() {
  if (!car) return;
  try {
    var g = game(), P = g && g.player;
    var show = rcOn() && inMatch() && P && P.alive && P.center;
    car.visible = !!show;
    if (!show) return;
    var fx = 0, fz = -1;
    try {
      if (P.forward) { fx = P.forward.x; fz = P.forward.z; }
      else { fx = -Math.sin(P.yaw || 0); fz = -Math.cos(P.yaw || 0); }
      var l = Math.hypot(fx, fz) || 1; fx /= l; fz /= l;
    } catch (e) {}
    var tx = P.center.x - fx * 3.2 + (-fz) * 1.4;
    var tz = P.center.z - fz * 3.2 + fx * 1.4;
    var ty = (P.body && P.body.pos && P.body.pos.y) || 0;
    car.position.x += (tx - car.position.x) * 0.06;
    car.position.z += (tz - car.position.z) * 0.06;
    car.position.y += (ty - car.position.y) * 0.1;
    try {
      var dx = tx - car.position.x, dz = tz - car.position.z;
      if (dx * dx + dz * dz > 0.04) car.rotation.y = Math.atan2(dx, dz);
    } catch (e) {}
    carWheels.forEach(function (w) { try { w.rotation.x += 0.2; } catch (e) {} });
    if (carHop > 0) {
      carHop -= 0.06;
      try { car.position.y += Math.sin(Math.max(0, carHop) * Math.PI) * 0.25; } catch (e) {}
    }
  } catch (e) {}
}

/* ---------------- §4 SKYWRITER PLANE ---------------- */
var planes = [];
function spawnPlane() {
  if (!T) return;
  try {
    var g = game(), P = g && g.player;
    if (!P || !P.center || !g.ctx || !g.ctx.scene) return;
    var grp = new T.Group();
    var mat = new T.MeshBasicMaterial({ color: 0xe33d2e });
    var dark = new T.MeshBasicMaterial({ color: 0x22222a });
    var fus = new T.Mesh(new T.BoxGeometry(0.7, 0.7, 4.2), mat);
    var wing = new T.Mesh(new T.BoxGeometry(6.4, 0.18, 1.1), mat);
    var tail = new T.Mesh(new T.BoxGeometry(2.4, 0.16, 0.7), dark);
    tail.position.z = 1.9;
    grp.add(fus); grp.add(wing); grp.add(tail);
    grp.position.set(P.center.x - 70, P.center.y + 26, P.center.z - 20);
    grp.rotation.y = Math.PI / 2;
    g.ctx.scene.add(grp);
    planes.push({ m: grp, life: 5 });
    tone(196, 0.5, 0, 0.08); tone(147, 0.6, 0.4, 0.08);
  } catch (e) {}
}
function planesTick(dt) {
  if (!planes.length) return;
  try {
    var scene = game().ctx.scene;
    for (var i = planes.length - 1; i >= 0; i--) {
      var p = planes[i];
      p.m.position.x += 30 * dt;
      p.m.position.y += Math.sin(performance.now() / 400) * 0.02;
      p.life -= dt;
      /* v3.2.1: free the plane geometries/materials instead of leaking them */
      if (p.life <= 0) {
        try { scene.remove(p.m); } catch (e) {}
        try { p.m.traverse(function (o) { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); } catch (e2) {}
        planes.splice(i, 1);
      }
    }
  } catch (e) {}
}

/* ---------------- §5 CASTLE PORTCULLIS ---------------- */
var port = { bars: [], plate: null, box: null, state: 'up', t0: 0, cdUntil: 0 };
function portSetup() {
  portTeardown();
  if (mapKey() !== 'castle' || !T) return;
  try {
    var g = game();
    var lv = g && g.level;
    if (!lv || !lv.meshes) return;
    /* the five gate bars: thin tall dark boxes at z=28 */
    for (var i = 0; i < lv.meshes.length; i++) {
      (function (o) {
        try {
          if (!o || !o.isMesh || !o.geometry || !o.geometry.parameters) return;
          var gp = o.geometry.parameters;
          if (Math.abs((gp.width || 0) - 0.18) > 0.02) return;
          if (Math.abs((gp.height || 0) - 5) > 0.02) return;
          if (Math.abs((gp.depth || 0) - 0.18) > 0.02) return;
          if (Math.abs(o.position.z - 28) > 0.5) return;
          if (Math.abs(o.position.y - 5) > 1.5) return;
          port.bars.push(o);
        } catch (e) {}
      })(lv.meshes[i]);
    }
    if (!port.bars.length) { log('portcullis bars not found'); return; }
    /* pressure plate on the drawbridge */
    var plate = new T.Mesh(new T.CylinderGeometry(1.1, 1.3, 0.18, 12),
      new T.MeshBasicMaterial({ color: 0xffc21c }));
    plate.position.set(0, 0.35, 32);
    g.ctx.scene.add(plate);
    port.plate = plate;
    log('portcullis armed (' + port.bars.length + ' bars)');
  } catch (e) {}
}
function portTeardown() {
  try {
    raisePort(true);
    var g = game();
    if (port.plate && g && g.ctx && g.ctx.scene) {
      try { g.ctx.scene.remove(port.plate); } catch (e) {}
    }
  } catch (e) {}
  port.bars = []; port.plate = null; port.box = null; port.state = 'up';
}
function slamPort() {
  if (port.state !== 'up') return;
  port.state = 'falling';
  port.t0 = performance.now();
  try {
    var k = window.__ddKit;
    if (k && typeof k.collider === 'function') {
      port.box = k.collider(0, 0, 28, 4.5, 5, 2, { noNav: true });
    }
  } catch (e) {}
  toast('⛓ PORTCULLIS SLAMMED!', 2);
  tone(98, 0.5, 0, 0.16); tone(65, 0.7, 0.08, 0.16);
  try {
    var g = game();
    if (g && g.hud && typeof g.hud.kill === 'function') g.hud.kill('⛓ PORTCULLIS SLAMMED', 0);
  } catch (e) {}
}
function raisePort(silent) {
  if (port.state === 'up') return;
  port.state = 'up';
  try {
    var g = game();
    if (port.box && g && g.world && typeof g.world.removeBox === 'function') {
      try { g.world.removeBox(port.box); } catch (e) {}
    }
  } catch (e) {}
  port.box = null;
  port.bars.forEach(function (b) { try { b.position.y = 5; } catch (e) {} });
  if (!silent) port.cdUntil = performance.now() + 15000;
  else port.cdUntil = 0;
}
function portTick() {
  if (!port.bars.length || !inMatch()) return;
  try {
    var now = performance.now();
    if (port.plate) {
      try {
        var s = 1 + 0.08 * Math.sin(now / 200);
        port.plate.scale.set(s, 1, s);
      } catch (e) {}
    }
    if (port.state === 'falling') {
      var k = Math.min(1, (now - port.t0) / 280);
      port.bars.forEach(function (b) { try { b.position.y = 5 - 4.4 * k * k; } catch (e) {} });
      if (k >= 1) { port.state = 'down'; port.t0 = now; }
      return;
    }
    if (port.state === 'down') {
      if (now - port.t0 > 6000) { port.state = 'rising'; port.t0 = now; }
      return;
    }
    if (port.state === 'rising') {
      var k2 = Math.min(1, (now - port.t0) / 2000);
      port.bars.forEach(function (b) { try { b.position.y = 0.6 + 4.4 * k2; } catch (e) {} });
      if (k2 >= 1) raisePort(false);
      return;
    }
    /* armed: check the plate */
    if (now < port.cdUntil) return;
    var g = game();
    var trig = false;
    function near(x, z) {
      return Math.hypot(x - 0, z - 32) < 2.4;
    }
    try {
      if (g.player && g.player.alive && g.player.center && near(g.player.center.x, g.player.center.z)) trig = true;
      var r = g.remote;
      if (!trig && r && typeof r.values === 'function') {
        Array.from(r.values()).forEach(function (p) {
          if (p && p.alive !== false && p.center && near(p.center.x, p.center.z)) trig = true;
        });
      }
    } catch (e) {}
    if (trig) slamPort();
  } catch (e) {}
}

/* ---------------- §6 SPAR BOTS ---------------- */
var BOT_NAMES = ['BOB', 'WALLY', 'ZED', 'MOIRA', 'PIXEL', 'INKY', 'SKRIB', 'DOT'];
var spar = { n: 0, spawned: 0, tags: [] };
function sparWanted() {
  if (isOnline()) return 0;
  if (mapKey() === 'park') return 0;
  var n = storeGet('doodle_sparbots', 0) | 0;
  return (n === 2 || n === 4 || n === 6) ? n : 0;
}
function sparReset() {
  spar.n = sparWanted();
  spar.spawned = 0;
  clearTags();
  if (spar.n > 0) {
    toast('🤖 SPAR MODE — ' + spar.n + ' named bots, no waves. Good luck.');
    log('spar mode: ' + spar.n + ' bots');
  }
}
function makeTag(name) {
  try {
    var cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    var cx = cv.getContext('2d');
    cx.font = 'bold 38px "Patrick Hand", "Comic Sans MS", cursive';
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.lineWidth = 6; cx.strokeStyle = '#1a1a1a';
    cx.strokeText(name, 128, 34);
    cx.fillStyle = '#ff5b4d';
    cx.fillText(name, 128, 34);
    var tex = new T.CanvasTexture(cv);
    var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sp.scale.set(2.4, 0.6, 1);
    return sp;
  } catch (e) { return null; }
}
function sparSpawn() {
  try {
    var g = game();
    var M = g && g.enemies;
    if (!M || typeof M.spawn !== 'function' || !T) return false;
    var lv = g.level;
    var pts = (lv && lv.arenaSpawns && lv.arenaSpawns.length ? lv.arenaSpawns : (lv && lv.spawns)) || [];
    if (!pts.length) return false;
    var pos = pts[spar.spawned % pts.length];
    var bot = M.spawn('sparbot', pos);
    if (!bot) return false;
    var nm = BOT_NAMES[spar.spawned % BOT_NAMES.length] +
      (spar.spawned >= BOT_NAMES.length ? ' ' + (1 + Math.floor(spar.spawned / BOT_NAMES.length)) : '');
    bot._ddBot = true;
    bot._ddName = nm;
    spar.spawned++;
    try {
      var tag = makeTag(nm);
      if (tag && g.ctx && g.ctx.scene) {
        g.ctx.scene.add(tag);
        spar.tags.push({ bot: bot, tag: tag });
      }
    } catch (e) {}
    return true;
  } catch (e) { return false; }
}
function clearTags() {
  try {
    var g = game();
    spar.tags.forEach(function (t) {
      try { if (g && g.ctx && g.ctx.scene) g.ctx.scene.remove(t.tag); } catch (e) {}
    });
  } catch (e) {}
  spar.tags = [];
}
function sparPoll() {
  if (!inMatch()) return;
  wrapOnKill();
  if (spar.n <= 0) return;
  try {
    var g = game();
    /* bots replace waves */
    try { if (g.game && g.game.queue) g.game.queue.length = 0; } catch (e) {}
    var M = g && g.enemies;
    if (!M || !M.enemies) return;
    var alive = 0;
    for (var i = 0; i < M.enemies.length; i++) {
      var b = M.enemies[i];
      if (b && b._ddBot && b.alive) alive++;
    }
    /* drop tags of the fallen */
    for (var j = spar.tags.length - 1; j >= 0; j--) {
      if (!spar.tags[j].bot || !spar.tags[j].bot.alive) {
        try { g.ctx.scene.remove(spar.tags[j].tag); } catch (e) {}
        spar.tags.splice(j, 1);
      }
    }
    if (alive < spar.n && spar.spawned < 40) {
      if (!spar._cd || performance.now() > spar._cd) {
        spar._cd = performance.now() + 900;
        sparSpawn();
      }
    }
  } catch (e) {}
}
function tagsTick() {
  if (!spar.tags.length) return;
  try {
    for (var i = 0; i < spar.tags.length; i++) {
      var t = spar.tags[i];
      if (t.bot && t.bot.alive && t.bot.center) {
        t.tag.position.set(t.bot.center.x, t.bot.center.y + 2.4, t.bot.center.z);
      }
    }
  } catch (e) {}
}
function wrapOnKill() {
  try {
    var g = game();
    var M = g && g.enemies;
    if (!M || typeof M.onKill === 'undefined') return;
    if (M.onKill && M.onKill._ddWrapped) return;
    var orig = M.onKill;
    var f = function (n, t, e) {
      try { if (typeof orig === 'function') orig(n, t, e); } catch (err) {}
      try {
        if (n && n._ddBot && n._ddName) {
          var how = (t && t.source) || 'rifle';
          var gg = game();
          if (gg && gg.hud && typeof gg.hud.kill === 'function') {
            gg.hud.kill('ERASED ' + n._ddName + ' \xB7 ' + String(how).toUpperCase(), 0);
          }
        }
      } catch (err2) {}
    };
    f._ddWrapped = true;
    M.onKill = f;
  } catch (e) {}
}

/* ---------------- boot ---------------- */
function waitForGame(tries) {
  if (window.__game && window.__game.player && window.__game.level !== undefined) { boot(); return; }
  if (tries <= 0) { log('game API not found, giving up'); return; }
  setTimeout(function () { waitForGame(tries - 1); }, 250);
}
function boot() {
  if (booted) return;
  booted = true;

  /* master rAF: car, planes, portcullis, tags */
  var lastT = performance.now();
  (function frame() {
    requestAnimationFrame(frame);
    var now = performance.now();
    var dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    try { carTick(); } catch (e) {}
    try { planesTick(dt); } catch (e) {}
    try { portTick(); } catch (e) {}
    try { tagsTick(); } catch (e) {}
  })();

  setInterval(function () {
    try { parkPoll(); } catch (e) {}
  }, 100);
  setInterval(function () {
    try { sparPoll(); } catch (e) {}
    try { carEnsure(); } catch (e) {}
  }, 500);

  /* streak events drive bell + plane + car hops */
  window.addEventListener('dd-streak', function (ev) {
    try {
      var d = (ev && ev.detail) || {};
      var s = d.streak || 0;
      if (mapKey() === 'school' && s >= 2) {
        var n = Math.min(s - 1, 5);
        bellToll(n);
        toast('🔔 THE BELL TOLLS ×' + n);
      }
      if (s === 5) spawnPlane();
    } catch (e) {}
  });
  window.addEventListener('dd-kill', function (ev) {
    try {
      var d = (ev && ev.detail) || {};
      if (d.mine && car && car.visible) {
        carHop = 1;
        beepBeep();
      }
    } catch (e) {}
  });
  window.addEventListener('dd-match-start', function () {
    try {
      parkReset();
      sparReset();
      portSetup();
      carEnsure();
      if (car) carHop = 1;
    } catch (e) {}
  });
  window.addEventListener('dd-match-end', function () {
    try {
      park.active = false;
      var hud = $('dd-park-hud');
      if (hud) hud.style.display = 'none';
      spar.n = 0;
      clearTags();
      portTeardown();
      if (car) car.visible = false;
    } catch (e) {}
  });

  window.__ddBits = { version: '3.2.0' };
  log('world bits ready');
}

waitForGame(80);
})();
