/* Demo mode. With the API started with INTERVIEW_DEMO=1, #/demo loads the
   recorded demo user's onboarding answers and starts a fresh interview; each
   question then arrives with that user's recorded answer (`demo_answer`). */
import { post } from './api';
import { setState, type InterviewQuestion, type Profile } from './store';
import { replace } from './router';

export async function startDemo() {
  try {
    const { profile } = await post<{ profile: Profile }>('/api/interview/demo', {});
    setState({ profile, done: true, step: 0, cache: {}, ticks: {}, chat: null, plan: null,
      interview: { turns: [], question: '', current: null, roadmap: null } });
    replace('summary');
  } catch (err) {
    console.error('Demo mode is not available:', (err as Error).message);
    replace('');
  }
}

/** Split a recorded answer into the options it picks (in order) and any typed text. */
export function prefill(q: InterviewQuestion): { picked: number[]; typed: string } {
  const picked: number[] = [];
  const typed: string[] = [];
  for (const part of (q.demo_answer || '').split(/ > |; /)) {
    const i = q.options.indexOf(part);
    if (i < 0) typed.push(part);
    else if (!picked.includes(i)) picked.push(i);
  }
  return { picked, typed: typed.filter(Boolean).join('; ') };
}
