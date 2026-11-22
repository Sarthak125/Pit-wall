import { isLight } from './theme';
/**
 * Team colours. OpenF1 supplies team_colour for live sessions; these are
 * fallbacks for Jolpica data, keyed by constructorId or a name fragment.
 */
const BY_ID: Record<string, string> = {
  mclaren: '#FF8000',
  ferrari: '#E8002D',
  red_bull: '#3671C6',
  mercedes: '#27F4D2',
  aston_martin: '#229971',
  williams: '#64C4FF',
  alpine: '#0093CC',
  haas: '#B6BABD',
  rb: '#6692FF',
  racing_bulls: '#6692FF',
  alphatauri: '#5E8FAA',
  sauber: '#52E252',
  kick_sauber: '#52E252',
  audi: '#BB0A30',
  cadillac: '#C9A227',
};

const NAME_HINTS: [RegExp, string][] = [
  [/mclaren/i, BY_ID.mclaren],
  [/ferrari/i, BY_ID.ferrari],
  [/racing bulls|\brb\b|visa/i, BY_ID.rb],
  [/red bull/i, BY_ID.red_bull],
  [/mercedes/i, BY_ID.mercedes],
  [/aston/i, BY_ID.aston_martin],
  [/williams/i, BY_ID.williams],
  [/alpine/i, BY_ID.alpine],
  [/haas/i, BY_ID.haas],
  [/audi/i, BY_ID.audi],
  [/sauber/i, BY_ID.sauber],
  [/cadillac/i, BY_ID.cadillac],
];

export const FALLBACK_COLOUR = '#8B93A1';

export function teamColour(idOrName: string | null | undefined, openf1Hex?: string | null): string {
  if (openf1Hex && /^[0-9a-f]{6}$/i.test(openf1Hex)) return `#${openf1Hex}`;
  if (!idOrName) return FALLBACK_COLOUR;
  if (BY_ID[idOrName]) return BY_ID[idOrName];
  return NAME_HINTS.find(([re]) => re.test(idOrName))?.[1] ?? FALLBACK_COLOUR;
}

export const TYRE: Record<string, { colour: string; letter: string; name: string }> = {
  SOFT: { colour: '#EF4444', letter: 'S', name: 'Soft' },
  MEDIUM: { colour: '#FACC15', letter: 'M', name: 'Medium' },
  // White, except on the light theme, where a silver grey still stands out from the page.
  HARD: { get colour() { return isLight() ? '#B9BEC6' : '#F2F2F2'; }, letter: 'H', name: 'Hard' },
  INTERMEDIATE: { colour: '#22C55E', letter: 'I', name: 'Intermediate' },
  WET: { colour: '#3B82F6', letter: 'W', name: 'Wet' },
};

export function tyre(compound: string | null | undefined) {
  return TYRE[(compound ?? '').toUpperCase()] ?? { colour: '#8B93A1', letter: '?', name: 'Unknown' };
}
