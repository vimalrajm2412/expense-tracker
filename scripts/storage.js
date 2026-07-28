/**
 * storage.js
 * ---------------------------------------------------------------------------
 * Thin wrapper around localStorage for client-only preferences that should
 * survive a refresh, such as theme, remembered email, and last visited view.
 * This app is fully local-first, so these preferences live on-device only.
 * ---------------------------------------------------------------------------
 */

const PREFIX = "pocketledger:";
const LEGACY_PREFIX = "orb-expense-tracker:";

const KEYS = {
  THEME: `${PREFIX}theme`,
  REMEMBER_EMAIL: `${PREFIX}remember-email`,
  LAST_VIEW: `${PREFIX}last-view`,
};

function safeGet(key) {
  try {
    const value = localStorage.getItem(key);
    if (value !== null) return value;

    const legacyKey = key.replace(PREFIX, LEGACY_PREFIX);
    const legacyValue = localStorage.getItem(legacyKey);
    if (legacyValue !== null) {
      localStorage.setItem(key, legacyValue);
      return legacyValue;
    }

    return null;
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode, quota, etc.) — fail silently */
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function getTheme() {
  return safeGet(KEYS.THEME) || "dark";
}

export function setTheme(theme) {
  safeSet(KEYS.THEME, theme);
}

export function getRememberedEmail() {
  return safeGet(KEYS.REMEMBER_EMAIL) || "";
}

export function setRememberedEmail(email) {
  if (email) safeSet(KEYS.REMEMBER_EMAIL, email);
  else safeRemove(KEYS.REMEMBER_EMAIL);
}

export function getLastView() {
  return safeGet(KEYS.LAST_VIEW) || "dashboard-view";
}

export function setLastView(viewId) {
  safeSet(KEYS.LAST_VIEW, viewId);
}
