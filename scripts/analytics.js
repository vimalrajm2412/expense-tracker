/**
 * analytics.js
 * ---------------------------------------------------------------------------
 * No-op analytics layer for local-only mode.
 * ---------------------------------------------------------------------------
 */

function noop() {}

export const Analytics = {
  login: noop,
  signUp: noop,
  logout: noop,
  addExpense: noop,
  editExpense: noop,
  deleteExpense: noop,
  viewChange: noop,
  exportData: noop,
  themeChange: noop,
};
