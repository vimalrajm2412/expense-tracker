/**
 * auth.js
 * ---------------------------------------------------------------------------
 * Local-only auth layer for single-device usage. Accounts are stored in
 * localStorage on the current device only; no network or Firebase is used.
 * ---------------------------------------------------------------------------
 */

const AUTH_STORAGE_KEY = "pocketledger:local-auth";
const LEGACY_AUTH_STORAGE_KEY = "orb-expense-tracker:local-auth";
const AUTH_EVENT = "pocketledger-local-auth-changed";

let authState = loadAuthState();
const observers = new Set();

function loadAuthState() {
  try {
    const primary = localStorage.getItem(AUTH_STORAGE_KEY);
    if (primary) {
      return JSON.parse(primary) || { currentUserId: null, users: [] };
    }

    const legacy = localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) || { currentUserId: null, users: [] };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
      return parsed;
    }

    return { currentUserId: null, users: [] };
  } catch {
    return { currentUserId: null, users: [] };
  }
}

function saveAuthState() {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
}

function emitAuthChange() {
  const user = getCurrentUser();
  observers.forEach((callback) => callback(user));
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: user }));
}

function persistAndNotify() {
  saveAuthState();
  emitAuthChange();
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || "",
  };
}

function getCurrentUserRecord() {
  return authState.users.find((user) => user.uid === authState.currentUserId) || null;
}

function getCurrentUser() {
  return sanitizeUser(getCurrentUserRecord());
}

function createUid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function findUserByEmail(email) {
  return authState.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) || null;
}

export function observeAuthState(callback) {
  observers.add(callback);
  callback(getCurrentUser());

  const handleStorage = (event) => {
    if (event.key && event.key !== AUTH_STORAGE_KEY) return;
    authState = loadAuthState();
    callback(getCurrentUser());
  };

  const handleCustom = () => {
    authState = loadAuthState();
    callback(getCurrentUser());
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(AUTH_EVENT, handleCustom);

  return () => {
    observers.delete(callback);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(AUTH_EVENT, handleCustom);
  };
}

export async function signUp({ name, email, password }) {
  const existing = findUserByEmail(email);
  if (existing) {
    throw { code: "auth/email-already-in-use" };
  }

  const user = {
    uid: createUid(),
    email,
    password,
    displayName: name || "",
    createdAt: new Date().toISOString(),
  };

  authState.users.push(user);
  authState.currentUserId = user.uid;
  persistAndNotify();
  return sanitizeUser(user);
}

export async function logIn({ email, password }) {
  const user = findUserByEmail(email);
  if (!user || user.password !== password) {
    throw { code: "auth/invalid-credential" };
  }

  authState.currentUserId = user.uid;
  persistAndNotify();
  return sanitizeUser(user);
}

export async function logInWithGoogle() {
  throw new Error("Google sign-in is not available in local-only mode.");
}

export async function logOut() {
  authState.currentUserId = null;
  persistAndNotify();
}

export async function resetPassword() {
  throw new Error("Password reset is not available in local-only mode.");
}

export async function removeAccount() {
  const currentUser = getCurrentUserRecord();
  if (!currentUser) return;

  authState.users = authState.users.filter((user) => user.uid !== currentUser.uid);
  authState.currentUserId = null;
  persistAndNotify();
}

export function friendlyAuthError(error) {
  const code = error?.code || "";
  const message = error?.message || "";
  const map = {
    "auth/email-already-in-use": "An account with this email already exists on this device.",
    "auth/invalid-email": "That email address looks invalid.",
    "auth/weak-password": "Password is too weak — use at least 8 characters.",
    "auth/invalid-credential": "Incorrect email or password.",
  };
  return map[code] || message || "Something went wrong. Please try again.";
}
