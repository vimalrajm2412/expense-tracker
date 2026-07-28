/**
 * helpers.js
 * ---------------------------------------------------------------------------
 * Small, pure, reusable utility functions shared across the app.
 * Nothing here touches Firebase or the DOM directly.
 * ---------------------------------------------------------------------------
 */

export function formatCurrency(amount, currencyCode = "INR") {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `Rs ${Math.round(value)}`;
  }
}

export function formatDate(dateInput, options = {}) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
}

export function toDateInputValue(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

export function isSameDay(a, b) {
  const d1 = a instanceof Date ? a : new Date(a);
  const d2 = b instanceof Date ? b : new Date(b);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfWeek(date = new Date()) {
  const d = startOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

export function startOfMonth(date = new Date()) {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function debounce(fn, delay = 300) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

const CATEGORY_COLORS = {
  Food: "#ff9f5b",
  Transport: "#5b8cff",
  Shopping: "#ff5bb0",
  Bills: "#ffc24b",
  Entertainment: "#9b5bff",
  Health: "#2fe6a8",
  Travel: "#4be0ff",
  Salary: "#2fe6a8",
  Other: "#aab0c6",
};

export function colorForCategory(category) {
  return CATEGORY_COLORS[category] || "#5b8cff";
}

const CATEGORY_ICONS = {
  Food: "🍔",
  Transport: "🚗",
  Shopping: "🛍️",
  Bills: "💡",
  Entertainment: "🎬",
  Health: "💊",
  Travel: "✈️",
  Salary: "💰",
  Other: "📦",
};

export function iconForCategory(category) {
  return CATEGORY_ICONS[category] || "📦";
}

export function parseTags(tagsString) {
  if (!tagsString) return [];
  return tagsString
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function sumAmounts(items) {
  return items.reduce((total, item) => total + (Number(item.amount) || 0), 0);
}
