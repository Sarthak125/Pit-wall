/** Bridges the service worker's "new version waiting" signal to the update banner. */
type Listener = () => void;
const listeners = new Set<Listener>();
let waiting = false;
let apply: () => void = () => window.location.reload();

export function setUpdateHandler(fn: () => void) {
  apply = fn;
}

export function announceUpdate() {
  waiting = true;
  listeners.forEach((l) => l());
}

export function onUpdate(l: Listener): () => void {
  listeners.add(l);
  if (waiting) l();
  return () => listeners.delete(l);
}

export function applyUpdate() {
  apply();
}
