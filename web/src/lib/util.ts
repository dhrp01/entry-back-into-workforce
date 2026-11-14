export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function monthLabel(ym?: string) {
  const m = /^(\d{4})-(\d{2})/.exec(ym || '');
  return m ? `${MONTHS[+m[2] - 1]} ${m[1]}` : '';
}

/** Links come from job boards and models: only ever render http(s). */
export function safeUrl(u?: string) {
  return /^https?:\/\//i.test(String(u || '')) ? String(u) : undefined;
}

export const article = (word = '') => (/^[aeiou]/i.test(word) ? 'an' : 'a');

export function splitList(text = '') {
  return text.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
}

export const FIELD_EMOJI: Record<string, string> = {
  software: '💻', data: '📊', marketing: '📣', finance: '💰', hr: '🤝', healthcare: '🩺',
  education: '🎓', design: '🎨', sales: '📈', operations: '🗂️', admin: '🗃️', other: '✨',
};

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A burst of confetti. Loaded only when first used, and skipped for reduced motion. */
export async function celebrate(big = false) {
  if (reduceMotion()) return;
  const { default: confetti } = await import('canvas-confetti');
  const colors = ['#0e6b5b', '#58c5ad', '#d9583b', '#e4b65c', '#ffffff'];
  confetti({ particleCount: big ? 160 : 70, spread: big ? 100 : 70, origin: { y: 0.65 }, colors, scalar: 0.9 });
  if (big) setTimeout(() => confetti({ particleCount: 90, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors }), 220);
  if (big) setTimeout(() => confetti({ particleCount: 90, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors }), 380);
}

const CHEERS = ['Nice. One step closer.', 'That counts!', 'Look at you go.', 'Momentum!', 'Another one done.', 'Keep it up.'];
export const cheer = () => CHEERS[Math.floor(Math.random() * CHEERS.length)];
