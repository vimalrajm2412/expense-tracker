/**
 * db.js
 * ---------------------------------------------------------------------------
 * Local-only data store for profile, settings, and transactions. Everything
 * is persisted in localStorage on the current device only.
 * ---------------------------------------------------------------------------
 */

const DB_STORAGE_KEY = "pocketledger:local-db";
const LEGACY_DB_STORAGE_KEY = "orb-expense-tracker:local-db";
const DB_EVENT = "pocketledger-local-db-changed";

const DEFAULT_SETTINGS = {
  theme: "dark",
  currency: "INR",
  monthlyBudget: 0,
};

function loadDb() {
  try {
    const primary = localStorage.getItem(DB_STORAGE_KEY);
    if (primary) {
      return JSON.parse(primary) || { users: {} };
    }

    const legacy = localStorage.getItem(LEGACY_DB_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) || { users: {} };
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(parsed));
      return parsed;
    }

    return { users: {} };
  } catch {
    return { users: {} };
  }
}

function saveDb(db) {
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function ensureUserRecord(db, uid, seed = {}) {
  if (!db.users[uid]) {
    db.users[uid] = {
      profile: {
        name: seed.name || "",
        email: seed.email || "",
      },
      settings: { ...DEFAULT_SETTINGS },
      expenses: [],
    };
  }

  db.users[uid].profile ||= { name: seed.name || "", email: seed.email || "" };
  db.users[uid].settings = { ...DEFAULT_SETTINGS, ...(db.users[uid].settings || {}) };
  db.users[uid].expenses ||= [];
  return db.users[uid];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function notify(uid) {
  window.dispatchEvent(new CustomEvent(DB_EVENT, { detail: { uid } }));
}

export async function createUserProfile(uid, { name, email }) {
  const db = loadDb();
  ensureUserRecord(db, uid, { name, email });
  saveDb(db);
  notify(uid);
}

export async function getUserProfile(uid) {
  const db = loadDb();
  const user = ensureUserRecord(db, uid);
  saveDb(db);
  return clone({
    profile: user.profile,
    settings: user.settings,
  });
}

export async function updateUserProfile(uid, profile) {
  const db = loadDb();
  const user = ensureUserRecord(db, uid);
  user.profile = {
    ...user.profile,
    ...profile,
  };
  saveDb(db);
  notify(uid);
}

export async function updateUserSettings(uid, settings) {
  const db = loadDb();
  const user = ensureUserRecord(db, uid);
  user.settings = {
    ...user.settings,
    ...settings,
  };
  saveDb(db);
  notify(uid);
}

export function subscribeToExpenses(uid, callback) {
  const emit = () => {
    const db = loadDb();
    const user = ensureUserRecord(db, uid);
    const expenses = clone(user.expenses).sort((a, b) => new Date(b.date) - new Date(a.date));
    callback(expenses);
  };

  const handleStorage = (event) => {
    if (event.key && event.key !== DB_STORAGE_KEY) return;
    emit();
  };

  const handleCustom = (event) => {
    if (!event.detail?.uid || event.detail.uid === uid) emit();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(DB_EVENT, handleCustom);
  emit();

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(DB_EVENT, handleCustom);
  };
}

export async function addExpense(uid, expense) {
  const db = loadDb();
  const user = ensureUserRecord(db, uid);
  const id = createId();
  user.expenses.push({
    id,
    ...expense,
    createdAt: new Date().toISOString(),
  });
  saveDb(db);
  notify(uid);
  return id;
}

export async function updateExpense(uid, expenseId, expense) {
  const db = loadDb();
  const user = ensureUserRecord(db, uid);
  const index = user.expenses.findIndex((item) => item.id === expenseId);
  if (index === -1) throw new Error("Transaction not found.");

  user.expenses[index] = {
    ...user.expenses[index],
    ...expense,
    updatedAt: new Date().toISOString(),
  };
  saveDb(db);
  notify(uid);
}

export async function deleteExpense(uid, expenseId) {
  const db = loadDb();
  const user = ensureUserRecord(db, uid);
  user.expenses = user.expenses.filter((item) => item.id !== expenseId);
  saveDb(db);
  notify(uid);
}

export async function deleteAllUserData(uid) {
  const db = loadDb();
  delete db.users[uid];
  saveDb(db);
  notify(uid);
}
