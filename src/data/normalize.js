export function normalizeTeam(team = {}) {
  return {
    id: team.id ?? team.uid ?? team.team?.id ?? null,
    name: team.displayName ?? team.name ?? team.team?.name ?? "فريق غير معروف",
    shortName: team.abbreviation ?? team.shortDisplayName ?? team.team?.abbreviation ?? "",
    logo: team.logo ?? team.logos?.[0]?.href ?? team.team?.logo ?? null
  };
}

export function normalizeEvent(event = {}) {
  const competition = event.competitions?.[0] ?? {};
  const competitors = competition.competitors ?? [];
  const home = competitors.find((x) => x.homeAway === "home") ?? competitors[0] ?? {};
  const away = competitors.find((x) => x.homeAway === "away") ?? competitors[1] ?? {};
  const status = event.status ?? competition.status ?? {};
  const state = status.type?.state ?? "unknown";
  const homeScore = parseScore(home.score);
  const awayScore = parseScore(away.score);
  return {
    id: event.id ?? null,
    name: event.name ?? event.shortName ?? "مباراة",
    date: event.date ?? null,
    status: {
      state,
      label: status.type?.shortDetail ?? status.type?.detail ?? "الحالة غير متاحة",
      completed: Boolean(status.type?.completed),
      period: status.period ?? null,
      clock: status.displayClock ?? null
    },
    home: normalizeTeam(home.team ?? home),
    away: normalizeTeam(away.team ?? away),
    score: {
      home: homeScore,
      away: awayScore,
      available: homeScore !== null && awayScore !== null
    },
    venue: competition.venue?.fullName ?? null,
    competition: event.season?.name ?? competition.league?.name ?? null,
    source: "ESPN"
  };
}

function parseScore(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeStanding(entry = {}) {
  const stats = Object.fromEntries((entry.stats ?? []).map((s) => [s.name, s.value]));
  const team = normalizeTeam(entry.team ?? {});
  const get = (...keys) => {
    for (const key of keys) {
      const val = stats[key];
      if (val !== undefined && Number.isFinite(Number(val))) return Number(val);
    }
    return null;
  };
  return {
    id: team.id,
    team,
    rank: entry.position ?? entry.rank ?? null,
    played: get("gamesPlayed", "played"),
    won: get("wins", "win"),
    drawn: get("ties", "draws", "draw"),
    lost: get("losses", "loss"),
    goalsFor: get("pointsFor", "goalsFor"),
    goalsAgainst: get("pointsAgainst", "goalsAgainst"),
    goalDifference: get("pointDifferential", "goalDifference"),
    points: get("points", "leaguePoints")
  };
}

export function normalizeAthlete(athlete = {}) {
  const person = athlete.athlete ?? athlete;
  const headshot = person.headshot?.href ?? person.headshot ?? null;
  return {
    id: person.id ?? null,
    name: person.fullName ?? person.displayName ?? person.name ?? "اسم غير متاح",
    number: athlete.jersey ?? person.jersey ?? null,
    position: athlete.position?.name ?? athlete.position?.abbreviation ?? person.position?.name ?? "غير محدد",
    nationality: person.citizenship ?? person.nationality ?? null,
    image: typeof headshot === "string" ? headshot : null
  };
}

export function normalizeNewsItem(item = {}) {
  const link = item.links?.web?.href ?? item.link ?? null;
  const image = item.images?.[0]?.url ?? item.image ?? null;
  return {
    id: item.id ?? link ?? null,
    title: item.headline ?? item.title ?? "عنوان غير متاح",
    summary: item.description ?? item.summary ?? "",
    source: item.source ?? "ESPN",
    publishedAt: item.published ?? item.publishedAt ?? null,
    image,
    url: link
  };
}