/* ============================================================
   Doodle District — Party Pack Phase 2 (dd-modes.js)
   Net-synced party features (bundle Uo whitelist required):
     §1 ddmode / ddhat / ddwall events (host-authoritative states)
     §2 match modes: FFA / KING OF THE HILL / INFECTED / JUGGERNAUT
     §3 sketch-wall (B): native breakable, host-ordered ids, brk sync
     §4 hats: halo / crown / antenna / party (mesh direct sync)
     §5 dual-wield visual: mirrored second rifle when stats.dual
   Custom net types pass the bundle validator (ea(t) shape check);
   handlers additionally verify host-only roles. Same-version gate
   (Qt) guarantees every peer understands the new types.
   ============================================================ */
(function () {
'use strict';

/* ---------------- §0 utils ---------------- */
var booted = false;
var T = null;
try { import('three').then(function (m) { T = m; }).catch(function () {}); } catch (e) {}

function log() { try { console.log.apply(console, ['[DD Modes]'].concat([].slice.call(arguments))); } catch (e) {} }
function $(id) { try { return document.getElementById(id); } catch (e) { return null; } }
function game() { return window.__game || null; }
function net() { try { return (game() || {}).net || null; } catch (e) { return null; } }
function storeGet(k, fb) { try { var v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch (e) { return fb; } }
function storeSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function toast(msg, secs) {
  try {
    if (window.__ddMenu && typeof window.__ddMenu.toast === 'function') { window.__ddMenu.toast(msg, secs || 3); return; }
  } catch (e) {}
}
function emit(name, detail) { try { window.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); } catch (e) {} }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
var AC = null;
function beep(freq, dur, delay) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    var t = AC.currentTime + (delay || 0);
    var o = AC.createOscillator(), gn = AC.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(freq || 660, t);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(0.1, t + 0.02);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.15));
    o.connect(gn); gn.connect(AC.destination);
    o.start(t); o.stop(t + (dur || 0.15) + 0.05);
  } catch (e) {}
}
function inMatch() {
  try { var g = game(); return !!(g && g.game && g.game.state === 'play'); } catch (e) { return false; }
}
function isOnline() {
  try { var n = net(); return !!(n && n.active); } catch (e) { return false; }
}
function isHost() {
  try { var n = net(); return !!(n && n.active && n.isHost); } catch (e) { return false; }
}
function myId() {
  try { var n = net(); return (n && n.id) || 'self'; } catch (e) { return 'self'; }
}
function myName() {
  try { var g = game(); if (g && g.player && g.player.name) return g.player.name; } catch (e) {}
  return 'you';
}
function scores() {
  try { var g = game(); return (g && g.scores) || null; } catch (e) { return null; }
}
function remotes() {
  try { var g = game(); return (g && g.remote) || null; } catch (e) { return null; }
}
function allIds() {
  var ids = [myId()];
  try {
    var r = remotes();
    if (r && typeof r.keys === 'function') Array.from(r.keys()).forEach(function (k) { ids.push(k); });
  } catch (e) {}
  return ids;
}
function nameOf(id) {
  if (id === myId()) return myName();
  try {
    var sc = scores();
    if (sc && typeof sc.get === 'function') { var e = sc.get(id); if (e && e.name) return e.name; }
    var r = remotes();
    if (r && typeof r.get === 'function') { var p = r.get(id); if (p && p.name) return p.name; }
  } catch (e) {}
  return 'someone';
}
function idOfName(name) {
  if (!name) return null;
  if (name === myName()) return myId();
  try {
    var sc = scores();
    if (sc && typeof sc.entries === 'function') {
      var arr = Array.from(sc.entries());
      for (var i = 0; i < arr.length; i++) if (arr[i][1] && arr[i][1].name === name) return arr[i][0];
    }
  } catch (e) {}
  return null;
}
function send(type, data) {
  try {
    var n = net();
    if (n && typeof n.broadcast === 'function') { n.broadcast(type, data || {}); return true; }
  } catch (e) {}
  return false;
}

/* ---------------- §2 match modes ---------------- */
var KOTH_PTS = 45, KOTH_R = 5, INF_T = 180, JUGG_T = 210, JUGG_KILLS = 10;
var lastMode = 'ffa';        /* last applied mode */
var lastState = null;        /* last ddmode (host or own) */
var H = null;                /* host-side mutable state */
var ringObjs = [];           /* koth hill meshes */
var markerMap = {};          /* id -> marker mesh (infected/juggernaut) */
var origMaxHp = 0;

function partyMode() {
  try { return localStorage.getItem('doodle_party_mode') || 'ffa'; } catch (e) { return 'ffa'; }
}
function hillCenter() {
  try {
    var g = game();
    var lv = g && g.level;
    var arr = (lv && lv.arenaSpawns && lv.arenaSpawns.length ? lv.arenaSpawns : (lv && lv.spawns)) || [];
    if (arr.length) { var p = arr[0]; return [p.x || 0, p.y || 0, p.z || 0]; }
  } catch (e) {}
  return [0, 0, 0];
}
function playerPos(id) {
  try {
    var g = game();
    if (!g) return null;
    if (id === myId()) return g.player && g.player.center;
    var r = remotes();
    if (r && typeof r.get === 'function') { var p = r.get(id); if (p && p.alive !== false && p.center) return p.center; }
  } catch (e) {}
  return null;
}
function playerAlive(id) {
  try {
    var g = game();
    if (id === myId()) return !!(g && g.player && g.player.alive);
    var r = remotes();
    if (r && typeof r.get === 'function') { var p = r.get(id); return !!(p && p.alive !== false); }
  } catch (e) { return false; }
  return false;
}

