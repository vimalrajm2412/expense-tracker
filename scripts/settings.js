/**
 * settings.js
 * ---------------------------------------------------------------------------
 * Wires up the Settings view: theme toggle, currency + monthly budget
 * preferences, profile name editing, full data export (JSON), and account
 * deletion. Persists account data via the local data store and UI theme
 * preference via storage.js.
 * ---------------------------------------------------------------------------
 */

import { applyTheme } from "./ui.js";
import { updateUserSettings, updateUserProfile, deleteAllUserData } from "./db.js";
import { showSuccess, showError, confirmDialog } from "./notifications.js";
import { Analytics } from "./analytics.js";
import { removeAccount } from "./auth.js";

export function initSettingsView({ uid, settings, profile, expenses, onAccountDeleted, onSettingsSaved, onProfileSaved }) {
  const currencySelect = document.getElementById("currency-select");
  const budgetInput = document.getElementById("monthly-budget-input");
  const nameInput = document.getElementById("profile-name-input");
  const darkBtn = document.getElementById("theme-dark-btn");
  const lightBtn = document.getElementById("theme-light-btn");

  if (currencySelect) currencySelect.value = settings?.currency || "INR";
  if (budgetInput) budgetInput.value = settings?.monthlyBudget || "";
  if (nameInput) nameInput.value = profile?.name || "";

  if (darkBtn) darkBtn.onclick = () => {
    applyTheme("dark");
    Analytics.themeChange("dark");
  };
  if (lightBtn) lightBtn.onclick = () => {
    applyTheme("light");
    Analytics.themeChange("light");
  };

  document.getElementById("save-preferences").onclick = async () => {
    try {
      const nextSettings = {
        currency: "INR",
        monthlyBudget: Number(budgetInput.value) || 0,
      };
      await updateUserSettings(uid, nextSettings);
      onSettingsSaved?.(nextSettings);
      showSuccess("Preferences saved.");
    } catch (err) {
      showError("Could not save preferences.");
      console.error(err);
    }
  };

  document.getElementById("save-profile").onclick = async () => {
    try {
      const nextProfile = { name: nameInput.value.trim(), email: profile?.email || "" };
      await updateUserProfile(uid, nextProfile);
      document.getElementById("user-name").textContent = nameInput.value.trim() || "User";
      onProfileSaved?.(nextProfile);
      showSuccess("Profile updated.");
    } catch (err) {
      showError("Could not update profile.");
      console.error(err);
    }
  };

  document.getElementById("settings-export-data").onclick = () => {
    const payload = { profile, settings, expenses };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pocketledger-data.json";
    a.click();
    URL.revokeObjectURL(url);
    Analytics.exportData("json");
    showSuccess("Data exported.");
  };

  document.getElementById("delete-account-btn").onclick = async () => {
    const confirmed = await confirmDialog(
      "Delete account?",
      "This permanently deletes your profile and settings. This cannot be undone."
    );
    if (!confirmed) return;

    try {
      await deleteAllUserData(uid);
      await removeAccount();
      showSuccess("Account deleted.");
      onAccountDeleted?.();
    } catch (err) {
      showError("Could not delete account. Try logging out and back in, then retry.");
      console.error(err);
    }
  };
}
