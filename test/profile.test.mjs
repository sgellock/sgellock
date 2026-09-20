import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, copyFile, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collect, makeClient, reportingWindow, activeRepositories, GROUPS } from '../scripts/collect.mjs';
import { build } from '../scripts/build.mjs';
import { verifySnapshot, verifyOutput, verifySvg } from '../scripts/verify.mjs';

const NOW = new Date('2026-09-20T12:00:00Z');
const DAY = 86400000;
function fixture({ restricted = 0, detailAccess = true } = {}) {
  const from = Date.parse(reportingWindow(NOW).from);
  const raw = {
    detailAccess, restrictedContributionsCount: restricted,
    totalCommitContributions: 101, totalPullRequestContributions: 22, totalPullRequestReviewContributions: 17,
    contributionCalendar: { weeks: [{ contributionDays: Array.from({ length: 365 }, (_, i) => ({ date: new Date(from + i * DAY).toISOString().slice(0, 10), contributionCount: i % 2 === 0 ? 2 : 0 })) }] },
  };
  const privateRepo = { id: 'PRIVATE_ID_SENTINEL', name: 'PRIVATE_NAME_SENTINEL', primaryLanguage: { name: 'TypeScript', color: '#3178c6' } };
  for (const [field, total] of GROUPS) {
    raw[field] = [{ repository: privateRepo }];
    raw[total] = 1;
  }
  raw.pullRequestContributionsByRepository.push({ repository: { id: 'another-private-id', primaryLanguage: { name: 'Python', color: '#3572a5' } } });
  raw.totalRepositoriesWithContributedPullRequests = 2;
  return raw;
}

test('365 complete UTC days, including leap-year boundary', () => {
  assert.deepEqual(reportingWindow(NOW), { from: '2025-09-20T00:00:00.000Z', to: '2026-09-19T23:59:59.999Z' });
  const leap = reportingWindow(new Date('2024-03-01T18:00:00Z'));
  assert.equal(leap.to, '2024-02-29T23:59:59.999Z');
  assert.equal(Date.parse(leap.to) - Date.parse(leap.from) + 1, 365 * DAY);
});

test('personal counters, repository deduplication, language counts, privacy and weekly reconciliation', async () => {
  const snapshot = await collect(async () => fixture(), NOW);
  verifySnapshot(snapshot);
  assert.equal(snapshot.totals.contributions, 366);
  assert.equal(snapshot.totals.activeDays30, 15);
  assert.equal(snapshot.totals.commits, 101);
  assert.equal(snapshot.totals.activeRepositories, 2);
  assert.equal(snapshot.languages.reduce((s, l) => s + l.repositories, 0), 2);
  assert.equal(snapshot.weekly.reduce((s, w) => s + w.count, 0), snapshot.totals.contributions90);
  assert.doesNotMatch(JSON.stringify(snapshot), /PRIVATE_|private-id/);
});

test('restricted contributions or absent profile scope never become zero detailed counters', async () => {
  for (const options of [{ restricted: 200 }, { detailAccess: false }]) {
    const snapshot = await collect(async () => fixture(options), NOW);
    verifySnapshot(snapshot);
    assert.equal(snapshot.coverage, 'aggregate-only');
    assert.equal(snapshot.totals.commits, null);
    assert.equal(snapshot.totals.activeRepositories, null);
    assert.equal(snapshot.languages, null);
    assert.equal(snapshot.totals.contributions, 366);
  }
});

test('truncated repository groups split time windows and deduplicate across pages', async () => {
  const raw = fixture();
  raw.totalRepositoriesWithContributedCommits = 101;
  const ranges = [];
  const repos = await activeRepositories(raw, { login: 'sgellock', ...reportingWindow(NOW) }, async vars => {
    ranges.push(vars);
    return fixture();
  });
  assert.equal(ranges.length, 2);
  assert.equal(Date.parse(ranges[0].to) + 1, Date.parse(ranges[1].from));
  assert.equal(repos.size, 2);
});