/* ----- host tick ----- */
function hostEnsure() {
  var m = partyMode();
  if (!H || H.m !== m || H.matchKey !== matchKey()) {
    H = { m: m, matchKey: matchKey(), pts: {}, inf: null, zero: null, t: 0, jugg: null, jk: 0, walls: [], wseq: 1, hill: hillCenter() };
    if (m === 'infected') {
      var ids = allIds();
      H.zero = ids[Math.floor(Math.random() * ids.length)] || myId();
      H.inf = [H.zero];
      H.t = INF_T;
    }
    if (m === 'jugg') { H.jugg = null; H.jk = 0; H.t = JUGG_T; }
    log('host mode init: ' + m);
  }
  return H;
}
var _mk = 0;
function matchKey() { return _mk; }
function hostTick() {
  if (!inMatch() || !isOnline() || !isHost()) return;
  var m = partyMode();
  if (m === 'ffa') { lastMode = 'ffa'; return; }
  hostEnsure();
  var nowMs = performance.now();
  if (H.m === 'koth') {
    if (!H._pt || nowMs - H._pt >= 1000) {
      H._pt = nowMs;
      var inside = [];
      allIds().forEach(function (id) {
        var p = playerPos(id);
        if (p && playerAlive(id)) {
          var dx = p.x - H.hill[0], dz = p.z - H.hill[2];
          if (dx * dx + dz * dz <= KOTH_R * KOTH_R) inside.push(id);
        }
      });
      if (inside.length === 1) {
        H.pts[inside[0]] = (H.pts[inside[0]] || 0) + 1;
        if (H.pts[inside[0]] >= KOTH_PTS) { hostEnd(inside[0]); return; }
      }
    }
  } else if (H.m === 'infected' || H.m === 'jugg') {
    if (H.t > 0 && (!H._tt || nowMs - H._tt >= 1000)) { H._tt = nowMs; H.t--; }
    if (H.m === 'infected' && H.inf) {
      var surv = allIds().filter(function (id) { return H.inf.indexOf(id) === -1; });
      if (surv.length === 0 && allIds().length > 1) { hostEnd(topKills(H.inf) || H.zero); return; }
      if (H.t <= 0) { hostEnd(topKills(surv.length ? surv : allIds()) || myId()); return; }
    }
    if (H.m === 'jugg') {
      if (H.jk >= JUGG_KILLS && H.jugg) { hostEnd(H.jugg); return; }
      if (H.t <= 0) { hostEnd(topKills(allIds()) || myId()); return; }
    }
  }
  broadcastState();
}
function topKills(ids) {
  var best = null, bk = -1;
  try {
    var sc = scores();
    (ids || []).forEach(function (id) {
      var k = 0;
      if (id === myId()) {
        /* self kills live in scores too (host keeps full table) */
      }
      if (sc && typeof sc.get === 'function') { var e = sc.get(id); k = (e && e.kills) || 0; }
      if (k > bk) { bk = k; best = id; }
    });
  } catch (e) {}
  return best;
}
function broadcastState() {
  if (!H) return;
  var d = { m: H.m, now: performance.now(), walls: H.walls, wseq: H.wseq };
  if (H.m === 'koth') { d.pts = H.pts; d.hill = H.hill; }
  if (H.m === 'infected') { d.inf = H.inf; d.t = H.t; d.zero = H.zero; }
  if (H.m === 'jugg') { d.j = H.jugg; d.jk = H.jk; d.t = H.t; }
  lastState = d;
  lastMode = H.m;
  send('ddmode', d);
  applyState(d, myId());
}
function hostEnd(winnerId) {
  try {
    var nm = nameOf(winnerId);
    log('mode end, winner: ' + nm);
    try { send('end', { id: winnerId, name: nm }); } catch (e) {}
    try {
      var n = net();
      if (n && n.handlers && typeof n.handlers.get === 'function') {
        var h = n.handlers.get('end');
        if (typeof h === 'function') h({ id: winnerId, name: nm });
      }
    } catch (e) {}
    emit('dd-mode-win', { win: winnerId === myId(), winner: nm });
  } catch (e) {}
}
/* feed kills (host authority transitions). Idempotent: safe to double-fire. */
function ingestKill(killerName, victimName) {
  if (!inMatch() || !isOnline() || !isHost()) return;
  if (!H || (H.m !== 'infected' && H.m !== 'jugg')) return;
  var k = idOfName(killerName), v = idOfName(victimName);
  if (H.m === 'infected' && H.inf) {
    if (k && v && H.inf.indexOf(k) !== -1 && H.inf.indexOf(v) === -1) {
      H.inf.push(v);
      broadcastState();
      toast('☣ ' + victimName + ' is INFECTED!');
    }
  }
  if (H.m === 'jugg') {
    if (k && !H.jugg) { H.jugg = k; H.jk = 0; broadcastState(); toast('♛ ' + killerName + ' is the JUGGERNAUT!'); }
    else if (k && v && v === H.jugg && k !== v) {
      H.jugg = k; H.jk = 0; broadcastState();
      toast('♛ ' + killerName + ' slew the Juggernaut!');
    } else if (k && k === H.jugg) {
      H.jk++;
      if (H.jk >= JUGG_KILLS) { hostEnd(H.jugg); return; }
      broadcastState();
    }
  }
}

