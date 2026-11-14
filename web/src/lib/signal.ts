import { useSyncExternalStore } from 'react';

/** A tiny shared value components can read and update (used for toasts). */
export function signal<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next: T) { value = next; listeners.forEach((l) => l()); },
    use(): T {
      return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => value);
    },
  };
}
