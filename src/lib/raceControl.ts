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
    other: { tab: 'Other', label: msg.category ? msg.category.toUpperCase() : 'INFO', tone: 'grey' },
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
}

export function summariseTrackLimits(msgs: ClassifiedMsg[]): LimitsSummary[] {
  const map = new Map<number, LimitsSummary>();
  for (const m of msgs) {
    if (m.kind !== 'limits') continue;
    const text = m.message.toUpperCase();
    for (const car of m.cars) {
      const row = map.get(car) ?? { car, deleted: 0, blackAndWhite: false };
      if (/DELETED/.test(text)) row.deleted++;
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
