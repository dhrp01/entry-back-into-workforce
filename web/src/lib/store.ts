/* App state. One small store, saved to localStorage under the same "rtw.*"
   keys the old page used, so people keep their answers and progress. */
import { useSyncExternalStore } from 'react';

export type Profile = {
  name?: string; lastRole?: string; field?: string; strengths?: string;
  awayDate?: string; improvement?: string; startDate?: string; education?: string;
  [key: string]: unknown;
};
export type ChatMessage = { role: 'coach' | 'you'; text: string };
export type Chat = { messages: ChatMessage[]; previousId: string | null; greeting: string; suggestions: string[]; ready: boolean };
export type Task = { kind: string; text: string; hours: number; url?: string; step?: string };
export type Week = { week: number; starts: string; phase: string; phaseNote: string; tasks: Task[] };
export type Plan = { mode: 'live' | 'starter'; note?: string; understood: string[]; decisions: string[]; weeks: Week[]; totalWeeks: number; hoursPerWeek: number };
export type Turn = { question: string; answer: string };
/** One message from the interview skill (PR #4): an optional intro, the
    question, answer choices and how to pick them, and whether the intake is done. */
export type InterviewQuestion = { intro: string; question: string; options: string[]; selection: 'single' | 'multiple' | 'ranked'; done: boolean; demo_answer?: string };
export type Interview = { turns: Turn[]; question: string; current?: InterviewQuestion | null; roadmap: any };
export type Field = { key: string; label: string; roles: string[] };
export type Config = { ai: boolean; adzuna: boolean; coach: { enabled: boolean; reason: string }; fields: Field[] };

export type State = {
  config: Config | null;
  profile: Profile;
  done: boolean;
  step: number;
  cache: Record<string, any>;
  ticks: Record<string, boolean>;
  resumeText: string;
  resumePdf: { name: string; data: string } | null;
  interview: Interview;
  chat: Chat | null;
  plan: Plan | null;
  jobs: any;
  remoteOnly: boolean;
};

// Persisted fields and the localStorage key each lives under.
const PERSIST: Partial<Record<keyof State, string>> = {
  profile: 'profile', done: 'done', step: 'step', cache: 'cache', ticks: 'ticks',
  resumeText: 'resume', resumePdf: 'resumePdf', interview: 'interview', chat: 'chat', plan: 'plan',
};

function read<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem('rtw.' + key); return v == null ? fallback : JSON.parse(v); }
  catch { return fallback; }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem('rtw.' + key, JSON.stringify(value)); } catch { /* private mode or full */ }
}

const emptyInterview = (): Interview => ({ turns: [], question: '', roadmap: null });

function initial(): State {
  const s: State = {
    config: null,
    profile: read('profile', {}),
    done: read('done', false),
    step: read('step', 0),
    cache: read('cache', {}),
    ticks: read('ticks', {}),
    resumeText: read('resume', ''),
    resumePdf: read('resumePdf', null),
    interview: read('interview', emptyInterview()),
    chat: read('chat', null),
    plan: read('plan', null),
    jobs: null,
    remoteOnly: false,
  };
  // A questionnaire change restarts its position (version 3: five questions).
  if (read('quizVersion', 0) < 3) { s.step = 0; write('step', 0); write('quizVersion', 3); }
  return s;
}

let state = initial();
const listeners = new Set<() => void>();

export function getState() { return state; }

export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const next = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...next };
  for (const k of Object.keys(next) as (keyof State)[]) {
    const key = PERSIST[k];
    if (key) write(key, state[k]);
  }
  listeners.forEach((l) => l());
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => select(state),
  );
}

export function resetAll() {
  try { Object.keys(localStorage).filter((k) => k.startsWith('rtw.')).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
  state = { ...initial(), config: state.config };
  listeners.forEach((l) => l());
}

/** Finishing the questionnaire starts a fresh interview, courses and roadmap. */
export function finishQuestionnaire() {
  setState({ done: true, cache: {}, jobs: null, interview: emptyInterview(), plan: null, ticks: {} });
}
