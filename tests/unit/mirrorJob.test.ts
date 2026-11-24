import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/** A small stand-in for Jolpica: two seasons with one finished race each. */
function fakeJolpica(): Promise<{ server: Server; url: string }> {
  const server = createServer((req, res) => {
    const path = (req.url ?? '').split('?')[0];
    const season = path.includes('/2025/') ? '2025' : '2026';
    const race = { season, round: '1', raceName: 'Test Grand Prix', date: `${season}-03-01` };
    const withResults = { ...race, Results: [{ number: '1', position: '1', Driver: { driverId: 'a' }, Constructor: { constructorId: 'x' } }] };
    const table = (Races: unknown[]) => ({ MRData: { total: String(Races.length), RaceTable: { season, Races } } });
    res.setHeader('content-type', 'application/json');
    if (/\/races\/?$/.test(path)) res.end(JSON.stringify(table([race])));
    else if (/\/results\/?$/.test(path)) res.end(JSON.stringify(table([withResults])));
    else if (/\/(sprint|qualifying)\/?$/.test(path)) res.end(JSON.stringify(table([])));
    else res.end(JSON.stringify({ MRData: { total: '0', StandingsTable: { season, StandingsLists: [] } } }));
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` })));
}

/** The live site's earlier copy: says 2025 is complete but holds none of its files. */
function fakeSite(): Promise<{ server: Server; url: string }> {
  const server = createServer((req, res) => {
    if (req.url?.endsWith('/data/jolpica/manifest.json')) {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ generatedAt: '2026-01-01T00:00:00Z', dataFrom: '2026-01-01T00:00:00Z', current: '2026', complete: ['2025'], keys: [] }));
    } else { res.statusCode = 404; res.end(); }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/` })));
}

describe('the Jolpica copy job', () => {
  let api: Awaited<ReturnType<typeof fakeJolpica>>, site: Awaited<ReturnType<typeof fakeSite>>, out: string, log: string;
  beforeAll(async () => {
    api = await fakeJolpica();
    site = await fakeSite();
    out = mkdtempSync(join(tmpdir(), 'jolpica-copy-'));
    // The job runs as a separate process, as it does in the workflow (asynchronously, so the stand-in servers can answer).
    log = await new Promise<string>((ok, fail) => {
      execFile(process.execPath, ['scripts/mirror-jolpica.mjs', out, site.url], { env: { ...process.env, JOLPICA_API: api.url, NODE_OPTIONS: '' }, encoding: 'utf8', timeout: 60_000 }, (err, stdout, stderr) => (err ? fail(new Error(`${err.message}\n${stderr}`)) : ok(stdout)));
    });
  }, 90_000);
  afterAll(() => { api.server.close(); site.server.close(); rmSync(out, { recursive: true, force: true }); });

  it('fetches a finished season\'s files that the live copy lacks, instead of leaving them out', () => {
    for (const file of ['2025/races/limit-100.json', '2025/results/limit-100_offset-0.json', '2025/1/results/limit-100.json', '2025/driverstandings/limit-100.json', '2025/1/constructorstandings/limit-100.json']) {
      expect(existsSync(join(out, file)), file).toBe(true);
    }
    expect(log).toContain('0 missing');
    const manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
    expect(manifest.keys).toContain('2025/driverstandings/limit-100.json');
  });
});
