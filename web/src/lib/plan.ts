/* Building the plan. The journey is: questionnaire, then the skills interview,
   then this. It turns the questionnaire and interview into three things:
   1. the interview's findings (skill profile and pathways) from /api/interview/roadmap
   2. courses chosen from those, from /api/courses
   3. the week-by-week roadmap built towards the top pathway, from /api/plan
   Each step falls back gracefully, so the person always gets a plan. */
import { post } from './api';
import { getState, setState, type Plan } from './store';

export type Stage = 'findings' | 'courses' | 'weeks';

const answered = () => getState().interview.turns.filter((t) => t.answer && t.answer !== 'Skipped');

/** Interview turns as the conversation the planner reads. */
const transcript = () => getState().interview.turns.flatMap((t) => [{ role: 'coach', text: t.question }, { role: 'you', text: t.answer }]);

/** Courses for the Courses screen and the roadmap, from the questionnaire and interview. */
export async function loadCourses(): Promise<{ mode: string; courses: any[] }> {
  const s = getState();
  const hit = s.cache.courses;
  if (hit) return hit;
  const data = await post('/api/courses', { profile: s.profile, turns: s.interview.turns, findings: s.interview.roadmap });
  setState((st) => ({ cache: { ...st.cache, courses: data } }));
  return data;
}

export async function buildEverything(onStage: (stage: Stage) => void = () => {}): Promise<Plan> {
  // 1. Interview findings, when there are answers to read and none yet.
  if (answered().length && !getState().interview.roadmap) {
    onStage('findings');
    try {
      const findings = await post('/api/interview/roadmap', { profile: getState().profile, turns: getState().interview.turns });
      setState((s) => ({ interview: { ...s.interview, roadmap: findings } }));
    } catch { /* the weekly plan can still be built from the answers themselves */ }
  }
  // 2. Courses, chosen fresh for these answers.
  onStage('courses');
  setState((s) => { const cache = { ...s.cache }; delete cache.courses; return { cache }; });
  let courses: any[] = [];
  try { courses = (await loadCourses()).courses; } catch { /* the planner has its own fallback list */ }
  // 3. The week-by-week roadmap.
  onStage('weeks');
  const plan = await post<Plan>('/api/plan', {
    profile: getState().profile, transcript: transcript(), findings: getState().interview.roadmap, courses,
  });
  setState({ plan, ticks: {} }); // a new plan has new tasks
  return plan;
}
