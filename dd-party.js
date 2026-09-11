/* ============================================================
   Doodle District — Party Pack v3.2 (dd-party.js)
   Zero-bundle-risk fun layer. Reads the public window.__game API
   (player/hud/net/remote/scores/enemies/effects/ctx) and adds:
     §1 killfeed watcher → structured kill/death events
     §2 kill streaks (3 radar ping, 5 airstrike, 8 eraser volley)
     §3 death recap panel (killer · weapon · distance · tip)
     §4 mutator flags (low-grav / big-head; engine hooks read these)
     §5 GG emote (H): hop + chalk stamp
     §6 ink gun-skins (ink-colored lasers + grip accents)
     §7 client weather/fx (day/dusk/night/rain/snow overlays)
     §8 daily/weekly challenges with XP + unlock rewards
     §9 session + lifetime weapon stats (feeds the STATS tab)
     §10 match watcher → dispatches dd-match-start / dd-match-end
   Everything is guarded: if the engine shape drifts, each section
   fails silently and the game plays on.
   ============================================================ */
(function () {
'use strict';

/* ---------------- §0 utils ---------------- */
var booted = false;
var T = null; /* three, cached like dd-fixes does */
try { import('three').then(function (m) { T = m; }).catch(function () {}); } catch (e) {}

function log() { try { console.log.apply(console, ['[DD Party]'].concat([].slice.call(arguments))); } catch (e) {} }
function $(id) { try { return document.getElementById(id); } catch (e) { return null; } }
function game() { return window.__game || null; }
function storeGet(k, fb) {
  try { var v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); }
  catch (e) { return fb; }
}
function storeSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function toast(msg, secs) {
  try {
    if (window.__ddMenu && typeof window.__ddMenu.toast === 'function') {
      window.__ddMenu.toast(msg, secs || 3);
      return;
    }
  } catch (e) {}
  try {
    var g = game();
    if (g && g.hud && typeof g.hud.tip === 'function') g.hud.tip(String(msg));
  } catch (e2) {}
}
/* tiny synth blip for streaks (the engine synth is internal, so we roll our own) */
var AC = null;
function beep(freq, dur, delay, gain) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    var t = AC.currentTime + (delay || 0);
    var o = AC.createOscillator(), gn = AC.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(freq || 660, t);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(gain || 0.12, t + 0.02);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.15));
    o.connect(gn); gn.connect(AC.destination);
    o.start(t); o.stop(t + (dur || 0.15) + 0.05);
  } catch (e) {}
}
function fanfare(n) {
  var i;
  for (i = 0; i < n; i++) beep(520 + i * 160, 0.12, i * 0.09);
}
function inMatch() {
  try {
    var g = game();
    return !!(g && g.game && g.game.state === 'play');
  } catch (e) { return false; }
}
function matchMode() {
  try {
    var g = game();
    return (g && g.net && g.net.active) ? 'ffa' : 'solo';
  } catch (e) { return 'solo'; }
}
function myName() {
  try {
    var g = game();
    if (g && g.player && g.player.name) return g.player.name;
  } catch (e) {}
  try { return localStorage.getItem('doodle_name') || 'you'; }
  catch (e2) { return 'you'; }
}
function emit(name, detail) {
  try { window.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); } catch (e) {}
}

/* ---------------- §9 session + weapon stats ---------------- */
var session = {
  kills: 0, deaths: 0, streak: 0, best: 0,
  byWeapon: {}, matches: 0, wins: 0, headshots: 0
};
var lifeWeapons = storeGet('doodle_stats_weapons', {});

function canonWeapon(how) {
  if (!how) return 'unknown';
  var h = String(how).toLowerCase();
  if (h.indexOf('rocket') !== -1 || h === 'rk') return 'rocket';
  if (h.indexOf('grenade') !== -1 || h.indexOf('nade') !== -1) return 'grenade';
  if (h.indexOf('katana') !== -1 || h.indexOf('blade') !== -1 || h.indexOf('saber') !== -1 || h.indexOf('sabre') !== -1) return 'blade';
  if (h.indexOf('shotgun') !== -1 || h.indexOf('scatter') !== -1) return 'shotgun';
  if (h.indexOf('sniper') !== -1) return 'sniper';
  if (h.indexOf('rifle') !== -1) return 'rifle';
  if (h.indexOf('revolver') !== -1 || h.indexOf('pistol') !== -1) return 'revolver';
  if (h.indexOf('fall') !== -1) return 'fall';
  return h.slice(0, 18);
}

function recordKill(how, crit) {
  var w = canonWeapon(how);
  session.kills++;
  session.streak++;
  if (session.streak > session.best) session.best = session.streak;
  if (crit) session.headshots++;
  session.byWeapon[w] = (session.byWeapon[w] || 0) + 1;
  lifeWeapons[w] = (lifeWeapons[w] || 0) + 1;
  storeSet('doodle_stats_weapons', lifeWeapons);
  challengesOnKill(w, !!crit);
  checkStreak();
}

