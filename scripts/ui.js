/**
 * ui.js
 * ---------------------------------------------------------------------------
 * Generic, app-wide DOM helpers that don't belong to one specific feature:
 * switching between auth screen and app shell, sidebar navigation between
 * views, opening/closing modals, the global loading overlay, theme toggling,
 * and small shared render helpers (transaction row markup).
 * ---------------------------------------------------------------------------
 */

import { escapeHtml, formatCurrency, formatDate, iconForCategory } from "./helpers.js";
import { getTheme, setTheme as persistTheme, setLastView } from "./storage.js";

export function showLoader() {
  document.getElementById("global-loader")?.classList.remove("hidden");
}

export function hideLoader() {
  document.getElementById("global-loader")?.classList.add("hidden");
}

export function showAuthScreen() {
  document.getElementById("auth-screen")?.classList.remove("hidden");
  document.getElementById("app-shell")?.classList.add("hidden");
}

export function showAppShell() {
  document.getElementById("auth-screen")?.classList.add("hidden");
  document.getElementById("app-shell")?.classList.remove("hidden");
}

export function switchAuthForm(formId) {
  document.querySelectorAll(".auth-form").forEach((form) => {
    form.classList.toggle("active-form", form.id === formId);
  });
}

export function switchView(viewId) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active-view", view.id === viewId);
  });
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewId);
  });
  setLastView(viewId);
  document.body.classList.remove("mobile-nav-open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function toggleMobileNav() {
  document.body.classList.toggle("mobile-nav-open");
}

export function openModal(modalId) {
  document.getElementById(modalId)?.classList.remove("hidden");
}

export function closeModal(modalId) {
  document.getElementById(modalId)?.classList.add("hidden");
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
  document.getElementById("theme-dark-btn")?.classList.toggle("active", theme !== "light");
  document.getElementById("theme-light-btn")?.classList.toggle("active", theme === "light");
  persistTheme(theme);
}

export function initThemeFromStorage() {
  applyTheme(getTheme());
}

/**
 * Builds the inner HTML for one transaction row, used by the dashboard
 * recent list, the search results list, and the calendar day detail list.
 * @param {object} tx - expense/income document
 */
export function renderTransactionRow(tx, currency = "INR") {
  const isIncome = tx.type === "income";
  const sign = isIncome ? "+" : "-";
  return `
    <li class="transaction-item" data-id="${tx.id}">
      <div class="tx-left">
        <div class="tx-icon" style="background:${isIncome ? "linear-gradient(135deg,#2fe6a8,#22b389)" : "var(--gradient-primary)"}">
          ${iconForCategory(tx.category)}
        </div>
        <div class="tx-meta">
          <span class="tx-category">${escapeHtml(tx.category)}${tx.notes ? ` · ${escapeHtml(tx.notes)}` : ""}</span>
          <span class="tx-date">${formatDate(tx.date)}${tx.recurring ? " · Recurring" : ""}</span>
        </div>
      </div>
      <span class="tx-amount ${isIncome ? "income" : "expense"}">${sign}${formatCurrency(Math.abs(tx.amount), currency)}</span>
    </li>
  `;
}

export function renderEmptyState(message = "No transactions yet.") {
  return `<li class="empty-state">${escapeHtml(message)}</li>`;
}
