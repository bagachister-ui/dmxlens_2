// Tiny global progress bus — lets any page signal "work in progress"
// so the top-of-screen loading bar can animate. Counts active tasks so
// overlapping operations keep the bar visible until all finish.

let active = 0;
const listeners = new Set();

function notify() {
  for (const l of listeners) {
    try {
      l(active > 0);
    } catch (e) {
      // ignore listener errors
    }
  }
}

export const progressBus = {
  start() {
    active += 1;
    notify();
  },
  done() {
    active = Math.max(0, active - 1);
    notify();
  },
  subscribe(listener) {
    listeners.add(listener);
    listener(active > 0);
    return () => listeners.delete(listener);
  },
  // Wrap an async function so the bar shows for its full duration
  async track(fn) {
    progressBus.start();
    try {
      return await fn();
    } finally {
      progressBus.done();
    }
  },
};