/* PDF resume upload and review (PR #5's flow: /api/resume/pdf then /api/resume). */
import { useRef, useState } from 'react';
import { Copy, FileUp, Sparkles } from 'lucide-react';
import { post } from '../lib/api';
import { getState, setState, useStore } from '../lib/store';
import { celebrate } from '../lib/util';
import { Card, Chip, copy, Failed, NextStep, PageHead, Ring, Skeleton, toast } from '../components/ui';

const ORDER: Record<string, string> = { high: 'Do first', medium: 'Worth doing', low: 'Nice to have' };
const MAX = 2 * 1024 * 1024;

export default function Resume() {
  const profile = useStore((s) => s.profile);
  const pdf = useStore((s) => s.resumePdf);
  const review = useStore((s) => s.cache.resume);
  const ai = useStore((s) => s.config!.ai);
  const [status, setStatus] = useState(pdf?.name || '');
  const [reading, setReading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [over, setOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function load(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') || (file.type && file.type !== 'application/pdf') || file.size > MAX) {
      setStatus('Choose a PDF no larger than 2 MB.'); return;
    }
    setReading(true); setStatus('Reading PDF…');
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read the file.'));
        reader.readAsDataURL(file);
      });
      const result = await post('/api/resume/pdf', { pdf: data.split(',')[1] });
      setState((s) => { const cache = { ...s.cache }; delete cache.resume; return { resumeText: result.text, resumePdf: { name: file.name, data }, cache }; });
      setStatus(file.name);
      toast('Resume loaded 📄');
    } catch (err) { setStatus((err as Error).message); }
    setReading(false);
  }

  async function run() {
    const text = getState().resumeText;
    if (text.trim().length < 40 || !getState().resumePdf) { toast('Upload a PDF resume first'); return; }
    setReviewing(true); setError(null);
    try {
      const r = await post('/api/resume', { profile, resume: text });
      setState((s) => ({ cache: { ...s.cache, resume: r } }));
      if (r.score >= 80) celebrate();
    } catch (err) { setError(err); }
    setReviewing(false);
  }

  return (
    <>
      <PageHead eyebrow="Resume" title="Small edits, big difference.">Upload your PDF resume for specific changes for a {String(profile.targetRole || 'new')} role, including how to present your break.</PageHead>
      <Card className="stack rise">
        <div className={`drop${over ? ' over' : ''}`} role="button" tabIndex={0} aria-label="Upload a PDF resume, up to 2 MB"
          onClick={() => fileInput.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.current?.click(); } }}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); load(e.dataTransfer.files[0]); }}>
          <FileUp aria-hidden />
          <strong>{pdf ? 'Replace your resume' : 'Drop your resume PDF here'}</strong>
          <span className="muted small">or click to choose a file · PDF, up to 2 MB</span>
          <input ref={fileInput} type="file" accept=".pdf,application/pdf" hidden onChange={(e) => { load(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        {status && <p className="small muted" role="status">📄 {status}</p>}
        {pdf && <iframe className="pdf-frame" title="Original resume PDF preview" src={pdf.data} />}
        <button className="btn" type="button" onClick={run} disabled={!pdf || reading || reviewing}><Sparkles aria-hidden /> Review my resume</button>
        <p className="small muted">The preview shows your original PDF formatting. Extracted text may differ and is used only for review. The PDF and text are saved in this browser. {ai ? 'Extracted text is sent to Claude for review.' : 'Extracted text is sent to the local server for review.'}</p>
      </Card>

      <div style={{ marginTop: 22 }}>
        {reviewing ? <Skeleton cards={2} label={ai ? 'Reading your resume. This can take a minute.' : 'Checking your resume'} />
          : error ? <Failed error={error} retry={run} />
          : review && <ReviewResult r={review} />}
      </div>
    </>
  );
}

function ReviewResult({ r }: { r: any }) {
  return (
    <>
      <div className="grid two stagger">
        <Card className="row" style={{ gap: 18, flexWrap: 'nowrap' }}>
          <Ring value={r.score} label={r.score} />
          <div>
            <h2>Ready-to-send score</h2>
            <p className="muted small">{r.score >= 80 ? 'Nearly there. A few finishing touches.' : r.score >= 55 ? 'A solid base. The edits below will lift it quickly.' : 'A good starting draft. Work through the first few edits and check again.'}</p>
            <p className="small muted" style={{ marginTop: 6 }}>{r.mode === 'live' ? 'Reviewed by Claude' : 'Automated check'}</p>
          </div>
        </Card>
        <Card className="stack">
          <h2>Keywords for {r.targetRole}</h2>
          {r.present.length > 0 && <div className="chips">{r.present.map((k: string) => <Chip key={k}>✓ {k}</Chip>)}</div>}
          {r.missing.length ? <><p className="small muted">Not found yet. Add the ones that are true for you:</p><div className="chips">{r.missing.slice(0, 12).map((k: string) => <Chip key={k} tone="plain">+ {k}</Chip>)}</div></> : <p className="muted small">Good coverage.</p>}
        </Card>
      </div>
      {r.strong?.length > 0 && <div className="note" style={{ marginTop: 16 }}><strong>Already working:</strong> {r.strong.join(' · ')}</div>}
      <Card className="stack" style={{ marginTop: 16 }}>
        <div className="row spread"><h2>A summary for the top of the page</h2><button className="btn ghost small" type="button" onClick={() => copy(r.summary)}><Copy aria-hidden /> Copy</button></div>
        <p className="quote">{r.summary}</p>
        <div className="row spread"><h2>Your career break entry</h2><button className="btn ghost small" type="button" onClick={() => copy(r.gapLine)}><Copy aria-hidden /> Copy</button></div>
        <p className="quote">{r.gapLine}</p>
      </Card>
      <h2 style={{ margin: '30px 0 14px' }}>{r.edits.length} suggested edit{r.edits.length === 1 ? '' : 's'}</h2>
      <div className="stagger">
        {r.edits.map((e: any, i: number) => (
          <Card key={i} className={`edit ${e.severity}`}>
            <div className="row spread"><h3>{e.title}</h3><Chip tone="plain">{ORDER[e.severity] || ''}</Chip></div>
            <p className="muted" style={{ marginTop: 6 }}>{e.detail}</p>
            {(e.before || e.after) && (
              <div className="diff">
                {e.before && <div className="before"><b>Now</b>{e.before}</div>}
                {e.after && <div className="after"><b>Suggested</b>{e.after} <button className="link small" type="button" onClick={() => copy(e.after)}>Copy</button></div>}
              </div>
            )}
          </Card>
        ))}
      </div>
      <NextStep to="jobs" label="Jobs" />
    </>
  );
}
