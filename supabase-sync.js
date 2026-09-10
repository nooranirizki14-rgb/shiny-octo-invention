/* ============================================================
   Doodle District — Supabase Save Sync & Leaderboard v3.0
   - Persistent save sync (profile, loadout, unlocks, stats)
   - Global + multiplayer K/D leaderboard
   - Anonymous auth via device-generated UUID
   - Falls back to localStorage-only when no credentials configured
   ============================================================ */
(function () {
'use strict';

var DB = null;
var client = null;
var deviceId = null;
var connected = false;
var syncEnabled = false;

/* ---- device ID (anonymous auth) ---- */
function getDeviceId() {
  if (deviceId) return deviceId;
  try {
    deviceId = localStorage.getItem('dd_supabase_device_id');
    if (!deviceId) {
      deviceId = 'dd-' + crypto.randomUUID();
      localStorage.setItem('dd_supabase_device_id', deviceId);
    }
  } catch (e) {
    deviceId = 'dd-fallback-' + Date.now();
  }
  return deviceId;
}

/* ---- config: read from localStorage (user enters in settings) ---- */
function getConfig() {
  try {
    var url = localStorage.getItem('dd_supabase_url');
    var key = localStorage.getItem('dd_supabase_anon_key');
    if (url && key) return { url: url, key: key };
  } catch (e) {}
  return null;
}

function isConfigured() {
  return !!getConfig();
}

/* ---- lazy-load Supabase JS client from CDN ---- */
function loadSupabase() {
  return new Promise(function (resolve, reject) {
    if (window.supabase) { resolve(window.supabase); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    s.onload = function () { resolve(window.supabase); };
    s.onerror = function () { reject(new Error('Failed to load Supabase client')); };
    document.head.appendChild(s);
  });
}

/* ---- initialize ---- */
async function init() {
  var config = getConfig();
  if (!config) { console.log('[DD Sync] No Supabase config — running localStorage-only'); return false; }
  try {
    var sb = await loadSupabase();
    client = sb.createClient(config.url, config.key, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    DB = client.from('dd_profiles');
    connected = true;
    syncEnabled = true;
    console.log('[DD Sync] Connected to Supabase');
    await ensureProfile();
    return true;
  } catch (e) {
    console.error('[DD Sync] Failed to connect:', e.message);
    return false;
  }
}

/* ---- ensure a profile row exists for this device ---- */
async function ensureProfile() {
  if (!client) return;
  var id = getDeviceId();
  var { data, error } = await client.from('dd_profiles').select('id').eq('id', id).maybeSingle();
  if (error) { console.error('[DD Sync] ensureProfile error:', error.message); return; }
  if (!data) {
    await client.from('dd_profiles').insert({ id: id, callsign: 'doodle', created_at: new Date().toISOString() });
  }
}

/* ---- sync local save to cloud ---- */
var syncPending = false;
async function syncToCloud() {
  if (!syncEnabled || !client) return;
  if (syncPending) return;
  syncPending = true;
  try {
    var id = getDeviceId();
    var profile = JSON.parse(localStorage.getItem('doodle_profile_v1') || '{}');
    var unlocks = JSON.parse(localStorage.getItem('doodle_unlocks_v1') || '{}');
    var loadout = JSON.parse(localStorage.getItem('doodle_loadout') || '{}');
    var name = (localStorage.getItem('doodle_name') || 'doodle').slice(0, 14);
    var character = localStorage.getItem('doodle_character') || 'default';

    var lv = window.__ddMenu ? window.__ddMenu.levelForXP(profile.xp || 0) : { level: 1 };

    await client.from('dd_profiles').upsert({
      id: id,
      callsign: name,
      level: lv.level,
      xp: profile.xp || 0,
      character: character,
      loadout: loadout,
      unlocks: unlocks,
      best_score: profile.bestScore || 0,
      best_wave: profile.bestWave || 0,
      total_kills: profile.kills || 0,
      matches: profile.matches || 0,
      online_wins: profile.wins || 0,
      online_kills: profile.onlineKills || 0,
      online_deaths: profile.onlineDeaths || 0,
      updated_at: new Date().toISOString()
    });
  } catch (e) {
    console.error('[DD Sync] sync error:', e.message);
  }
  syncPending = false;
}

/* ---- pull cloud save and merge with local ---- */
async function syncFromCloud() {
  if (!syncEnabled || !client) return null;
  try {
    var id = getDeviceId();
    var { data, error } = await client.from('dd_profiles').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;

    var localProfile = JSON.parse(localStorage.getItem('doodle_profile_v1') || '{}');
    /* Merge: take the higher XP (cloud wins if equal or higher) */
    if (data.xp > (localProfile.xp || 0)) {
      localStorage.setItem('doodle_profile_v1', JSON.stringify({
        xp: data.xp, matches: data.matches || 0, kills: data.total_kills || 0,
        bestScore: data.best_score || 0, bestWave: data.best_wave || 0,
        wins: data.online_wins || 0, onlineKills: data.online_kills || 0,
        onlineDeaths: data.online_deaths || 0,
        emblem: localProfile.emblem || 0, banner: localProfile.banner || 'b0',
        avatar: localProfile.avatar || null, specialEmblem: localProfile.specialEmblem || null,
        title: localProfile.title || null
      }));
    }
    if (data.loadout) localStorage.setItem('doodle_loadout', JSON.stringify(data.loadout));
    if (data.unlocks) localStorage.setItem('doodle_unlocks_v1', JSON.stringify(data.unlocks));
    if (data.callsign) localStorage.setItem('doodle_name', data.callsign);
    if (data.character) localStorage.setItem('doodle_character', data.character);
    return data;
  } catch (e) {
    console.error('[DD Sync] pull error:', e.message);
    return null;
  }
}

/* ---- leaderboard ---- */
async function getLeaderboard(mode) {
  if (!syncEnabled || !client) return [];
  try {
    var col = mode === 'mp' ? 'online_kills' : 'best_score';
    var { data, error } = await client.from('dd_profiles')
      .select('callsign,level,best_score,best_wave,total_kills,online_kills,online_deaths,online_wins')
      .order(col, { ascending: false })
      .limit(50);
    if (error) { console.error('[DD Sync] leaderboard error:', error.message); return []; }
    return data || [];
  } catch (e) {
    console.error('[DD Sync] leaderboard error:', e.message);
    return [];
  }
}

/* ---- submit match result ---- */
async function submitMatchResult(result) {
  if (!syncEnabled || !client) return;
  try {
    var id = getDeviceId();
    var { data } = await client.from('dd_profiles').select('*').eq('id', id).maybeSingle();
    if (!data) return;

    var updates = { updated_at: new Date().toISOString() };
    if (result.kind === 'solo') {
      updates.best_score = Math.max(data.best_score || 0, result.score || 0);
      updates.best_wave = Math.max(data.best_wave || 0, result.wave || 0);
      updates.total_kills = (data.total_kills || 0) + (result.kills || 0);
      updates.matches = (data.matches || 0) + 1;
    } else {
      updates.online_kills = (data.online_kills || 0) + (result.kills || 0);
      updates.online_deaths = (data.online_deaths || 0) + (result.deaths || 0);
      if (result.win) updates.online_wins = (data.online_wins || 0) + 1;
      updates.matches = (data.matches || 0) + 1;
      updates.total_kills = (data.total_kills || 0) + (result.kills || 0);
    }
    await client.from('dd_profiles').update(updates).eq('id', id);
  } catch (e) {
    console.error('[DD Sync] submit error:', e.message);
  }
}

/* ---- public API ---- */
window.__ddSync = {
  init: init,
  isConfigured: isConfigured,
  isConnected: function () { return connected; },
  syncToCloud: syncToCloud,
  syncFromCloud: syncFromCloud,
  getLeaderboard: getLeaderboard,
  submitMatchResult: submitMatchResult,
  getDeviceId: getDeviceId
};
})();
