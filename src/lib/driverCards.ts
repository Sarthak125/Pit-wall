/**
 * Driver cards: each driver's season so far as six stats, each turned into a 1 to 99 rating against the other drivers,
 * and one overall rating that mixes them with fixed weights. Worked out from Jolpica's race, sprint and qualifying
 * results, round by round, so a card can show how its ratings moved since the previous race.
 *
 * A rating is where the driver stands among everyone with at least three starts: 99 is the best of the field, 1 the
 * lowest, and a higher rating is always better. It follows the order of the field, not the size of the gaps. The
 * weights of the overall rating are Pit Wall's own choice, not an official measure.
 */
import type { RaceWithQualifying, RaceWithResults, Result } from '../api/jolpica';
import { isClassified } from './driverStats';

/** Races a driver needs before the ratings appear, so one lucky weekend does not read as a trend. */
export const MIN_STARTS = 3;

export const STAT_LABELS = ['Points / race', 'Qualifying', 'Race finish', 'Points finishes', 'Finish rate', 'Team-mate duel'] as const;
/** Weight of each stat in the overall rating (they add up to 1). */
export const WEIGHTS = [0.3, 0.15, 0.2, 0.1, 0.1, 0.15] as const;

export interface Mate {
  code: string;
  family: string;
  /** Rounds both started: this driver finished ahead, behind, and how many in all. */
  races: [number, number, number];
  /** Rounds both qualified: this driver ahead, and how many in all. */
  quali: [number, number];
  /** Season points: this driver, team-mate. */
  points: [number, number];
}

export interface CardData {
  driverId: string;
  code: string;
  given: string;
  family: string;
  number: string;
  nationality: string;
  team: string;
  teamId: string;
  starts: number;
  points: number;
  /** Championship position (computed from the results; the official one where given). */
  pos: number;
  wins: number;
  podiums: number;
  poles: number;
  dnfs: number;
  /** Last five race results: finishing position, or null for a retirement. */
  form: (number | null)[];
  best: { pos: number; race: string } | null;
  worst: { pos: number; race: string } | null;
  /** The real figures behind the ratings, in the order of STAT_LABELS (null while unknown). */
  raw: { pointsPerRace: number | null; qualifying: number | null; finish: number | null; pointsFinishes: number | null; finishRate: number | null; duel: [number, number] };
  /** 1 to 99 per stat, or null until the driver has MIN_STARTS races. */
  ratings: (number | null)[] | null;
  overall: number | null;
  mate: Mate | null;
}

export interface CardSnapshot {
  round: number;
  race: string;
  cards: Record<string, CardData>;
}

