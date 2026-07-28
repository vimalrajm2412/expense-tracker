/**
 * app.js
 * ---------------------------------------------------------------------------
 * The application controller. Holds in-memory state (current user, expenses,
 * settings), wires up all DOM event listeners, and coordinates the feature
 * modules (dashboard, calendar, charts, settings) whenever data changes.
 * ---------------------------------------------------------------------------
 */

import {
  observeAuthState,
  signUp,
  logIn,
  logInWithGoogle,
  logOut,
  resetPassword,
  friendlyAuthError,
} from "./auth.js";
import {
  createUserProfile,
  getUserProfile,
  subscribeToExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
} from "./db.js";
import {
  showLoader,
  hideLoader,
  showAuthScreen,
  showAppShell,
  switchAuthForm,
  switchView,
  toggleMobileNav,
  openModal,
  closeModal,
  initThemeFromStorage,
  renderTransactionRow,
  renderEmptyState,
} from "./ui.js";
import { showSuccess, showError, confirmDialog } from "./notifications.js";
import { renderDashboard } from "./dashboard.js";
import { renderCalendar, goToPreviousMonth, goToNextMonth } from "./calendar.js";
import { renderAllCharts, resizeAllCharts } from "./charts.js";
import { initSettingsView } from "./settings.js";
import { Analytics } from "./analytics.js";
import { validateEmail, validatePassword, validatePasswordsMatch, validateName, validateExpense } from "./validation.js";
import { toDateInputValue, parseTags, formatCurrency, formatDate, debounce, escapeHtml } from "./helpers.js";
import { getRememberedEmail, setRememberedEmail, getLastView } from "./storage.js";

// ---------------------------------------------------------------------------
// In-memory app state
// ---------------------------------------------------------------------------
const state = {
  user: null,
  profile: null,
  settings: { currency: "INR", monthlyBudget: 0, theme: "dark" },
  expenses: [],
  unsubscribeExpenses: null,
};

// ---------------------------------------------------------------------------
// Bootstrapping
// ---------------------------------------------------------------------------
export function initApp() {
  initThemeFromStorage();
  prefillRememberedEmail();
  applyLocalOnlyAuthUi();
  wireAuthForms();
  wireSidebarNav();
  wireExpenseModal();
  wireCalendarNav();
  wireSearchView();

  showLoader();
  observeAuthState(async (user) => {
    if (user) {
      await handleSignedIn(user);
    } else {
      handleSignedOut();
    }
    hideLoader();
  });
}

function prefillRememberedEmail() {
  const remembered = getRememberedEmail();
  if (remembered) {
    const loginEmail = document.getElementById("login-email");
    if (loginEmail) loginEmail.value = remembered;
  }
}

function applyLocalOnlyAuthUi() {
  const googleButton = document.getElementById("google-login-btn");
  if (googleButton) googleButton.classList.add("hidden");

  const forgotPasswordButton = document.getElementById("forgot-password-btn");
  if (forgotPasswordButton) {
    forgotPasswordButton.disabled = true;
    forgotPasswordButton.title = "Password reset is unavailable in local-only mode.";
  }
}

// ---------------------------------------------------------------------------
// Auth state handling
// ---------------------------------------------------------------------------
async function handleSignedIn(user) {
  state.user = user;

  let profileDoc = await getUserProfile(user.uid);
  if (!profileDoc) {
    await createUserProfile(user.uid, { name: user.displayName, email: user.email });
    profileDoc = await getUserProfile(user.uid);
  }
  state.profile = profileDoc?.profile || { name: user.displayName || "", email: user.email || "" };
  state.settings = { ...state.settings, ...(profileDoc?.settings || {}), currency: "INR" };

  document.getElementById("user-name").textContent = state.profile.name || user.displayName || "User";
  document.getElementById("user-email").textContent = state.profile.email || user.email || "";
  document.getElementById("user-avatar").textContent = (state.profile.name || user.email || "U").charAt(0).toUpperCase();

  showAppShell();
  switchView(getLastView());

  if (state.unsubscribeExpenses) state.unsubscribeExpenses();
  state.unsubscribeExpenses = subscribeToExpenses(user.uid, (expenses) => {
    state.expenses = expenses;
    renderEverything();
  });
}

