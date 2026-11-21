import type React from 'react';
import type { ConstructorStanding, DriverStanding, RaceWithResults } from '../api/jolpica';
import { useFavouriteTeam } from '../hooks/useFavourite';
import { href } from '../lib/router';
import { FlagIcon } from './Icons';

/** Dashboard strip for the favourite team. Hidden when no team is chosen (the driver strip already prompts). */
export function TeamStrip({ teams, drivers, races }: { teams: ConstructorStanding[]; drivers: DriverStanding[]; races: RaceWithResults[] }) {
  const team = useFavouriteTeam();
  if (!team) return null;
  const idx = teams.findIndex((t) => t.Constructor.constructorId === team.id);
  const me = teams[idx];
  if (!me) {
    return (
      <section className="card fav-prompt" aria-label="Your team">
        <span>
          <span className="team-flag" style={{ '--team': team.colour } as React.CSSProperties}><FlagIcon filled /></span> {team.name} has no standings in this season.
        </span>
      </section>
    );
  }
  const leader = Number(teams[0]?.points ?? 0);
  const pair = drivers.filter((d) => team.codes.has(d.Driver.code ?? ''));
  const total = pair.reduce((a, d) => a + Number(d.points), 0) || 1;
  const last = [...races].reverse().find((r) => r.Results?.some((x) => x.Constructor.constructorId === team.id));
  const lastPos = (code?: string) => {
    const r = last?.Results?.find((x) => x.Driver.code === code);
    return r ? (/^\d+$/.test(r.positionText) ? `P${r.positionText}` : 'DNF') : '-';
  };
  // Second driver in a lighter shade of the team colour.
  const shades = [team.colour, `color-mix(in srgb, ${team.colour} 45%, white)`];

  return (
    <section className="card fav-card team-card" style={{ borderLeftColor: team.colour }} aria-label="Your team">
      <div className="who" style={{ gap: 14 }}>
        <span className="team-flag" style={{ '--team': team.colour } as React.CSSProperties}><FlagIcon filled size={22} /></span>
        <div>
          <div className="kicker" style={{ fontSize: 11 }}>Your team</div>
          <div className="name">{me.Constructor.name}</div>
        </div>
      </div>
      <div className="fav-stats" style={{ marginLeft: 0 }}>
        <div><div className="l">Constructors</div><div className="v">P{me.position ?? me.positionText}</div></div>
        <div><div className="l">Points</div><div className="v">{me.points}</div></div>
        <div><div className="l">To leader</div><div className="v">{idx === 0 ? 'Leader' : `-${leader - Number(me.points)}`}</div></div>
        <div><div className="l">Wins</div><div className="v">{me.wins}</div></div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 'auto', minWidth: 260, flex: '0 1 340px' }}>
        {pair.map((d) => (
          <div key={d.Driver.driverId} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
            <span>
              <strong>{d.Driver.familyName}</strong> <span className="muted">P{d.position ?? d.positionText} · {d.points} pts</span>
            </span>
            <span className="mono">Last race {lastPos(d.Driver.code)}</span>
          </div>
        ))}
        <div className="team-split" aria-label="Share of the team's points">
          {pair.map((d, i) => (
            <div key={d.Driver.driverId} style={{ width: `${(Number(d.points) / total) * 100}%`, background: shades[i % 2] }} />
          ))}
        </div>
      </div>
      <a className="link" href={href('team')} style={{ color: 'var(--text)', fontWeight: 600 }}>Team stats →</a>
    </section>
  );
}