/* ---------------- §2 kill streaks ---------------- */
function hostiles() {
  /* [{pos:Vector3-like, name}] across solo enemies + ffa remotes */
  var out = [];
  try {
    var g = game();
    if (g && g.enemies && g.enemies.enemies) {
      g.enemies.enemies.forEach(function (e) {
        if (e && e.alive && e.center) out.push({ pos: e.center, name: e.name || e.kind || 'enemy' });
      });
    }
    if (g && g.remote && typeof g.remote.values === 'function') {
      Array.from(g.remote.values()).forEach(function (r) {
        if (r && r.alive !== false && r.center) out.push({ pos: r.center, name: r.name || 'rival' });
      });
    }
  } catch (e) {}
  return out;
}

function radarPing() {
  try {
    var g = game();
    if (!T || !g || !g.ctx || !g.ctx.scene) return false;
    var scene = g.ctx.scene;
    var marks = [];
    hostiles().slice(0, 24).forEach(function (h, i) {
      try {
        var geo = new T.OctahedronGeometry(0.28);
        var mat = new T.MeshBasicMaterial({ color: 0xff2233, wireframe: true });
        var m = new T.Mesh(geo, mat);
        m.position.set(h.pos.x, h.pos.y + 1.4, h.pos.z);
        scene.add(m);
        marks.push(m);
      } catch (e) {}
    });
    if (!marks.length) return false;
    var t0 = performance.now();
    (function pulse() {
      var k = (performance.now() - t0) / 3500;
      if (k >= 1) {
        marks.forEach(function (m) { try { scene.remove(m); } catch (e) {} });
        return;
      }
      var s = 1 + 0.35 * Math.sin(performance.now() / 90);
      marks.forEach(function (m) { try { m.scale.set(s, s, s); m.rotation.y += 0.08; } catch (e) {} });
      requestAnimationFrame(pulse);
    })();
    return true;
  } catch (e) { return false; }
}

function airStrike() {
  /* three free grenades with varied charges — real projectiles, so the
     engine owns damage/score/netcode exactly like a hand throw */
  try {
    var g = game();
    var P = g && g.player;
    if (!P || typeof P.throwGrenade !== 'function' || !P.alive) return false;
    P.grenades = (P.grenades || 0) + 3;
    var i = 0;
    var charges = [0.25, 0.55, 0.9];
    (function next() {
      if (i >= 3) return;
      try { P.throwGrenade(null, charges[i]); } catch (e) {}
      i++;
      setTimeout(next, 180);
    })();
    return true;
  } catch (e) { return false; }
}

function eraserVolley() {
  /* five free rockets downrange — consume=false spends no ammo */
  try {
    var g = game();
    var P = g && g.player;
    if (!P || typeof P.throwRocket !== 'function' || !P.alive) return false;
    var i = 0;
    (function next() {
      if (i >= 5) return;
      try { P.throwRocket(null, false); } catch (e) {}
      try { if (g.effects) g.effects.shakeAmt = Math.min(1.2, (g.effects.shakeAmt || 0) + 0.18); } catch (e2) {}
      i++;
      setTimeout(next, 160);
    })();
    return true;
  } catch (e) { return false; }
}

function announce(text, sub) {
  try {
    var g = game();
    if (g && g.hud) {
      if (typeof g.hud.message === 'function') g.hud.message(text, sub || '');
      else if (typeof g.hud.tip === 'function') g.hud.tip(text);
    }
  } catch (e) {}
  try {
    var g2 = game();
    if (g2 && g2.hud && typeof g2.hud.kill === 'function') g2.hud.kill(text, 0);
  } catch (e2) {}
}

function checkStreak() {
  var s = session.streak;
  if (s === 3) {
    if (radarPing()) {
      announce('RADAR PING', 'hostiles marked');
      toast('◉ RADAR PING — hostiles marked');
      fanfare(3);
    }
  } else if (s === 5) {
    if (airStrike()) {
      announce('DOODLE AIRSTRIKE', 'nades away!');
      toast('☄ DOODLE AIRSTRIKE — nades away!');
      fanfare(4);
    }
  } else if (s >= 8 && (s - 8) % 4 === 0) {
    if (eraserVolley()) {
      announce('THE ERASER', s + ' kill streak!');
      toast('✎ THE ERASER — ' + s + ' kill streak!');
      fanfare(5);
    }
  }
  emit('dd-streak', { streak: s });
}

/* ---------------- §1 killfeed watcher ---------------- */
function cleanFeedText(el) {
  var t = '';
  try { t = (el.textContent || '').replace(/\s+\+\d+\s*$/, '').trim(); } catch (e) {}
  return t;
}