interface Acc {
  driverId: string;
  code: string;
  given: string;
  family: string;
  number: string;
  nationality: string;
  team: string;
  teamId: string;
  starts: number;
  points: number;
  wins: number;
  podiums: number;
  poles: number;
  dnfs: number;
  classified: number;
  inPoints: number;
  finishes: number[];
  qualis: number[];
  duelWins: number;
  duelRounds: number;
  form: (number | null)[];
  best: { pos: number; race: string } | null;
  worst: { pos: number; race: string } | null;
  /** Finishing position per round (99 for a retirement), for the head-to-head with a team-mate. */
  byRound: Map<number, number>;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round1 = (n: number | null) => (n == null ? null : Math.round(n * 10) / 10);
export const rateFromPercent = (pct: number) => Math.max(1, Math.round(pct * 0.99));
export const shortRace = (name: string) => name.replace(/ Grand Prix.*$/, ' GP');

/** Overall rating from six stat ratings, or null while any is missing. */
export function overallRating(ratings: (number | null)[] | null): number | null {
  if (!ratings || ratings.some((r) => r == null)) return null;
  return Math.round(ratings.reduce<number>((sum, r, i) => sum + (r as number) * WEIGHTS[i], 0));
}

/** Colour band of a rating: 85 and up gold, 70 and up green, 50 and up amber, otherwise grey. */
export function ratingTier(r: number | null): 'gold' | 'green' | 'amber' | 'grey' {
  return r == null ? 'grey' : r >= 85 ? 'gold' : r >= 70 ? 'green' : r >= 50 ? 'amber' : 'grey';
}

/**
 * One snapshot per round that has results. `official` (driver id to position and points) replaces the computed
 * standing in the last snapshot, so the card agrees with the Standings page.
 */
export function driverCardSnapshots(
  races: RaceWithResults[],
  sprints: RaceWithResults[],
  quali: RaceWithQualifying[],
  official?: Map<string, { pos: number; points: number }>,
): CardSnapshot[] {
  const run = races.filter((r) => r.Results?.length).sort((a, b) => Number(a.round) - Number(b.round));
  const acc = new Map<string, Acc>();
  const snapshots: CardSnapshot[] = [];

  run.forEach((race, index) => {
    const roundNo = Number(race.round);
    const qualiRound = quali.find((q) => q.round === race.round)?.QualifyingResults ?? [];
    const qualiPos = new Map(qualiRound.map((q) => [q.Driver.driverId, Number(q.position)]));
    const mateOf = (driverId: string, teamId: string) => qualiRound.find((q) => q.Constructor.constructorId === teamId && q.Driver.driverId !== driverId);

    for (const r of race.Results as Result[]) {
      const id = r.Driver.driverId;
      let a = acc.get(id);
      if (!a) {
        a = {
          driverId: id, code: r.Driver.code ?? r.Driver.familyName.slice(0, 3).toUpperCase(), given: r.Driver.givenName, family: r.Driver.familyName,
          number: r.Driver.permanentNumber ?? r.number, nationality: r.Driver.nationality ?? '', team: r.Constructor.name, teamId: r.Constructor.constructorId,
          starts: 0, points: 0, wins: 0, podiums: 0, poles: 0, dnfs: 0, classified: 0, inPoints: 0, finishes: [], qualis: [], duelWins: 0, duelRounds: 0,
          form: [], best: null, worst: null, byRound: new Map(),
        };
        acc.set(id, a);
      }
      a.team = r.Constructor.name;
      a.teamId = r.Constructor.constructorId;
      a.starts++;
      a.points += Number(r.points) || 0;
      if (isClassified(r)) {
        const p = Number(r.positionText);
        a.classified++;
        a.finishes.push(p);
        a.form.push(p);
        a.byRound.set(roundNo, p);
        if (p === 1) a.wins++;
        if (p <= 3) a.podiums++;
        if (p <= 10) a.inPoints++;
        if (!a.best || p < a.best.pos) a.best = { pos: p, race: shortRace(race.raceName) };
        if (!a.worst || p > a.worst.pos) a.worst = { pos: p, race: shortRace(race.raceName) };
      } else {
        a.dnfs++;
        a.form.push(null);
        a.byRound.set(roundNo, 99);
      }
      const q = qualiPos.get(id);
      if (q != null) {
        a.qualis.push(q);
        if (q === 1) a.poles++;
        const mate = mateOf(id, r.Constructor.constructorId);
        if (mate) {
          a.duelRounds++;
          if (q < Number(mate.position)) a.duelWins++;
        }
      }
    }
    // Sprint points count towards the championship.
    const sprint = sprints.find((s) => s.round === race.round)?.SprintResults ?? [];
    for (const s of sprint) {
      const a = acc.get(s.Driver.driverId);
      if (a) a.points += Number(s.points) || 0;
    }

    // Standing: points, then wins, then podiums.
    const order = [...acc.values()].sort((x, y) => y.points - x.points || y.wins - x.wins || y.podiums - x.podiums || x.family.localeCompare(y.family));
    const posOf = new Map(order.map((a, i) => [a.driverId, i + 1]));
    const last = index === run.length - 1;

    const raws = new Map<string, CardData['raw']>();
    for (const a of acc.values()) {
      raws.set(a.driverId, {
        pointsPerRace: a.starts ? round1(a.points / a.starts) : null,
        qualifying: round1(mean(a.qualis)),
        finish: round1(mean(a.finishes)),
        pointsFinishes: a.starts ? Math.round((100 * a.inPoints) / a.starts) : null,
        finishRate: a.starts ? Math.round((100 * a.classified) / a.starts) : null,
        duel: [a.duelWins, a.duelRounds],
      });
    }
    const score = (raw: CardData['raw'], k: number): number | null => {
      switch (k) {
        case 0: return raw.pointsPerRace;
        case 1: return raw.qualifying == null ? null : -raw.qualifying;
        case 2: return raw.finish == null ? null : -raw.finish;
        case 3: return raw.pointsFinishes;
        case 4: return raw.finishRate;
        default: return raw.duel[1] ? raw.duel[0] / raw.duel[1] : null;
      }
    };
    const eligible = [...acc.values()].filter((a) => a.starts >= MIN_STARTS);
    const field = Array.from({ length: 6 }, (_, k) => eligible.map((a) => score(raws.get(a.driverId)!, k)).filter((v): v is number => v != null));

    const cards: Record<string, CardData> = {};
    for (const a of acc.values()) {
      const raw = raws.get(a.driverId)!;
      let ratings: (number | null)[] | null = null;
      if (a.starts >= MIN_STARTS) {
        ratings = Array.from({ length: 6 }, (_, k) => {
          const v = score(raw, k);
          if (v == null || !field[k].length) return null;
          const rank = 1 + field[k].filter((x) => x > v).length;
          const pct = (100 * (field[k].length - rank)) / Math.max(1, field[k].length - 1);
          return rateFromPercent(pct);
        });
      }
      const mates = [...acc.values()].filter((m) => m.driverId !== a.driverId && m.teamId === a.teamId).sort((x, y) => y.starts - x.starts);
      let mate: Mate | null = null;
      if (mates[0]) {
        const m = mates[0];
        const both = [...a.byRound.keys()].filter((r) => m.byRound.has(r));
        mate = {
          code: m.code,
          family: m.family,
          races: [both.filter((r) => a.byRound.get(r)! < m.byRound.get(r)!).length, both.filter((r) => a.byRound.get(r)! > m.byRound.get(r)!).length, both.length],
          quali: [a.duelWins, a.duelRounds],
          points: [a.points, m.points],
        };
      }
      const off = last ? official?.get(a.driverId) : undefined;
      cards[a.driverId] = {
        driverId: a.driverId, code: a.code, given: a.given, family: a.family, number: a.number, nationality: a.nationality, team: a.team, teamId: a.teamId,
        starts: a.starts, points: off?.points ?? a.points, pos: off?.pos ?? posOf.get(a.driverId)!, wins: a.wins, podiums: a.podiums, poles: a.poles, dnfs: a.dnfs,
        form: a.form.slice(-5), best: a.best, worst: a.worst, raw, ratings, overall: overallRating(ratings), mate,
      };
    }
    snapshots.push({ round: roundNo, race: race.raceName, cards });
  });
  return snapshots;
}
