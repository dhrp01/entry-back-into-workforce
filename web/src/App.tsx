import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from 'react';
import { BookOpen, Briefcase, FileText, LayoutDashboard, Map, MapPin, Moon, Sparkles, Sun } from 'lucide-react';
import { getState, resetAll, setState, useStore } from './lib/store';
import { replace, useRoute } from './lib/router';
import { Skeleton, Toaster } from './components/ui';

// Each screen is its own chunk, downloaded the first time it is opened.
const Welcome = lazy(() => import('./pages/Welcome'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Summary = lazy(() => import('./pages/Summary'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const Interview = lazy(() => import('./pages/Interview'));
const Courses = lazy(() => import('./pages/Courses'));
const Resume = lazy(() => import('./pages/Resume'));
const Jobs = lazy(() => import('./pages/Jobs'));
const Resources = lazy(() => import('./pages/Resources'));

const PAGES: Record<string, ComponentType> = {
  interview: Interview, roadmap: Roadmap, courses: Courses, summary: Summary, resume: Resume, jobs: Jobs, resources: Resources,
};
// Old addresses from earlier versions, sent to where that content lives now.
const MOVED: Record<string, string> = { 'interview-roadmap': 'roadmap', chat: 'interview', refresher: 'courses' };

// The journey after the questionnaire: interview, then the roadmap and courses built from it.
const NAV: [string, string, ComponentType<{ 'aria-hidden'?: boolean }>][] = [
  ['interview', 'Skills interview', Sparkles],
  ['roadmap', 'Roadmap', Map],
  ['courses', 'Courses', BookOpen],
  ['summary', 'Summary', LayoutDashboard],
  ['resume', 'Resume', FileText],
  ['jobs', 'Jobs', Briefcase],
  ['resources', 'Utah resources', MapPin],
];

function useTheme() {
  const [theme, setTheme] = useState<string>(() => { try { return localStorage.getItem('rtw.theme') || ''; } catch { return ''; } });
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme; else delete document.documentElement.dataset.theme;
    try { if (theme) localStorage.setItem('rtw.theme', theme); else localStorage.removeItem('rtw.theme'); } catch { /* ignore */ }
  }, [theme]);
  const dark = theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  return { dark, toggle: () => setTheme(dark ? 'light' : 'dark') };
}

export function App() {
  const route = useRoute();
  const config = useStore((s) => s.config);
  const done = useStore((s) => s.done);
  const hasProfile = useStore((s) => Object.keys(s.profile).length > 0);
  const [offline, setOffline] = useState(false);
  const { dark, toggle } = useTheme();
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    fetch('/api/config').then((r) => r.json()).then((c) => setState({ config: c })).catch(() => setOffline(true));
  }, []);

  // Unfinished visitors always land on their saved question, as before.
  useEffect(() => {
    if (!getState().done && route !== 'quiz') replace('quiz');
    else if (MOVED[route]) replace(MOVED[route]);
    else if (route && route !== 'quiz' && !PAGES[route]) replace('');
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
  }, [route, done]);

  if (offline) {
    return <main className="wrap"><div className="note warm"><strong>The app could not reach its server.</strong> Start it with <code>python3 server.py</code> and reload.</div></main>;
  }

  const Page = route === 'quiz' ? Onboarding : PAGES[route] || Welcome;
  const showNav = done && route !== 'quiz';

  return (
    <>
      <header className="top">
        <a className="brand" href="#/" aria-label="MOMentum, Return to Work: home">
          <span className="brand-mark" aria-hidden="true">🌱</span>
          <span className="brand-name"><span className="brand-mom">MOM</span>entum</span>
          <span className="brand-sub">Return to Work</span>
        </a>
        {showNav && (
          <nav className="nav" aria-label="Steps">
            {NAV.map(([key, label, Icon]) => (
              <a key={key} href={`#/${key}`} aria-current={route === key ? 'page' : undefined}>
                <Icon aria-hidden /> {label}
              </a>
            ))}
          </nav>
        )}
        <button className="icon-btn" type="button" onClick={toggle} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} style={{ marginLeft: 'auto' }}>
          {dark ? <Sun /> : <Moon />}
        </button>
      </header>
      <main className="wrap" ref={main} tabIndex={-1}>
        {config ? (
          <Suspense fallback={<Skeleton cards={2} />}>
            <Page key={route} />
          </Suspense>
        ) : <Skeleton cards={2} />}
      </main>
      <footer className="foot">
        <span>Your answers stay in this browser.</span>
        {hasProfile && (
          <button className="link" type="button" onClick={() => {
            if (!confirm('This clears your answers, plan progress and resume from this browser. Continue?')) return;
            resetAll(); replace('');
          }}>Start over</button>
        )}
      </footer>
      <Toaster />
    </>
  );
}
