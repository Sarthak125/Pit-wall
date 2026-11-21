import { useConstructorStandings, useDriverStandings } from '../hooks/useSeason';
import type { TimingRow } from '../hooks/useLiveTiming';
import { driverHref, teamHref } from '../lib/router';
import { teamColour } from '../lib/teams';

const RACE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const SPRINT = [8, 7, 6, 5, 4, 3, 2, 1];

/**
 * Championship standings if the race (or sprint) ended now: points before this session plus the points each
 * driver's current position would score. Shown only while the session is running, before Jolpica's standings
 * include it.
 */
export function LiveStandings({ season, round, sprint, rows, favCode, favTeam }: { season: string; round: number; sprint: boolean; rows: TimingRow[]; favCode?: string; favTeam?: string }) {
  const ds = useDriverStandings(season);
  const cs = useConstructorStandings(season);
  if (!ds.data || !cs.data) return null;
  // The standings must not already include this session. A race weekend's standings can already hold its sprint.
  if (ds.data.round > round || (sprint && ds.data.round >= round)) return null;
  const table = sprint ? SPRINT : RACE;
  const scored = new Map<string, number>();
  for (const r of rows) {
    const out = r.status === 'RETIRED' || r.status === 'DNS' || r.status === 'DSQ';
    if (r.position != null && !out) scored.set(r.driver.name_acronym, table[r.position - 1] ?? 0);
  }

  const drivers = ds.data.standings.map((s, i) => {
    const code = s.Driver.code ?? '';
    const add = scored.get(code) ?? 0;
    return { s, code, before: Number(s.points), add, total: Number(s.points) + add, was: i + 1, team: s.Constructors[s.Constructors.length - 1] };
  });
  drivers.sort((a, b) => b.total - a.total || a.was - b.was);
  const teamAdd = new Map<string, number>();
  for (const d of drivers) if (d.team) teamAdd.set(d.team.constructorId, (teamAdd.get(d.team.constructorId) ?? 0) + d.add);
  const teams = cs.data.standings.map((s, i) => {
    const add = teamAdd.get(s.Constructor.constructorId) ?? 0;
    return { s, add, total: Number(s.points) + add, was: i + 1 };
  });
  teams.sort((a, b) => b.total - a.total || a.was - b.was);

  const leaderD = drivers[0]?.total ?? 0;
  const leaderT = teams[0]?.total ?? 0;
  const shownD = drivers.filter((d, i) => i < 10 || d.code === favCode);
  const shownT = teams.filter((t, i) => i < 5 || t.s.Constructor.constructorId === favTeam);
  const move = (was: number, now: number) => (was > now ? <span className="diff up">↑{was - now}</span> : was < now ? <span className="diff down">↓{now - was}</span> : <span className="diff">–</span>);

  return (
    <section className="card tight" aria-labelledby="if-now">
      <div className="card-head">
        <div>
          <h2 className="h2" id="if-now">Championship if it ended now</h2>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            Points before this {sprint ? 'sprint' : 'race'} plus what each current position would score ({sprint ? '8 to 1 for the top eight' : '25 to 1 for the top ten'}). Retired cars score nothing.
          </div>
        </div>
      </div>
      <div className="row top">
        <div className="w3 scroll-x">
          <table className="tbl">
            <thead><tr><th>Pos</th><th></th><th>Driver</th><th className="r">Before</th><th className="r">This {sprint ? 'sprint' : 'race'}</th><th className="r">Total</th><th className="r">Gap</th></tr></thead>
            <tbody>
              {shownD.map((d) => {
                const now = drivers.indexOf(d) + 1;
                return (
                  <tr key={d.code || d.s.Driver.driverId} className={d.code === favCode ? 'fav' : undefined}>
                    <td className="mono muted">{now}</td>
                    <td>{move(d.was, now)}</td>
                    <td>
                      <div className="who">
                        <span className="team-bar" style={{ height: 18, background: teamColour(d.team?.constructorId) }} />
                        {d.code ? <a className="name-link" href={driverHref(d.code)}>{d.s.Driver.givenName} {d.s.Driver.familyName}</a> : `${d.s.Driver.givenName} ${d.s.Driver.familyName}`}
                      </div>
                    </td>
                    <td className="r mono muted">{d.before}</td>
                    <td className={`r mono ${d.add ? 'tone-personal' : 'faint'}`}>{d.add ? `+${d.add}` : '0'}</td>
                    <td className="r mono" style={{ fontWeight: 700 }}>{d.total}</td>
                    <td className="r mono muted">{now === 1 ? 'Leader' : `-${leaderD - d.total}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="w2 scroll-x">
          <table className="tbl">
            <thead><tr><th>Pos</th><th></th><th>Team</th><th className="r">+</th><th className="r">Total</th><th className="r">Gap</th></tr></thead>
            <tbody>
              {shownT.map((t) => {
                const now = teams.indexOf(t) + 1;
                const id = t.s.Constructor.constructorId;
                return (
                  <tr key={id} className={id === favTeam ? 'team' : undefined}>
                    <td className="mono muted">{now}</td>
                    <td>{move(t.was, now)}</td>
                    <td><div className="who"><span className="team-bar" style={{ height: 18, background: teamColour(id) }} /><a className="name-link" href={teamHref(id)}>{t.s.Constructor.name}</a></div></td>
                    <td className={`r mono ${t.add ? 'tone-personal' : 'faint'}`}>{t.add ? `+${t.add}` : '0'}</td>
                    <td className="r mono" style={{ fontWeight: 700 }}>{t.total}</td>
                    <td className="r mono muted">{now === 1 ? 'Leader' : `-${leaderT - t.total}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
