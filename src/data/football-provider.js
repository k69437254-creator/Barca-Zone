import { normalizeEvent, normalizeStanding, normalizeAthlete, normalizeNewsItem } from "./normalize.js";

const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const LEAGUE = "esp.1"; // ESPN's LaLiga competition slug; validate coverage at runtime.
const TTL = { matches: 60_000, standings: 15 * 60_000, roster: 6 * 60 * 60_000, news: 5 * 60_000 };
const cache = new Map();

async function requestJson(url, ttl, fetchImpl = fetch) {
  const cached = cache.get(url);
  const now = Date.now();
  if (cached && now - cached.savedAt < ttl) return { data: cached.data, cached: true };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetchImpl(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const data = await response.json();
    cache.set(url, { data, savedAt: now });
    return { data, cached: false };
  } finally {
    clearTimeout(timeout);
  }
}

export const footballProvider = {
  async matches({ date, fetchImpl } = {}) {
    const dateParam = date ? `?dates=${encodeURIComponent(date.replaceAll("-", ""))}` : "";
    const result = await requestJson(`${BASE}/${LEAGUE}/scoreboard${dateParam}`, TTL.matches, fetchImpl);
    return { items: (result.data.events ?? []).map(normalizeEvent), cached: result.cached, updatedAt: new Date().toISOString() };
  },
  async standings({ fetchImpl } = {}) {
    const result = await requestJson(`${BASE}/${LEAGUE}/scoreboard`, TTL.standings, fetchImpl);
    const entries = result.data.standings?.[0]?.entries ?? result.data.children?.flatMap((x) => x.standings?.entries ?? []) ?? [];
    if (!entries.length) throw new Error("STANDINGS_UNAVAILABLE");
    return { items: entries.map(normalizeStanding), cached: result.cached, updatedAt: new Date().toISOString() };
  },
  async roster({ fetchImpl } = {}) {
    const result = await requestJson(`${BASE}/esp.1/teams/barcelona/roster`, TTL.roster, fetchImpl);
    const athletes = result.data.athletes ?? result.data.roster ?? [];
    if (!athletes.length) throw new Error("ROSTER_UNAVAILABLE");
    return { items: athletes.map(normalizeAthlete), cached: result.cached, updatedAt: new Date().toISOString() };
  },
  async news({ fetchImpl } = {}) {
    const result = await requestJson(`${BASE}/${LEAGUE}/news`, TTL.news, fetchImpl);
    const articles = result.data.articles ?? [];
    return { items: articles.map((x) => normalizeNewsItem({ ...x, source: "ESPN" })).filter((x) => x.url), cached: result.cached, updatedAt: new Date().toISOString() };
  },
  clearCache() { cache.clear(); }
};

export function getCacheDurations() {
  return { ...TTL };
}