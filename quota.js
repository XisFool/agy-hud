/**
 * quota.js — Real account-level quota fetcher.
 *
 * Calls the same `fetchAvailableModels` endpoint that agy uses for /usage.
 * Token is read from ~/.gemini/antigravity-cli/antigravity-oauth-token.
 * Results are cached to /tmp/agy-hud-quota-cache.json keyed by the earliest
 * resetTime, so we never hit the network more than once per quota window.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const TOKEN_PATH = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'antigravity-oauth-token');
const CACHE_PATH = path.join(os.tmpdir(), 'agy-hud-quota-cache.json');

// The same endpoints agy uses (daily sandbox first, prod fallback)
const ENDPOINTS = [
  'https://daily-cloudcode-pa.googleapis.com',
  'https://cloudcode-pa.googleapis.com',
];

const DEFAULT_PROJECT_ID = 'rising-fact-p41fc';

// Models to show in the HUD — filtered from the full list, de-duped by quota bucket
const INTERESTING_MODEL_IDS = [
  'gemini-3-flash-agent',    // Gemini 3.5 Flash (High)
  'gemini-3.5-flash-low',    // Gemini 3.5 Flash (Medium)
  'gemini-3.1-pro-high',     // Gemini 3.1 Pro (High)
  'gemini-3.1-pro-low',      // Gemini 3.1 Pro (Low)
  'claude-sonnet-4-6',       // Claude Sonnet 4.6
  'claude-opus-4-6-thinking',// Claude Opus 4.6
  'gpt-oss-120b-medium',     // GPT-OSS 120B
];

/**
 * @returns {{ accessToken: string } | null}
 */
function readToken() {
  try {
    const raw = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    const token = raw.token;
    if (!token || !token.access_token) return null;
    return { accessToken: token.access_token };
  } catch {
    return null;
  }
}

/**
 * Build headers matching what agy sends.
 * @param {string} accessToken
 */
function buildHeaders(accessToken) {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'antigravity/1.15.8 darwin/arm64',
    'X-Goog-Api-Client': 'gl-node/22.17.0',
    'Client-Metadata': JSON.stringify({
      ideType: 'IDE_UNSPECIFIED',
      platform: 'PLATFORM_UNSPECIFIED',
      pluginType: 'GEMINI',
    }),
  };
}

/**
 * Get the projectId from loadCodeAssist, falling back to DEFAULT_PROJECT_ID.
 * @param {string} accessToken
 * @param {string} endpoint
 * @returns {Promise<string>}
 */
async function fetchProjectId(accessToken, endpoint) {
  try {
    const r = await fetch(`${endpoint}/v1internal:loadCodeAssist`, {
      method: 'POST',
      headers: buildHeaders(accessToken),
      body: JSON.stringify({ metadata: { ideType: 'IDE_UNSPECIFIED', platform: 'PLATFORM_UNSPECIFIED', pluginType: 'GEMINI' } }),
    });
    if (r.ok) {
      const data = await r.json();
      const proj = data.cloudaicompanionProject;
      if (typeof proj === 'string' && proj) return proj;
      if (proj && proj.id) return proj.id;
    }
  } catch { /* fallthrough */ }
  return DEFAULT_PROJECT_ID;
}

/**
 * @typedef {Object} ModelQuota
 * @property {string} id
 * @property {string} displayName
 * @property {number} remainingFraction  0–1
 * @property {string|null} resetTime     ISO-8601 or null
 */

/**
 * Fetch quota data from the cloud API.
 * @param {string} accessToken
 * @returns {Promise<ModelQuota[]>}
 */
async function fetchQuotaFromCloud(accessToken) {
  for (const endpoint of ENDPOINTS) {
    try {
      const projectId = await fetchProjectId(accessToken, endpoint);
      const r = await fetch(`${endpoint}/v1internal:fetchAvailableModels`, {
        method: 'POST',
        headers: buildHeaders(accessToken),
        body: JSON.stringify({ project: projectId }),
      });
      if (!r.ok) continue;
      const data = await r.json();
      const models = data.models || {};

      const results = [];
      for (const id of INTERESTING_MODEL_IDS) {
        const m = models[id];
        if (!m || !m.quotaInfo) continue;
        const qi = m.quotaInfo;
        // Skip models without remainingFraction (means unlimited / no quota tracked)
        if (qi.remainingFraction === undefined) continue;
        results.push({
          id,
          displayName: m.displayName || id,
          remainingFraction: qi.remainingFraction,
          resetTime: qi.resetTime || null,
        });
      }
      return results;
    } catch { /* try next endpoint */ }
  }
  return [];
}

/**
 * Read cached quota if still valid.
 * @returns {ModelQuota[] | null}
 */
function readCache() {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    if (!raw.expiresAt || Date.now() >= raw.expiresAt) return null;
    return raw.data || null;
  } catch {
    return null;
  }
}

/**
 * Write quota cache. Expires at the earliest resetTime among all buckets.
 * @param {ModelQuota[]} data
 */
function writeCache(data) {
  // Find earliest resetTime
  let earliest = Infinity;
  for (const m of data) {
    if (m.resetTime) {
      const t = new Date(m.resetTime).getTime();
      if (t < earliest) earliest = t;
    }
  }
  // If no resetTime found, cache for 5 minutes
  const expiresAt = isFinite(earliest) ? earliest : Date.now() + 5 * 60 * 1000;
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify({ expiresAt, data }));
  } catch { /* ignore write errors */ }
}

/**
 * Get quota data (cached or fresh).
 * @returns {Promise<ModelQuota[]>}
 */
async function getQuota() {
  const cached = readCache();
  if (cached) return cached;

  const tok = readToken();
  if (!tok) return [];

  const fresh = await fetchQuotaFromCloud(tok.accessToken);
  if (fresh.length > 0) writeCache(fresh);
  return fresh;
}

module.exports = { getQuota };
