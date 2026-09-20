const DAY = 86_400_000;
export const GROUPS = [
  ['commitContributionsByRepository', 'totalRepositoriesWithContributedCommits'],
  ['issueContributionsByRepository', 'totalRepositoriesWithContributedIssues'],
  ['pullRequestContributionsByRepository', 'totalRepositoriesWithContributedPullRequests'],
  ['pullRequestReviewContributionsByRepository', 'totalRepositoriesWithContributedPullRequestReviews'],
];

export const QUERY = `query Profile($login: String!, $from: DateTime!, $to: DateTime!) {
  viewer { login }
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      restrictedContributionsCount
      totalCommitContributions
      totalPullRequestContributions(excludeFirst: false, excludePopular: false)
      totalPullRequestReviewContributions
      totalRepositoriesWithContributedCommits
      totalRepositoriesWithContributedIssues(excludeFirst: false, excludePopular: false)
      totalRepositoriesWithContributedPullRequests(excludeFirst: false, excludePopular: false)
      totalRepositoriesWithContributedPullRequestReviews
      contributionCalendar { weeks { contributionDays { date contributionCount } } }
      ${GROUPS.map(([field]) => `${field}(maxRepositories: 100${/^(issue|pullRequestContributions)/.test(field) ? ', excludeFirst: false, excludePopular: false' : ''}) {
        repository { id primaryLanguage { name color } }
      }`).join('\n')}
    }
  }
}`;

export function reportingWindow(now = new Date()) {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 1;
  return { from: new Date(end + 1 - 365 * DAY).toISOString(), to: new Date(end).toISOString() };
}

function count(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid contribution count.');
  return value;
}

export function makeClient(token, fetcher = fetch) {
  if (!token) throw new Error('PROFILE_STATS_TOKEN is required. No sample data will be published.');
  return async (variables) => {
    const response = await fetcher('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'sgellock-profile' },
      body: JSON.stringify({ query: QUERY, variables }),
      signal: AbortSignal.timeout(60_000),
    });
    // Never include API bodies in public logs: errors can contain private resource details.
    if (!response.ok) throw new Error(`GitHub request failed (HTTP ${response.status}).`);
    const result = await response.json();
    if (result.errors?.length || !result.data?.user?.contributionsCollection) {
      throw new Error('GitHub returned incomplete contribution data. Previous output retained.');
    }
    if (result.data.viewer?.login?.toLowerCase() !== variables.login.toLowerCase()) {
      throw new Error('Use a personal credential belonging to the profile owner.');
    }
    const scopes = (response.headers.get('x-oauth-scopes') ?? '').split(',').map(s => s.trim());
    return { ...result.data.user.contributionsCollection,
      detailAccess: scopes.includes('repo') && (scopes.includes('read:user') || scopes.includes('user')) };
  };
}

// Repository group lists are capped by GitHub. Split the period when any group is
// truncated, then deduplicate in memory. Private identifiers are never serialized.
export async function activeRepositories(collection, variables, request, depth = 0) {
  const truncated = GROUPS.some(([field, total]) => {
    if (!Array.isArray(collection[field])) throw new Error('Missing repository coverage.');
    return collection[field].length < count(collection[total]);
  });
  if (truncated) {
    const start = Date.parse(variables.from);
    const end = Date.parse(variables.to);
    if (end - start < DAY || depth > 10) throw new Error('Repository coverage is truncated; refusing incomplete statistics.');
    const split = Math.floor((start + end + 1) / (2 * DAY)) * DAY;
    const merged = new Map();
    for (const range of [
      { from: variables.from, to: new Date(split - 1).toISOString() },
      { from: new Date(split).toISOString(), to: variables.to },
    ]) {
      const vars = { ...variables, ...range };
      const child = await request(vars);
      if (count(child.restrictedContributionsCount) !== 0) throw new Error('Repository coverage changed during collection.');
      for (const [id, language] of await activeRepositories(child, vars, request, depth + 1)) merged.set(id, language);
    }
    return merged;
  }
  const repos = new Map();
  for (const [field] of GROUPS) {
    for (const { repository } of collection[field]) {
      if (!repository?.id) throw new Error('Repository coverage is incomplete.');
      const lang = repository.primaryLanguage;
      if (lang && (typeof lang.name !== 'string' || !/^#[0-9a-f]{6}$/i.test(lang.color))) {
        throw new Error('Invalid language metadata.');
      }
      repos.set(repository.id, lang ? { name: lang.name, color: lang.color } : null);
    }
  }
  return repos;
}

export async function collect(request, now = new Date(), login = 'sgellock') {
  const range = reportingWindow(now);
  const variables = { login, ...range };
  const raw = await request(variables);
  const start = range.from.slice(0, 10);
  const end = range.to.slice(0, 10);
  const days = raw.contributionCalendar.weeks.flatMap(w => w.contributionDays)
    .filter(d => d.date >= start && d.date <= end)
    .map(d => ({ date: d.date, count: count(d.contributionCount) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (days.length !== 365 || days.some((d, i) => d.date !== new Date(Date.parse(range.from) + i * DAY).toISOString().slice(0, 10))) {
    throw new Error('Contribution calendar is incomplete or duplicated.');
  }
  const restricted = count(raw.restrictedContributionsCount);
  const repos = restricted === 0 && raw.detailAccess === true ? await activeRepositories(raw, variables, request) : null;
  const languageCounts = new Map();
  if (repos) for (const lang of repos.values()) {
    if (lang) languageCounts.set(lang.name, { ...lang, repositories: (languageCounts.get(lang.name)?.repositories ?? 0) + 1 });
  }
  const recent = days.slice(-90);
  // Fixed seven-day bins anchored at the period end; the oldest bin contains six days.
  const weekly = [];
  for (let endIndex = recent.length; endIndex > 0; endIndex -= 7) {
    const group = recent.slice(Math.max(0, endIndex - 7), endIndex);
    weekly.unshift({ from: group[0].date, to: group.at(-1).date, count: group.reduce((s, d) => s + d.count, 0) });
  }
  return {
    schemaVersion: 1,
    period: { from: start, to: end },
    coverage: repos === null ? 'aggregate-only' : 'accessible-repositories',
    totals: {
      contributions: days.reduce((s, d) => s + d.count, 0),
      commits: repos ? count(raw.totalCommitContributions) : null,
      pullRequests: repos ? count(raw.totalPullRequestContributions) : null,
      reviews: repos ? count(raw.totalPullRequestReviewContributions) : null,
      activeRepositories: repos ? repos.size : null,
      activeDays30: days.slice(-30).filter(d => d.count > 0).length,
      contributions90: recent.reduce((s, d) => s + d.count, 0),
    },
    weekly,
    languages: repos ? [...languageCounts.values()].sort((a, b) => b.repositories - a.repositories || a.name.localeCompare(b.name)).slice(0, 5) : null,
  };
}