function onFeedLine(text) {
  if (!text) return;
  var m, me = myName();
  /* my kill: "ERASED <victim> · <how>[ headshot]" */
  if ((m = text.match(/^ERASED (.+?)(?: \xB7 (.+?))?(?: headshot)?$/))) {
    var how = (m[2] || '').replace(/ headshot$/, '');
    var crit = /headshot$/.test(m[2] || '') || /headshot$/.test(text);
    recordKill(how, crit);
    emit('dd-kill', { killer: me, victim: m[1], how: how, crit: crit, mine: true });
    return;
  }
  /* someone else's kill: "<killer> erased <victim> · <how>" */
  if ((m = text.match(/^(.+?) erased (.+?)(?: \xB7 (.+?))?(?: headshot)?$/))) {
    emit('dd-kill', { killer: m[1], victim: m[2], how: (m[3] || '').replace(/ headshot$/, ''), mine: false });
    modeOnRemoteKill(m[1], m[2]);
    return;
  }
  /* my death: "erased by <killer> · <how]" */
  if ((m = text.match(/^erased by (.+?)(?: \xB7 (.+?))?(?: headshot)?$/))) {
    onMyDeath(m[1], (m[2] || '').replace(/ headshot$/, ''));
    return;
  }
  /* fell: "fell off the page · -1 kill" */
  if (text.indexOf('fell off the page') !== -1) {
    onMyDeath('the page', 'fall');
    return;
  }
}

var feedObs = null;
function watchFeed() {
  var kf = $('killfeed');
  if (!kf) return false;
  if (feedObs) return true;
  try {
    feedObs = new MutationObserver(function (muts) {
      muts.forEach(function (mu) {
        mu.addedNodes.forEach(function (n) {
          try { onFeedLine(cleanFeedText(n)); } catch (e) {}
        });
      });
    });
    feedObs.observe(kf, { childList: true });
    log('feed watcher on');
    return true;
  } catch (e) { return false; }
}

function onMyDeath(killer, how) {
  session.deaths++;
  session.streak = 0;
  emit('dd-death', { killer: killer, how: how });
  showRecap(killer, how);
}

/* ---------------- §3 death recap ---------------- */
var RECAP_TIPS = [
  'Strafing beats backpedaling — never run in a straight line.',
  'Rockets one-tap barrels. Barrels one-tap groups.',
  'Grapple up (Q/E) and shoot down — the high ground is real.',
  'Cook a grenade (hold G) so it bursts on arrival.',
  'Low on rockets? F spends the launcher mag first.',
  'Aim for the head — headshots crit for big damage.',
  'Reload behind cover. Dying with 0 in the mag is a tragedy.',
  'The radar ping marks hostiles through walls. Streaks save lives.'
];
function killerPos(name) {
  try {
    var g = game();
    if (g && g.remote && typeof g.remote.values === 'function') {
      var rs = Array.from(g.remote.values());
      for (var i = 0; i < rs.length; i++) {
        if (rs[i] && rs[i].name === name && rs[i].center) return rs[i].center;
      }
    }
    if (g && g.enemies && g.enemies.enemies) {
      var best = null, bd = 1e9;
      var pc = g.player && g.player.center;
      g.enemies.enemies.forEach(function (e) {
        if (e && e.alive && e.center && pc) {
          var d = e.center.distanceTo(pc);
          if (d < bd) { bd = d; best = e.center; }
        }
      });
      if (best) return best;
    }
  } catch (e) {}
  return null;
}
var recapTimer = null;
function showRecap(killer, how) {
  try {
    var old = $('dd-recap');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    if (recapTimer) clearTimeout(recapTimer);
    var g = game();
    var dist = '?';
    try {
      var kp = killerPos(killer);
      var pc = g && g.player && g.player.center;
      if (kp && pc && typeof kp.distanceTo === 'function') dist = Math.round(kp.distanceTo(pc)) + 'm';
    } catch (e) {}
    var w = canonWeapon(how);
    var wLabel = { rocket: 'ROCKET', grenade: 'GRENADE', blade: 'BLADE', shotgun: 'SHOTGUN', sniper: 'SNIPER', rifle: 'RIFLE', revolver: 'REVOLVER', fall: 'GRAVITY' }[w] || String(how || '?').toUpperCase();
    var tip = RECAP_TIPS[Math.floor(Math.random() * RECAP_TIPS.length)];
    var div = document.createElement('div');
    div.id = 'dd-recap';
    div.innerHTML =
      '<div class="dd-recap-kicker">YOU GOT ERASED</div>' +
      '<div class="dd-recap-main">by <b>' + escapeHtml(killer) + '</b> · ' + escapeHtml(wLabel) + ' · ' + escapeHtml(dist) + '</div>' +
      '<div class="dd-recap-tip">✎ ' + escapeHtml(tip) + '</div>';
    document.body.appendChild(div);
    recapTimer = setTimeout(function () {
      try { if (div.parentNode) div.parentNode.removeChild(div); } catch (e) {}
    }, 5000);
  } catch (e) {}
}
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* ---------------- §4 mutators ---------------- */
var MUT_KEY = 'doodle_mutators_v1';
function getMutators() {
  var m = storeGet(MUT_KEY, null) || {};
  return {
    lowgrav: !!m.lowgrav,
    bighead: !!m.bighead
  };
}
function setMutator(k, v) {
  var m = getMutators();
  m[k] = !!v;
  storeSet(MUT_KEY, m);
  applyMutators();
  toast((k === 'lowgrav' ? 'Low gravity ' : 'Big heads ') + (v ? 'ON — party time!' : 'OFF'));
  emit('dd-mutator', { key: k, value: !!v });
}
function pushMutatorFlags() { applyMutators(); }
function applyMutators() {
  var m = getMutators();
  window.__ddLowGrav = m.lowgrav;
  window.__ddBigHead = m.bighead;
  /* low-grav rides the engine's own gravityScale (client-side fun) */
  try {
    var g = game();
    if (g && g.player) g.player.gravityScale = m.lowgrav ? 0.35 : 1;
  } catch (e) {}
  applyBigHead(m.bighead);
}
/* big-head scales every visible head (rivals + enemies). The local player
   is first-person, so there is no local head to scale — but everyone with
   the mutator on sees everyone else's glorious cranium. */
