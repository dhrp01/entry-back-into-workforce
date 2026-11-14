import { useSyncExternalStore } from 'react';

const read = () => (location.hash.replace(/^#\/?/, '') || '').split('?')[0];

export function useRoute() {
  return useSyncExternalStore(
    (l) => { window.addEventListener('hashchange', l); return () => window.removeEventListener('hashchange', l); },
    read,
  );
}

export const go = (route: string) => { location.hash = '#/' + route; };
export const replace = (route: string) => {
  history.replaceState(null, '', '#/' + route);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
};