/* ----- client apply ----- */
function applyState(d, from) {
  if (!d || typeof d !== 'object') return;
  if (from !== myId()) {
    /* only the host drives mode state */
    try { var n = net(); if (!n || !n.active || from !== n.hostId) return; } catch (e) { return; }
  }
  lastState = d;
  if (d.m && d.m !== lastMode) {
    onModeStart(d.m);
    lastMode = d.m;
  }
  if (d.m === 'koth') { ensureRing(d.hill); applyKothHud(d); }
  else if (d.m === 'infected') { applyInfected(d); }
  else if (d.m === 'jugg') { applyJugg(d); }
  else { clearModeFx(); }
  if (Array.isArray(d.walls)) reconcileWalls(d.walls);
  updateModeHud(d);
}
function onModeStart(m) {
  clearModeFx();
  clearBuffs();
  if (m === 'ffa') return;
  var label = m === 'koth' ? '♛ KING OF THE HILL — hold the gold ring!' : m === 'infected' ? '☣ INFECTED — survive!' : '♛ JUGGERNAUT — first blood takes the crown!';
  toast(label, 4);
  try {
    var g = game();
    if (g && g.hud && typeof g.hud.message === 'function') g.hud.message(label.split('—')[0].trim(), 'party mode', 3);
  } catch (e) {}
  beep(660, 0.12, 0); beep(880, 0.16, 0.12);
}
function ensureRing(hill) {
  try {
    if (!T || !game() || !game().ctx || !game().ctx.scene) return;
    if (ringObjs.length) return;
    var h = hill || hillCenter();
    var scene = game().ctx.scene;
    var y = (h[1] || 0) + 0.25;
    var ring = new T.Mesh(new T.TorusGeometry(KOTH_R, 0.18, 10, 48),
      new T.MeshBasicMaterial({ color: 0xffc21c }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(h[0], y, h[2]);
    var beam = new T.Mesh(new T.CylinderGeometry(0.7, 0.7, 9, 12, 1, true),
      new T.MeshBasicMaterial({ color: 0xffc21c, transparent: true, opacity: 0.22, side: T.DoubleSide, depthWrite: false }));
    beam.position.set(h[0], y + 4.5, h[2]);
    scene.add(ring); scene.add(beam);
    ringObjs = [ring, beam];
  } catch (e) {}
}
function applyKothHud() { /* points shown in mode HUD */ }
function applyInfected(d) {
  try {
    var me = myId();
    var iAm = d.inf && d.inf.indexOf(me) !== -1;
    setVig(iAm ? 'inf' : '');
    if (iAm) {
      window.__ddSpeedMul = 1.15;
      /* blade-only: yank back to the blade if they swap away */
      var g = game();
      if (g && g.player && g.player.weapons && typeof g.player.switchTo === 'function') {
        var P = g.player;
        var cur = P.weapons[P.weaponIndex];
        if (cur && cur.kind !== 'katana' && P.katanaIndex != null && !P._ddInfLock) {
          P._ddInfLock = true;
          setTimeout(function () { try { P._ddInfLock = false; } catch (e) {} }, 1500);
          try { P.switchTo(P.katanaIndex); toast('☣ INFECTED — blade only!'); } catch (e) {}
        }
      }
    } else {
      if (window.__ddSpeedMul === 1.15) window.__ddSpeedMul = 1;
    }
    syncMarkers(d.inf || [], 0xff2233);
  } catch (e) {}
}
function applyJugg(d) {
  try {
    var me = myId();
    var iAm = d.j && d.j === me;
    setVig(iAm ? 'jugg' : '');
    var g = game(), P = g && g.player;
    if (iAm && P) {
      window.__ddDmgMul = 1.25;
      window.__ddSpeedMul = 1;
      if (!origMaxHp) origMaxHp = P.maxHp || 110;
      var want = Math.round(origMaxHp * 3);
      if (P.maxHp !== want) { P.maxHp = want; P.hp = want; toast('♛ JUGGERNAUT — ' + want + ' HP!'); }
    } else {
      if (window.__ddDmgMul === 1.25) window.__ddDmgMul = 1;
      if (P && origMaxHp && P.maxHp !== origMaxHp) { P.maxHp = origMaxHp; P.hp = Math.min(P.hp, origMaxHp); }
    }
    /* scale + crown the jugg remote for everyone */
    var ids = d.j ? [d.j] : [];
    syncMarkers(ids, 0xffc21c);
    try {
      var r = remotes();
      if (r && typeof r.values === 'function') {
        Array.from(r.values()).forEach(function (rp) {
          if (!rp || !rp.root || !rp.root.scale) return;
          var s = (d.j && rp.id === d.j) ? 1.3 : 1;
          if (rp.root.scale.x !== s) rp.root.scale.set(s, s, s);
        });
      }
    } catch (e) {}
  } catch (e) {}
}
function syncMarkers(ids, color) {
  try {
    if (!T || !game() || !game().ctx || !game().ctx.scene) return;
    var scene = game().ctx.scene;
    var want = {};
    (ids || []).forEach(function (id) { if (id !== myId()) want[id] = true; });
    Object.keys(markerMap).forEach(function (id) {
      if (!want[id]) { try { scene.remove(markerMap[id]); } catch (e) {} delete markerMap[id]; }
    });
    Object.keys(want).forEach(function (id) {
      if (markerMap[id]) return;
      try {
        var m = new T.Mesh(new T.OctahedronGeometry(0.3),
          new T.MeshBasicMaterial({ color: color, wireframe: true }));
        scene.add(m);
        markerMap[id] = m;
      } catch (e) {}
    });
    /* snap positions (poll refreshes) */
    Object.keys(markerMap).forEach(function (id) {
      try {
        var p = playerPos(id);
        if (p) markerMap[id].position.set(p.x, p.y + 2.2, p.z);
        else { scene.remove(markerMap[id]); delete markerMap[id]; }
      } catch (e) {}
    });
  } catch (e) {}
}
function setVig(kind) {
  try {
    var v = $('dd-vig');
    if (!v) { v = document.createElement('div'); v.id = 'dd-vig'; document.body.appendChild(v); }
    v.className = kind ? ('dd-vig-' + kind) : '';
  } catch (e) {}
}
function clearModeFx() {
  try {
    var g = game();
    if (g && g.ctx && g.ctx.scene) {
      ringObjs.forEach(function (m) { try { g.ctx.scene.remove(m); } catch (e) {} });
      Object.keys(markerMap).forEach(function (id) { try { g.ctx.scene.remove(markerMap[id]); } catch (e) {} });
    }
  } catch (e) {}
  ringObjs = []; markerMap = {};
  setVig('');
  var hud = $('dd-mode-hud');
  if (hud) hud.style.display = 'none';
  /* restore jugg-scaled remotes */
  try {
    var r = remotes();
    if (r && typeof r.values === 'function') {
      Array.from(r.values()).forEach(function (rp) {
        if (rp && rp.root && rp.root.scale) rp.root.scale.set(1, 1, 1);
      });
    }
  } catch (e) {}
}
function clearBuffs() {
  try {
    if (window.__ddSpeedMul && window.__ddSpeedMul !== 1) window.__ddSpeedMul = 1;
    if (window.__ddDmgMul && window.__ddDmgMul !== 1) window.__ddDmgMul = 1;
    var g = game(), P = g && g.player;
    if (P && origMaxHp && P.maxHp !== origMaxHp) { P.maxHp = origMaxHp; P.hp = Math.min(P.hp, origMaxHp); }
  } catch (e) {}
  origMaxHp = 0;
}
function updateModeHud(d) {
  try {
    var hud = $('dd-mode-hud');
    if (!hud) { hud = document.createElement('div'); hud.id = 'dd-mode-hud'; document.body.appendChild(hud); }
    if (!d || d.m === 'ffa' || !inMatch()) { hud.style.display = 'none'; return; }
    hud.style.display = 'block';
    var html = '';
    if (d.m === 'koth') {
      var lead = null, lb = -1;
      Object.keys(d.pts || {}).forEach(function (id) {
        if (d.pts[id] > lb) { lb = d.pts[id]; lead = id; }
      });
      var mine = (d.pts && d.pts[myId()]) || 0;
      html = '♛ HILL ' + mine + '/' + KOTH_PTS + (lead ? ' · 👑 ' + esc(nameOf(lead)) + ' ' + lb : '');
    } else if (d.m === 'infected') {
      var nInf = (d.inf || []).length;
      var nAll = allIds().length;
      var t = d.t != null ? d.t : 0;
      html = '☣ ' + nInf + ' infected · ' + Math.max(0, nAll - nInf) + ' left · ' + fmtT(t);
    } else if (d.m === 'jugg') {
      var t2 = d.t != null ? d.t : 0;
      html = '♛ ' + (d.j ? esc(nameOf(d.j)) : '—') + ' ' + (d.jk || 0) + '/' + JUGG_KILLS + ' · ' + fmtT(t2);
    }
    if (hud._last !== html) { hud._last = html; hud.innerHTML = html; }
  } catch (e) {}
}
function fmtT(s) {
  s = Math.max(0, s | 0);
  return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
}
/* natural match end while a mode runs: crown the mode champion for challenges */
function onMatchEndNatural() {
  try {
    var d = lastState;
    var champ = null;
    if (d && d.m === 'koth' && d.pts) {
      var lb = -1;
      Object.keys(d.pts).forEach(function (id) { if (d.pts[id] > lb) { lb = d.pts[id]; champ = id; } });
    } else if (d && d.m === 'infected' && d.inf) {
      var surv = allIds().filter(function (id) { return d.inf.indexOf(id) === -1; });
      champ = topKills(surv.length ? surv : (d.zero ? [d.zero] : allIds()));
    } else if (d && d.m === 'jugg') {
      champ = d.j || topKills(allIds());
    }
    if (champ) emit('dd-mode-win', { win: champ === myId(), winner: nameOf(champ) });
  } catch (e) {}
  clearBuffs();
}

/* ---------------- §3 sketch-wall (B) ---------------- */
var WALL_CD = 12, WALL_HP = 60, WALL_LIFE = 25;
var wallCdUntil = 0;
var pendingPred = null;   /* {mesh, box} predicted wall awaiting host id */
var pendingReq = 0;
var myReqIds = {};

function kit() { try { return window.__ddKit || null; } catch (e) { return null; } }
function breakables() {
  try { var g = game(); return (g && g.level && g.level.breakables) || null; } catch (e) { return null; }
}
function wallEntries() {
  var out = [];
  try {
    var b = breakables();
    if (b) for (var i = 0; i < b.length; i++) if (b[i] && b[i].kind === 'wall') out.push(b[i]);
  } catch (e) {}
  return out;
}
function buildWallMesh(w, h, d) {
  var grp = new T.Group();
  var fill = new T.Mesh(new T.BoxGeometry(w, h, d),
    new T.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.55 }));
  fill.position.y = h / 2;
  var edge = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(w, h, d)),
    new T.LineBasicMaterial({ color: 0x1a30c0 }));
  edge.position.y = h / 2;
  grp.add(fill); grp.add(edge);
  return grp;
}
function wallDims(axis) { return axis === 'x' ? [4, 3, 0.5] : [0.5, 3, 4]; }
function placeWall() {
  try {
    var now = performance.now();
    if (now < wallCdUntil) { toast('Sketch-wall recharging…'); return false; }
    if (!inMatch()) return false;
    var g = game(), P = g && g.player;
    if (!P || !P.alive || !P.center) return false;
    var k = kit();
    if (!k || typeof k.breakable !== 'function' || !T) { toast('Walls need the v3.2 engine — refresh!'); return false; }
    var fx = 0, fz = -1;
    try {
      if (P.forward) { fx = P.forward.x; fz = P.forward.z; }
      else { fx = -Math.sin(P.yaw || 0); fz = -Math.cos(P.yaw || 0); }
      var l = Math.hypot(fx, fz) || 1; fx /= l; fz /= l;
    } catch (e) {}
    var axis = Math.abs(fx) > Math.abs(fz) ? 'x' : 'z';
    var feet = 0;
    try { feet = (P.body && P.body.pos && P.body.pos.y) || 0; } catch (e) {}
    var x = Math.round((P.center.x + fx * 3) * 10) / 10;
    var z = Math.round((P.center.z + fz * 3) * 10) / 10;
    var y = Math.round(feet * 10) / 10;
    wallCdUntil = now + WALL_CD * 1000;
    if (!isOnline()) {
      insertWallReal(-((H && H.wseq) ? H.wseq++ : (wallSoloSeq++)), x, y, z, axis, performance.now(), 0);
      afterPlace(true);
      return true;
    }
    /* online: predict locally, host assigns the real id */
    var req = ++pendingReq;
    myReqIds[req] = true;
    predictWall(x, y, z, axis);
    send('ddwall', { req: req, x: x, y: y, z: z, axis: axis });
    setTimeout(function () {
      /* host never answered (left?) — drop the prediction */
      if (myReqIds[req]) { delete myReqIds[req]; removePrediction(); }
    }, 6000);
    afterPlace(true);
    return true;
  } catch (e) { return false; }
}
var wallSoloSeq = 1;
function afterPlace(ok) {
  if (ok) { beep(520, 0.1, 0); beep(780, 0.12, 0.08); emit('dd-wall', { placed: true }); }
}
function predictWall(x, y, z, axis) {
  try {
    removePrediction();
    var k = kit(), dims = wallDims(axis);
    var mesh = buildWallMesh(dims[0], dims[1], dims[2]);
    mesh.position.set(x, y, z);
    game().ctx.scene.add(mesh);
    var fake = { alive: true, hp: WALL_HP, kind: 'wall', id: -1, group: mesh, pos: new T.Vector3(x, y + dims[1] / 2, z), _pred: true };
    var box = k.collider(x, y, z, dims[0], dims[1], dims[2], { noNav: true });
    box.data.breakable = fake;
    fake.box = box;
    pendingPred = { mesh: mesh, box: box, fake: fake };
  } catch (e) {}
}
function removePrediction() {
  try {
    if (!pendingPred) return;
    var g = game();
    if (g && g.world && typeof g.world.removeBox === 'function') {
      try { g.world.removeBox(pendingPred.box); } catch (e) {}
    }
    if (g && g.ctx && g.ctx.scene) {
      try { g.ctx.scene.remove(pendingPred.mesh); } catch (e) {}
    }
  } catch (e) {}
  pendingPred = null;
}
/* insert a REAL native wall, keeping hid-sorted order among walls so array
   indices (used by brk sync) stay aligned on every client */
