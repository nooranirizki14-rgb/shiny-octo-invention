/* ============================================================
   Doodle District — Boot loader & error overlay v3.0.1
   - Shows a loading screen the instant the page starts parsing,
     so a failure can NEVER look like a blank page again.
   - Runs its environment checks IMMEDIATELY (not after a timeout),
     and fails fast the moment the engine reports an error, so a
     broken boot takes ~a second to explain itself instead of 20s.
   - Detects the common "game shows nothing" causes and explains
     them in plain language:
       * page opened directly as a file (file://) — modules blocked
       * browser too old for import maps
       * WebGL2 unavailable / blocked
       * engine files unreachable (offline, ad-blocker, firewall)
       * any uncaught error while the game boots
   - Watchdogs the game module: the game sets window.__DD_gameBooted
     as its very last step; if that flag never appears, this overlay
     switches from "loading" to a diagnosis + [RETRY] button, plus a
     one-click switch between the bundled copy of the 3D engine and
     the jsdelivr / unpkg CDNs.
   Classic script, zero dependencies, runs before everything else.
   ============================================================ */
(function () {
'use strict';

/* Keep in sync with the inline import-map injector in index.html */
var CDN_KEY = 'dd_cdn';
var BOOT_FLAG = '__DD_gameBooted';
/* The engine now ships with the game, so a healthy boot is fast. Give a slow
   phone room to compile+start, but nothing like the old 20s dead wait — and
   note that real failures are reported immediately, not at this deadline. */
var WATCHDOG_MS = 9000;
var SOURCES = ['local', 'jsdelivr', 'unpkg'];
var SOURCE_LABELS = { local: 'bundled copy', jsdelivr: 'jsDelivr CDN', unpkg: 'unpkg CDN' };
var errors = [];

function getCdn() {
  try {
    var v = localStorage.getItem(CDN_KEY);
    return SOURCES.indexOf(v) !== -1 ? v : 'local';
  } catch (e) { return 'local'; }
}
function setCdn(name) {
  try { localStorage.setItem(CDN_KEY, SOURCES.indexOf(name) !== -1 ? name : 'local'); } catch (e) {}
}
/* Next source to offer: always steer a failing boot back to the bundled copy
   first, since that one cannot be blocked by a network or an ad-blocker. */
function otherCdn() { return getCdn() === 'local' ? 'jsdelivr' : 'local'; }
function sourceLabel(name) { return SOURCE_LABELS[name] || name; }

/* ---------------- error capture (starts immediately) ---------------- */
function note(source, message) {
  try {
    message = String(message || '').slice(0, 300);
    if (!message) return;
    /* Vercel analytics 404s off-Vercel by design — never worth alarming anyone */
    if (message.indexOf('_vercel/insights') !== -1) return;
    for (var i = 0; i < errors.length; i++) {
      if (errors[i].message === message) return; /* de-dupe */
    }
    errors.push({ source: source, message: message, at: new Date().toISOString() });
    if (errors.length > 12) errors.shift();
    /* Don't sit on a known-fatal error until the watchdog deadline: if the
       engine or the game module failed to load, say so right away. */
    scheduleFailFast();
  } catch (e) {}
}

/* Report a hard failure almost immediately, but on a short delay so several
   related errors (three.js + the game module) can be collected first. */
var failFastTimer = null;
function scheduleFailFast() {
  if (finished || failFastTimer) return;
  try {
    failFastTimer = setTimeout(function () {
      failFastTimer = null;
      if (finished || booted()) return;
      if (engineFailed()) watchdog();
    }, 250);
  } catch (e) {}
}

window.addEventListener('error', function (ev) {
  try {
    if (ev && ev.target && ev.target !== window && (ev.target.src || ev.target.href)) {
      var url = ev.target.src || ev.target.href;
      note('resource', 'Failed to load: ' + url);
    } else if (ev) {
      note('error', (ev.message || 'Script error') +
        (ev.filename ? ' @ ' + String(ev.filename).split('/').pop() + ':' + (ev.lineno || '?') : ''));
    }
  } catch (e) {}
}, true);

window.addEventListener('unhandledrejection', function (ev) {
  try {
    var r = ev && ev.reason;
    var msg = r ? (r.message || String(r)) : 'Unhandled rejection';
    note('promise', msg);
  } catch (e) {}
}, true);

/* ---------------- environment checks ---------------- */
function isFileProtocol() {
  try { return window.location.protocol === 'file:'; } catch (e) { return false; }
}
function importMapSupported() {
  try {
    if (window.HTMLScriptElement && typeof window.HTMLScriptElement.supports === 'function') {
      return window.HTMLScriptElement.supports('importmap');
    }
    /* API missing => predates import maps entirely (Chrome <89, FF <108, Safari <16.4) */
    return false;
  } catch (e) { return false; }
}
function webgl2Available() {
  try {
    var c = document.createElement('canvas');
    var gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
    if (!gl) return false;
    try { gl.getExtension('EXT_color_buffer_float'); } catch (e) {}
    return true;
  } catch (e) { return false; }
}

/* ---------------- overlay UI ---------------- */
var overlay = null, cardEl = null, statusEl = null, spinEl = null;
var finished = false;

var CSS =
  '#dd-boot{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;' +
  'background:#f6f3e6;padding:20px;box-sizing:border-box;transition:opacity .35s ease;}' +
  '#dd-boot.hide{opacity:0;pointer-events:none;}' +
  '#dd-boot .dd-boot-card{font-family:"Patrick Hand","Caveat","Comic Sans MS","Segoe Print",cursive;' +
  'color:#1a30c0;text-align:center;max-width:620px;width:100%;background:#faf8ee;' +
  'border:3px solid #1a30c0;border-radius:14px 18px 12px 16px/16px 12px 16px 14px;' +
  'box-shadow:6px 6px 0 rgba(26,48,192,.15);padding:28px 30px 26px;}' +
  '#dd-boot h1{font-size:52px;margin:0;letter-spacing:3px;line-height:1;}' +
  '#dd-boot h2{font-size:24px;margin:6px 0 4px;font-weight:normal;opacity:.85;}' +
  '#dd-boot .dd-boot-spin{font-size:44px;display:inline-block;animation:ddbootspin 1.1s linear infinite;margin:10px 0 2px;}' +
  '@keyframes ddbootspin{to{transform:rotate(360deg);}}' +
  '#dd-boot .dd-boot-status{font-size:21px;margin:8px 0 0;min-height:28px;}' +
  '#dd-boot .dd-boot-err{text-align:left;font-size:19px;line-height:1.45;background:rgba(208,32,48,.07);' +
  'border:2.5px dashed #d02030;border-radius:10px;padding:10px 16px;margin:12px 0 4px;}' +
  '#dd-boot .dd-boot-err b{color:#d02030;}' +
  '#dd-boot .dd-boot-err code{font-size:16px;background:rgba(26,48,192,.1);border-radius:5px;padding:0 6px;}' +
  '#dd-boot .dd-boot-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px;}' +
  '#dd-boot button{font-family:inherit;font-size:22px;cursor:pointer;color:#f6f3e6;background:#1a30c0;' +
  'border:2.5px solid #1a30c0;border-radius:7px 10px 6px 9px;padding:8px 26px;}' +
  '#dd-boot button.alt{color:#1a30c0;background:transparent;}' +
  '#dd-boot button:hover{transform:rotate(-1deg) scale(1.03);}' +
  '#dd-boot details{margin-top:14px;font-size:16px;text-align:left;opacity:.85;}' +
  '#dd-boot summary{cursor:pointer;font-size:18px;}' +
  '#dd-boot pre{white-space:pre-wrap;word-break:break-word;background:rgba(26,48,192,.06);' +
  'border-radius:8px;padding:8px 12px;max-height:180px;overflow:auto;font-size:14px;}';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildOverlay() {
  if (overlay) return;
  try {
    var st = document.createElement('style');
    st.id = 'dd-boot-css';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);

    overlay = document.createElement('div');
    overlay.id = 'dd-boot';
    overlay.innerHTML =
      '<div class="dd-boot-card">' +
        '<h1>DOODLE DISTRICT</h1>' +
        '<h2 id="dd-boot-sub">loading…</h2>' +
        '<div class="dd-boot-spin" id="dd-boot-spin">✎</div>' +
        '<div class="dd-boot-status" id="dd-boot-status">sharpening pencils…</div>' +
        '<div id="dd-boot-body"></div>' +
      '</div>';
    (document.body || document.documentElement).appendChild(overlay);
    cardEl = overlay.firstChild;
    statusEl = document.getElementById('dd-boot-status');
    spinEl = document.getElementById('dd-boot-spin');
  } catch (e) {}
}

function setStatus(t) { try { if (statusEl) statusEl.textContent = t; } catch (e) {} }
function setSub(t) { try { var s = document.getElementById('dd-boot-sub'); if (s) s.textContent = t; } catch (e) {} }

function diagnosticsText() {
  var lines = [];
  lines.push('time: ' + new Date().toISOString());
  try { lines.push('url: ' + location.href); } catch (e) {}
  try { lines.push('protocol: ' + location.protocol); } catch (e) {}
  lines.push('engine source: ' + getCdn() + ' (' + sourceLabel(getCdn()) + ')');
  try { lines.push('ua: ' + navigator.userAgent); } catch (e) {}
  lines.push('importmap: ' + (importMapSupported() ? 'yes' : 'NO'));
  lines.push('webgl2: ' + (webgl2Available() ? 'yes' : 'NO'));
  lines.push('booted: ' + (window[BOOT_FLAG] === true ? 'yes' : 'no'));
  try { lines.push('__game: ' + (window.__game && window.__game.game ? window.__game.game.state : String(!!window.__game))); } catch (e) {}
  try { lines.push('peerjs: ' + (typeof window.Peer === 'function' ? 'yes' : 'NO')); } catch (e) {}
  if (!errors.length) lines.push('captured errors: none');
  else {
    lines.push('captured errors (' + errors.length + '):');
    for (var i = 0; i < errors.length; i++) lines.push('  [' + errors[i].source + '] ' + errors[i].message);
  }
  return lines.join('\n');
}

function showError(title, html) {
  if (finished) return;
  buildOverlay();
  try {
    if (spinEl) spinEl.style.display = 'none';
    setSub(title);
    setStatus('');
    var body = document.getElementById('dd-boot-body');
    if (body) {
      body.innerHTML =
        '<div class="dd-boot-err">' + html + '</div>' +
        '<div class="dd-boot-row">' +
          '<button type="button" id="dd-boot-retry">↻ RETRY</button>' +
          '<button type="button" class="alt" id="dd-boot-cdn">USE ' + esc(sourceLabel(otherCdn()).toUpperCase()) + '</button>' +
        '</div>' +
        '<details><summary>technical details (for bug reports)</summary><pre id="dd-boot-diag">' +
        esc(diagnosticsText()) + '</pre></details>';
      var retry = document.getElementById('dd-boot-retry');
      if (retry) retry.addEventListener('click', function () { location.reload(); });
      var cdn = document.getElementById('dd-boot-cdn');
      if (cdn) cdn.addEventListener('click', function () {
        setCdn(otherCdn());
        location.reload();
      });
    }
  } catch (e) {}
}

function finish() {
  if (finished) return;
  finished = true;
  try {
    if (!overlay) return;
    overlay.classList.add('hide');
    setTimeout(function () {
      try { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch (e) {}
      var css = document.getElementById('dd-boot-css');
      try { if (css && css.parentNode) css.parentNode.removeChild(css); } catch (e) {}
      overlay = null;
    }, 400);
  } catch (e) {}
}

function booted() {
  try { return window[BOOT_FLAG] === true; } catch (e) { return false; }
}

/* ---------------- boot sequence ---------------- */
function engineFailed() {
  for (var i = 0; i < errors.length; i++) {
    var m = errors[i].message.toLowerCase();
    if (m.indexOf('three') !== -1 || m.indexOf('jsdelivr') !== -1 ||
        m.indexOf('unpkg') !== -1 || m.indexOf('failed to fetch') !== -1 ||
        m.indexOf('import') !== -1 || m.indexOf('module') !== -1 ||
        m.indexOf('game.7lcerblr.js') !== -1) return true;
  }
  return false;
}

/* Checks that are true or false the instant the page loads — there is no point
   making anyone stare at a spinner for these. Returns true if it showed one. */
function preflight() {
  if (isFileProtocol() || !importMapSupported() || !webgl2Available()) {
    watchdog();
    return true;
  }
  return false;
}

function watchdog() {
  if (booted()) { finish(); return; }
  if (isFileProtocol()) {
    showError('could not start', '<b>You opened the game file directly</b> (file://), and browsers ' +
      'block games from loading that way — that is why the page is empty.<br><br>' +
      'Run it through a local server instead, e.g. open a terminal in the game folder and run:<br>' +
      '<code>python3 -m http.server 8000</code><br>then visit <code>http://localhost:8000</code><br><br>' +
      'Or host the folder with any static server / VS&nbsp;Code “Live Server”.');
    return;
  }
  if (!importMapSupported()) {
    showError('browser too old', '<b>Your browser does not support import maps</b>, which this game needs. ' +
      'Please update to a recent version of Chrome, Edge, Firefox or Safari and try again.');
    return;
  }
  if (!webgl2Available()) {
    showError('no 3D (WebGL2)', '<b>WebGL2 is unavailable</b> — the 3D engine cannot start without it.<br><br>' +
      'Try: enabling “hardware acceleration” in your browser settings, updating your graphics drivers, ' +
      'or switching to Chrome/Edge on a device with a GPU. Remote-desktop and some virtual machines also block WebGL.');
    return;
  }
  if (engineFailed()) {
    var src = getCdn();
    showError('could not load the engine',
      '<b>The 3D engine failed to load</b> (currently using the <b>' + esc(sourceLabel(src)) + '</b>).' +
      (src === 'local'
        ? '<br><br>The engine ships with the game, so this usually means a file is missing from the ' +
          'upload, or the server is not serving <code>vendor/</code>. Hit <b>RETRY</b>, or fall back to a CDN below.'
        : '<br><br>You are loading it from a CDN, which can be blocked by an ad-blocker, firewall or ' +
          'school network — and fails entirely when you are offline. Switch back to the <b>bundled copy</b> ' +
          'below: it needs no internet at all.'));
    return;
  }
  showError('taking too long…', '<b>The game did not finish loading.</b> ' +
    'Something blocked one of its files, or your device is still working through the 3D engine. ' +
    'Hit <b>RETRY</b>, or switch the engine source below. ' +
    (typeof window.Peer !== 'function' ? '<br><br>Note: the multiplayer library also failed to load, which points at a missing or blocked file.' : ''));
}

/* status flavor while waiting */
var statusTimer = null;
function startStatusRotation() {
  var msgs = ['sharpening pencils…', 'loading the 3D engine…', 'unfolding the paper…', 'inking the district…'];
  var i = 0;
  try {
    statusTimer = setInterval(function () {
      if (finished || booted()) { if (statusTimer) clearInterval(statusTimer); return; }
      i = (i + 1) % msgs.length;
      /* once the game object exists we are past downloading and into starting up */
      try {
        if (window.__game && window.__game.game) setStatus('starting the game…');
        else setStatus(msgs[i]);
      } catch (e) { setStatus(msgs[i]); }
    }, 2500);
  } catch (e) {}
}

function boot() {
  buildOverlay();
  try { window.addEventListener('dd-game-booted', finish); } catch (e) {}
  /* Fatal environment problems are known right now — report them instantly
     instead of pretending to load for the full watchdog period. */
  if (preflight()) return;
  startStatusRotation();
  var poll = setInterval(function () {
    try { if (booted()) { clearInterval(poll); if (statusTimer) clearInterval(statusTimer); finish(); } }
    catch (e) {}
  }, 250);
  setTimeout(function () {
    try {
      if (booted()) { clearInterval(poll); if (statusTimer) clearInterval(statusTimer); finish(); }
      else watchdog();
    } catch (e) { try { watchdog(); } catch (e2) {} }
  }, WATCHDOG_MS);
}

/* Paint the loading screen NOW. We run in <head>, so <body> does not exist
   yet — but <html> does, and appending there renders immediately. Waiting for
   DOMContentLoaded meant waiting on every blocking script in <body> first,
   which is exactly the "nothing happens for ages" everyone complained about.
   Once <body> exists we move the overlay into it so it sits above the game. */
buildOverlay();
function reparentOverlay() {
  try {
    if (overlay && document.body && overlay.parentNode !== document.body) {
      document.body.appendChild(overlay);
    }
  } catch (e) {}
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    reparentOverlay();
    boot();
  });
} else {
  reparentOverlay();
  boot();
}

/* public API for debugging */
window.__DDboot = {
  booted: booted,
  errors: errors,
  diagnostics: diagnosticsText,
  retry: function () { location.reload(); },
  /* 'local' (bundled, default), 'jsdelivr' or 'unpkg' */
  source: getCdn,
  useCdn: function (name) { setCdn(name); location.reload(); }
};

})();
