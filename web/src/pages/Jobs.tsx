import { useState } from 'react';
import { Copy, ExternalLink, RefreshCw, Search, Users } from 'lucide-react';
import { post } from '../lib/api';
import { setState, useStore, type Profile } from '../lib/store';
import { article, safeUrl, splitList } from '../lib/util';
import { Card, copy, Failed, NextStep, PageHead, Ring, Skeleton } from '../components/ui';

function outreach(job: any, p: Profile) {
  const strengths = splitList(p.strengths).slice(0, 2).join(' and ');
  return `Hello,\n\nI have applied for the ${job.title} role at ${job.company}. I am ${article(p.lastRole)} ${p.lastRole || 'professional'} returning to work after a planned career break${strengths ? `, with a background in ${strengths}` : ''}, and I have recently refreshed my skills.\n\nWould you be open to a short conversation about the role and what the team is looking for?\n\nThank you,\n${p.name || ''}`.trim();
}

export default function Jobs() {
  const profile = useStore((s) => s.profile);
  const j = useStore((s) => s.jobs);
  const remoteOnly = useStore((s) => s.remoteOnly);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const role = String(profile.targetRole || profile.lastRole || 'your target role');

  async function find() {
    setLoading(true); setError(null);
    try { setState({ jobs: await post('/api/jobs', { profile }) }); } catch (err) { setError(err); }
    setLoading(false);
  }

  const head = <PageHead eyebrow="Jobs" title="Live roles worth your time.">Current postings, ranked for {role} and the way you want to work. Each one comes with a way to find its recruiters.</PageHead>;
  if (loading) return <>{head}<Skeleton cards={3} lines={4} label="Checking job boards for current postings" /></>;
  if (error) return <>{head}<Failed error={error} retry={find} /></>;
  if (!j) {
    return (
      <>
        {head}
        <Card className="stack rise" style={{ textAlign: 'center', padding: 34 }}>
          <span style={{ fontSize: '2.6rem' }} aria-hidden="true">🔎</span>
          <p>We check public job boards now, so every result is a posting that is open today.</p>
          <div><button className="btn" type="button" onClick={find}><Search aria-hidden /> Find live jobs</button></div>
        </Card>
      </>
    );
  }

  const list = j.jobs.filter((x: any) => !remoteOnly || x.remote);
  const ok = j.sources.filter((s: any) => s.ok).map((s: any) => s.name);
  const bad = j.sources.filter((s: any) => !s.ok).map((s: any) => s.name);
  return (
    <>
      {head}
      <div className="row spread" style={{ marginBottom: 16 }}>
        <span className="muted small">{j.scanned} postings checked from {ok.join(', ') || 'no sources'} at {j.fetchedAt.slice(11)}. {list.length} match{list.length === 1 ? 'es' : ''} you.{bad.length ? ` ${bad.join(', ')} did not respond.` : ''}</span>
        <span className="row">
          <button className="pill" type="button" aria-pressed={remoteOnly} onClick={() => setState({ remoteOnly: !remoteOnly })}>🏠 Remote only</button>
          <button className="btn ghost small" type="button" onClick={find}><RefreshCw aria-hidden /> Refresh</button>
        </span>
      </div>
      {!list.length && (
        <div className="note warm"><strong>No strong matches right now.</strong> These boards lean towards remote and European roles. Try a broader job title in <a href="#/quiz">your answers</a>{j.adzuna ? '' : ', or add a free Adzuna key for local listings (see the README)'}.</div>
      )}
      <div className="stagger">
        {list.map((x: any) => {
          const url = safeUrl(x.url);
          const recruiters = safeUrl(x.recruiterUrl);
          return (
            <Card key={x.url} className="lift">
              <div className="item-head">
                <div><h3>{x.title}</h3><p className="muted">{x.company || 'Company not listed'} · {x.location || 'Location not listed'}</p></div>
                <Ring value={x.match} size={64} stroke={7} label={<span style={{ fontSize: '.95rem' }}>{x.match}%</span>} />
              </div>
              <ul className="reasons">{x.reasons.map((r: string) => <li key={r}>{r}</li>)}</ul>
              <p className="snippet">{x.snippet}{x.snippet.length >= 260 ? '…' : ''}</p>
              <div className="row" style={{ marginTop: 14 }}>
                {url && <a className="btn small" href={url} target="_blank" rel="noopener noreferrer">View and apply <ExternalLink aria-hidden /></a>}
                {recruiters && <>
                  <a className="btn ghost small" href={recruiters} target="_blank" rel="noopener noreferrer"><Users aria-hidden /> Find recruiters on LinkedIn</a>
                  <button className="btn ghost small" type="button" onClick={() => copy(outreach(x, profile))}><Copy aria-hidden /> Copy a message to send</button>
                </>}
                <span className="muted small" style={{ marginLeft: 'auto' }}>{x.posted ? `Posted ${x.posted} · ` : ''}via {x.source}</span>
              </div>
            </Card>
          );
        })}
      </div>
      <NextStep to="roadmap" label="Back to your roadmap" />
      <p className="small muted" style={{ marginTop: 18 }}>The LinkedIn button opens a people search for recruiters at that company in your own LinkedIn account. Match scores are a guide based on your answers, not a prediction.</p>
    </>
  );
}
