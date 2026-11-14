/* Utah resources: one to three suggestions matched to her answers, each ending
   in a single next step, then the full vetted directory. */
import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useStore } from '../lib/store';
import { GROUPS, RESOURCES, suggest, type Group, type Resource } from '../lib/utahResources';
import { Card, PageHead } from '../components/ui';

function Links({ r }: { r: Resource }) {
  return (
    <span className="row" style={{ gap: 8 }}>
      {r.links.map((l) => l.href
        ? <a key={l.label} className="chip plain resource-link" href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{l.label} {l.href.startsWith('http') && <ExternalLink size={12} aria-hidden />}</a>
        : <span key={l.label} className="chip plain">{l.label}</span>)}
    </span>
  );
}

export default function Resources() {
  const profile = useStore((s) => s.profile);
  const turns = useStore((s) => s.interview.turns);
  const [group, setGroup] = useState<Group | 'all'>('all');
  const picks = suggest(profile, turns);
  const list = RESOURCES.filter((r) => group === 'all' || r.group === group);

  return (
    <>
      <PageHead eyebrow="Utah resources" title="Local help, matched to you.">
        Programs to connect with, by what you need. Program details change, so check each site for current dates and eligibility.
      </PageHead>

      <h2 className="section-title" style={{ marginTop: 0 }}>⭐ Suggested for you</h2>
      <div className="grid two stagger">
        {picks.map(({ resource: r, why }) => (
          <Card key={r.id} className="stack lift resource-pick">
            <h3>{r.name}</h3>
            <p className="small muted">{why}</p>
            <p>{r.offers}</p>
            <p className="note"><strong>Next step:</strong> {r.nextStep}</p>
            <Links r={r} />
          </Card>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>
        Matched from your questionnaire{turns.length ? ' and skills interview' : ''}.{!turns.length && <> <a href="#/interview">Do the skills interview</a> for closer matches.</>}
      </p>

      <h2 className="section-title">📚 All resources</h2>
      <div className="filters" role="group" aria-label="Filter resources" style={{ marginBottom: 16 }}>
        <button className="pill" type="button" aria-pressed={group === 'all'} onClick={() => setGroup('all')}>All</button>
        {GROUPS.map(([key, label, emoji]) => (
          <button key={key} className="pill" type="button" aria-pressed={group === key} onClick={() => setGroup(key)}>{emoji} {label}</button>
        ))}
      </div>
      {GROUPS.filter(([key]) => group === 'all' || group === key).map(([key, label, emoji]) => (
        <section key={key} style={{ marginBottom: 22 }}>
          <h3 style={{ margin: '6px 0 10px' }}>{emoji} {label}</h3>
          <div className="stagger">
            {list.filter((r) => r.group === key).map((r) => (
              <Card key={r.id} className="stack lift">
                <h3>{r.name}</h3>
                <p>{r.offers}</p>
                <Links r={r} />
              </Card>
            ))}
          </div>
        </section>
      ))}
      <p className="small muted">Source: the team's vetted list of Utah resources. If you need something not listed here, we do not have verified details for it yet.</p>
    </>
  );
}
