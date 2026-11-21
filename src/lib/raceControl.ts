/**
 * Classifies FIA race control messages. OpenF1 gives the raw message text
 * plus a category and flag; penalties, investigations and "noted" incidents
 * are only told apart by the stewards' standard wording, which this parses.
 */
import type { RaceControlMsg } from '../api/openf1';

export type MsgKind = 'penalty' | 'investigation' | 'noted' | 'nfa' | 'limits' | 'flag' | 'safetycar' | 'other';

export type MsgTab = 'All' | 'Penalties' | 'Investigations' | 'Noted' | 'Track limits' | 'Flags' | 'Other';

export const TABS: MsgTab[] = ['All', 'Penalties', 'Investigations', 'Noted', 'Track limits', 'Flags', 'Other'];

export interface ClassifiedMsg extends RaceControlMsg {
  id: string;
  kind: MsgKind;
  tab: MsgTab;
  label: string;
  cars: number[];
  tone: 'red' | 'amber' | 'grey' | 'blue' | 'violet' | 'green';
}

const CAR_RE = /\bCARS?\s+((?:\d{1,2}\s*\([A-Z]{3}\)(?:\s*(?:,|AND)\s*)?)+)/g;
const CAR_NUM_RE = /(\d{1,2})\s*\([A-Z]{3}\)/g;

export function carsIn(msg: Pick<RaceControlMsg, 'message' | 'driver_number'>): number[] {
  const cars = new Set<number>();
  if (msg.driver_number) cars.add(msg.driver_number);
  for (const group of msg.message.toUpperCase().matchAll(CAR_RE)) {
    for (const m of group[1].matchAll(CAR_NUM_RE)) cars.add(Number(m[1]));
  }
  return [...cars];
}

export function classify(msg: RaceControlMsg, index: number): ClassifiedMsg {
  const text = msg.message.toUpperCase();
  const flag = (msg.flag ?? '').toUpperCase();
  let kind: MsgKind;

  if (/NO FURTHER (INVESTIGATION|ACTION)|REVIEWED NO/.test(text)) kind = 'nfa';
  else if (/UNDER INVESTIGATION|WILL BE INVESTIGATED/.test(text)) kind = 'investigation';
  else if (/PENALTY|REPRIMAND|DISQUALIFIED|BLACK AND ORANGE/.test(text)) kind = 'penalty';
  else if (/\bNOTED\b/.test(text)) kind = 'noted';
  else if (/TRACK LIMITS|DELETED/.test(text) || flag === 'BLACK AND WHITE') kind = 'limits';
  else if (msg.category === 'SafetyCar' || /SAFETY CAR/.test(text)) kind = 'safetycar';
  else if (msg.category === 'Flag' || flag) kind = 'flag';
  else kind = 'other';

  const meta: Record<MsgKind, { tab: MsgTab; label: string; tone: ClassifiedMsg['tone'] }> = {
    penalty: { tab: 'Penalties', label: 'PENALTY', tone: 'red' },
    investigation: { tab: 'Investigations', label: 'UNDER INVESTIGATION', tone: 'amber' },
    noted: { tab: 'Noted', label: 'NOTED', tone: 'grey' },
    nfa: { tab: 'Noted', label: 'NO FURTHER ACTION', tone: 'blue' },
    limits: { tab: 'Track limits', label: 'TRACK LIMITS', tone: 'violet' },
    safetycar: { tab: 'Flags', label: /VIRTUAL/.test(text) ? 'VSC' : 'SAFETY CAR', tone: 'amber' },
    flag: { tab: 'Flags', label: flag ? `${flag} FLAG`.replace('FLAG FLAG', 'FLAG') : 'FLAG', tone: flagTone(flag) },
    other: { tab: 'Other', label: msg.category === 'SessionStatus' ? 'SESSION' : msg.category === 'Drs' ? 'DRS' : 'INFO', tone: 'grey' },
  };

  return { ...msg, id: `${msg.date}-${index}`, kind, cars: carsIn(msg), ...meta[kind] };
}

function flagTone(flag: string): ClassifiedMsg['tone'] {
  if (flag === 'GREEN' || flag === 'CLEAR') return 'green';
  if (flag === 'RED') return 'red';
  if (flag.includes('YELLOW')) return 'amber';
  if (flag === 'BLUE') return 'blue';
  return 'grey';
}

export interface PenaltySummary {
  car: number;
  penalty: string;
  reason: string;
  lap: number | null;
  served: boolean;
}

const PENALTY_RE =
  /(\d+\s+SECOND\s+(?:TIME\s+|STOP\/GO\s+)?PENALTY|DRIVE[\s-]THROUGH\s+PENALTY|STOP\/GO\s+PENALTY|\d+\s+PLACE\s+GRID\s+PENALTY|PIT\s+LANE\s+START|REPRIMAND|DISQUALIFIED|BLACK AND ORANGE FLAG)/;