function insertWallReal(hid, x, y, z, axis, t0, req) {
  try {
    var k = kit(), b = breakables();
    if (!k || !b || !T) return null;
    var dims = wallDims(axis);
    var entry = k.breakable('wall', x, y, z, dims[0], dims[1], dims[2], function (at) {
      try {
        var m = buildWallMesh(dims[0], dims[1], dims[2]);
        at.add(m);
      } catch (e) {}
    }, { hp: WALL_HP });
    entry._hid = hid; entry._t0 = t0; entry._req = req || 0;
    sortWallsLocked();
    return entry;
  } catch (e) { return null; }
}
/* walls always trail the level breakables; keep that tail hid-sorted */
function sortWallsLocked() {
  try {
    var b = breakables();
    if (!b) return;
    var first = -1;
    for (var i = 0; i < b.length; i++) {
      if (b[i] && b[i].kind === 'wall') { first = i; break; }
    }
    if (first === -1) return;
    var tail = b.splice(first).filter(function (e) { return e && e.kind === 'wall'; });
    tail.sort(function (a, c) { return (a._hid || 0) - (c._hid || 0); });
    for (var j = 0; j < tail.length; j++) { b.push(tail[j]); tail[j].id = b.length - 1; }
  } catch (e) {}
}
function reconcileWalls(hostWalls) {
  try {
    var have = {};
    wallEntries().forEach(function (e) { have[e._hid] = e; });
    var wantOrder = hostWalls.map(function (w) { return w[0]; }).join(',');
    var haveOrder = wallEntries().map(function (e) { return e._hid; }).join(',');
    var changed = false;
    /* my prediction confirmed? swap it for the real thing */
    for (var i = 0; i < hostWalls.length; i++) {
      var w = hostWalls[i];
      if (w[6] && myReqIds[w[6]]) {
        delete myReqIds[w[6]];
        removePrediction();
      }
      if (!have[w[0]]) {
        insertWallReal(w[0], w[1], w[2], w[3], w[4] === 'x' ? 'x' : 'z', w[5], w[6] || 0);
        changed = true;
      }
    }
    if (changed || wantOrder !== haveOrder) sortWallsLocked();
    expireWalls(lastState && lastState.now != null ? lastState.now : performance.now(), true);
  } catch (e) {}
}
function expireWalls(hostNow, useHostClock) {
  try {
    var now = (useHostClock && hostNow != null) ? hostNow : performance.now();
    wallEntries().forEach(function (e) {
      if (e.alive && e._t0 && now - e._t0 > WALL_LIFE * 1000) killWallEntry(e);
    });
  } catch (e) {}
}
/* tombstone: keep the array slot (indices stay aligned), drop box + mesh */
function killWallEntry(e) {
  try {
    e.alive = false;
    var g = game();
    if (g && g.world && typeof g.world.removeBox === 'function' && e.box) {
      try { g.world.removeBox(e.box); } catch (e2) {}
    }
    if (g && g.ctx && g.ctx.scene && e.group) {
      try { g.ctx.scene.remove(e.group); } catch (e3) {}
    }
  } catch (e4) {}
}
function onWallNet(d) {
  if (!d || typeof d !== 'object') return;
  if (isHost() && d.req && inMatch() && isOnline()) {
    hostEnsure();
    var hid = H.wseq++;
    H.walls.push([hid, d.x || 0, d.y || 0, d.z || 0, d.axis === 'x' ? 'x' : 'z', performance.now(), d.req]);
    broadcastState();
  }
}

