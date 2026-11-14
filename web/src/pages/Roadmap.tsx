/* The roadmap, built from the questionnaire and the skills interview: what the
   interview found (skill profile, pathways), then a tickable week-by-week plan
   aimed at the top pathway, with the chosen courses scheduled in. */
import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, ChevronDown, ExternalLink, Heart, RefreshCw, Rocket } from 'lucide-react';
import { buildEverything, type Stage } from '../lib/plan';
import { setState, useStore, type Week } from '../lib/store';
import { celebrate, cheer, safeUrl } from '../lib/util';
import { Findings } from '../components/Findings';
import { Card, Failed, NextStep, PageHead, Ring, toast } from '../components/ui';

const STAGES: [Stage, string][] = [
  ['findings', 'Reading your interview: skills and pathways'],
  ['courses', 'Choosing courses for you'],
  ['weeks', 'Laying out your weeks'],
];

function Building({ stage, withInterview }: { stage: Stage | null; withInterview: boolean }) {
  const stages = withInterview ? STAGES : STAGES.slice(1);
  const at = stages.findIndex(([s]) => s === stage);
  return (
    <Card className="stack rise building">
      <p className="loading-label"><span className="dot-pulse" aria-hidden="true" /> Building your roadmap. This can take a minute.</p>
      <ol className="build-steps">
        {stages.map(([s, label], i) => (
          <li key={s} className={i < at ? 'done' : i === at ? 'now' : ''}>
            <span className="step-dot" aria-hidden="true">{i < at ? <Check size={13} strokeWidth={3} /> : i + 1}</span>{label}
          </li>
        ))}
      </ol>
    </Card>
  );
}

const LEVELS: [number, string, string][] = [
  [100, '🚀', 'Ready to launch'], [75, '🏔️', 'Almost there'], [50, '⚡', 'Halfway hero'], [25, '🔥', 'Building momentum'], [0, '🌱', 'Getting started'],
];
const KIND_ICON: Record<string, React.ReactNode> = { Learn: <BookOpen size={12} />, Career: <Rocket size={12} />, Confidence: <Heart size={12} /> };

