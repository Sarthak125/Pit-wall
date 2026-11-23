import { describe, expect, it } from 'vitest';
import { mirrorKey } from '../../src/lib/mirrorKey';

describe('mirror file names', () => {
  it('turns a Jolpica request into a file path', () => {
    expect(mirrorKey('current/results/?limit=100&offset=0')).toBe('current/results/limit-100_offset-0.json');
    expect(mirrorKey('2025/3/sprint/?limit=100')).toBe('2025/3/sprint/limit-100.json');
    expect(mirrorKey('/current/races/')).toBe('current/races/index.json');
  });
  it('gives different requests different files', () => {
    expect(mirrorKey('current/results/?limit=100&offset=100')).not.toBe(mirrorKey('current/results/?limit=100&offset=0'));
  });
});