function handleSignedOut() {
  state.user = null;
  state.profile = null;
  state.expenses = [];
  if (state.unsubscribeExpenses) {
    state.unsubscribeExpenses();
    state.unsubscribeExpenses = null;
  }
  showAuthScreen();
  switchAuthForm("login-form");
}

// ---------------------------------------------------------------------------
// Rendering orchestration
// ---------------------------------------------------------------------------
function renderEverything() {
  renderDashboard(state.expenses, state.settings.monthlyBudget, state.settings.currency);
  renderAllCharts(state.expenses);
  renderCalendar(state.expenses, onCalendarDayClick, state.settings.currency);
  applySearchFilters();
  initSettingsView({
    uid: state.user.uid,
    settings: state.settings,
    profile: state.profile,
    expenses: state.expenses,
    onSettingsSaved: (nextSettings) => {
      state.settings = { ...state.settings, ...nextSettings };
      renderEverything();
    },
    onProfileSaved: (nextProfile) => {
      state.profile = { ...state.profile, ...nextProfile };
      document.getElementById("user-name").textContent = state.profile.name || "User";
      document.getElementById("user-email").textContent = state.profile.email || "";
      document.getElementById("user-avatar").textContent = (state.profile.name || state.profile.email || "U").charAt(0).toUpperCase();
    },
    onAccountDeleted: () => logOut(),
  });
}

function onCalendarDayClick(date) {
  const dayExpenses = state.expenses.filter((e) => {
    const d = new Date(e.date);
    return d.toDateString() === date.toDateString();
  });
  const detailPanel = document.getElementById("calendar-day-detail");
  const title = document.getElementById("calendar-day-title");
  const list = document.getElementById("calendar-day-list");

  title.textContent = formatDate(date, { weekday: "long" });
  list.innerHTML = dayExpenses.length
    ? dayExpenses.map((tx) => renderTransactionRow(tx, state.settings.currency)).join("")
    : renderEmptyState("No transactions on this day.");
  detailPanel.classList.remove("hidden");
}

// ---------------------------------------------------------------------------
// Auth forms
// ---------------------------------------------------------------------------
function wireAuthForms() {
  document.querySelectorAll("[data-show]").forEach((btn) => {
    btn.addEventListener("click", () => switchAuthForm(btn.dataset.show));
  });

  document.getElementById("forgot-password-btn")?.addEventListener("click", () => {
    switchAuthForm("forgot-password-form");
  });

  document.getElementById("login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const remember = document.getElementById("remember-me").checked;

    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    if (emailErr || passErr) return showError(emailErr || passErr);

    try {
      showLoader();
      await logIn({ email, password, remember });
      setRememberedEmail(remember ? email : "");
      Analytics.login("password");
      showSuccess("Welcome back!");
    } catch (err) {
      showError(friendlyAuthError(err));
    } finally {
      hideLoader();
    }
  });

  document.getElementById("signup-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("signup-confirm-password").value;

    const errors = [
      validateName(name),
      validateEmail(email),
      validatePassword(password),
      validatePasswordsMatch(password, confirmPassword),
    ].filter(Boolean);
    if (errors.length) return showError(errors[0]);

    try {
      showLoader();
      await signUp({ name, email, password, remember: true });
      Analytics.signUp("password");
      showSuccess("Account created on this device.");
    } catch (err) {
      showError(friendlyAuthError(err));
    } finally {
      hideLoader();
    }
  });

  document.getElementById("google-login-btn")?.addEventListener("click", async () => {
    try {
      showLoader();
      await logInWithGoogle();
      Analytics.login("google");
      showSuccess("Welcome!");
    } catch (err) {
      showError(friendlyAuthError(err));
    } finally {
      hideLoader();
    }
  });

  document.getElementById("forgot-password-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("reset-email").value.trim();
    const emailErr = validateEmail(email);
    if (emailErr) return showError(emailErr);

    try {
      showLoader();
      await resetPassword(email);
      showSuccess("Password reset email sent.");
      switchAuthForm("login-form");
    } catch (err) {
      showError(friendlyAuthError(err));
    } finally {
      hideLoader();
    }
  });

  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await logOut();
    Analytics.logout();
    showSuccess("Logged out.");
  });
}

