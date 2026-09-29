// localStorage persistence for the MVP. No backend, no auth.

const KEY = "focusflow:v1";

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("FocusFlow: could not save state", e);
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch (e) {
    console.warn("FocusFlow: could not load state", e);
    return null;
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    console.warn("FocusFlow: could not clear state", e);
  }
}