/** Penalties handed out in this session, and whether a later message marks them served. */
export function summarisePenalties(msgs: ClassifiedMsg[]): PenaltySummary[] {
  const chronological = [...msgs].sort((a, b) => a.date.localeCompare(b.date));
  const out: PenaltySummary[] = [];
  for (const m of chronological) {
    const text = m.message.toUpperCase();
    if (m.kind !== 'penalty') continue;
    if (/PENALTY SERVED/.test(text)) {
      for (const car of m.cars) {
        const open = [...out].reverse().find((p) => p.car === car && !p.served);
        if (open) open.served = true;
      }
      continue;
    }
    const match = PENALTY_RE.exec(text);
    const reason = text.includes(' - ') ? text.slice(text.lastIndexOf(' - ') + 3) : '';
    for (const car of m.cars) {
      out.push({ car, penalty: match ? tidyPenalty(match[1]) : 'Penalty', reason: sentence(reason), lap: m.lap_number, served: false });
    }
  }
  return out.reverse();
}

function tidyPenalty(p: string): string {
  const secs = /^(\d+)\s+SECOND\s+TIME/.exec(p);
  if (secs) return `+${secs[1]}s`;
  return sentence(p);
}

function sentence(s: string): string {
  const t = s.trim().toLowerCase();
  return t ? t[0].toUpperCase() + t.slice(1) : '';
}

export interface LimitsSummary {
  car: number;
  deleted: number;
  blackAndWhite: boolean;
  /** Corner number to how many lap times were deleted there. */
  turns: Map<number, number>;
}

export function summariseTrackLimits(msgs: ClassifiedMsg[]): LimitsSummary[] {
  const map = new Map<number, LimitsSummary>();
  for (const m of msgs) {
    if (m.kind !== 'limits') continue;
    const text = m.message.toUpperCase();
    for (const car of m.cars) {
      const row = map.get(car) ?? { car, deleted: 0, blackAndWhite: false, turns: new Map<number, number>() };
      if (/DELETED/.test(text)) {
        row.deleted++;
        const turn = /AT TURN (\d+)/.exec(text);
        if (turn) row.turns.set(Number(turn[1]), (row.turns.get(Number(turn[1])) ?? 0) + 1);
      }
      if (/BLACK AND WHITE/.test(text) || (m.flag ?? '').toUpperCase() === 'BLACK AND WHITE') row.blackAndWhite = true;
      map.set(car, row);
    }
  }
  return [...map.values()].sort((a, b) => b.deleted - a.deleted);
}

/** Investigations with no later decision message for the same cars. */
export function openInvestigations(msgs: ClassifiedMsg[]): ClassifiedMsg[] {
  const chronological = [...msgs].sort((a, b) => a.date.localeCompare(b.date));
  const open: ClassifiedMsg[] = [];
  for (const m of chronological) {
    if (m.kind === 'investigation') {
      open.push(m);
    } else if (m.kind === 'penalty' || m.kind === 'nfa' || m.kind === 'noted') {
      const key = m.cars.slice().sort().join(',');
      const idx = open.findIndex((o) => o.cars.slice().sort().join(',') === key);
      if (idx >= 0) open.splice(idx, 1);
    }
  }
  return open.reverse();
}

export interface TrackStatus {
  label: string;
  tone: ClassifiedMsg['tone'];
}

/** Current track status, worked out from the session's race control messages. */
export function trackStatus(msgs: RaceControlMsg[]): TrackStatus | null {
  let status: TrackStatus | null = null;
  let neutralised: TrackStatus | null = null;
  for (const m of [...msgs].sort((a, b) => a.date.localeCompare(b.date))) {
    const text = m.message.toUpperCase();
    const flag = (m.flag ?? '').toUpperCase();
    if (m.category === 'SafetyCar') {
      if (/DEPLOYED/.test(text)) neutralised = { label: /VIRTUAL/.test(text) ? 'Virtual safety car' : 'Safety car', tone: 'amber' };
      continue;
    }
    if (m.category !== 'Flag') continue;
    const trackWide = (m.scope ?? '').toLowerCase() === 'track';
    if (flag === 'RED') status = { label: 'Red flag', tone: 'red' };
    else if (flag === 'CHEQUERED') {
      status = { label: 'Chequered flag', tone: 'grey' };
      neutralised = null;
    } else if (trackWide && (flag === 'GREEN' || flag === 'CLEAR')) {
      status = { label: 'Track clear', tone: 'green' };
      neutralised = null;
    } else if (trackWide && flag.includes('YELLOW')) status = { label: 'Yellow flag', tone: 'amber' };
  }
  return neutralised && status?.label !== 'Red flag' ? neutralised : status;
}

/* ---------- Plain-English wording ---------- */

