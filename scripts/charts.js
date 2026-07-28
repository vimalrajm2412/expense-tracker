/**
 * charts.js
 * ---------------------------------------------------------------------------
 * All Chart.js chart creation/updating lives here. Charts are created once
 * and updated in place on subsequent renders so Chart.js animations play on
 * every data change. Requires Chart.js loaded globally via CDN (window.Chart).
 *
 * Transactions flagged with excludeFromBudget: true are excluded from all
 * chart calculations — consistent with dashboard stat behaviour.
 * ---------------------------------------------------------------------------
 */

import { colorForCategory, startOfWeek } from "./helpers.js";

const instances = {};

const FONT_COLOR = "#aab0c6";
const GRID_COLOR = "rgba(255,255,255,0.06)";

function renderUnavailableState(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const parent = canvas.parentElement;
  if (!parent || parent.querySelector(".chart-unavailable")) return;

  canvas.style.display = "none";
  const message = document.createElement("p");
  message.className = "chart-unavailable";
  message.textContent = "Charts are unavailable in offline-only mode.";
  parent.appendChild(message);
}

function baseOptions(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 900, easing: "easeOutQuart" },
    plugins: {
      legend: { labels: { color: FONT_COLOR, font: { family: "Inter" } } },
    },
    ...extra,
  };
}

function getOrCreateChart(id, config) {
  const canvas = document.getElementById(id);
  if (!canvas) return null;
  if (typeof window.Chart === "undefined") {
    renderUnavailableState(id);
    return null;
  }

  if (instances[id]) {
    instances[id].data = config.data;
    instances[id].options = config.options;
    instances[id].update();
    return instances[id];
  }

  instances[id] = new window.Chart(canvas, config);
  return instances[id];
}

// Filter helper — strips excluded transactions before any chart calculation
function tracked(expenses) {
  return expenses.filter((e) => !e.excludeFromBudget);
}

export function renderCategoryChart(expenses) {
  const expensesOnly = tracked(expenses).filter((e) => e.type === "expense");
  const totals = {};
  expensesOnly.forEach((e) => {
    totals[e.category] = (totals[e.category] || 0) + Number(e.amount);
  });
  const labels = Object.keys(totals);
  const data = Object.values(totals);
  const colors = labels.map(colorForCategory);

  getOrCreateChart("chart-category", {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
    options: baseOptions({ cutout: "62%" }),
  });
}

export function renderIncomeExpenseChart(expenses) {
  const filtered = tracked(expenses);
  const income = filtered
    .filter((e) => e.type === "income")
    .reduce((s, e) => s + Number(e.amount), 0);
  const expense = filtered
    .filter((e) => e.type === "expense")
    .reduce((s, e) => s + Number(e.amount), 0);

  getOrCreateChart("chart-income-expense", {
    type: "bar",
    data: {
      labels: ["Income", "Expense"],
      datasets: [
        {
          data: [income, expense],
          backgroundColor: ["#2fe6a8", "#ff5b6e"],
          borderRadius: 8,
          maxBarThickness: 60,
        },
      ],
    },
    options: baseOptions({
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: FONT_COLOR }, grid: { display: false } },
        y: { ticks: { color: FONT_COLOR }, grid: { color: GRID_COLOR } },
      },
    }),
  });
}

export function renderMonthlyChart(expenses) {
  const filtered = tracked(expenses).filter((e) => e.type === "expense");
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d);
  }
  const labels = months.map((d) =>
    d.toLocaleDateString(undefined, { month: "short" })
  );
  const data = months.map((monthStart) => {
    const monthEnd = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      1
    );
    return filtered
      .filter(
        (e) =>
          new Date(e.date) >= monthStart && new Date(e.date) < monthEnd
      )
      .reduce((s, e) => s + Number(e.amount), 0);
  });

  getOrCreateChart("chart-monthly", {
    type: "bar",
    data: {
      labels,
      datasets: [
        { data, backgroundColor: "#5b8cff", borderRadius: 8, maxBarThickness: 36 },
      ],
    },
    options: baseOptions({
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: FONT_COLOR }, grid: { display: false } },
        y: { ticks: { color: FONT_COLOR }, grid: { color: GRID_COLOR } },
      },
    }),
  });
}

export function renderWeeklyTrendChart(expenses) {
  const filtered = tracked(expenses).filter((e) => e.type === "expense");
  const weekStart = startOfWeek(new Date());
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const data = labels.map((_, i) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    return filtered
      .filter((e) => new Date(e.date) >= day && new Date(e.date) < next)
      .reduce((s, e) => s + Number(e.amount), 0);
  });

  getOrCreateChart("chart-weekly", {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          data,
          borderColor: "#9b5bff",
          backgroundColor: "rgba(155,91,255,0.15)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#9b5bff",
        },
      ],
    },
    options: baseOptions({
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: FONT_COLOR }, grid: { display: false } },
        y: { ticks: { color: FONT_COLOR }, grid: { color: GRID_COLOR } },
      },
    }),
  });
}

export function renderAllCharts(expenses) {
  renderCategoryChart(expenses);
  renderIncomeExpenseChart(expenses);
  renderMonthlyChart(expenses);
  renderWeeklyTrendChart(expenses);
}

/**
 * Forces every existing Chart.js instance to recalculate its canvas size.
 * Call this right after the Analytics view becomes visible to fix blank
 * charts caused by 0x0 canvas dimensions while the view was hidden.
 */
export function resizeAllCharts() {
  Object.values(instances).forEach((chart) => {
    if (chart && typeof chart.resize === "function") {
      chart.resize();
    }
  });
}