function applyBigHead(on) {
  var s = on ? 1.9 : 1;
  try {
    var g = game();
    if (!g) return;
    /* brand-new spawns may not have parts yet — (re)applied every poll */
    if (window.__ddBigHeadApplied === s) return;
    function fix(o) {
      try {
        var h = o && ((o.parts && o.parts.head) || o.head);
        if (h && h.scale) h.scale.set(s, s, s);
      } catch (e) {}
    }
    if (g.remote && typeof g.remote.values === 'function') Array.from(g.remote.values()).forEach(fix);
    if (g.enemies && g.enemies.enemies) g.enemies.enemies.forEach(fix);
    window.__ddBigHeadApplied = s;
  } catch (e) {}
}

/* ---------------- §5 GG emote (H) ---------------- */
var emoteCdUntil = 0;
var GG_TEXTURE = null;
function ggTexture() {
  if (GG_TEXTURE || !T) return GG_TEXTURE;
  try {
    var cv = document.createElement('canvas');
    cv.width = 256; cv.height = 128;
    var cx = cv.getContext('2d');
    cx.strokeStyle = '#1a30c0'; cx.lineWidth = 7;
    cx.beginPath();
    cx.ellipse(128, 64, 110, 48, 0, 0, Math.PI * 2);
    cx.stroke();
    cx.fillStyle = '#c81e5b';
    cx.font = 'bold 64px "Comic Sans MS", cursive';
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText('GG!', 128, 68);
    GG_TEXTURE = new T.CanvasTexture(cv);
  } catch (e) { GG_TEXTURE = null; }
  return GG_TEXTURE;
}
function doEmote() {
  try {
    var now = performance.now();
    if (now < emoteCdUntil) return false;
    if (!inMatch()) return false;
    var g = game();
    var P = g && g.player;
    if (!P || !P.alive) return false;
    emoteCdUntil = now + 3000;
    /* happy little hop */
    try { if (P.vel) P.vel.y = Math.max(P.vel.y || 0, 4.2); } catch (e) {}
    /* chalk stamp on the floor */
    try {
      if (T && g.ctx && g.ctx.scene && P.center) {
        var tex = ggTexture();
        if (tex) {
          var mat = new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
          var m = new T.Mesh(new T.PlaneGeometry(1.6, 0.8), mat);
          m.rotation.x = -Math.PI / 2;
          m.rotation.z = Math.random() * Math.PI * 2;
          m.position.set(P.center.x, 0.06, P.center.z);
          g.ctx.scene.add(m);
          var t0 = performance.now();
          (function fade() {
            var k = (performance.now() - t0) / 6000;
            if (k >= 1) { try { g.ctx.scene.remove(m); } catch (e) {} return; }
            try { mat.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3; } catch (e) {}
            requestAnimationFrame(fade);
          })();
        }
      }
    } catch (e) {}
    beep(880, 0.1, 0); beep(1174, 0.14, 0.1);
    return true;
  } catch (e) { return false; }
}