// ---------------------------------------------------------------------------
// Sidebar navigation
// ---------------------------------------------------------------------------
function wireSidebarNav() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchView(btn.dataset.view);
      Analytics.viewChange(btn.dataset.view);

      // Charts are created while the analytics view may be hidden (display:none),
      // causing them to render at 0x0. Resize them the moment the view is shown.
      if (btn.dataset.view === "analytics-view") {
        setTimeout(() => {
          renderAllCharts(state.expenses);
          resizeAllCharts();
        }, 50);
      }
    });
  });

  document.getElementById("mobile-menu-btn")?.addEventListener("click", toggleMobileNav);
  document.getElementById("mobile-quick-add")?.addEventListener("click", () => openExpenseModal());

  document.getElementById("cal-prev")?.addEventListener("click", () => {
    goToPreviousMonth();
    renderCalendar(state.expenses, onCalendarDayClick, state.settings.currency);
  });
  document.getElementById("cal-next")?.addEventListener("click", () => {
    goToNextMonth();
    renderCalendar(state.expenses, onCalendarDayClick, state.settings.currency);
  });
}

function wireCalendarNav() {
  // handled inside wireSidebarNav() to keep prev/next logic colocated.
}

// ---------------------------------------------------------------------------
// Expense modal (Add / Edit / Delete)
// ---------------------------------------------------------------------------
function wireExpenseModal() {
  document.getElementById("open-add-expense")?.addEventListener("click", () => openExpenseModal());
  document.getElementById("close-expense-modal")?.addEventListener("click", () => closeModal("expense-modal"));

  document.getElementById("expense-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("expense-id").value;
    const type = document.querySelector('input[name="expense-type"]:checked').value;
    const amount = document.getElementById("expense-amount").value;
    const category = document.getElementById("expense-category").value;
    const date = document.getElementById("expense-date").value;
    const paymentMethod = document.getElementById("expense-payment-method").value;
    const tags = parseTags(document.getElementById("expense-tags").value);
    const notes = document.getElementById("expense-notes").value.trim();
    const recurring = document.getElementById("expense-recurring").checked;

    // Exclude from budget & spending totals (e.g. salary transfers, remittances)
    const excludeFromBudget = document.getElementById("expense-exclude-budget").checked;

    const validationError = validateExpense({ amount, category, date });
    if (validationError) return showError(validationError);

    const payload = {
      type,
      amount: Number(amount),
      category,
      date,
      paymentMethod,
      tags,
      notes,
      recurring,
      excludeFromBudget,
    };

    try {
      showLoader();
      if (id) {
        await updateExpense(state.user.uid, id, payload);
        Analytics.editExpense(type);
        showSuccess("Transaction updated.");
      } else {
        await addExpense(state.user.uid, payload);
        Analytics.addExpense(type, category);
        showSuccess("Transaction added.");
      }
      closeModal("expense-modal");
    } catch (err) {
      showError("Could not save transaction.");
      console.error(err);
    } finally {
      hideLoader();
    }
  });

  document.getElementById("delete-expense-btn")?.addEventListener("click", async () => {
    const id = document.getElementById("expense-id").value;
    if (!id) return;
    const confirmed = await confirmDialog("Delete transaction?", "This action cannot be undone.");
    if (!confirmed) return;

    try {
      showLoader();
      await deleteExpense(state.user.uid, id);
      Analytics.deleteExpense();
      showSuccess("Transaction deleted.");
      closeModal("expense-modal");
    } catch (err) {
      showError("Could not delete transaction.");
      console.error(err);
    } finally {
      hideLoader();
    }
  });

  // Delegate clicks on any rendered transaction row to open it for editing.
  document.addEventListener("click", (e) => {
    const row = e.target.closest(".transaction-item");
    if (row && row.dataset.id) openExpenseModal(row.dataset.id);
  });
}

