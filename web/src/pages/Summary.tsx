/* A one-page summary from the five questionnaire answers and, once done, what
   the skills interview found (skill profile and top pathway). */
import { Copy } from 'lucide-react';
import { cached } from '../lib/api';
import { useStore } from '../lib/store';
import { monthLabel } from '../lib/util';
import { Card, Chip, copy, CountUp, Failed, PageHead, Skeleton, useAsync } from '../components/ui';

export default function Summary() {
  const profile = useStore((s) => s.profile);
  const findings = useStore((s) => s.interview.roadmap);
  const { data: s, error, loading, retry } = useAsync(() => cached('summary', '/api/summary', { profile }), []);

  if (loading) return <Skeleton cards={3} label="Putting your summary together" />;
  if (error || !s) return <Failed error={error} retry={retry} />;

  const start = monthLabel(profile.startDate);
  const away = /^(\d{4})-(\d{2})/.exec(profile.awayDate || '');
  const yearsAway = away ? Math.max(0, new Date().getFullYear() - +away[1]) : 0;
  const skills: string[] = (findings?.strengths || []).map((x: any) => x.name);
  const pathway = findings?.pathways?.[0]?.name;

  return (
    <>
      <PageHead eyebrow="Your summary" title={s.headline.charAt(0).toUpperCase() + s.headline.slice(1)}>{s.awayNote}</PageHead>

      <div className="grid three stagger" style={{ marginBottom: 16 }}>
        <Card className="stat lift"><b><CountUp to={yearsAway} /></b><span className="muted small">years of life experience since you stepped away</span></Card>
        <Card className="stat lift"><b><CountUp to={s.weeks} /></b><span className="muted small">weeks to prepare</span></Card>
        <Card className="stat lift"><b><CountUp to={skills.length} /></b><span className="muted small">skills found in your interview</span></Card>
      </div>

      <div className="grid two stagger">
        <Card className="stack lift">
          <h2>🚀 Where you are heading</h2>
          <p style={{ fontSize: '1.2rem', fontWeight: 650 }}>{pathway || profile.lastRole || 'Your next role'}</p>
          <div className="chips">
            {profile.lastRole && pathway && <Chip tone="plain">Last role: {profile.lastRole}</Chip>}
            {start && <Chip tone="plain">Back at work by {start}</Chip>}
          </div>
          <p className="small muted">{pathway ? 'Your top pathway from the skills interview. ' : ''}{s.weeks} weeks to prepare; your roadmap is paced to this.</p>
        </Card>
        <Card className="stack lift">
          <h2>💪 Your skill profile</h2>
          {skills.length
            ? <div className="chips">{skills.map((x, i) => <span className="chip pop" style={{ animationDelay: `${i * 0.05}s` }} key={x}>{x}</span>)}</div>
            : <p className="muted">Your skills appear here after the <a href="#/interview">skills interview</a>, with the evidence from your own answers.</p>}
        </Card>
        <Card className="stack lift">
          <h2>🎓 Your education</h2>
          <p>{profile.education || 'Not answered yet.'}</p>
          <p className="small muted">It goes on your resume as it is. Lapsed certificates still count.</p>
        </Card>
        <Card className="stack lift">
          <h2>📅 Your time away</h2>
          <p>{away ? `Since ${monthLabel(profile.awayDate)}` : 'Not answered yet.'}</p>
          <p className="small muted">Time spent building judgement, not losing it. Your gap sentence below puts it into words.</p>
        </Card>
      </div>

      <Card className="stack rise" style={{ marginTop: 16 }}>
        <div className="row spread"><h2>Your gap, in one sentence</h2><button className="btn ghost small" type="button" onClick={() => copy(s.gapLine)}><Copy aria-hidden /> Copy</button></div>
        <p className="quote">{s.gapLine}</p>
        <p className="small muted">Use this on your resume and LinkedIn, and as the start of your answer in interviews.</p>
      </Card>

      <h2 style={{ margin: '34px 0 14px' }}>Your next three steps</h2>
      <div className="steps-list stagger">{s.firstSteps.map((f: any) => <a key={f.step} href={`#/${f.step}`}>{f.text}</a>)}</div>
      <p className="small muted" style={{ marginTop: 24 }}><a href="#/quiz">Edit my answers</a></p>
    </>
  );
}
