# Profile maintenance

The profile uses readme-aura 1.0.20 (the published version verified at implementation time), with an exact npm lockfile and bundled Mona Sans fonts. GitHub serves the generated SVGs. No separate hosting account or runtime image API is needed.

## One-time credential setup

1. Create a **dedicated classic personal access token** under GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic). Select `read:user` and `repo`, and choose an expiration you can maintain. The classic `repo` scope grants broad repository access, including write capability; the collector only makes read queries. Never reuse an unrelated credential or paste a token into a README, issue, or chat.
2. If relevant, authorize the token for organization SSO. Organizations can restrict classic tokens entirely; inaccessible organization history is outside this profile's coverage.
3. In **sgellock/sgellock → Settings → Secrets and variables → Actions**, create a repository secret named **PROFILE_STATS_TOKEN**. This must belong to `sgellock`.
4. Run the **Profile** workflow. Before the workflow exists on the default branch, rerun the branch's failed refresh job after adding the secret. After merge, use **Actions → Profile → Run workflow**.
5. Inspect the generated profile and verify private activity totals before merging the profile PR. The schedule begins on the default branch once merged.

The stock workflow `GITHUB_TOKEN` cannot supply account-wide private activity. It is used only to push the generated README and images. The dedicated token is supplied only to the collector/render step. Pull requests run tests without secrets. Trusted branch pushes can refresh that branch for review; they do not change the live profile until merged.

This initial implementation deliberately requires the classic `repo` and `read:user` scope headers for detailed output. Fine-grained tokens and GitHub App credentials are not silently assumed equivalent. If organizational policy requires them, add and verify that authentication path before using it.

## Display and metric definitions

- 365 complete UTC dates ending yesterday; no partial day is presented as complete.
- Contributions are the sum of GitHub's contribution calendar days in that exact window. They can include activity beyond the three detailed counters, so the counters are not expected to sum to the contribution total.
- Commits, opened pull requests, and submitted reviews come from the authenticated user's contribution collection, not repository-wide commit histories.
- Active repositories are deduplicated across qualifying commits, issues, pull requests and reviews. Private IDs are held only in memory. Repository-group truncation triggers smaller time-window queries and deduplication; unresolved truncation fails the build.
- Language counts use the primary language of each active repository, with each repository counted once. They are not language bytes, coding time, or individual proficiency. Only the top five languages appear.
- The 90-day trend has 13 bins: six days in the oldest bin and seven days in the others. Active days cover the last 30 complete UTC dates.
- Counts follow GitHub's attribution, branch and visibility rules. They do not include every commit on every branch, guarantee access to every organization, or reconstruct deleted history.

The first checked-in snapshot may have **aggregate-only** coverage if the local sign-in lacks `read:user`. That is real calendar data, with unavailable detailed fields clearly labeled. Scheduled builds require detailed access and reject restricted contributions; they never silently downgrade a complete snapshot or publish mock/zero fallback data.

## Reliability and privacy

The default schedule is 11:23 UTC daily, away from the top-of-hour queue. GitHub may delay schedules and may disable schedules in public repositories after 60 days without repository activity. The README contains a visible last-success timestamp; use manual dispatch if a refresh is overdue. GitHub Actions failure notifications follow your account settings.

The generator completes all fetching, validates a strict aggregate schema, and renders all cards before replacing the README. A failed API response, missing credential, incomplete calendar, insufficient private access, or render failure prevents publication. The workflow commits the README and assets together and never force-pushes. A push conflict fails safely; rerun against the latest branch.

Generated asset names include a content hash to avoid stale image caches. Only this generator's obsolete assets are removed. Daily refresh commits use the GitHub Actions bot, so they do not inflate the owner's activity counts.

No raw API responses, repository names, private IDs, source code, issue/PR titles, or commit messages are saved as files or workflow artifacts. Public aggregates and language names are intentional disclosures. API error bodies are not printed to public logs. Tests use synthetic fixtures exclusively in temporary directories.

## Local development

Use Node.js 22 or newer:

```sh
npm ci --ignore-scripts
npm test
npm run verify
```

To refresh real data, supply the dedicated credential securely in the `PROFILE_STATS_TOKEN` environment variable, then run `npm run build`. Do not put the value in command history. The default build requires complete accessible private detail; no sample-data mode exists in the production command.

Edit `readme.source.md` for content and layout. `scripts/themes.mjs` holds the GitHub-style light/dark palette. Each card is rendered in both themes, and GitHub selects its variant using `#gh-light-mode-only` and `#gh-dark-mode-only` image fragments. The source uses the pinned package's parser and renderer directly. Those are internal package entry points, so upgrades should be deliberate and pass the render tests before changing the lockfile. The upstream CLI is intentionally bypassed because it collects public-only repository statistics and substitutes sample data on failure.

To disable automatic updates, disable the Profile workflow in Actions. Existing README images remain available. To roll back the migration, revert its merge commit.

References: [GitHub contribution rules](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference), [contribution API and read:user](https://docs.github.com/en/graphql/reference/users), [scheduled workflow behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [readme-aura](https://github.com/collectioneur/readme-aura).
