/* The skills interview, driven by the interview skill (skills/SKILL.md, PR #4).
   Same endpoints and answer format as the old page:
   - /api/interview/question returns { intro, question, options, selection, done }
   - a single choice submits on tap; several picks join with "; "; a ranking joins with " > "
   - a typed answer is added after any picks; "Skipped" skips
   - when `done` is true the intake is over and the person builds their plan. */
import { useLayoutEffect, useRef, useState } from 'react';
import { Check, Send, SkipForward, Wand2 } from 'lucide-react';
import { post } from '../lib/api';
import { getState, setState, useStore, type Interview as InterviewT, type InterviewQuestion } from '../lib/store';
import { go } from '../lib/router';
import { celebrate } from '../lib/util';
import { PageHead } from '../components/ui';

export default function Interview() {
  const data = useStore((s) => s.interview);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState<'' | 'asking'>('');
  const [answer, setAnswer] = useState('');
  const [picked, setPicked] = useState<number[]>([]); // option indexes, in tap order
  const log = useRef<HTMLDivElement>(null);
  const save = (next: InterviewT) => setState({ interview: next });
  const payload = (turns = getState().interview.turns) => ({ profile: getState().profile, turns });

  const q: InterviewQuestion | null = data.question
    ? { intro: '', options: [], selection: 'single', done: false, ...(data.current || {}), question: data.question }
    : null;
  const many = !!q && q.selection !== 'single';

  useLayoutEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' }); }, [data.turns.length, data.question, busy]);

  async function ask(turns = data.turns) {
    setBusy('asking'); setStatus(''); setPicked([]);
    try {
      const r = await post<InterviewQuestion>('/api/interview/question', payload(turns));
      save({ ...getState().interview, question: r.question, current: r });
      if (r.done) celebrate();
    } catch (err) { setStatus((err as Error).message); }
    setBusy('');
  }

  function submit(text: string) {
    const turns = [...data.turns, { question: data.question, answer: text }];
    save({ turns, question: '', current: null, roadmap: null });
    setAnswer(''); setPicked([]);
    ask(turns);
  }

  function send() {
    if (!q) return;
    const chosen = picked.map((i) => q.options[i]).join(q.selection === 'ranked' ? ' > ' : '; ');
    const full = [chosen, answer.trim()].filter(Boolean).join('; ');
    if (full) submit(full);
    else setStatus(q.options.length ? 'Pick an option, type an answer, or skip this question.' : 'Enter an answer or skip this question.');
  }

  function pick(i: number) {
    if (!q) return;
    if (!many) { submit(q.options[i]); return; }
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  }

  /** Hand over to the Roadmap screen, which builds the findings, courses and
      week-by-week plan from this interview and the questionnaire. */
  function finish() {
    setState({ plan: null });
    go('roadmap');
  }

  const head = (
    <PageHead eyebrow="Skills interview" title="Let’s explore your experience.">
      Share only what you are comfortable sharing. Your profile and conversation will be sent to Google Gemini to generate questions and your roadmap. You can skip a question or finish at any time.
    </PageHead>
  );

  const asked = data.turns.length;
  return (
    <>
      {head}
      <div className="interview-meter rise" aria-hidden="true">
        <span className="small muted">{asked} answered</span>
        <div className="bar"><i style={{ width: `${q?.done ? 100 : Math.min(92, asked * 8)}%` }} /></div>
        <span className="small muted">{q?.done ? 'Ready 🎯' : 'Intake'}</span>
      </div>

      <div className="card chat rise">
        <div className="chat-log" ref={log} aria-live="polite">
          {data.turns.map((t, i) => (
            <div key={i} style={{ display: 'contents' }}>
              <div className="msg coach"><span className="avatar" aria-hidden="true">✨</span><div className="bubble">{t.question}</div></div>
              <div className="msg you"><span className="avatar" aria-hidden="true">🙂</span><div className="bubble">{t.answer === 'Skipped' ? <em>Skipped</em> : t.answer}</div></div>
            </div>
          ))}
          {q && (
            <div className="msg coach">
              <span className="avatar" aria-hidden="true">✨</span>
              <div className="bubble">
                {q.intro && <p style={{ whiteSpace: 'pre-line', marginBottom: 8 }}>{q.intro}</p>}
                <strong>{q.question}</strong>
              </div>
            </div>
          )}
          {busy === 'asking' && <div className="msg coach"><span className="avatar" aria-hidden="true">✨</span><div className="bubble"><span className="typing" aria-label="Preparing your next question"><i /><i /><i /></span></div></div>}
          {!q && !busy && (
            <p className="muted small" style={{ textAlign: 'center', margin: 'auto 0' }}>
              {asked ? 'Ready for another question, or generate your roadmap below.' : '✨ Press “Start conversation” and your first question will appear here.'}
            </p>
          )}
        </div>

        {q && !q.done && q.options.length > 0 && (
          <div className="answer-options">
            {q.selection === 'ranked' && <p className="small muted">Tap in order of importance.</p>}
            {q.selection === 'multiple' && <p className="small muted">Pick all that apply.</p>}
            <div className="options-grid" role="group" aria-label="Answer choices">
              {q.options.map((o, i) => {
                const at = picked.indexOf(i);
                return (
                  <button key={o} type="button" className={`option ${q.selection}`} aria-pressed={at >= 0} onClick={() => pick(i)} disabled={!!busy}>
                    <span className="option-mark" aria-hidden="true">{at >= 0 ? (q.selection === 'ranked' ? at + 1 : <Check size={13} strokeWidth={3} />) : ''}</span>
                    {o}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {q?.done ? (
          <div className="chat-form" style={{ justifyContent: 'center' }}>
            <button className="btn" type="button" onClick={finish}><Wand2 aria-hidden /> Build my roadmap and courses</button>
          </div>
        ) : q ? (
          <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <textarea className="field" rows={2} maxLength={4000} value={answer} autoFocus
              aria-label={q.options.length ? 'Or type your own answer' : 'Your answer'}
              placeholder={q.options.length ? 'Or type your own answer' : 'Your answer'}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <button className="btn" type="submit" disabled={!!busy || (!answer.trim() && !picked.length)} aria-label="Continue"><Send aria-hidden /></button>
              <button className="btn ghost small" type="button" onClick={() => submit('Skipped')} disabled={!!busy} title="Skip question" aria-label="Skip question"><SkipForward aria-hidden /></button>
            </div>
          </form>
        ) : (
          <div className="chat-form">
            <button className="btn" type="button" onClick={() => ask()} disabled={!!busy} style={{ flex: 1 }}>{asked ? 'Continue conversation' : 'Start conversation'}</button>
          </div>
        )}
      </div>

      {!q?.done && (
        <div className="build">
          <span className="muted small">{asked} answer{asked === 1 ? '' : 's'} so far. Finish whenever you like.</span>
          <button className="btn ghost small" type="button" onClick={finish} disabled={!!busy}><Wand2 aria-hidden /> Build my roadmap and courses</button>
        </div>
      )}
      {status && <p className="note warm" role="status" style={{ marginTop: 12 }}>{status}</p>}
    </>
  );
}
