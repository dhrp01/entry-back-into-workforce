/* Courses chosen from the questionnaire and the skills interview (/api/courses).
   With the interview done, Gemini picks from the app's course catalogue and
   explains each choice; otherwise this is the rule-based pick. */
import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { loadCourses } from '../lib/plan';
import { useStore } from '../lib/store';
import { safeUrl } from '../lib/util';
import { Card, Chip, Failed, NextStep, PageHead, Skeleton, useAsync } from '../components/ui';

const FILTERS: [string, string, (c: any) => boolean][] = [
  ['all', 'All', () => true],
  ['free', 'Free', (c) => c.cost === 'Free' || /audit/i.test(c.cost)],
  ['quick', 'Under 10 hours', (c) => c.hours < 10],
  ['field', 'For my field', (c) => c.fieldMatch],
];

export default function Courses() {
  const interviewed = useStore((s) => s.interview.turns.some((t) => t.answer && t.answer !== 'Skipped'));
  const [filter, setFilter] = useState('all');
  const { data, error, loading, retry } = useAsync(() => loadCourses(), []);
  const head = (
    <PageHead eyebrow="Courses" title="Learn what closes the gap.">
      Chosen from your {interviewed ? 'skills interview and questionnaire' : 'questionnaire'} for the time you have. Start with one. Finishing it matters more than which one.
    </PageHead>
  );
  if (loading) return <>{head}<Skeleton cards={3} label={interviewed ? 'Choosing courses from your interview' : 'Matching courses'} /></>;
  if (error || !data) return <>{head}<Failed error={error} retry={retry} /></>;

  const test = FILTERS.find(([k]) => k === filter)![2];
  const list = data.courses.filter(test);
  return (
    <>
      {head}
      {data.mode === 'live'
        ? <p className="note rise" style={{ marginBottom: 14 }}>✨ Picked for you from your skills interview, aimed at your top pathway.</p>
        : !interviewed && <p className="note rise" style={{ marginBottom: 14 }}>These are a starting point from your questionnaire. <a href="#/interview">Do the skills interview</a> to get courses chosen for you.</p>}
      <div className="filters" role="group" aria-label="Filter courses" style={{ marginBottom: 16 }}>
        {FILTERS.map(([k, label]) => <button key={k} className="pill" type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}</button>)}
      </div>
      <div className="stagger" key={filter}>
        {list.map((c) => {
          const url = safeUrl(c.url);
          return (
            <Card key={c.title} className="lift">
              <div className="item-head">
                <div><h3>{c.title}</h3><p className="muted small">{c.provider}</p></div>
                {c === data.courses[0] && <Chip tone="warm">⭐ Start here</Chip>}
              </div>
              <p style={{ marginTop: 10 }}>{c.why}</p>
              <div className="row" style={{ marginTop: 14 }}>
                <Chip tone={c.cost === 'Free' ? '' : 'plain'}>{c.cost}</Chip>
                <Chip tone="plain">⏱ About {c.hours} hours</Chip>
                {c.fieldMatch && <Chip tone="plain">For your field</Chip>}
                {c.fits ? <Chip tone="plain">Fits your timeline</Chip> : <Chip tone="gold">Longer than your plan: start now, finish after</Chip>}
                {url && <a className="btn small" style={{ marginLeft: 'auto' }} href={url} target="_blank" rel="noopener noreferrer">View course <ExternalLink aria-hidden /></a>}
              </div>
            </Card>
          );
        })}
        {!list.length && <p className="muted">No courses match that filter.</p>}
      </div>
      <p className="small muted" style={{ marginTop: 18 }}>Links open the provider's own site. "Free to audit" means the lessons are free and the certificate is paid.</p>
      <NextStep to="resume" label="Resume" />
    </>
  );
}