/* ---------------- §4 hats ---------------- */
var HATS = ['none', 'halo', 'crown', 'antenna', 'party'];
var HAT_LABEL = { none: 'NONE', halo: 'HALO', crown: 'CROWN', antenna: 'ANTENNA', party: 'PARTY CONE' };
function getHat() {
  try { return localStorage.getItem('doodle_hat') || 'none'; } catch (e) { return 'none'; }
}
function weeklyEverDone() {
  try {
    var st = storeGet('doodle_challenges_v1', null);
    return !!(st && st.done && st.done.some(function (k) { return String(k).indexOf('w:') === 0; }));
  } catch (e) { return false; }
}
function hatUnlocked(h) {
  if (h === 'crown') return weeklyEverDone();
  return true;
}
function setHat(h) {
  if (HATS.indexOf(h) === -1) h = 'none';
  if (!hatUnlocked(h)) { toast('♛ CROWN unlocks by finishing a weekly challenge!'); return false; }
  try { localStorage.setItem('doodle_hat', h); } catch (e) {}
  sendHat();
  toast('Hat: ' + HAT_LABEL[h] + (h === 'none' ? '' : ' (others see it online)'));
  return true;
}
function sendHat() {
  if (isOnline() && inMatch()) send('ddhat', { hat: getHat() });
}
var pendingHats = {};
function applyHat(d, from) {
  if (!d || typeof d.hat !== 'string' || HATS.indexOf(d.hat) === -1) return;
  if (!from || from === myId()) return;
  try {
    var r = remotes();
    var rp = r && typeof r.get === 'function' ? r.get(from) : null;
    if (!rp || !rp.parts || !rp.parts.head) { pendingHats[from] = d.hat; return; }
    attachHat(rp, d.hat);
  } catch (e) { pendingHats[from] = d.hat; }
}
function attachHat(rp, hat) {
  try {
    if (!T || !rp || !rp.parts || !rp.parts.head) return;
    var head = rp.parts.head;
    if (rp._ddHat) { try { head.remove(rp._ddHat); } catch (e) {} rp._ddHat = null; }
    if (!hat || hat === 'none') return;
    var grp = new T.Group();
    if (hat === 'halo') {
      var halo = new T.Mesh(new T.TorusGeometry(0.3, 0.05, 8, 24),
        new T.MeshBasicMaterial({ color: 0xffd94d }));
      halo.rotation.x = Math.PI / 2;
      grp.add(halo);
      grp.position.y = 0.62;
      grp._spin = true;
    } else if (hat === 'crown') {
      var cw = new T.Mesh(new T.CylinderGeometry(0.2, 0.24, 0.2, 8),
        new T.MeshBasicMaterial({ color: 0xffc21c }));
      cw.position.y = 0.1;
      grp.add(cw);
      for (var i = 0; i < 5; i++) {
        var sp = new T.Mesh(new T.ConeGeometry(0.05, 0.14, 6),
          new T.MeshBasicMaterial({ color: 0xffc21c }));
        var a = (i / 5) * Math.PI * 2;
        sp.position.set(Math.cos(a) * 0.18, 0.26, Math.sin(a) * 0.18);
        grp.add(sp);
      }
      var gem = new T.Mesh(new T.SphereGeometry(0.05, 8, 6),
        new T.MeshBasicMaterial({ color: 0xe33d2e }));
      gem.position.set(0, 0.12, 0.22);
      grp.add(gem);
      grp.position.y = 0.42;
    } else if (hat === 'antenna') {
      var stalk = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.5, 6),
        new T.MeshBasicMaterial({ color: 0x22222a }));
      stalk.position.y = 0.25;
      var ball = new T.Mesh(new T.SphereGeometry(0.08, 10, 8),
        new T.MeshBasicMaterial({ color: 0xe33d2e }));
      ball.position.y = 0.53;
      grp.add(stalk); grp.add(ball);
      grp.position.y = 0.4;
    } else if (hat === 'party') {
      var cone = new T.Mesh(new T.ConeGeometry(0.22, 0.42, 12),
        new T.MeshBasicMaterial({ color: 0xf06292 }));
      cone.position.y = 0.21;
      cone.rotation.z = 0.18;
      var pom = new T.Mesh(new T.SphereGeometry(0.07, 8, 6),
        new T.MeshBasicMaterial({ color: 0xffffff }));
      pom.position.set(-0.07, 0.44, 0);
      grp.add(cone); grp.add(pom);
      grp.position.y = 0.42;
    }
    head.add(grp);
    rp._ddHat = grp;
  } catch (e) {}
}
function hatsPoll() {
  try {
    var keys = Object.keys(pendingHats);
    if (!keys.length) return;
    var r = remotes();
    keys.forEach(function (id) {
      try {
        var rp = r && typeof r.get === 'function' ? r.get(id) : null;
        if (rp && rp.parts && rp.parts.head) { attachHat(rp, pendingHats[id]); delete pendingHats[id]; }
      } catch (e) {}
    });
  } catch (e) {}
  /* spin halos */
  try {
    var r2 = remotes();
    if (r2 && typeof r2.values === 'function') {
      Array.from(r2.values()).forEach(function (rp) {
        if (rp && rp._ddHat && rp._ddHat._spin) rp._ddHat.rotation.y += 0.06;
      });
    }
  } catch (e) {}
}

