import { readFile, writeFile, mkdir, rename, rm, mkdtemp, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { renderBlock } from 'readme-aura/dist/renderer.js';
import { parseSource } from 'readme-aura/dist/parser.js';
import { collect, makeClient } from './collect.mjs';
import { verifySnapshot, verifySvg } from './verify.mjs';
import { THEMES } from './themes.mjs';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function build({ root = ROOT, request, now = new Date(), snapshot, allowAggregate = false } = {}) {
  const stats = snapshot ?? await collect(request ?? makeClient(process.env.PROFILE_STATS_TOKEN), now);
  verifySnapshot(stats);
  if (stats.coverage === 'aggregate-only' && !allowAggregate) {
    throw new Error('Detailed private contribution access is missing. Check PROFILE_STATS_TOKEN scopes (repo and read:user) and organization authorization. Previous output retained.');
  }
  const stage = await mkdtemp(join(tmpdir(), 'profile-render-'));
  try {
    const fontRoot = join(dirname(require.resolve('@fontsource/mona-sans/metadata.json')), 'files');
    const fonts = await Promise.all([400, 600].map(async weight => ({
      name: 'Mona Sans', weight, style: 'normal',
      // Read bundled fonts directly: no network/CDN fallback.
      data: await readFile(join(fontRoot, `mona-sans-latin-${weight}-normal.woff`)),
    })));
    const parsed = await parseSource(join(root, 'readme.source.md'), join(root, '.github/assets'), join(root, 'README.md'));
    if (parsed.blocks.length !== 3) throw new Error('Expected three profile cards.');
    let markdown = parsed.markdown;
    const descriptions = ['Contribution totals for the past 365 days', 'Weekly contribution activity for the past 90 days', 'Active repositories and their primary languages'];
    const files = [];
    for (const block of parsed.blocks) {
      // Pass only our validated aggregate object. Do not use the upstream CLI,
      // its public-only collector, or its sample-data fallback.
      const images = [];
      for (const [mode, theme] of Object.entries(THEMES)) {
        const svg = await renderBlock(block, fonts, { stats, theme });
        verifySvg(svg);
        const hash = createHash('sha256').update(svg).digest('hex').slice(0, 12);
        const filename = `profile-${block.index}-${hash}.svg`;
        await writeFile(join(stage, filename), svg);
        files.push(filename);
        images.push(`![${descriptions[block.index]}](./.github/assets/${filename}#gh-${mode}-mode-only)`);
      }
      markdown = markdown.replace(
        new RegExp(`!\\[readme-aura-component-${block.index}\\]\\([^\\n]+\\)`),
        images.join('\n'),
      );
    }
    const format = n => n === null ? 'Unavailable' : n.toLocaleString('en-US');
    const coverage = stats.coverage === 'aggregate-only'
      ? '**Coverage:** Public and anonymous private contribution totals are available. Detailed counts and languages are unavailable with the current credential; they are intentionally not shown as zero.'
      : '**Coverage:** Public and private contribution history available to the credential. Repository details are published only as aggregate counts.';
    const summary = `**Reporting period:** ${stats.period.from} – ${stats.period.to} (365 complete UTC days).\n\n**Last successful refresh:** ${now.toISOString().slice(0, 16).replace('T', ' ')} UTC.\n\n${coverage}\n\n<details>\n<summary>Activity in text</summary>\n\n| Metric | Value |\n| --- | ---: |\n${[
      ['Contributions', stats.totals.contributions], ['Commit contributions', stats.totals.commits],
      ['Pull requests opened', stats.totals.pullRequests], ['Reviews submitted', stats.totals.reviews],
      ['Active repositories', stats.totals.activeRepositories], ['Contributions in the past 90 days', stats.totals.contributions90],
      ['Active days in the past 30 days', stats.totals.activeDays30],
    ].map(([label, value]) => `| ${label} | ${format(value)} |`).join('\n')}\n\n| Activity period | Contributions |\n| --- | ---: |\n${stats.weekly.map(w => `| ${w.from} – ${w.to} | ${format(w.count)} |`).join('\n')}\n\n${stats.languages === null ? 'Language detail unavailable.' : stats.languages.map(l => `${l.name}: ${l.repositories} active repositories`).join(' · ') || 'No language data.'}\n\n</details>`;
    if (!markdown.includes('<!-- PROFILE_SUMMARY -->')) throw new Error('Missing summary placeholder.');
    markdown = markdown.replace('<!-- PROFILE_SUMMARY -->', summary);
    await writeFile(join(stage, 'README.md'), markdown);
    // All fetching, validation and rendering finish before touching public output.
    const assets = join(root, '.github/assets');
    await mkdir(assets, { recursive: true });
    for (const file of files) await rename(join(stage, file), join(assets, file));
    await rename(join(stage, 'README.md'), join(root, 'README.md'));
    // The workflow commits README + assets together. Delete only our own obsolete files.
    for (const file of await readdir(assets)) {
      if (/^profile-\d+-[a-f0-9]{12}\.svg$/.test(file) && !files.includes(file)) await rm(join(assets, file));
    }
    return stats;
  } finally { await rm(stage, { recursive: true, force: true }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const stats = await build();
    console.log(`Profile generated successfully (${stats.coverage}). Only aggregate output was written.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