export default function Roadmap() {
  const plan = useStore((s) => s.plan);
  const ticks = useStore((s) => s.ticks);
  const findings = useStore((s) => s.interview.roadmap);
  const interviewed = useStore((s) => s.interview.turns.some((t) => t.answer && t.answer !== 'Skipped'));
  const [error, setError] = useState<unknown>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const building = useRef(false);

  useEffect(() => {
    if (plan || error || building.current) return;
    building.current = true;
    buildEverything(setStage).then(() => celebrate(true), setError).finally(() => { building.current = false; setStage(null); });
  }, [plan, error]);

  const title = (
    <PageHead eyebrow="Your roadmap" title={findings ? 'A plan built around you.' : 'One week at a time.'}>
      {plan ? `${plan.totalWeeks} weeks at about ${plan.hoursPerWeek} hours a week. ` : ''}Built from your questionnaire{interviewed ? ' and skills interview' : ''}. Three small tasks a week: one to learn, one for your career, one for your confidence.
    </PageHead>
  );
  if (error) return <>{title}<Failed error={error} retry={() => setError(null)} /></>;
  if (!plan) return <>{title}<Building stage={stage} withInterview={interviewed} /></>;

  const isDone = (w: Week, i: number) => !!ticks[`${w.week}-${i}`];
  const total = plan.weeks.reduce((n, w) => n + w.tasks.length, 0);
  const done = plan.weeks.reduce((n, w) => n + w.tasks.filter((_, i) => isDone(w, i)).length, 0);
  const pct = total ? (done / total) * 100 : 0;
  const current = plan.weeks.find((w) => w.tasks.some((_, i) => !isDone(w, i)));
  const [, emoji, level] = LEVELS.find(([min]) => pct >= min)!;
  const weekDone = (w: Week) => w.tasks.every((_, i) => isDone(w, i));

  const toggle = (w: Week, i: number) => {
    const id = `${w.week}-${i}`;
    const next = { ...ticks, [id]: !ticks[id] };
    setState({ ticks: next });
    if (!next[id]) return;
    const allDone = plan.weeks.every((wk) => wk.tasks.every((_, j) => next[`${wk.week}-${j}`]));
    const thisWeek = w.tasks.every((_, j) => next[`${w.week}-${j}`]);
    if (allDone) { celebrate(true); toast('Plan complete. You are ready! 🚀'); }
    else if (thisWeek) { celebrate(); toast(`Week ${w.week} done! 🎉`); }
    else toast(cheer());
  };

  const rebuild = () => {
    if (done && !confirm('Rebuilding replaces this plan and clears the tasks you have ticked. Continue?')) return;
    setState((s) => { const cache = { ...s.cache }; delete cache.courses; return { plan: null, cache, interview: { ...s.interview, roadmap: null } }; });
  };

  let lastPhase = '';
  return (
    <>
      {title}
      {findings && <Findings plan={findings} />}

      <h2 className="section-title">🗓️ Your week-by-week plan</h2>
      {plan.mode === 'live' ? (
        <Card className="stack rise" style={{ marginBottom: 16 }}>
          <div className="row spread"><span className="chip">✨ Built from your answers</span><button className="btn ghost small" type="button" onClick={rebuild}><RefreshCw aria-hidden /> Rebuild</button></div>
          <div className="grid two">
            <div><h3>What we understood</h3><ul className="reasons">{plan.understood.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>How that shaped your plan</h3><ul className="reasons">{plan.decisions.map((x) => <li key={x}>{x}</li>)}</ul></div>
          </div>
          <p className="small muted">Not quite right? <a href="#/interview">Add to your skills interview</a>, then rebuild. Your courses are on the <a href="#/courses">Courses</a> screen.</p>
        </Card>
      ) : (
        <div className="note rise" style={{ marginBottom: 16 }}>
          <div className="row spread">
            <span><strong>This is the standard plan from your questionnaire.</strong> {plan.note}</span>
            <span className="row">{!interviewed && <a className="btn ghost small" href="#/interview">Do the skills interview</a>}<button className="btn ghost small" type="button" onClick={rebuild}><RefreshCw aria-hidden /> Rebuild</button></span>
          </div>
        </div>
      )}

      <Card className="progress-hero rise">
        <Ring value={pct} size={104} />
        <div className="stack" style={{ flex: 1, minWidth: 200 }}>
          <span className="level">{emoji} {level}</span>
          <h2>{done === 0 ? 'Tick your first task to get going' : done === total ? 'Plan complete. You are ready.' : `${done} of ${total} tasks done`}</h2>
          <p className="muted small">{current ? `You are on week ${current.week} of ${plan.weeks.length}.` : 'Every week is done.'}</p>
        </div>
      </Card>

      {plan.weeks.map((w) => {
        const header = w.phase !== lastPhase ? (lastPhase = w.phase, (
          <div className="phase-head phase" key={`p-${w.week}`}><h2>{w.phase}</h2><span className="muted">{w.phaseNote}</span></div>
        )) : null;
        const isCurrent = current?.week === w.week;
        const expanded = open[w.week] ?? isCurrent;
        const finished = weekDone(w);
        const count = w.tasks.filter((_, i) => isDone(w, i)).length;
        return (
          <div key={w.week}>
            {header}
            <div className={`card week${finished ? ' done' : ''}${isCurrent ? ' current' : ''}`} style={{ marginTop: 12 }}>
              <button className="week-head" type="button" aria-expanded={expanded} onClick={() => setOpen((o) => ({ ...o, [w.week]: !expanded }))}>
                <h3>Week {w.week}</h3>
                {finished ? <span className="chip">✓ Done</span> : isCurrent ? <span className="chip warm">This week</span>
                  : <span className="muted small">from {new Date(w.starts + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>}
                <span className="bar mini" aria-hidden="true"><i style={{ width: `${(count / w.tasks.length) * 100}%` }} /></span>
                <ChevronDown aria-hidden style={{ marginLeft: 'auto', transform: expanded ? 'rotate(180deg)' : '', transition: 'transform .25s' }} />
              </button>
              {expanded && (
                <div className="week-body stagger">
                  {w.tasks.map((t, i) => {
                    const on = isDone(w, i);
                    const url = safeUrl(t.url);
                    return (
                      <label className={`task${on ? ' checked' : ''}`} key={i}>
                        <input type="checkbox" checked={on} onChange={() => toggle(w, i)} />
                        <span className="tick" aria-hidden="true">{on && <Check size={15} strokeWidth={3} />}</span>
                        <span>
                          <span className={`kind ${t.kind}`}>{KIND_ICON[t.kind]} {t.kind}</span><br />
                          <span className="task-text">{t.text}</span>
                          {url && <> <a href={url} target="_blank" rel="noopener noreferrer">Open course <ExternalLink size={12} aria-hidden /></a></>}
                          {!url && t.step && <> <a href={`#/${t.step}`}>Open</a></>}
                        </span>
                        <span className="hours">{t.hours} h</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <NextStep to="courses" label="Your courses" />
    </>
  );
}
