/**
 * calendar.js
 * ---------------------------------------------------------------------------
 * Renders the monthly calendar grid, highlights today, marks days that have
 * transactions, and notifies the caller when a date is clicked so app.js can
 * render that day's transaction list.
 * ---------------------------------------------------------------------------
 */

import { formatCurrency, isSameDay } from "./helpers.js";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

let viewDate = new Date();
let selectedDate = new Date();

export function getCalendarState() {
  return { viewDate, selectedDate };
}

export function goToPreviousMonth() {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
}

export function goToNextMonth() {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
}

export function selectDate(date) {
  selectedDate = date;
}

/**
 * Renders the calendar grid for the current viewDate into #calendar-grid,
 * marking days with transactions and today's date.
 * @param {Array} expenses - all of the user's expense/income docs
 * @param {(date: Date) => void} onDayClick
 * @param {string} currency
 */
export function renderCalendar(expenses, onDayClick, currency = "INR") {
  const grid = document.getElementById("calendar-grid");
  const label = document.getElementById("cal-month-label");
  if (!grid || !label) return;

  label.textContent = `${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();
  const today = new Date();

  const totalsByDay = {};
  expenses.forEach((e) => {
    const d = new Date(e.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate();
      totalsByDay[key] = (totalsByDay[key] || 0) + (e.type === "expense" ? Number(e.amount) : 0);
    }
  });

  let html = "";
  for (let i = 0; i < startWeekday; i++) {
    html += `<div class="cal-day empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(year, month, day);
    const isToday = isSameDay(cellDate, today);
    const isSelected = isSameDay(cellDate, selectedDate);
    const total = totalsByDay[day];

    html += `
      <div class="cal-day ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}" data-date="${cellDate.toISOString()}">
        <span>${day}</span>
        ${total ? `<span class="cal-day-amount">${formatCurrency(total, currency)}</span>` : ""}
        ${total ? `<span class="cal-day-dot"></span>` : ""}
      </div>`;
  }

  grid.innerHTML = html;

  grid.querySelectorAll(".cal-day:not(.empty)").forEach((cell) => {
    cell.addEventListener("click", () => {
      const date = new Date(cell.dataset.date);
      selectDate(date);
      renderCalendar(expenses, onDayClick, currency);
      onDayClick(date);
    });
  });
}
