/**
 * notifications.js
 * ---------------------------------------------------------------------------
 * Animated toast notification system. Pure DOM module with no Firebase
 * dependency, reusable by any module that needs to surface a message.
 * ---------------------------------------------------------------------------
 */

const CONTAINER_ID = "toast-container";
const DEFAULT_DURATION = 4000;

function getContainer() {
  return document.getElementById(CONTAINER_ID);
}

/**
 * @param {string} message
 * @param {"success"|"error"|"warning"|"info"} type
 * @param {number} duration
 */
export function showToast(message, type = "info", duration = DEFAULT_DURATION) {
  const container = getContainer();
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  const timer = setTimeout(() => removeToast(toast), duration);

  toast.addEventListener("click", () => {
    clearTimeout(timer);
    removeToast(toast);
  });
}

function removeToast(toast) {
  toast.classList.add("removing");
  setTimeout(() => toast.remove(), 280);
}

export function showSuccess(message) {
  showToast(message, "success");
}

export function showError(message) {
  showToast(message, "error");
}

export function showWarning(message) {
  showToast(message, "warning");
}

/**
 * Renders a confirm dialog and resolves true/false based on user choice.
 * Wires up the #confirm-dialog markup already present in index.html.
 * @param {string} title
 * @param {string} message
 * @returns {Promise<boolean>}
 */
export function confirmDialog(title, message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirm-dialog");
    const titleEl = document.getElementById("confirm-dialog-title");
    const messageEl = document.getElementById("confirm-dialog-message");
    const confirmBtn = document.getElementById("confirm-dialog-confirm");
    const cancelBtn = document.getElementById("confirm-dialog-cancel");

    titleEl.textContent = title;
    messageEl.textContent = message;
    overlay.classList.remove("hidden");

    function cleanup(result) {
      overlay.classList.add("hidden");
      confirmBtn.removeEventListener("click", onConfirm);
      cancelBtn.removeEventListener("click", onCancel);
      resolve(result);
    }
    function onConfirm() { cleanup(true); }
    function onCancel() { cleanup(false); }

    confirmBtn.addEventListener("click", onConfirm);
    cancelBtn.addEventListener("click", onCancel);
  });
}
