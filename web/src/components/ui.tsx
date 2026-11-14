import { useEffect, useRef, useState, type ReactNode } from 'react';
import { signal } from '../lib/signal';

/* ------------------------------------------------------------------ toast */
type ToastState = { text: string; id: number };
const toastStore = signal<ToastState | null>(null);
export function toast(text: string) { toastStore.set({ text, id: Date.now() }); }

export function Toaster() {
  const t = toastStore.use();
  useEffect(() => {
    if (!t) return;
    const timer = setTimeout(() => toastStore.set(null), 2400);
    return () => clearTimeout(timer);
  }, [t]);
  return <div className={`toast${t ? ' show' : ''}`} role="status" aria-live="polite">{t?.text}</div>;
}

export async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
  catch { toast('Select the text and copy it manually'); }
}

/* ---------------------------------------------------------------- layout */
export function PageHead({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="head rise">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <p className="lede">{children}</p>}
    </header>
  );
}

export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`card ${className}`} style={style}>{children}</div>;
}

export function Chip({ children, tone = '' }: { children: ReactNode; tone?: '' | 'warm' | 'gold' | 'plain' }) {
  return <span className={`chip ${tone}`}>{children}</span>;
}

export function NextStep({ to, label }: { to: string; label: string }) {
  return <div className="next-step"><a className="btn" href={`#/${to}`}>Next: {label} <span aria-hidden="true">→</span></a></div>;
}

export function Failed({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div className="note warm">
      <strong>That did not load.</strong> {(error as Error)?.message || String(error)}{' '}
      <button className="link" type="button" onClick={retry || (() => location.reload())}>Try again</button>
    </div>
  );
}

/** Placeholder blocks shown while content loads, shaped like the content. */
export function Skeleton({ lines = 3, cards = 1, label }: { lines?: number; cards?: number; label?: string }) {
  return (
    <div className="skeleton-wrap" aria-busy="true">
      {label && <p className="loading-label"><span className="dot-pulse" aria-hidden="true" /> {label}</p>}
      {Array.from({ length: cards }, (_, c) => (
        <div className="card skeleton" key={c}>
          <div className="sk sk-title" />
          {Array.from({ length: lines }, (_, i) => <div className="sk" key={i} style={{ width: `${92 - i * 14}%` }} />)}
        </div>
      ))}
    </div>
  );
}

/** Circular progress, 0 to 100. */
export function Ring({ value, size = 92, stroke = 9, label }: { value: number; size?: number; stroke?: number; label?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-fill" strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, Math.max(0, value)) / 100)} />
      </svg>
      <span className="ring-label">{label ?? `${Math.round(value)}%`}</span>
    </div>
  );
}

/** Counts up from 0 to `to` when it first appears. */
export function CountUp({ to, duration = 900 }: { to: number; duration?: number }) {
  const [n, setN] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) { setN(to); return; }
    started.current = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(to); return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{n}</>;
}

/** Async data for a screen, with loading and error states and a retry. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data?: T; error?: unknown; loading: boolean }>({ loading: true });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setState({ loading: true });
    load().then((data) => live && setState({ data, loading: false }), (error) => live && setState({ error, loading: false }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);
  return { ...state, retry: () => setAttempt((a) => a + 1) };
}

/** Light **bold** and line breaks for model replies, without injecting HTML. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') && part.endsWith('**') && part.length > 4
              ? <strong key={j}>{part.slice(2, -2)}</strong>
              : <span key={j}>{part}</span>)}
        </span>
      ))}
    </>
  );
}
