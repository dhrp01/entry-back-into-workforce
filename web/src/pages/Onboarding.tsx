/* The onboarding questionnaire: five short questions, then straight into the
   skills interview. Wording is the onboarding-questionnaire branch's; the field,
   skills and improvement questions were removed (the interview covers them). */
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { finishQuestionnaire, setState, useStore, type Profile } from '../lib/store';
import { go } from '../lib/router';
import { celebrate, MONTHS } from '../lib/util';

type Q = { id: keyof Profile & string; type: 'text' | 'textarea' | 'month'; q: string; hint?: string; placeholder?: string; past?: boolean; emoji: string };

const QUESTIONS: Q[] = [
  { id: 'name', type: 'text', q: 'What should we call you?', placeholder: 'Your name', emoji: '👋' },
  { id: 'lastRole', type: 'text', q: 'What was your most recent role?', placeholder: 'For example, Marketing manager', emoji: '💼' },
  { id: 'awayDate', type: 'month', past: true, q: 'When did you step away from work?', hint: 'A rough month is fine.', emoji: '📅' },
  { id: 'startDate', type: 'month', q: 'When would you like to be back at work?', hint: 'A target, not a deadline.', emoji: '🚀' },
  { id: 'education', type: 'text', q: 'Tell us about your education.', hint: 'Include any qualifications, training or education you would like to share.', placeholder: 'For example, BA in Business or a technical certificate', emoji: '🎓' },
];
const LAST = QUESTIONS.length; // index of the closing card

const answered = (v: unknown) => String(v ?? '').trim() !== '';

function MonthPicker({ value, past, onChange }: { value?: string; past?: boolean; onChange: (v: string) => void }) {
  const m = /^(\d{4})-(\d{2})/.exec(value || '');
  const [month, setMonth] = useState(m ? m[2] : '');
  const [year, setYear] = useState(m ? m[1] : '');
  const now = new Date().getFullYear();
  const years = past ? Array.from({ length: 36 }, (_, i) => now - i) : Array.from({ length: 3 }, (_, i) => now + i);
  const update = (mm: string, yy: string) => { setMonth(mm); setYear(yy); onChange(mm && yy ? `${yy}-${mm}` : ''); };
  return (
    <div className="row">
      <select className="field" aria-label="Month" style={{ flex: 1, minWidth: 150 }} value={month} onChange={(e) => update(e.target.value, year)}>
        <option value="">Month</option>
        {MONTHS.map((name, i) => <option key={name} value={String(i + 1).padStart(2, '0')}>{name}</option>)}
      </select>
      <select className="field" aria-label="Year" style={{ flex: 1, minWidth: 120 }} value={year} onChange={(e) => update(month, e.target.value)}>
        <option value="">Year</option>
        {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
      </select>
    </div>
  );
}

export default function Onboarding() {
  const profile = useStore((s) => s.profile);
  const done = useStore((s) => s.done);
  const saved = useStore((s) => s.step);
  // Returning to the questionnaire after finishing starts from the top, as before.
  const [step, setStep] = useState(() => (done ? 0 : Math.min(Math.max(saved, 0), LAST)));
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const input = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => { setState({ step }); }, [step]);
  useEffect(() => {
    const el = input.current;
    if (el) { el.focus(); el.setSelectionRange?.(el.value.length, el.value.length); }
    if (step === LAST) celebrate(true);
  }, [step]);

  const move = (delta: number) => {
    if (delta > 0 && step === LAST) { finishQuestionnaire(); go('interview'); return; }
    setDir(delta > 0 ? 'fwd' : 'back');
    setStep((s) => Math.max(0, Math.min(LAST, s + delta)));
  };
  const set = (id: string, value: string) => setState((s) => ({ profile: { ...s.profile, [id]: value } }));
  const pct = Math.round((step / LAST) * 100);

  if (step === LAST) {
    return (
      <div className="quiz">
        <Progress step={step} pct={pct} />
        <div className="card qcard finish fwd">
          <span className="big-emoji" aria-hidden="true">🎉</span>
          <p className="eyebrow" style={{ marginTop: 10 }}>Section 1 of 1 complete</p>
          <h1>That is everything we need.</h1>
          <p>You have just done the hardest part, which is starting. Next, a short skills interview so your roadmap and courses fit your real life.</p>
          <div className="quiz-actions">
            <button className="btn ghost" type="button" onClick={() => move(-1)}><ArrowLeft aria-hidden /> Back</button>
            <button className="btn" type="button" onClick={() => move(1)} autoFocus>Start my skills interview <ArrowRight aria-hidden /></button>
          </div>
        </div>
      </div>
    );
  }

  const q = QUESTIONS[step];
  const value = profile[q.id] as string | undefined;
  const ok = answered(value);
  const enter = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && q.type === 'text' && ok) { e.preventDefault(); move(1); } };

  return (
    <div className="quiz">
      <Progress step={step} pct={pct} />
      <div className={`card qcard ${dir}`} key={step}>
        <span className="q-emoji" aria-hidden="true">{q.emoji}</span>
        <p className="eyebrow" style={{ marginTop: 6 }}>Your starting point</p>
        <h1 id="q-title">{q.q}</h1>
        <p className="hint">{q.hint || ' '}</p>

        {q.type === 'text' && (
          <>
            <input ref={input} className="field" type="text" autoComplete="off" maxLength={120} aria-labelledby="q-title"
              placeholder={q.placeholder} value={value || ''} onChange={(e) => set(q.id, e.target.value)} onKeyDown={enter} />
          </>
        )}
        {q.type === 'textarea' && (
          <>
            <textarea ref={input} className="field" maxLength={600} aria-labelledby="q-title" value={value || ''} onChange={(e) => set(q.id, e.target.value)} />
            <p className="count">{(value || '').length} / 600</p>
          </>
        )}
        {q.type === 'month' && <MonthPicker value={value} past={q.past} onChange={(v) => set(q.id, v)} />}

        <div className="quiz-actions">
          <button className="btn ghost" type="button" onClick={() => move(-1)} disabled={step === 0}><ArrowLeft aria-hidden /> Back</button>
          <span className="row">
            {q.type === 'text' && ok && <span className="kbd">or press <kbd>Enter</kbd></span>}
            <button className="btn" type="button" onClick={() => move(1)} disabled={!ok}>Continue <ArrowRight aria-hidden /></button>
          </span>
        </div>
      </div>
    </div>
  );
}

function Progress({ step, pct }: { step: number; pct: number }) {
  return (
    <>
      <div className="quiz-top">
        <span className="small muted">Your starting point</span>
        <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Questionnaire progress"><i style={{ width: `${pct}%` }} /></div>
        <span className="small muted">{pct}%</span>
      </div>
      <div className="dots" aria-hidden="true">
        {Array.from({ length: LAST + 1 }, (_, i) => <i key={i} className={i < step ? 'on' : i === step ? 'now' : ''} />)}
      </div>
    </>
  );
}
