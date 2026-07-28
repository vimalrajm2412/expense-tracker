/**
 * validation.js
 * ---------------------------------------------------------------------------
 * Pure validation functions for auth and expense forms. Each validator
 * returns either null (valid) or a short, human-readable error string.
 * ---------------------------------------------------------------------------
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email) {
  if (!email || !email.trim()) return "Email is required.";
  if (!EMAIL_REGEX.test(email.trim())) return "Enter a valid email address.";
  return null;
}

export function validatePassword(password) {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export function validatePasswordsMatch(password, confirmPassword) {
  if (password !== confirmPassword) return "Passwords do not match.";
  return null;
}

export function validateName(name) {
  if (!name || !name.trim()) return "Name is required.";
  if (name.trim().length < 2) return "Name is too short.";
  return null;
}

export function validateExpense({ amount, category, date }) {
  if (amount === "" || amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return "Enter a valid amount.";
  }
  if (Number(amount) <= 0) return "Amount must be greater than zero.";
  if (!category) return "Select a category.";
  if (!date) return "Select a date.";
  return null;
}
