```aura width=800 height=224
<div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: theme.canvas, color: theme.text, padding: '16px 0 8px', fontFamily: 'Mona Sans', fontSize: 14, lineHeight: 1.5, borderTop: `1px solid ${theme.border}` }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div style={{ display: 'flex', fontSize: 16, fontWeight: 600 }}>Contribution activity</div>
    <div style={{ display: 'flex', fontSize: 12, color: theme.muted }}>Past 365 days</div>
  </div>
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
    {[
      ['Contributions', stats.totals.contributions, theme.text],
      ['Commit contributions', stats.totals.commits, theme.text],
      ['Pull requests opened', stats.totals.pullRequests, theme.text],
      ['Reviews submitted', stats.totals.reviews, theme.text],
    ].map(([label, value, color]) => <div key={label} style={{ display: 'flex', flexDirection: 'column', width: 392, height: 72, padding: '8px 16px', borderRadius: 6, background: theme.subtle }}>
      <div style={{ display: 'flex', fontSize: 20, fontWeight: 600, color }}>{value === null ? 'Unavailable' : value.toLocaleString('en-US')}</div>
      <div style={{ display: 'flex', fontSize: 14, marginTop: 4, color: theme.muted }}>{label}</div>
    </div>)}
  </div>
</div>
```

```aura width=800 height=240
<div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: theme.canvas, color: theme.text, padding: '16px 0 8px', fontFamily: 'Mona Sans', fontSize: 14, lineHeight: 1.5, borderTop: `1px solid ${theme.border}` }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div style={{ display: 'flex', fontSize: 16, fontWeight: 600 }}>Recent momentum</div>
    <div style={{ display: 'flex', fontSize: 12, color: theme.muted }}>Past 90 days</div>
  </div>
  <div style={{ display: 'flex', marginTop: 8, fontSize: 14, color: theme.muted }}>{stats.totals.contributions90.toLocaleString('en-US')} contributions · {stats.totals.activeDays30}/30 recent days active</div>
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 112, marginTop: 16, paddingBottom: 4 }}>
    {stats.weekly.map((week, i) => <div key={week.from} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', width: 50, height: '100%' }}>
      <div style={{ display: 'flex', fontSize: 12, marginBottom: 4, color: theme.muted }}>{week.count}</div>
      <div style={{ display: 'flex', width: 36, height: week.count === 0 ? 1 : Math.max(3, Math.round(week.count / Math.max(1, ...stats.weekly.map(w => w.count)) * 80)), background: i === stats.weekly.length - 1 ? theme.greenStrong : theme.green, borderRadius: '5px 5px 0 0' }} />
    </div>)}
  </div>
  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: theme.muted }}>
    <div style={{ display: 'flex' }}>{stats.weekly[0].from}</div>
    <div style={{ display: 'flex' }}>Weekly totals*</div>
    <div style={{ display: 'flex' }}>{stats.period.to}</div>
  </div>
</div>
```

```aura width=800 height=180
<div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: theme.canvas, color: theme.text, padding: '16px 0 8px', fontFamily: 'Mona Sans', fontSize: 14, lineHeight: 1.5, borderTop: `1px solid ${theme.border}` }}>
  <div style={{ display: 'flex', fontSize: 16, fontWeight: 600 }}>Across the codebase</div>
  <div style={{ display: 'flex', fontSize: 14, marginTop: 8, color: theme.muted }}>{stats.totals.activeRepositories === null ? 'Repository detail unavailable with the current credential' : `${stats.totals.activeRepositories} active repositories in the past 365 days`}</div>
  <div style={{ display: 'flex', fontSize: 12, marginTop: 16, color: theme.muted }}>Top languages · By active repository count</div>
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
    {stats.languages === null ? <div style={{ display: 'flex', fontSize: 14, color: theme.muted }}>Private activity is included above as anonymous totals.</div> : stats.languages.length === 0 ? <div style={{ display: 'flex', fontSize: 14 }}>No language data in this period.</div> : stats.languages.map(lang => <div key={lang.name} style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', background: theme.subtle, borderRadius: 6, fontSize: 14 }}>
      <div style={{ display: 'flex', width: 10, height: 10, borderRadius: 5, background: lang.color, marginRight: 10 }} />
      {lang.name}<span style={{ color: theme.muted, marginLeft: 12 }}>{lang.repositories}</span>
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
