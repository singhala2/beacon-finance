import type { DashboardLayout } from './dashboard-layout';

// Debounced PATCH /api/preferences. Caller passes a layout to save; we wait
// for `delay` ms of quiet before posting so rapid drag/remove operations
// collapse into a single request.
export function makeLayoutSaver(delay = 400) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inflight: AbortController | null = null;

  return function save(layout: DashboardLayout): Promise<void> {
    if (timer) clearTimeout(timer);
    return new Promise<void>((resolve, reject) => {
      timer = setTimeout(async () => {
        timer = null;
        if (inflight) inflight.abort();
        inflight = new AbortController();
        try {
          const res = await fetch('/api/preferences', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ layout }),
            signal: inflight.signal,
          });
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(text || `Save failed (${res.status})`);
          }
          inflight = null;
          resolve();
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            // Superseded by a newer save — not an error
            resolve();
            return;
          }
          reject(err);
        }
      }, delay);
    });
  };
}
