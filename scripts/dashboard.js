/**
 * dashboard.js
 * ---------------------------------------------------------------------------
 * Computes and renders the dashboard view: stat cards (monthly spending,
 * income, savings, budget remaining, today's & weekly spending), the recent
 * transactions list, and the top categories breakdown.
 *
 * Transactions flagged with excludeFromBudget: true are recorded for history
 * but excluded from all spending/budget calculations (e.g. salary transfers,
 * remittances to family members).
 * ---------------------------------------------------------------------------
 */

import { formatCurrency, startOfDay, startOfMonth, startOfWeek, isSameDay } from "./helpers.js";
import { renderTransactionRow, renderEmptyState } from "./ui.js";

function inRange(date, from) {
  return new Date(date) >= from;
}

export function computeStats(expenses, monthlyBudget = 0) {
  const now = new Date();
  const today = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  // Exclude transactions flagged as "exclude from budget" from all totals.
  const expensesOnly = expenses.filter(
    (e) => e.type === "expense" && !e.excludeFromBudget
  );
  const incomeOnly = expenses.filter(
    (e) => e.type === "income" && !e.excludeFromBudget
  );

  const monthlySpending = expensesOnly
    .filter((e) => inRange(e.date, monthStart))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const monthlyIncome = incomeOnly
    .filter((e) => inRange(e.date, monthStart))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const todaySpending = expensesOnly
    .filter((e) => isSameDay(e.date, today))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const weeklySpending = expensesOnly
    .filter((e) => inRange(e.date, weekStart))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const savings = monthlyIncome - monthlySpending;
  const budgetRemaining = Number(monthlyBudget) - monthlySpending;
  const budgetPercentUsed =
    monthlyBudget > 0
      ? Math.min(100, (monthlySpending / monthlyBudget) * 100)
      : 0;

  return {
    monthlySpending,
    monthlyIncome,
    todaySpending,
    weeklySpending,
    savings,
    budgetRemaining,
    budgetPercentUsed,
  };
}

export function renderStats(stats, currency = "INR") {
  document.getElementById("stat-monthly").textContent = formatCurrency(stats.monthlySpending, currency);
  document.getElementById("stat-income").textContent = formatCurrency(stats.monthlyIncome, currency);
  document.getElementById("stat-savings").textContent = formatCurrency(stats.savings, currency);
  document.getElementById("stat-budget").textContent = formatCurrency(stats.budgetRemaining, currency);
  document.getElementById("stat-today").textContent = formatCurrency(stats.todaySpending, currency);
  document.getElementById("stat-weekly").textContent = formatCurrency(stats.weeklySpending, currency);

  const trendEl = document.getElementById("stat-monthly-trend");
  if (trendEl) {
    trendEl.textContent =
      stats.savings >= 0 ? "On track this month" : "Spending exceeds income";
    trendEl.classList.toggle("negative", stats.savings < 0);
  }

  const progressEl = document.getElementById("budget-progress");
  if (progressEl) {
    progressEl.style.width = `${stats.budgetPercentUsed}%`;
    progressEl.style.background =
      stats.budgetPercentUsed >= 100
        ? "var(--accent-red)"
        : stats.budgetPercentUsed >= 80
        ? "var(--accent-yellow)"
        : "var(--gradient-primary)";
  }
}

export function renderRecentTransactions(expenses, currency = "INR") {
  const list = document.getElementById("recent-transactions");
  if (!list) return;
  // Show all recent transactions including excluded ones — they're still
  // part of the record, just not counted in budget totals.
  const recent = expenses.slice(0, 8);
  list.innerHTML = recent.length
    ? recent.map((tx) => renderTransactionRow(tx, currency)).join("")
    : renderEmptyState("No transactions yet — add your first one!");
}

export function renderTopCategories(expenses, currency = "INR") {
  const list = document.getElementById("top-categories");
  if (!list) return;

  // Top categories only counts real spending, not excluded transfers.
  const expensesOnly = expenses.filter(
    (e) => e.type === "expense" && !e.excludeFromBudget
  );
  const totals = {};
  expensesOnly.forEach((e) => {
    totals[e.category] = (totals[e.category] || 0) + Number(e.amount);
  });

  const sorted = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const max = sorted.length ? sorted[0][1] : 1;

  if (!sorted.length) {
    list.innerHTML = renderEmptyState(
      "Categories will appear once you add expenses."
    );
    return;
  }

  list.innerHTML = sorted
    .map(
      ([category, total]) => `
      <li class="category-row">
        <div class="category-row-top">
          <span>${category}</span>
          <span>${formatCurrency(total, currency)}</span>
        </div>
        <div class="category-bar">
          <div class="category-bar-fill" style="width:${Math.max(4, (total / max) * 100)}%"></div>
        </div>
      </li>`
    )
    .join("");
}

export function renderDashboard(expenses, monthlyBudget, currency) {
  const stats = computeStats(expenses, monthlyBudget);
  renderStats(stats, currency);
  renderRecentTransactions(expenses, currency);
  renderTopCategories(expenses, currency);
  return stats;
}