/* ---------------- §5 dual-wield visual ---------------- */
function dualWanted() {
  try {
    var L = storeGet('doodle_loadout_stats', null);
    return !!(L && L.rifle && L.rifle.dual);
  } catch (e) { return false; }
}
function dualPoll() {
  try {
    var g = game();
    var P = g && g.player;
    if (!P || !P.weapons || !inMatch()) return;
    var want = dualWanted();
    for (var i = 0; i < P.weapons.length; i++) {
      (function (w) {
        if (!w || !w.root) return;
        var isRifle = w.kind === 'rifle' || (w.name || '').indexOf('DUAL') !== -1;
        if (want && isRifle && w.kind === 'rifle') {
          if (!w._ddDual && T) {
            try {
              var c = w.root.clone(true);
              c.position.x -= 0.3;
              /* cloned flash would freeze mid-pose — hide it, main flash reads fine */
              c.traverse(function (o) {
                try {
                  if (o === c) return;
                  if (w.flash && o.geometry === w.flash.geometry) o.visible = false;
                } catch (e) {}
              });
              w.root.parent.add(c);
              w._ddDual = c;
            } catch (e) {}
          }
        }
        if (w._ddDual) {
          var cur = P.weapons[P.weaponIndex];
          w._ddDual.visible = (cur === w) && want && w.kind === 'rifle';
        }
      })(P.weapons[i]);
    }
  } catch (e) {}
}

