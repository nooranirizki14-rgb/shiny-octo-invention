/* ============================================================
   Doodle District — dd-fixes.js v3.1.0
   Runtime patch pack. The game bundle (game.?.js) exposes everything it
   needs on window.__game, so these fixes ride on top without touching
   the minified engine:
     1. TRUE AIM — bullets follow the real camera direction (including
        the recoil springs), so the crosshair, the ADS red-dot and the
        sniper scope all agree with the actual impact point.
     2. STEADY ADS — while aiming down sights the weapon-model kick is
        toned down, so the 3D sight stays glued near the bullet line
        instead of bouncing off it. Hip-fire feel is untouched.
     3. ADS CENTER DOT — a tiny sniper-style center dot while aiming
        with non-scope guns (the HUD crosshair hides during ADS), so
        there is always an exact-center reference like the sniper scope.
     4. RIFLE DOT — the in-game red dot is ~2px wide; enlarge it so the
        sight can actually be seen.
     5. LIGHTSABER MODEL — rebuilds the in-game saber as a real glowing
        plasma blade (white core + colored glow shell + round tip +
        emitter hilt) instead of a slightly fatter katana blade.
     6. MAP SAFETY NET — a throwing level-animated hook can no longer
        kill the whole frame loop (frozen/blank game); each hook is
        guarded and a broken one is disabled with a console warning.
     7. MULTIPLAYER — host retries once when the signalling server
        times out; failures get an actionable hint appended to the
        status line (same-version check, private-code tip, network tip).
     8. FRAME SAFETY NET — every per-frame system is guarded so one
        hitch shows a toast instead of black-screening; a render
        watchdog reloads the map if drawing stalls mid-match.
     9. LASER TOGGLE — press L to switch the gun laser sights on/off
        (choice is remembered between visits).
   ============================================================ */
