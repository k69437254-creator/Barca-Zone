import { describe, it, expect } from "vitest";
import { normalizeEvent, normalizeStanding, normalizeAthlete, normalizeNewsItem } from "../src/data/normalize.js";

describe("normalizeEvent", () => {
  it("preserves missing scores as unavailable rather than converting them to zero", () => {
    const m = normalizeEvent({ id: "x", competitions: [{ competitors: [
      { homeAway: "home", team: { id: "1", displayName: "Barcelona" } },
      { homeAway: "away", team: { id: "2", displayName: "Opponent" } }
    ] }] });
    expect(m.score.home).toBeNull();
    expect(m.score.away).toBeNull();
    expect(m.score.available).toBe(false);
  });
  it("normalizes a real numeric score", () => {
    const m = normalizeEvent({ id: "x", competitions: [{ competitors: [
      { homeAway: "home", score: "2", team: { id: "1", displayName: "Barcelona" } },
      { homeAway: "away", score: "1", team: { id: "2", displayName: "Opponent" } }
    ], status: { type: { state: "post", completed: true, shortDetail: "FT" } } }] });
    expect(m.score).toEqual({ home: 2, away: 1, available: true });
    expect(m.status.state).toBe("post");
  });
});
describe("normalizeStanding", () => {
  it("keeps unavailable table values null", () => {
    const row = normalizeStanding({ position: 1, team: { id: "1", displayName: "Barcelona" }, stats: [] });
    expect(row.rank).toBe(1);
    expect(row.points).toBeNull();
    expect(row.played).toBeNull();
  });
});
describe("normalizeAthlete", () => {
  it("uses the provider image only when supplied", () => {
    expect(normalizeAthlete({ athlete: { id: "a", fullName: "Player One" } }).image).toBeNull();
    expect(normalizeAthlete({ athlete: { id: "a", fullName: "Player One", headshot: { href: "https://example.com/a.png" } } }).image).toBe("https://example.com/a.png");
  });
});
describe("normalizeNewsItem", () => {
  it("preserves the source URL", () => {
    const n = normalizeNewsItem({ headline: "Headline", links: { web: { href: "https://example.com/story" } } });
    expect(n.title).toBe("Headline");
    expect(n.url).toBe("https://example.com/story");
  });
});