/* solo KOTH vs waves: hold the ring uncontested to bank points */
var soloKothPts = 0;
function soloKothTick() {
  if (!inMatch() || isOnline()) return;
  if (partyMode() !== 'koth') return;
  try {
    var H0 = hillCenter();
    ensureRing(H0);
    var g = game(), P = g && g.player;
    var inside = false;
    if (P && P.alive && P.center) {
      var dx = P.center.x - H0[0], dz = P.center.z - H0[2];
      inside = (dx * dx + dz * dz <= KOTH_R * KOTH_R);
    }
    var contested = false;
    if (inside && g && g.enemies && g.enemies.enemies) {
      for (var i = 0; i < g.enemies.enemies.length; i++) {
        var e = g.enemies.enemies[i];
        if (e && e.alive && e.center) {
          var ex = e.center.x - H0[0], ez = e.center.z - H0[2];
          if (ex * ex + ez * ez <= (KOTH_R + 3) * (KOTH_R + 3)) { contested = true; break; }
        }
      }
    }
    if (inside && !contested) {
      soloKothPts++;
      if (soloKothPts >= KOTH_PTS) {
        soloKothPts = 0;
        toast('\uD83D\uDC51 HILL HELD \u2014 KOTH CHAMPION! (+150 XP)', 4);
        try {
          var p = storeGet('doodle_profile_v1', null) || {};
          p.xp = (p.xp || 0) + 150;
          storeSet('doodle_profile_v1', p);
        } catch (e) {}
        beep(660, 0.12, 0); beep(880, 0.12, 0.1); beep(1174, 0.2, 0.2);
        emit('dd-mode-win', { win: true, winner: myName() });
      }
    }
    lastMode = 'koth';
    var pp = {};
    pp[myId()] = soloKothPts;
    updateModeHud({ m: 'koth', pts: pp });
  } catch (e) {}
}