export interface Friendly {
  /** Short readable headline. */
  title: string;
  /** Reason or extra context, if the message has any. */
  detail?: string;
}

const ABBREV = /\b(fia|drs|vsc|f1|q[1-3]|sq[1-3]|fp[1-3])\b/gi;

/** Sentence case that keeps abbreviations such as FIA, DRS and Q2, and driver codes like (VER), in capitals. */
function plain(s: string): string {
  const t = s.trim().toLowerCase().replace(/race directors/g, "race director's").replace(/\bfn\b/g, 'f1');
  if (!t) return '';
  return (t[0].toUpperCase() + t.slice(1)).replace(ABBREV, (w) => w.toUpperCase()).replace(/\(([a-z]{3})\)/g, (_m, c: string) => `(${c.toUpperCase()})`);
}

/** "LEC, PIA and NOR" from the "16 (LEC), 81 (PIA) AND 4 (NOR)" part of a message. */
function who(text: string): string {
  const codes = [...text.matchAll(/\b\d{1,2}\s*\(([A-Z]{3})\)/g)].map((m) => m[1]);
  const list = codes.length ? codes : [...text.matchAll(/\bCARS?\s+(\d{1,2})\b/g)].map((m) => `car ${m[1]}`);
  if (list.length <= 1) return list[0] ?? '';
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

/** "FAILING TO FOLLOW RACE DIRECTORS INSTRUCTIONS - MAXIMUM DELTA TIME" to "Failing to follow race director's instructions (maximum delta time)". */
function reason(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const parts = s.split(/\s+[-–]\s+/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return undefined;
  const [head, ...rest] = parts;
  return rest.length ? `${plain(head)} (${rest.map((p) => p.toLowerCase()).join(', ')})` : plain(head);
}

function penaltyName(p: string): string {
  const t = p.trim();
  let m = /^(\d+)\s+SECOND\s+(TIME|STOP\/GO)\s+PENALTY$/.exec(t);
  if (m) return `${m[1]}-second ${m[2] === 'TIME' ? 'time' : 'stop/go'} penalty`;
  m = /^(\d+)\s+PLACE\s+GRID\s+PENALTY$/.exec(t);
  if (m) return `${m[1]}-place grid penalty`;
  if (/^DRIVE[\s-]THROUGH/.test(t)) return 'drive-through penalty';
  return t.toLowerCase();
}

const join = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' · ') || undefined;

/**
 * Turns the stewards' all-caps wording into a short readable headline and a
 * reason line. The original text is still shown on request, so nothing is lost
 * if a message does not match one of the known patterns.
 */
export function friendly(m: Pick<RaceControlMsg, 'message'>, codeOf?: (n: number) => string): Friendly {
  let text = m.message.toUpperCase().replace(/\s+/g, ' ').trim();
  let update: string | undefined;
  text = text.replace(/^FIA STEWARDS:\s*/, '');
  if (/^UPDATE:\s*/.test(text)) {
    update = 'Updated decision';
    text = text.replace(/^UPDATE:\s*/, '');
  }
  let r: RegExpExecArray | null;

  // Incidents: "TURN 4 INCIDENT INVOLVING CARS 1 (VER) AND 4 (NOR) UNDER INVESTIGATION - CAUSING A COLLISION"
  r = /^(.*?)\s*INCIDENT(?: INVOLVING (.+?))?\s+(UNDER INVESTIGATION|WILL BE INVESTIGATED AFTER THE (?:SESSION|RACE)|NOTED|NO FURTHER ACTION|REVIEWED NO FURTHER INVESTIGATION)(?:\s+-\s+(.*))?$/.exec(text);
  if (r) {
    const where = r[1] ? plain(r[1].replace(/(LAP \d+) (TURN \d+)/, '$1, $2')) : '';
    const cars = r[2] ? who(r[2]) : '';
    const title = `${where ? `${where} incident` : 'Incident'}${cars ? ` involving ${cars}` : ''}`;
    const after = /AFTER THE (SESSION|RACE)/.exec(r[3]);
    return { title, detail: join(update, reason(r[4]), after ? `To be investigated after the ${after[1].toLowerCase()}` : undefined) };
  }

  // Penalties served: "PENALTY SERVED - 5 SECOND TIME PENALTY FOR CAR 22 (TSU) - CAUSING A COLLISION"
  r = /^PENALTY SERVED\s+-\s+(.+?)\s+FOR CARS?\s+(.+?)(?:\s+-\s+(.*))?$/.exec(text);
  if (r) return { title: `${who(r[2])} served a ${penaltyName(r[1])}`, detail: join(update, reason(r[3])) };

  // Track limits: "CAR 3 (VER) TIME 1:33.456 DELETED - TRACK LIMITS AT TURN 1 LAP 8 20:13:25"
  r = /^CARS? (.+?\)) (?:TIME ([\d:.]+) |LAP )DELETED\s+-\s+TRACK LIMITS AT TURN (\d+)(?: LAP (\d+))?/.exec(text);
  if (r) {
    const lap = r[4] ? `lap ${r[4]}` : 'lap';
    return { title: `${who(r[1])}: ${lap} time deleted${r[2] ? ` (${r[2]})` : ''}`, detail: `Track limits at turn ${r[3]}` };
  }
  r = /^CARS? (.+?\)) TIME ([\d:.]+) WILL BE REINSTATED/.exec(text);
  if (r) return { title: `${who(r[1])}: lap time ${r[2]} reinstated` };

  // Flags and sanctions aimed at a car: "WAVED BLUE FLAG FOR CAR 18 (STR) TIMED AT 15:04:11"
  r = /^(.+?)\s+FOR CARS?\s+(.+?)(?:\s+TIMED AT [\d:]+)?(?:\s+-\s+(.*))?$/.exec(text);
  if (r && /\(\w{3}\)|\bCARS? \d/.test(`CAR ${r[2]}`)) {
    const what = r[1];
    if (/BLUE FLAG/.test(what)) return { title: `Blue flag for ${who(r[2])}`, detail: 'Let the faster car past' };
    if (/BLACK AND WHITE/.test(what)) return { title: `${who(r[2])}: black and white flag`, detail: join('Warning', reason(r[3])) };
    if (/BLACK AND ORANGE/.test(what)) return { title: `${who(r[2])}: black and orange flag`, detail: join('Must pit to fix a mechanical problem', reason(r[3])) };
    if (/^BLACK FLAG/.test(what)) return { title: `${who(r[2])}: black flag`, detail: join('Disqualified from the session', reason(r[3])) };
    if (/PENALTY|REPRIMAND/.test(what)) {
      return { title: `${who(r[2])}: ${penaltyName(what)}`, detail: join(update, reason(r[3])) };
    }
  }

  // Sector flags.
  r = /^(DOUBLE YELLOW|YELLOW|CLEAR|GREEN) IN TRACK SECTOR (\d+)$/.exec(text);
  if (r) {
    if (r[1] === 'CLEAR' || r[1] === 'GREEN') return { title: `Sector ${r[2]} clear` };
    return { title: `${r[1] === 'DOUBLE YELLOW' ? 'Double yellow' : 'Yellow'} flag in sector ${r[2]}`, detail: r[1] === 'DOUBLE YELLOW' ? 'Slow down a lot, no overtaking, be ready to stop' : 'Slow down, no overtaking' };
  }

  r = /^FIRST CAR TO TAKE THE FLAG\s+-\s+(.+)$/.exec(text);
  if (r) return { title: `${who(r[1])} takes the chequered flag first` };

  r = /^ORDER FOR RESTART:\s*([\d,\s]+)$/.exec(text);
  if (r) {
    const nums = r[1].split(/[,\s]+/).filter(Boolean).map(Number);
    return { title: 'Order for the restart', detail: nums.map((n) => codeOf?.(n) ?? `#${n}`).join(', ') };
  }

  const special: [RegExp, Friendly][] = [
    [/^RED FLAG$/, { title: 'Red flag', detail: 'Session stopped' }],
    [/^CHEQUERED FLAG$/, { title: 'Chequered flag' }],
    [/^GREEN LIGHT - PIT EXIT OPEN$/, { title: 'Pit exit open', detail: 'Green light at the end of the pit lane' }],
    [/^SAFETY CAR IN THIS LAP$/, { title: 'Safety car coming in this lap' }],
    [/^VIRTUAL SAFETY CAR ENDING$/, { title: 'Virtual safety car ending' }],
    [/^DRS ENABLED$/, { title: 'DRS enabled' }],
    [/^DRS DISABLED$/, { title: 'DRS disabled' }],
  ];
  for (const [re, f] of special) if (re.test(text)) return f;

  // Anything else: sentence case, car numbers shown as driver codes, track sectors simplified.
  const tidy = text
    .replace(/\bCARS? \d{1,2} \(([A-Z]{3})\)/g, '($1)')
    .replace(/\bIN TRACK SECTOR\b/g, 'IN SECTOR');
  const title = plain(tidy).replace(/\(([A-Z]{3})\)/g, '$1');
  const at = /\bAT (\d{1,2}:\d{2})\b/.test(text) ? 'Local track time' : undefined;
  return { title, detail: join(update, at) };
}

/** Routine sector and blue flags, which the All tab hides by default. */
export function isMinor(m: ClassifiedMsg): boolean {
  const text = m.message.toUpperCase();
  if (/BLUE FLAG/.test(text)) return true;
  if (m.kind !== 'flag') return false;
  return (m.scope ?? '').toLowerCase() === 'sector' || /IN TRACK SECTOR/.test(text);
}