function openExpenseModal(expenseId = null) {
  const form = document.getElementById("expense-form");
  form.reset();
  document.getElementById("expense-id").value = "";
  document.getElementById("delete-expense-btn").classList.add("hidden");
  document.getElementById("expense-date").value = toDateInputValue(new Date());
  document.getElementById("expense-modal-title").textContent = "Add Transaction";

  // Always reset the exclude checkbox on a fresh modal open
  document.getElementById("expense-exclude-budget").checked = false;

  if (expenseId) {
    const tx = state.expenses.find((e) => e.id === expenseId);
    if (tx) {
      document.getElementById("expense-id").value = tx.id;
      document.querySelector(`input[name="expense-type"][value="${tx.type}"]`).checked = true;
      document.getElementById("expense-amount").value = tx.amount;
      document.getElementById("expense-category").value = tx.category;
      document.getElementById("expense-date").value = toDateInputValue(tx.date);
      document.getElementById("expense-payment-method").value = tx.paymentMethod || "Cash";
      document.getElementById("expense-tags").value = (tx.tags || []).join(", ");
      document.getElementById("expense-notes").value = tx.notes || "";
      document.getElementById("expense-recurring").checked = !!tx.recurring;
      // Restore the exclude flag when editing an existing transaction
      document.getElementById("expense-exclude-budget").checked = !!tx.excludeFromBudget;
      document.getElementById("expense-modal-title").textContent = "Edit Transaction";
      document.getElementById("delete-expense-btn").classList.remove("hidden");
    }
  }

  openModal("expense-modal");
}

// ---------------------------------------------------------------------------
// Search / Filter / Export
//
// NOTE: The category filter dropdown (#filter-category) is a static list
// written directly in index.html so it always shows every category regardless
// of how many transactions exist. We do NOT rebuild it dynamically here.
// ---------------------------------------------------------------------------
function wireSearchView() {
  const debouncedFilter = debounce(applySearchFilters, 200);
  [
    "search-input",
    "filter-category",
    "filter-type",
    "filter-date-from",
    "filter-date-to",
    "filter-amount-min",
    "filter-amount-max",
    "filter-sort",
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", debouncedFilter);
    document.getElementById(id)?.addEventListener("change", debouncedFilter);
  });

  document.getElementById("export-csv")?.addEventListener("click", exportCsv);
  document.getElementById("export-pdf")?.addEventListener("click", exportPdf);
  document.getElementById("print-report")?.addEventListener("click", () => window.print());
}

