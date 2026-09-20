import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

function assert(condition, message) { if (!condition) throw new Error(message); }
function keys(object, names) {
  assert(object && Object.keys(object).sort().join(',') === [...names].sort().join(','), 'Unexpected fields in public aggregate data.');
}
const isCount = n => Number.isSafeInteger(n) && n >= 0;
const isDate = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(d).toISOString().slice(0, 10) === d;

export function verifySnapshot(s) {
  keys(s, ['schemaVersion', 'period', 'coverage', 'totals', 'weekly', 'languages']);
  assert(s.schemaVersion === 1, 'Unknown aggregate schema.');
  keys(s.period, ['from', 'to']);
  assert(isDate(s.period.from) && isDate(s.period.to) && Date.parse(s.period.to) - Date.parse(s.period.from) === 364 * 86400000, 'Invalid reporting period.');
  assert(['aggregate-only', 'accessible-repositories'].includes(s.coverage), 'Invalid coverage.');
  keys(s.totals, ['contributions', 'commits', 'pullRequests', 'reviews', 'activeRepositories', 'activeDays30', 'contributions90']);
  for (const field of ['contributions', 'activeDays30', 'contributions90']) assert(isCount(s.totals[field]), 'Invalid aggregate count.');
  for (const field of ['commits', 'pullRequests', 'reviews', 'activeRepositories']) {
    assert(s.coverage === 'aggregate-only' ? s.totals[field] === null : isCount(s.totals[field]), 'Invalid detailed coverage.');
  }
  assert(s.totals.activeDays30 <= 30 && s.totals.contributions90 <= s.totals.contributions, 'Inconsistent totals.');
  assert(Array.isArray(s.weekly) && s.weekly.length === 13, 'Incomplete weekly series.');
  let next = Date.parse(s.period.to) - 89 * 86400000;
  let total = 0;
  s.weekly.forEach((w, i) => {
    keys(w, ['from', 'to', 'count']);
    assert(isDate(w.from) && isDate(w.to) && isCount(w.count), 'Invalid weekly data.');
    assert(Date.parse(w.from) === next && Date.parse(w.to) - next === (i === 0 ? 5 : 6) * 86400000, 'Invalid weekly boundaries.');
    next = Date.parse(w.to) + 86400000;
    total += w.count;
  });
  assert(total === s.totals.contributions90, 'Weekly counts do not reconcile.');
  if (s.coverage === 'aggregate-only') assert(s.languages === null, 'Languages require detailed access.');
  else {
    assert(Array.isArray(s.languages) && s.languages.length <= 5, 'Invalid language summary.');
    const seen = new Set();
    for (const lang of s.languages) {
      keys(lang, ['name', 'color', 'repositories']);
      assert(/^[A-Za-z0-9 .#+/_()-]{1,40}$/.test(lang.name) && /^#[a-f0-9]{6}$/i.test(lang.color), 'Invalid language metadata.');
      assert(!seen.has(lang.name), 'Duplicate language.');
      seen.add(lang.name);
      assert(isCount(lang.repositories) && lang.repositories > 0 && lang.repositories <= s.totals.activeRepositories, 'Invalid language count.');
    }
  }
}

export function verifySvg(svg) {
  assert(svg.includes('<svg') && svg.includes('</svg>'), 'Invalid SVG output.');
  assert(!/<script|<foreignObject|\bon\w+\s*=/i.test(svg), 'Unexpected active SVG content.');
  assert(!/(?:href|src)\s*=\s*["'](?:https?:|\/\/)/i.test(svg), 'SVG contains an external asset dependency.');
}

export async function verifyOutput(root) {
  const readme = await readFile(resolve(root, 'README.md'), 'utf8');
  const images = [...readme.matchAll(/!\[[^\]]*\]\((\.\/\.github\/assets\/profile-\d+-[a-f0-9]{12}\.svg)#gh-(light|dark)-mode-only\)/g)];
  assert(images.length === 6, 'Expected light and dark versions of three local profile images.');
  for (let i = 0; i < 3; i++) {
    for (const mode of ['light', 'dark']) {
      assert(images.filter(([, path, theme]) => path.includes(`/profile-${i}-`) && theme === mode).length === 1, 'Missing or duplicate themed card.');
    }
  }
  assert(!/!\[[^\]]*\]\(https?:|<img[^>]+src=["']https?:|github-readme-stats\.vercel\.app/.test(readme), 'README depends on a remote image service.');
  assert(!readme.includes('<!-- PROFILE_SUMMARY -->') && !readme.includes('```aura'), 'README generation is incomplete.');
  for (const [, path] of images) verifySvg(await readFile(resolve(root, path), 'utf8'));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await verifyOutput(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
  console.log('Verified local images, generated README, and SVG safety.');
}
