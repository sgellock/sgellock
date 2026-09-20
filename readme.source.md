# Scott Gellock

Microsoft Copilot Studio · Conversational AI Platform Engineering

[Website](https://www.gellock.com) · [GitHub](https://github.com/sgellock)

```aura width=800 height=380
<div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#121727', color: '#e9edff', padding: 32, borderRadius: 20, border: '1px solid #2b3652' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div style={{ display: 'flex', fontSize: 30, fontWeight: 700 }}>A year of building</div>
    <div style={{ display: 'flex', fontSize: 18, color: '#a4afff' }}>PAST 365 DAYS</div>
  </div>
  <div style={{ display: 'flex', marginTop: 10, fontSize: 20, color: '#aab6d0' }}>Public + private contribution activity</div>
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 26 }}>
    {[
      ['Contributions', stats.totals.contributions, '#9baaff'],
      ['Commit contributions', stats.totals.commits, '#78dce8'],
      ['Pull requests opened', stats.totals.pullRequests, '#c4a4ff'],
      ['Reviews submitted', stats.totals.reviews, '#83dec5'],
    ].map(([label, value, color]) => <div key={label} style={{ display: 'flex', flexDirection: 'column', width: 358, height: 108, padding: '14px 20px', borderRadius: 12, background: '#1b2237' }}>
      <div style={{ display: 'flex', fontSize: value === null ? 28 : 38, fontWeight: 700, color }}>{value === null ? 'Unavailable' : value.toLocaleString('en-US')}</div>
      <div style={{ display: 'flex', fontSize: 19, marginTop: 4, color: '#cad3e9' }}>{label}</div>
    </div>)}
  </div>
</div>
```

```aura width=800 height=360
<div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#121727', color: '#e9edff', padding: 32, borderRadius: 20, border: '1px solid #2b3652' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div style={{ display: 'flex', fontSize: 30, fontWeight: 700 }}>Recent momentum</div>
    <div style={{ display: 'flex', fontSize: 18, color: '#a4afff' }}>PAST 90 DAYS</div>
  </div>
  <div style={{ display: 'flex', marginTop: 12, fontSize: 21, color: '#cad3e9' }}>{stats.totals.contributions90.toLocaleString('en-US')} contributions · {stats.totals.activeDays30}/30 recent days active</div>
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 170, marginTop: 24, borderBottom: '1px solid #45516e', paddingBottom: 10 }}>
    {stats.weekly.map((week, i) => <div key={week.from} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', width: 45, height: '100%' }}>
      <div style={{ display: 'flex', fontSize: 16, marginBottom: 7, color: '#cad3e9' }}>{week.count}</div>
      <div style={{ display: 'flex', width: 36, height: week.count === 0 ? 1 : Math.max(3, Math.round(week.count / Math.max(1, ...stats.weekly.map(w => w.count)) * 115)), background: i === stats.weekly.length - 1 ? '#78dce8' : '#8796ef', borderRadius: '5px 5px 0 0' }} />
    </div>)}
  </div>
  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 18, color: '#aab6d0' }}>
    <div style={{ display: 'flex' }}>{stats.weekly[0].from}</div>
    <div style={{ display: 'flex' }}>Weekly totals*</div>
    <div style={{ display: 'flex' }}>{stats.period.to}</div>
  </div>
</div>
```

```aura width=800 height=310
<div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#121727', color: '#e9edff', padding: 32, borderRadius: 20, border: '1px solid #2b3652' }}>
  <div style={{ display: 'flex', fontSize: 30, fontWeight: 700 }}>Across the codebase</div>
  <div style={{ display: 'flex', fontSize: 21, marginTop: 12, color: '#cad3e9' }}>{stats.totals.activeRepositories === null ? 'Repository detail unavailable with the current credential' : `${stats.totals.activeRepositories} active repositories in the past 365 days`}</div>
  <div style={{ display: 'flex', fontSize: 18, marginTop: 24, color: '#aab6d0' }}>TOP LANGUAGES · BY ACTIVE REPOSITORY COUNT</div>
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
    {stats.languages === null ? <div style={{ display: 'flex', fontSize: 21, color: '#cad3e9' }}>Private activity is included above as anonymous totals.</div> : stats.languages.length === 0 ? <div style={{ display: 'flex', fontSize: 21 }}>No language data in this period.</div> : stats.languages.map(lang => <div key={lang.name} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: '#1b2237', borderRadius: 10, fontSize: 21 }}>
      <div style={{ display: 'flex', width: 10, height: 10, borderRadius: 5, background: lang.color, marginRight: 10 }} />
      {lang.name}<span style={{ color: '#aab6d0', marginLeft: 12 }}>{lang.repositories}</span>
    </div>)}
  </div>
</div>
```

<!-- PROFILE_SUMMARY -->

<details>
<summary>How these numbers work</summary>

Activity follows GitHub's contribution rules, including qualifying contributions in private repositories. Commit contributions are attributed to my account; they are not a total of everyone’s commits in my repositories. Unmerged feature-branch work may not appear.

Active repositories are the distinct repositories with a qualifying commit, issue, pull request, or review during the reporting period. Language counts use each active repository’s primary language; they do not measure coding time or lines I authored. Repositories without a detected language are omitted from the language list.

*The 90-day chart ends with the last complete UTC day. Its oldest bar covers six days; the remaining bars cover seven days each. The reporting period excludes today’s partial activity.*

Private repository names, links, commit messages, and issue titles are never published. Coverage is limited to the profile history and repositories GitHub makes available to the credential. Inaccessible organizations and deleted history may be absent. A successful response does not prove universal repository coverage.

Generated with [readme-aura](https://github.com/collectioneur/readme-aura) on GitHub Actions. Images live in this repository. If a refresh fails, the last successful version stays visible.

</details>