function getFilteredExpenses() {
  const search = document.getElementById("search-input")?.value.trim().toLowerCase() || "";
  const category = document.getElementById("filter-category")?.value || "";
  const type = document.getElementById("filter-type")?.value || "";
  const dateFrom = document.getElementById("filter-date-from")?.value || "";
  const dateTo = document.getElementById("filter-date-to")?.value || "";
  const amountMin = document.getElementById("filter-amount-min")?.value || "";
  const amountMax = document.getElementById("filter-amount-max")?.value || "";
  const sort = document.getElementById("filter-sort")?.value || "newest";

  let results = state.expenses.filter((e) => {
    if (search) {
      const haystack = `${e.notes || ""} ${(e.tags || []).join(" ")}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (category && e.category !== category) return false;
    if (type && e.type !== type) return false;
    if (dateFrom && new Date(e.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(e.date) > new Date(dateTo)) return false;
    if (amountMin && Number(e.amount) < Number(amountMin)) return false;
    if (amountMax && Number(e.amount) > Number(amountMax)) return false;
    return true;
  });

  results.sort((a, b) => {
    switch (sort) {
      case "oldest": return new Date(a.date) - new Date(b.date);
      case "highest": return Number(b.amount) - Number(a.amount);
      case "lowest": return Number(a.amount) - Number(b.amount);
      default: return new Date(b.date) - new Date(a.date);
    }
  });

  return results;
}

function applySearchFilters() {
  const list = document.getElementById("search-results");
  if (!list) return;
  const results = getFilteredExpenses();
  list.innerHTML = results.length
    ? results.map((tx) => renderTransactionRow(tx, state.settings.currency)).join("")
    : renderEmptyState("No transactions match your filters.");
}

function exportCsv() {
  const results = getFilteredExpenses();
  const header = ["Date", "Type", "Category", "Amount", "Payment Method", "Tags", "Notes", "Recurring", "Excluded from Budget"];
  const rows = results.map((e) => [
    formatDate(e.date),
    e.type,
    e.category,
    e.amount,
    e.paymentMethod || "",
    (e.tags || []).join("; "),
    (e.notes || "").replace(/,/g, ";"),
    e.recurring ? "Yes" : "No",
    e.excludeFromBudget ? "Yes" : "No",
  ]);
  const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pocketledger-transactions.csv";
  a.click();
  URL.revokeObjectURL(url);
  Analytics.exportData("csv");
  showSuccess("CSV exported.");
}

function exportPdf() {
  const results = getFilteredExpenses();
  const win = window.open("", "_blank");
  const trackedResults = results.filter((e) => !e.excludeFromBudget);
  const incomeTotal = trackedResults
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const expenseTotal = trackedResults
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const excludedTotal = results
    .filter((e) => e.excludeFromBudget)
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const budget = Number(state.settings.monthlyBudget) || 0;
  const categoryTotals = trackedResults
    .filter((e) => e.type === "expense")
    .reduce((totals, e) => {
      totals[e.category] = (totals[e.category] || 0) + Number(e.amount);
      return totals;
    }, {});
  const categoryRowsHtml = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([category, total]) =>
        `<tr><td>${escapeHtml(category)}</td><td>${formatCurrency(total, state.settings.currency)}</td></tr>`
    )
    .join("");
  const rowsHtml = results
    .map(
      (e) =>
        `<tr><td>${formatDate(e.date)}</td><td>${e.type}</td><td>${escapeHtml(e.category)}</td><td>${formatCurrency(e.amount, state.settings.currency)}</td><td>${escapeHtml(e.notes || "")}</td><td>${e.excludeFromBudget ? "Yes" : "No"}</td></tr>`
    )
    .join("");
  win.document.write(`
    <html><head><title>PocketLedger Expense Report</title>
    <style>
      body{font-family:Arial,sans-serif;padding:24px;color:#111}
      h1{margin-bottom:4px}
      h2{font-size:18px;margin:24px 0 8px}
      .muted{color:#555;margin:0 0 16px}
      .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}
      .card{border:1px solid #ccc;border-radius:8px;padding:12px;background:#f8f9fb}
      .card span{display:block;color:#555;font-size:12px;margin-bottom:6px}
      .card strong{font-size:18px}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:13px}
      th{background:#f2f2f2}
      @media print{body{padding:0}.summary{grid-template-columns:repeat(4,1fr)}}
    </style></head><body>
    <h1>PocketLedger Expense Report</h1>
    <p class="muted">Generated ${formatDate(new Date())} - ${results.length} transaction${results.length === 1 ? "" : "s"} included</p>

    <section class="summary">
      <div class="card"><span>Income</span><strong>${formatCurrency(incomeTotal, state.settings.currency)}</strong></div>
      <div class="card"><span>Expenses</span><strong>${formatCurrency(expenseTotal, state.settings.currency)}</strong></div>
      <div class="card"><span>Balance</span><strong>${formatCurrency(incomeTotal - expenseTotal, state.settings.currency)}</strong></div>
      <div class="card"><span>Budget Left</span><strong>${formatCurrency(Math.max(budget - expenseTotal, 0), state.settings.currency)}</strong></div>
      <div class="card"><span>Monthly Budget</span><strong>${formatCurrency(budget, state.settings.currency)}</strong></div>
      <div class="card"><span>Excluded Total</span><strong>${formatCurrency(excludedTotal, state.settings.currency)}</strong></div>
      <div class="card"><span>Income Entries</span><strong>${results.filter((e) => e.type === "income").length}</strong></div>
      <div class="card"><span>Expense Entries</span><strong>${results.filter((e) => e.type === "expense").length}</strong></div>
    </section>

    <h2>Expense Summary by Category</h2>
    <table><thead><tr><th>Category</th><th>Total</th></tr></thead>
    <tbody>${categoryRowsHtml || '<tr><td colspan="2">No expense categories in this report.</td></tr>'}</tbody></table>

    <h2>Transactions</h2>
    <table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Notes</th><th>Excl. Budget</th></tr></thead>
    <tbody>${rowsHtml || '<tr><td colspan="6">No transactions match your filters.</td></tr>'}</tbody></table>
    </body></html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
  Analytics.exportData("pdf");
}