test('unresolved single-day truncation refuses incomplete counts', async () => {
  const raw = fixture();
  raw.totalRepositoriesWithContributedCommits = 101;
  await assert.rejects(activeRepositories(raw, { from: '2026-09-19T00:00:00Z', to: '2026-09-19T23:59:59Z' }, async () => raw), /truncated/);
});

test('missing or duplicate calendar days fail instead of undercounting', async () => {
  const raw = fixture();
  raw.contributionCalendar.weeks[0].contributionDays[5] = raw.contributionCalendar.weeks[0].contributionDays[4];
  await assert.rejects(collect(async () => raw, NOW), /incomplete or duplicated/);
  raw.contributionCalendar.weeks[0].contributionDays.pop();
  await assert.rejects(collect(async () => raw, NOW), /incomplete or duplicated/);
});

test('API rejects partial GraphQL errors, HTTP failures and wrong owner without logging private bodies', async () => {
  const request = makeClient('test-token', async () => new Response(JSON.stringify({ data: { user: {} }, errors: [{ message: 'PRIVATE_ERROR_SENTINEL' }] }), { status: 200 }));
  await assert.rejects(request({ login: 'sgellock' }), error => /incomplete/.test(error.message) && !error.message.includes('PRIVATE_ERROR'));
  await assert.rejects(makeClient('test-token', async () => new Response('PRIVATE_ERROR_SENTINEL', { status: 403 }))({ login: 'sgellock' }), /HTTP 403/);
  await assert.rejects(makeClient('test-token', async () => new Response(JSON.stringify({ data: { viewer: { login: 'someone-else' }, user: { contributionsCollection: fixture() } } })))({ login: 'sgellock' }), /profile owner/);
  assert.throws(() => makeClient(''), /required/);
});

test('classic scope headers determine detailed access', async () => {
  for (const [scopes, expected] of [['repo, read:user', true], ['repo, user', true], ['repo', false], ['', false]]) {
    const request = makeClient('test-token', async () => new Response(JSON.stringify({ data: { viewer: { login: 'sgellock' }, user: { contributionsCollection: fixture() } } }), { headers: { 'x-oauth-scopes': scopes } }));
    assert.equal((await request({ login: 'sgellock' })).detailAccess, expected);
  }
});

test('strict public schema rejects raw/private fields and unsafe SVG dependencies', async () => {
  const s = await collect(async () => fixture(), NOW);
  assert.throws(() => verifySnapshot({ ...s, repositoryName: 'private' }), /Unexpected fields/);
  assert.throws(() => verifySvg('<svg><image href="https://example.com/a.png" /></svg>'), /external/);
  assert.throws(() => verifySvg('<svg><script>alert(1)</script></svg>'), /active/);
});

test('render real package, verify three light/dark card pairs, reject secret fields, and preserve output on failure', async () => {
  const root = await mkdtemp(join(tmpdir(), 'profile-test-'));
  try {
    await copyFile(new URL('../readme.source.md', import.meta.url), join(root, 'readme.source.md'));
    await build({ root, request: async () => fixture(), now: NOW });
    await verifyOutput(root);
    const readme = await readFile(join(root, 'README.md'), 'utf8');
    assert.match(readme, /Commit contributions \| 101/);
    assert.doesNotMatch(readme, /PRIVATE_|private-id/);
    for (const file of await readdir(join(root, '.github/assets'))) {
      assert.doesNotMatch(await readFile(join(root, '.github/assets', file), 'utf8'), /PRIVATE_|private-id/);
    }
    await assert.rejects(build({ root, request: async () => { throw new Error('API unavailable'); }, now: NOW }), /API unavailable/);
    assert.equal(await readFile(join(root, 'README.md'), 'utf8'), readme);
    await assert.rejects(build({ root, request: async () => fixture({ restricted: 200 }), now: NOW }), /private contribution access/);
    assert.equal(await readFile(join(root, 'README.md'), 'utf8'), readme);
    await writeFile(join(root, 'readme.source.md'), '# broken\n\n```aura\n<Missing />\n```');
    await assert.rejects(build({ root, request: async () => fixture(), now: NOW }));
    assert.equal(await readFile(join(root, 'README.md'), 'utf8'), readme);
  } finally { await rm(root, { recursive: true, force: true }); }
});