(function () {
'use strict';

var PATCH_TAG = '[DD fixes]';
var booted = false;

function log() {
  try { console.log.apply(console, [PATCH_TAG].concat([].slice.call(arguments))); } catch (e) {}
}

/* Wait for the game module (deferred) to expose its API, then patch. */
function waitForGame(tries) {
  if (window.__game && window.__game.player && window.__game.player.weapons) {
    boot();
    return;
  }
  if (tries <= 0) { log('game API not found, giving up'); return; }
  setTimeout(function () { waitForGame(tries - 1); }, 250);
}

function boot() {
  if (booted) return;
  booted = true;
  try { patchTrueAim(); } catch (e) { log('true-aim failed', e); }
  try { patchAdsKick(); } catch (e) { log('ads-kick failed', e); }
  try { patchRifleDot(); } catch (e) { log('rifle-dot failed', e); }
  try { patchAdsDot(); } catch (e) { log('ads-dot failed', e); }
  try { patchSaber(); } catch (e) { log('saber failed', e); }
  try { patchAnimatedGuard(); } catch (e) { log('animated-guard failed', e); }
  try { patchNet(); } catch (e) { log('net failed', e); }
  try { patchFrameSafety(); } catch (e) { log('frame-safety failed', e); }
  try { patchLaserToggle(); } catch (e) { log('laser-toggle failed', e); }
  log('all patches applied');
}

/* ---------------- 1. TRUE AIM ----------------
   Bullets used the raw yaw/pitch, but the camera also carries the
   recoil springs (recoilPitch/recoilYaw). During recoil the screen
   center (crosshair / scope / red-dot) and the bullet line disagreed,
   so impacts landed off the sight — usually reading as "a bit high".
   Recompute the base direction from the EFFECTIVE angles (springs
   included, random shake noise excluded — that is only camera jitter). */
function patchTrueAim() {
  var g = window.__game;
  var p = g.player;
  if (!p || typeof p.aimDir !== 'function') return;
  if (p.aimDir.__ddPatched) return;
  var orig = p.aimDir.bind(p);
  p.aimDir = function (spread) {
    try {
      var rx = p.pitch + (p.recoilPitch ? p.recoilPitch.value : 0);
      var ry = p.yaw + (p.recoilYaw ? p.recoilYaw.value : 0);
      var cp = Math.cos(rx);
      /* forward from effective angles (same convention as the engine) */
      var dx = -Math.sin(ry) * cp, dy = Math.sin(rx), dz = -Math.cos(ry) * cp;
      if (spread > 0) {
        var r = p.right;
        var sx = (Math.random() * 2 - 1) * spread;
        var sy = (Math.random() * 2 - 1) * spread;
        dx += r.x * sx; dy += sy; dz += r.z * sx;
        var l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        dx /= l; dy /= l; dz /= l;
      }
      /* reuse a vector of the same class the engine uses */
      var v = p.forward.clone();
      v.set(dx, dy, dz);
      return v;
    } catch (e) {
      return orig(spread);
    }
  };
  p.aimDir.__ddPatched = true;
  log('true aim on');
}

/* ---------------- 2. STEADY ADS ----------------
   Wrap every gun's fire(): while the trigger pull is an aimed shot,
   temporarily shrink the model/camera/FOV kick so the 3D sight stays
   near the bullet line. Restored immediately (fire is synchronous). */
function patchAdsKick() {
  var g = window.__game;
  var MODEL = 0.45, CAM = 0.75, FOV = 0.6;
  (g.player.weapons || []).forEach(function (w) {
    if (!w || !w.isGun || typeof w.fire !== 'function' || w.fire.__ddPatched) return;
    var orig = w.fire.bind(w);
    w.fire = function (st) {
      var aiming = !!(st && st.aim);
      if (!aiming || !w.modelKick || !w.camKick) return orig(st);
      var mk = w.modelKick, ck = w.camKick, fk = w.fovKick;
      w.modelKick = [mk[0] * MODEL, mk[1] * MODEL, mk[2] * MODEL, mk[3] * MODEL, mk[4] * MODEL, mk[5] * MODEL];
      w.camKick = [ck[0] * CAM, ck[1] * CAM];
      if (typeof fk === 'number') w.fovKick = fk * FOV;
      try {
        return orig(st);
      } finally {
        w.modelKick = mk; w.camKick = ck; w.fovKick = fk;
      }
    };
    w.fire.__ddPatched = true;
  });
  log('steady ADS on');
}

/* ---------------- 3. RIFLE RED-DOT SIZE ----------------
   The rifle's red dot is a 1.2mm sphere (~2px on screen) — exact but
   nearly invisible, so players aimed with the sight frame instead.
   Scale the dot mesh up; the shotgun bead and sniper scope are fine. */
function patchRifleDot() {
  var g = window.__game;
  (g.player.weapons || []).forEach(function (w) {
    if (!w || w.kind !== 'rifle' || !w.root || !w.red) return;
    w.root.traverse(function (o) {
      try {
        if (o && o.isMesh && o.material === w.red && o.geometry &&
            o.geometry.type === 'SphereGeometry') {
          o.scale.setScalar(3);
        }
      } catch (e) {}
    });
  });
  log('rifle dot enlarged');
}

/* ---------------- 4. ADS CENTER DOT ----------------
   The HUD crosshair hides during ADS (opacity 0) and only the sniper
   gets a true-center overlay. Show a tiny sniper-style dot for the
   other guns while aimed, driven by the existing setAds hook. */
function patchAdsDot() {
  var g = window.__game;
  var hud = g.hud;
  if (!hud || typeof hud.setAds !== 'function' || hud.setAds.__ddPatched) return;
  var dot = document.createElement('div');
  dot.id = 'dd-adot';
  var host = document.getElementById('hud') || document.body;
  host.appendChild(dot);
  var orig = hud.setAds.bind(hud);
  hud.setAds = function (on) {
    orig(on);
    try {
      var w = g.player && g.player.weapon;
      var show = !!on && !!w && !!w.isGun && !w.scope && !!g.player.alive;
      dot.classList.toggle('on', show);
    } catch (e) {}
  };
  hud.setAds.__ddPatched = true;
  /* resync when the weapon changes (scope guns must never show it) */
  setInterval(function () {
    try {
      var w = g.player && g.player.weapon;
      var wantHud = hud._ads && w && w.isGun && !w.scope && g.player.alive &&
        g.game && g.game.state === 'play' && !g.game.menu;
      if (!wantHud && dot.classList.contains('on')) dot.classList.remove('on');
    } catch (e) {}
  }, 500);
  log('ADS dot on');
}

/* ---------------- 5. LIGHTSABER MODEL ----------------
   The engine's setSaberMode only hides the guard/groove/wraps and
   fattens the flat katana blade. Wrap it: in saber mode hide the
   katana blade + angled tip and show a real plasma blade instead —
   white core, colored additive glow shell, round tip, emitter hilt.
   Glow color follows the blade ink chosen in the loadout. */
var SABER_COLORS = [0x4d6bff, 0xff3344, 0xb48cff, 0xff9a1f, 0x2eff8f, 0xff6fb5];

function patchSaber() {
  var g = window.__game;
  var kat = null;
  (g.player.weapons || []).forEach(function (w) {
    if (w && w.kind === 'katana') kat = w;
  });
  if (!kat || typeof kat.setSaberMode !== 'function' || kat.setSaberMode.__ddPatched) return;

  var T = null;            /* three namespace (import-mapped, vendored) */
  var saberGroup = null;   /* built lazily once three is available */
  var glowMat = null, tipMesh = null;
  var katanaTip = null;    /* angled katana tip mesh, found by geometry size */
  var lastInk = -1;

  try {
    kat.root.traverse(function (o) {
      if (katanaTip || !o || !o.isMesh || !o.geometry || !o.geometry.parameters) return;
      var gp = o.geometry.parameters;
      if (Math.abs(gp.width - 0.012) < 1e-6 && Math.abs(gp.height - 0.02) < 1e-6 &&
          Math.abs(gp.depth - 0.08) < 1e-6) {
        katanaTip = o;
      }
    });
  } catch (e) {}

  function inkColor() {
    try {
      var v = kat.mat && kat.mat.uniforms && kat.mat.uniforms.uInk
        ? kat.mat.uniforms.uInk.value : 0;
      return SABER_COLORS[v] != null ? SABER_COLORS[v] : SABER_COLORS[0];
    } catch (e) { return SABER_COLORS[0]; }
  }

  function buildSaber() {
    if (saberGroup || !T) return;
    saberGroup = new T.Group();
    /* white-hot core */
    var coreGeo = new T.CylinderGeometry(0.016, 0.016, 1.2, 12);
    coreGeo.rotateX(Math.PI / 2);
    var core = new T.Mesh(coreGeo, new T.MeshBasicMaterial({ color: 0xffffff }));
    core.position.set(0, 0, -0.62);
    /* colored glow shell */
    var glowGeo = new T.CylinderGeometry(0.04, 0.04, 1.2, 12);
    glowGeo.rotateX(Math.PI / 2);
    glowMat = new T.MeshBasicMaterial({
      color: inkColor(), transparent: true, opacity: 0.55,
      blending: T.AdditiveBlending, depthWrite: false
    });
    var glow = new T.Mesh(glowGeo, glowMat);
    glow.position.set(0, 0, -0.62);
    /* round tip */
    tipMesh = new T.Mesh(new T.SphereGeometry(0.04, 12, 10), glowMat);
    tipMesh.position.set(0, 0, -1.22);
    /* emitter hilt where the groove used to be */
    var dark = new T.MeshBasicMaterial({ color: 0x23232e });
    var emitGeo = new T.CylinderGeometry(0.045, 0.052, 0.14, 10);
    emitGeo.rotateX(Math.PI / 2);
    var emitter = new T.Mesh(emitGeo, dark);
    emitter.position.set(0, 0, 0.0);
    saberGroup.add(core, glow, tipMesh, emitter);
    saberGroup.visible = false;
    kat.root.add(saberGroup);
    lastInk = inkColor();
  }

  function applySaber(on) {
    /* engine part first (hides guard/groove/wraps, restores on off) */
    origSaber(on);
    try {
      if (on && !saberGroup && T) buildSaber();
      var col = inkColor();
      if (glowMat && col !== lastInk) { glowMat.color.setHex(col); lastInk = col; }
      if (kat.blade) kat.blade.visible = !on;
      if (katanaTip) katanaTip.visible = !on;
      if (saberGroup) saberGroup.visible = !!on;
      /* saber reads as pure light: no ink fill on the (hidden) blade */
      if (on && kat.mat && kat.mat.uniforms && kat.mat.uniforms.uFill) {
        kat.mat.uniforms.uFill.value = 1;
      }
    } catch (e) {}
  }

  var origSaber = kat.setSaberMode.bind(kat);
  kat.setSaberMode = function (on) { applySaber(!!on); };
  kat.setSaberMode.__ddPatched = true;

  /* three is import-mapped to the vendored build; cache it, then if the
     player already has the saber equipped, apply the new look at once */
  import('three').then(function (mod) {
    T = mod;
    try {
      if (kat.saberMode) applySaber(true);
    } catch (e) {}
  }).catch(function () {});

  log('saber rebuild on');
}

/* ---------------- 6. MAP SAFETY NET ----------------
   The frame loop runs every level.animated hook unguarded — one throw
   (a level script hiccup) freezes rendering entirely. Guard each hook
   once per level object; a failing hook is disabled, the game runs on. */
function patchAnimatedGuard() {
  var g = window.__game;
  var guardedLevel = null;
  function guard() {
    try {
      var lv = g.level;
      if (!lv || lv === guardedLevel || !lv.animated) return;
      for (var i = 0; i < lv.animated.length; i++) {
        (function (a) {
          if (!a || typeof a.update !== 'function' || a.update.__ddGuarded) return;
          var orig = a.update;
          a.update = function (tm) {
            try {
              orig(tm);
            } catch (e) {
              a.update = function () {};
              try { console.warn(PATCH_TAG, 'disabled a broken level animation', e); } catch (_) {}
            }
          };
          a.update.__ddGuarded = true;
        })(lv.animated[i]);
      }
      guardedLevel = lv;
    } catch (e) {}
  }
  guard();
  setInterval(guard, 750);
  log('animated guard on');
}

/* ---------------- 7. MULTIPLAYER ----------------
   (a) Hosting fails outright when the signalling handshake times out;
       retry once automatically before surfacing the error.
   (b) After host/join/quick-play failures, append one short actionable
       hint to the status line (kept quiet when a hint is already there). */
function patchNet() {
  var g = window.__game;
  var net = g.net;
  if (!net) return;

  function hintFor(msg) {
    msg = String(msg || '');
    if (/signalling|timed out|matchmaking/i.test(msg)) {
      return ' · if it keeps failing, try another network (some Wi-Fi blocks peer play)';
    }
    if (/no lobby with that code/i.test(msg)) {
      return ' · codes only work while the host is still in the lobby';
    }
    if (/could not connect|no answer|blocks it/i.test(msg)) {
      return ' · NAT blocked the link: host can CREATE again, or both try another network';
    }
    if (/full/i.test(msg)) return ' · pick another lobby or make your own';
    if (/updated|refresh/i.test(msg)) return ' · both players must be on the same version';
    return '';
  }
  function appendHint(err) {
    /* deferred: the game's own failure handler rewrites the status line
       after our wrapper rejects, so the hint must land after that. */
    setTimeout(function () {
      try {
        var el = document.querySelector('#online #status') || document.querySelector('#status');
        if (!el || el.dataset.ddHint) return;
        var h = hintFor(el.textContent || (err && err.message) || '');
        if (h) { el.textContent += h; el.dataset.ddHint = '1'; }
      } catch (e) {}
    }, 60);
  }

  if (typeof net.host === 'function' && !net.host.__ddPatched) {
    var origHost = net.host.bind(net);
    net.host = function (opts) {
      return origHost(opts).catch(function (err) {
        var m = String((err && err.message) || err || '');
        if (/signalling server timed out/i.test(m)) {
          try {
            var el = document.querySelector('#online #status') || document.querySelector('#status');
            if (el) el.textContent = 'matchmaking is slow · trying once more…';
          } catch (e) {}
          return new Promise(function (res) { setTimeout(res, 1300); })
            .then(function () { return origHost(opts); })
            .catch(function (err2) { appendHint(err2); throw err2; });
        }
        appendHint(err);
        throw err;
      });
    };
    net.host.__ddPatched = true;
  }
  ['join', 'quickJoin'].forEach(function (k) {
    if (typeof net[k] === 'function' && !net[k].__ddPatched) {
      var orig = net[k].bind(net);
      net[k] = function () {
        var args = arguments;
        return orig.apply(net, args).catch(function (err) {
          appendHint(err);
          throw err;
        });
      };
      net[k].__ddPatched = true;
    }
  });
  log('net hardening on');
}

/* ---------------- 8. FRAME SAFETY NET ----------------
   The engine's frame loop stops drawing the moment any per-frame update
   throws (the render call sits at the end). That single fact is behind
   most "black / empty world in matches" reports: one hiccup in enemies,
   remotes, props, effects, audio or the player — and the screen goes
   black while the game keeps running blind underneath.
   This patch: (a) guards every per-frame update reachable from the game
   API, (b) shows a small on-screen error toast so failures are visible
   instead of silent, (c) watches the render heartbeat and reloads the
   current map automatically if drawing stalls mid-match. */
var errorLog = [];
try { window.__ddFixes = window.__ddFixes || {}; window.__ddFixes.errors = errorLog; } catch (e) {}

function ensureToastBox() {
  var box = document.getElementById('dd-errbox');
  if (box) return box;
  try {
    box = document.createElement('div');
    box.id = 'dd-errbox';
    document.body.appendChild(box);
  } catch (e) { return null; }
  return box;
}

var lastToastAt = 0;
function reportError(source, err) {
  var msg = String((err && err.message) || err || 'unknown error');
  try { errorLog.push({ t: Date.now(), src: source, msg: msg }); } catch (e) {}
  try { console.warn(PATCH_TAG, source + ':', err); } catch (e) {}
  /* one toast every few seconds max — a per-frame throw must not spam */
  var now = Date.now();
  if (now - lastToastAt < 4000) return;
  lastToastAt = now;
  try {
    var box = ensureToastBox();
    if (!box) return;
    var d = document.createElement('div');
    d.className = 'dd-err';
    d.textContent = 'hitch in ' + source + ': ' + msg.slice(0, 140);
    box.appendChild(d);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(function () {
      d.classList.add('out');
      setTimeout(function () { try { d.remove(); } catch (e) {} }, 500);
    }, 6000);
  } catch (e) {}
}

function guardUpdate(obj, method, source) {
  try {
    if (!obj || typeof obj[method] !== 'function') return false;
    var fn = obj[method];
    if (fn.__ddGuarded) return true;
    var bound = fn.bind ? fn.bind(obj) : function () { return fn.apply(obj, arguments); };
    obj[method] = function () {
      try {
        return bound.apply(null, arguments);
      } catch (e) {
        reportError(source, e);
        return undefined;
      }
    };
    obj[method].__ddGuarded = true;
    return true;
  } catch (e) { return false; }
}

function patchFrameSafety() {
  var g = window.__game;

  /* surface global failures instead of failing silently */
  try {
    window.addEventListener('error', function (ev) {
      if (ev && ev.message) reportError('window', ev.message);
    });
    window.addEventListener('unhandledrejection', function (ev) {
      if (ev && ev.reason) reportError('promise', ev.reason);
    });
  } catch (e) {}

  /* guard the per-frame updates the engine runs before drawing */
  try {
    if (g.player) {
      guardUpdate(g.player, 'update', 'player');
      guardUpdate(g.player, 'idleCam', 'menu camera');
    }
    if (g.enemies) guardUpdate(g.enemies, 'update', 'enemies');
    if (g.props) guardUpdate(g.props, 'update', 'props');
    if (g.effects) guardUpdate(g.effects, 'update', 'effects');
    if (g.hud) guardUpdate(g.hud, 'update', 'hud');
    if (g.input) guardUpdate(g.input, 'update', 'input');
    if (g.ctx && g.ctx.audio) {
      guardUpdate(g.ctx.audio, 'setListener', 'audio');
      guardUpdate(g.ctx.audio, 'setIntensity', 'audio');
    }
  } catch (e) {}

  /* remote players arrive later; guard each one's update as it appears */
  function guardRemotes() {
    try {
      var remotes = g.remote;
      if (!remotes || !remotes.forEach) return;
      remotes.forEach(function (rp) {
        guardUpdate(rp, 'update', 'remote player');
      });
    } catch (e) {}
  }
  guardRemotes();
  setInterval(guardRemotes, 1000);

  /* render heartbeat + stall recovery */
  try {
    var renderer = g.ctx && g.ctx.renderer;
    var lastRender = performance.now();
    var renderThrows = 0;
    if (renderer && typeof renderer.render === 'function' && !renderer.render.__ddGuarded) {
      var origRender = renderer.render.bind(renderer);
      renderer.render = function () {
        try {
          var r = origRender.apply(null, arguments);
          lastRender = performance.now();
          renderThrows = 0;
          return r;
        } catch (e) {
          renderThrows++;
          if (renderThrows <= 2) reportError('renderer', e);
          return undefined;
        }
      };
      renderer.render.__ddGuarded = true;
    }
    var recoveries = 0, lastRecovery = 0;
    var bootGrace = performance.now() + 8000;
    setInterval(function () {
      try {
        if (performance.now() < bootGrace) return;
        if (document.hidden) return;
        var st = g.game && g.game.state;
        if (st !== 'play' && st !== 'dying') { lastRender = performance.now(); return; }
        if (performance.now() - lastRender < 3000) return;
        /* drawing stalled mid-match — reload the current map once */
        if (recoveries >= 2 && performance.now() - lastRecovery < 60000) return;
        recoveries++;
        lastRecovery = performance.now();
        lastRender = performance.now();
        var key = (g.level && g.level.key) || 'district';
        var arena = !!(g.game && g.game.mode === 'ffa');
        reportError('watchdog', 'drawing stalled — reloading ' + key);
        try {
          if (typeof g.setLevel === 'function') g.setLevel(key, arena, true);
        } catch (e2) {
          try {
            if (typeof g.setLevel === 'function') g.setLevel('district', arena, true);
          } catch (e3) {}
        }
      } catch (e) {}
    }, 1000);
  } catch (e) {}

  log('frame safety on');
}

/* ---------------- 9. LASER TOGGLE ----------------
   Every gun carries a red laser sight (built by the engine). L flips
   window.__ddLaserOn, which the weapon update reads every frame. The
   choice persists in localStorage; default is on. */
function patchLaserToggle() {
  try {
    var saved = null;
    try { saved = localStorage.getItem('doodle_laser'); } catch (e) {}
    window.__ddLaserOn = saved !== '0';
  } catch (e) { window.__ddLaserOn = true; }
  document.addEventListener('keydown', function (e) {
    try {
      if (!e || e.code !== 'KeyL' || e.repeat) return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      window.__ddLaserOn = !window.__ddLaserOn;
      try { localStorage.setItem('doodle_laser', window.__ddLaserOn ? '1' : '0'); } catch (err) {}
      var msg = window.__ddLaserOn ? 'laser sights ON' : 'laser sights OFF';
      if (window.__ddMenu && typeof window.__ddMenu.toast === 'function') window.__ddMenu.toast(msg);
      else log(msg);
    } catch (err) {}
  });
  log('laser toggle on');
}

/* go */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () { waitForGame(80); });
} else {
  waitForGame(80);
}
})();