/* ---------------- §6 ink gun-skins ---------------- */
var INK_HEX = [0x2b6cff, 0xe33d2e, 0x22222a, 0xf08a1d, 0x2fae4e, 0xf06292];
var skinsOn = storeGet('doodle_inkskins', null);
if (skinsOn == null) skinsOn = true;
function weaponInk(w) {
  try {
    if (w && w.ink != null && INK_HEX[w.ink] != null) return INK_HEX[w.ink];
    if (w && w.mat && w.mat.uniforms && w.mat.uniforms.uInk) {
      var v = w.mat.uniforms.uInk.value | 0;
      if (INK_HEX[v] != null) return INK_HEX[v];
    }
  } catch (e) {}
  return INK_HEX[0];
}
function applyInkSkins() {
  if (!T) return;
  try {
    var g = game();
    var ws = g && g.player && g.player.weapons;
    if (!ws) return;
    ws.forEach(function (w) {
      if (!w || !w.root || w._ddSkin) return;
      try {
        var col = weaponInk(w);
        /* ink-colored laser beam */
        if (w._ddLaser && w._ddLaser.material && w._ddLaser.material.color) {
          w._ddLaser.material.color.setHex(skinsOn ? col : 0xff2222);
        }
        if (w._ddLaserDot && w._ddLaserDot.material && w._ddLaserDot.material.color) {
          w._ddLaserDot.material.color.setHex(skinsOn ? col : 0xff2222);
        }
        /* one accent stripe on the body — the actual "skin" */
        if (!w._ddAccent) {
          var stripe = new T.Mesh(
            new T.BoxGeometry(0.02, 0.012, 0.16),
            new T.MeshBasicMaterial({ color: col })
          );
          stripe.position.set(0, 0.055, -0.1);
          w.root.add(stripe);
          w._ddAccent = stripe;
        }
        w._ddAccent.visible = !!skinsOn;
        if (w._ddAccent.material && w._ddAccent.material.color) {
          w._ddAccent.material.color.setHex(col);
        }
        w._ddSkin = true;
      } catch (e) {}
    });
  } catch (e) {}
}
function setInkSkins(on) {
  skinsOn = !!on;
  storeSet('doodle_inkskins', skinsOn);
  try {
    var g = game();
    (g && g.player && g.player.weapons || []).forEach(function (w) { if (w) w._ddSkin = false; });
  } catch (e) {}
  applyInkSkins();
  toast('Ink gun-skins ' + (skinsOn ? 'ON' : 'OFF'));
}

/* ---------------- §7 client weather/fx ---------------- */
var WEATHERS = ['day', 'dusk', 'night', 'rain', 'snow'];
function getWeather() {
  try { return localStorage.getItem('doodle_weather') || 'day'; }
  catch (e) { return 'day'; }
}
function setWeather(id) {
  if (WEATHERS.indexOf(id) === -1) id = 'day';
  try { localStorage.setItem('doodle_weather', id); } catch (e) {}
  applyWeather();
  toast('Weather: ' + id.toUpperCase() + ' (client-side FX)');
  emit('dd-weather', { weather: id });
}
var precipRAF = 0, precipCv = null;
function stopPrecip() {
  try { if (precipRAF) cancelAnimationFrame(precipRAF); } catch (e) {}
  precipRAF = 0;
  try { if (precipCv && precipCv.parentNode) precipCv.parentNode.removeChild(precipCv); } catch (e) {}
  precipCv = null;
}
function startPrecip(kind) {
  stopPrecip();
  try {
    precipCv = document.createElement('canvas');
    precipCv.id = 'dd-precip';
    precipCv.width = window.innerWidth;
    precipCv.height = window.innerHeight;
    document.body.appendChild(precipCv);
    var cx = precipCv.getContext('2d');
    var N = kind === 'rain' ? 140 : 110;
    var ps = [];
    for (var i = 0; i < N; i++) {
      ps.push({ x: Math.random() * precipCv.width, y: Math.random() * precipCv.height,
        v: (kind === 'rain' ? 9 : 1.5) + Math.random() * (kind === 'rain' ? 7 : 2),
        r: 1 + Math.random() * (kind === 'rain' ? 1 : 2.2), w: Math.random() * 6.28 });
    }
    window.addEventListener('resize', function onRs() {
      if (!precipCv) { window.removeEventListener('resize', onRs); return; }
      precipCv.width = window.innerWidth; precipCv.height = window.innerHeight;
    });
    (function frame() {
      if (!precipCv) return;
      cx.clearRect(0, 0, precipCv.width, precipCv.height);
      if (kind === 'rain') {
        cx.strokeStyle = 'rgba(140,180,255,0.5)'; cx.lineWidth = 1.5;
        cx.beginPath();
        for (var j = 0; j < ps.length; j++) {
          var p = ps[j];
          cx.moveTo(p.x, p.y); cx.lineTo(p.x - 3, p.y + 14);
          p.y += p.v * 1.6; p.x -= 0.6;
          if (p.y > precipCv.height + 20) { p.y = -20; p.x = Math.random() * (precipCv.width + 100); }
        }
        cx.stroke();
      } else {
        cx.fillStyle = 'rgba(255,255,255,0.85)';
        for (var k = 0; k < ps.length; k++) {
          var q = ps[k];
          q.w += 0.02; q.y += q.v; q.x += Math.sin(q.w) * 0.6;
          if (q.y > precipCv.height + 10) { q.y = -10; q.x = Math.random() * precipCv.width; }
          cx.beginPath(); cx.arc(q.x, q.y, q.r, 0, 6.29); cx.fill();
        }
      }
      precipRAF = requestAnimationFrame(frame);
    })();
  } catch (e) {}
}
function applyWeather() {
  try {
    var w = getWeather();
    var ov = $('dd-weather');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'dd-weather';
      document.body.appendChild(ov);
    }
    ov.className = 'dd-wx-' + w;
    var c = $('c');
    if (c) c.style.filter = (w === 'night') ? 'brightness(0.62) saturate(0.85)' : '';
    if (w === 'rain' || w === 'snow') startPrecip(w);
    else stopPrecip();
  } catch (e) {}
}