/* ---------------- boot ---------------- */
function waitForGame(tries) {
  if (window.__game && window.__game.player && window.__game.net) { boot(); return; }
  if (tries <= 0) { log('game API not found, giving up'); return; }
  setTimeout(function () { waitForGame(tries - 1); }, 250);
}
function boot() {
  if (booted) return;
  booted = true;

  /* net handlers (dd-party may also route these — both call the same apply) */
  try {
    var n = net();
    if (n && typeof n.on === 'function') {
      n.on('ddmode', function (d, from) { try { applyState(d, from); } catch (e) {} });
      n.on('ddhat', function (d, from) { try { applyHat(d, from); } catch (e) {} });
      n.on('ddwall', function (d) { try { onWallNet(d); } catch (e) {} });
    }
  } catch (e) {}

  /* host tick + client poll */
  setInterval(function () {
    try { hostTick(); } catch (e) {}
    try { soloKothTick(); } catch (e) {}
    try {
      if (inMatch()) {
        /* refresh marker + ring pulses */
        Object.keys(markerMap).forEach(function (id) {
          try {
            var p = playerPos(id);
            if (p) markerMap[id].position.set(p.x, p.y + 2.2, p.z);
          } catch (e) {}
        });
        if (ringObjs[0]) { try { ringObjs[0].rotation.z += 0.01; } catch (e) {} }
        expireWalls(lastState && lastState.now != null ? lastState.now : performance.now(), !!lastState);
        dualPoll();
      }
      hatsPoll();
    } catch (e) {}
  }, 500);
  /* rebroadcast hat for late joiners */
  setInterval(function () { try { sendHat(); } catch (e) {} }, 10000);

  /* feed kills → host transitions */
  window.addEventListener('dd-kill', function (ev) {
    try {
      var d = ev.detail || {};
      if (d.killer && d.victim) ingestKill(d.killer, d.victim);
    } catch (e) {}
  });
  /* match edges */
  window.addEventListener('dd-match-start', function () {
    try {
      _mk++;
      H = null;
      soloKothPts = 0;
      clearModeFx();
      clearBuffs();
      sendHat();
      if (!isOnline() && partyMode() !== 'ffa' && partyMode() !== 'koth') {
        toast('☣ party modes need online rivals — FFA rules apply solo');
      }
    } catch (e) {}
  });
  window.addEventListener('dd-match-end', function () {
    try { onMatchEndNatural(); } catch (e) {}
    try { clearModeFx(); } catch (e) {}
    pendingPred = null;
  });

  /* B = sketch-wall (the engine ignores B, no capture needed) */
  document.addEventListener('keydown', function (e) {
    try {
      if (e.code !== 'KeyB' || e.repeat) return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (placeWall()) e.preventDefault();
    } catch (e2) {}
  });

  window.__ddModes = {
    version: '3.2.0',
    apply: applyState,
    onKill: function (k, v) { try { ingestKill(k, v); } catch (e) {} },
    state: function () { return lastState; },
    mode: function () { return lastMode; }
  };
  window.__ddHats = {
    apply: applyHat,
    set: setHat,
    get: getHat,
    list: function () {
      return HATS.map(function (h) { return { id: h, label: HAT_LABEL[h], locked: !hatUnlocked(h) }; });
    }
  };
  log('modes + walls + hats ready');
}

waitForGame(80);
})();
