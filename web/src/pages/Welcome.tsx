import { useStore } from '../lib/store';

const JOURNEY = [
  ['📝', 'A short questionnaire', 'Five quick questions about where you are starting.'],
  ['✨', 'A skills interview', 'Tap-to-answer questions that find the skills you already have.'],
  ['🗺️', 'Your roadmap', 'Your skill profile, pathways, and a week-by-week plan.'],
  ['📚', 'Courses', 'Chosen from your interview, for the time you have.'],
  ['📄', 'Resume edits', 'Specific changes, including how to present the gap.'],
  ['💼', 'Live jobs', 'Current postings ranked for you, with who to contact.'],
];

export default function Welcome() {
  const done = useStore((s) => s.done);
  const started = useStore((s) => Object.keys(s.profile).length > 0);
  const hasPlan = useStore((s) => !!s.plan);
  return (
    <section className="hero">
      <span className="hero-badge rise">🌱 MOMentum · Return to Work</span>
      <h1 className="rise">Everything she has, <em>finally in motion.</em></h1>
      <p className="lede rise">Answer a few questions, take a short skills interview, and get a personal plan: your strengths, pathways that fit your life, courses to take, resume edits, and live jobs worth applying to.</p>
      <div className="row rise" style={{ marginTop: 28 }}>
        <a className="btn" href="#/quiz">{done ? 'Edit my answers' : started ? 'Continue where I left off' : 'Start: it takes 2 minutes'}</a>
        {done && <a className="btn ghost" href={`#/${hasPlan ? 'roadmap' : 'interview'}`}>{hasPlan ? 'Go to my roadmap' : 'Continue my skills interview'}</a>}
      </div>
      <ol className="journey stagger">
        {JOURNEY.map(([emoji, title, text]) => (
          <li key={title}><span className="emoji" aria-hidden="true">{emoji}</span><strong>{title}</strong><span className="muted small">{text}</span></li>
        ))}
      </ol>
    </section>
  );
}