/* ---------------- §8 challenges ---------------- */
/* metrics: kills, rocket, grenade, blade, streak, headshots, wins, wave, matches */
var CHAL_POOL = [
  { id: 'd_kills6', desc: 'Erase 6 doodles', metric: 'kills', target: 6, xp: 50 },
  { id: 'd_rockets2', desc: '2 rocket erasures', metric: 'rocket', target: 2, xp: 70 },
  { id: 'd_nades2', desc: '2 grenade erasures', metric: 'grenade', target: 2, xp: 70 },
  { id: 'd_blade3', desc: '3 blade erasures', metric: 'blade', target: 3, xp: 70 },
  { id: 'd_streak3', desc: 'Reach a 3 kill streak', metric: 'streak', target: 3, xp: 70 },
  { id: 'd_heads2', desc: '2 headshot erasures', metric: 'headshots', target: 2, xp: 80 },
  { id: 'd_win1', desc: 'Win 1 FFA match', metric: 'wins', target: 1, xp: 90 },
  { id: 'd_wave6', desc: 'Reach wave 6 in solo', metric: 'wave', target: 6, xp: 70 },
  { id: 'd_wall2', desc: 'Place 2 sketch-walls (B)', metric: 'walls', target: 2, xp: 60 },
  { id: 'd_sniper3', desc: '3 sniper erasures', metric: 'sniper', target: 3, xp: 70 }
];
var CHAL_WEEKLY = { id: 'w_erase50', desc: 'Erase 50 doodles', metric: 'kills', target: 50, xp: 300 };
function daySeed() {
  try {
    var d = new Date();
    return d.getFullYear() * 1000 + dayOfYear(d);
  } catch (e) { return 1; }
}
function dayOfYear(d) {
  var s = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - s) / 86400000);
}
function weekSeed() {
  try {
    var d = new Date();
    var one = new Date(d.getFullYear(), 0, 1);
    return d.getFullYear() * 100 + Math.floor(((d - one) / 86400000 + one.getDay() + 1) / 7);
  } catch (e) { return 1; }
}
function pickDaily() {
  var seed = daySeed(), out = [], pool = CHAL_POOL.slice();
  var s = seed;
  function rnd() { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}
function chalState() {
  var st = storeGet('doodle_challenges_v1', null) || {};
  if (st.day !== daySeed()) {
    st = { day: daySeed(), week: weekSeed(), d: {}, w: {}, done: st.done || [] };
  }
  if (st.week !== weekSeed()) { st.week = weekSeed(); st.w = {}; }
  st.d = st.d || {}; st.w = st.w || {}; st.done = st.done || [];
  return st;
}
function chalSave(st) { storeSet('doodle_challenges_v1', st); }
function grantXP(n) {
  try {
    var p = storeGet('doodle_profile_v1', null) || {};
    p.xp = (p.xp || 0) + n;
    storeSet('doodle_profile_v1', p);
  } catch (e) {}
}
function chalProgress(id, metric, target, scope) {
  var st = chalState();
  var bucket = scope === 'w' ? st.w : st.d;
  var cur = bucket[id] || 0;
  return { cur: cur, target: target, done: st.done.indexOf(scope + ':' + dayOrWeek(scope) + ':' + id) !== -1 };
}
function dayOrWeek(scope) { return scope === 'w' ? weekSeed() : daySeed(); }
function chalBump(metric, value) {
  try {
    var st = chalState();
    var changed = false;
    pickDaily().forEach(function (c) {
      if (c.metric !== metric) return;
      var nv = Math.max(st.d[c.id] || 0, value);
      if (nv !== st.d[c.id]) { st.d[c.id] = nv; changed = true; }
      chalMaybeDone(st, 'd', c);
    });
    if (CHAL_WEEKLY.metric === metric) {
      var wv = Math.max(st.w[CHAL_WEEKLY.id] || 0, value);
      if (wv !== st.w[CHAL_WEEKLY.id]) { st.w[CHAL_WEEKLY.id] = wv; changed = true; }
      chalMaybeDone(st, 'w', CHAL_WEEKLY);
    }
    if (changed) chalSave(st);
  } catch (e) {}
}
function chalMaybeDone(st, scope, c) {
  var key = scope + ':' + dayOrWeek(scope) + ':' + c.id;
  if (st.done.indexOf(key) !== -1) return;
  var cur = scope === 'w' ? (st.w[c.id] || 0) : (st.d[c.id] || 0);
  if (cur < c.target) return;
  st.done.push(key);
  chalSave(st);
  grantXP(c.xp);
  toast('★ CHALLENGE COMPLETE: ' + c.desc + ' (+' + c.xp + ' XP)', 4);
  fanfare(4);
  emit('dd-challenge', { id: c.id, desc: c.desc, xp: c.xp });
}
function challengesOnKill(weapon, crit) {
  chalBump('kills', session.kills);
  chalBump(weapon, session.byWeapon[weapon] || 0);
  if (crit) chalBump('headshots', session.headshots);
  chalBump('streak', session.best);
}
function challengesOnMatchEnd(info) {
  if (info.mode === 'ffa' && info.win) {
    session.wins++;
    var st = chalState();
    st.d.__winCount = (st.d.__winCount || 0) + 1;
    chalSave(st);
    chalBump('wins', st.d.__winCount);
  }
  if (info.mode === 'solo' && info.wave) chalBump('wave', info.wave);
  chalBump('matches', session.matches);
}
function challengeList() {
  var st = chalState();
  function row(scope, c) {
    var cur = scope === 'w' ? (st.w[c.id] || 0) : (st.d[c.id] || 0);
    var done = st.done.indexOf(scope + ':' + dayOrWeek(scope) + ':' + c.id) !== -1;
    return { id: c.id, desc: c.desc, cur: Math.min(cur, c.target), target: c.target, xp: c.xp, done: done };
  }
  return {
    daily: pickDaily().map(function (c) { return row('d', c); }),
    weekly: row('w', CHAL_WEEKLY)
  };
}

/* ---------------- §10 match watcher + mode hooks ---------------- */
var lastState = '', lastMode = '';
function myScoreEntry() {
  try {
    var g = game();
    if (g && g.scores && g.net && typeof g.scores.get === 'function') return g.scores.get(g.net.id) || null;
  } catch (e) {}
  return null;
}
function readWaveScore() {
  var wave = 0, score = 0;
  try {
    var g = game();
    if (g && g.game) {
      if (g.game.wave) wave = g.game.wave | 0;
      if (g.game.score) score = g.game.score | 0;
    }
  } catch (e) {}
  if (!wave) { try { wave = parseInt(($('wave') || {}).textContent || '0', 10) || 0; } catch (e) {} }
  return { wave: wave, score: score };
}
function detectWin() {
  /* ffa win = my kills top the scores table */
  try {
    var g = game();
    if (window.__ddModes && window.__ddModes.mode && window.__ddModes.mode() !== 'ffa') return false;
    if (!g || !g.scores || typeof g.scores.values !== 'function') return false;
    var mine = -1, best = -1;
    Array.from(g.scores.entries()).forEach(function (kv) {
      var k = (kv[1] && kv[1].kills) || 0;
      if (k > best) best = k;
      if (g.net && kv[0] === g.net.id) mine = k;
    });
    return mine >= 0 && mine >= best;
  } catch (e) { return false; }
}
function pollMatch() {
  var g = game();
  var st = '', mode = matchMode();
  try { st = g && g.game ? (g.game.state || '') : ''; } catch (e) {}
  if (st !== lastState || mode !== lastMode) {
    var prev = lastState;
    lastState = st; lastMode = mode;
    if (st === 'play' && prev !== 'play') onMatchStart(mode);
    if (st === 'over' && prev !== 'over') onMatchEnd(mode);
    if ((st === 'lobby' || st === 'menu' || st === '') && (prev === 'play' || prev === 'over')) onMatchLeave();
  }
  /* feed element is rebuilt with the HUD — (re)attach cheaply */
  try { watchFeed(); } catch (e) {}
  /* fresh spawns need their (big) heads — re-seat while playing */
  try {
    if (st === 'play') {
      window.__ddBigHeadApplied = -1;
      applyMutators();
    }
  } catch (e) {}
  /* re-apply cheap per-poll visuals (new weapons after loadout swap) */
  try {
    if (st === 'play') {
      applyInkSkins();
      /* lasers re-tint when ink changes (cheap: only when flag flips) */
      var ws = g && g.player && g.player.weapons;
      if (ws) for (var i = 0; i < ws.length; i++) {
        var w = ws[i];
        if (w && w._ddLaser && w._ddLaser.material && !w._ddSkinTint) { w._ddSkin = false; }
      }
    }
  } catch (e) {}
}
function onMatchStart(mode) {
  log('match start (' + mode + ')');
  session.streak = 0;
  pushMutatorFlags();
  applyWeather();
  try { applyInkSkins(); } catch (e) {}
  /* let the engine-side hooks (Phase 2) re-seat mutators/mode */
  try {
    var g = game();
    if (g && g.player) {
      var m = getMutators();
      if (typeof g.player.applyLowGrav === 'function') g.player.applyLowGrav(m.lowgrav);
      if (typeof g.player.applyBigHead === 'function') g.player.applyBigHead(m.bighead);
    }
  } catch (e) {}
  emit('dd-match-start', { mode: mode });
}
function onMatchEnd(mode) {
  log('match end (' + mode + ')');
  var ws = readWaveScore();
  var win = mode === 'ffa' ? detectWin() : false;
  session.matches++;
  var info = { mode: mode, kills: session.kills, deaths: session.deaths, win: win, wave: ws.wave, score: ws.score };
  challengesOnMatchEnd(info);
  emit('dd-match-end', info);
  /* per-match session reset (lifetime weapon stats persist) */
  session.kills = 0; session.deaths = 0; session.streak = 0;
  session.byWeapon = {}; session.headshots = 0;
}
function onMatchLeave() {
  try { stopPrecip(); } catch (e) {}
  var c = $('c');
  try { if (c) c.style.filter = ''; } catch (e) {}
  try {
    var ov = $('dd-weather');
    if (ov) ov.className = 'dd-wx-day';
  } catch (e) {}
}

/* mode kill hook (host-authoritative modes arrive in Phase 2; the
   deterministic fallback already lives here via feed events) */
function modeOnRemoteKill(killer, victim) {
  try {
    if (window.__ddModes && typeof window.__ddModes.onKill === 'function') {
      window.__ddModes.onKill(killer, victim);
    }
  } catch (e) {}
}

/* ---------------- boot ---------------- */
function waitForGame(tries) {
  if (window.__game && window.__game.player && window.__game.hud) {
    boot();
    return;
  }
  if (tries <= 0) { log('game API not found, giving up'); return; }
  setTimeout(function () { waitForGame(tries - 1); }, 250);
}

function boot() {
  if (booted) return;
  booted = true;
  pushMutatorFlags();
  applyWeather();
  watchFeed();
  setInterval(pollMatch, 500);

  /* party-mode wins (crowned by dd-modes, not by frag count) */
  window.addEventListener('dd-mode-win', function (ev) {
    try {
      var d = (ev && ev.detail) || {};
      if (d.win) {
        session.wins++;
        var st = chalState();
        st.d.__winCount = (st.d.__winCount || 0) + 1;
        chalSave(st);
        chalBump('wins', st.d.__winCount);
        toast('★ MODE WIN counts toward challenges!');
      }
    } catch (e) {}
  });
  /* sketch-wall placements */
  window.addEventListener('dd-wall', function () {
    try {
      var st = chalState();
      st.d.__walls = (st.d.__walls || 0) + 1;
      chalSave(st);
      chalBump('walls', st.d.__walls);
    } catch (e) {}
  });

  /* H = GG emote (capture not needed — the engine ignores H) */
  document.addEventListener('keydown', function (e) {
    try {
      if (e.code !== 'KeyH' || e.repeat) return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (doEmote()) { e.preventDefault(); }
    } catch (e2) {}
  });

  /* custom net events for hats/modes (Phase 2 renders them; harmless now) */
  try {
    var g = game();
    if (g && g.net && typeof g.net.on === 'function') {
      g.net.on('ddhat', function (d, from) {
        try { if (window.__ddHats && window.__ddHats.apply) window.__ddHats.apply(d, from); } catch (e) {}
      });
      g.net.on('ddmode', function (d, from) {
        try { if (window.__ddModes && window.__ddModes.apply) window.__ddModes.apply(d, from); } catch (e) {}
      });
    }
  } catch (e) {}

  window.__ddParty = {
    version: '3.2.0',
    session: session,
    lifeWeapons: lifeWeapons,
    setMutator: setMutator,
    getMutators: getMutators,
    setWeather: setWeather,
    getWeather: getWeather,
    setInkSkins: setInkSkins,
    isInkSkins: function () { return !!skinsOn; },
    emote: doEmote,
    challenges: challengeList
  };

  log('party pack ready');
}

waitForGame(80);
})();
