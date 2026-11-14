import { getState, setState } from './store';

export async function post<T = any>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || 'The server could not complete that.');
  return data as T;
}

/** POST once per profile and keep the answer until the profile changes. */
export async function cached<T = any>(key: string, path: string, body: unknown): Promise<T> {
  const hit = getState().cache[key];
  if (hit) return hit;
  const data = await post<T>(path, body);
  setState((s) => ({ cache: { ...s.cache, [key]: data } }));
  return data;
}

/** Read a newline-delimited JSON stream, one event per line. */
export async function streamLines(path: string, body: unknown, onEvent: (e: any) => void) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).error || 'The coach could not reply just now.');
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const handle = (line: string) => { if (line.trim()) onEvent(JSON.parse(line)); };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    lines.forEach(handle);
  }
  handle(buffer);
}
