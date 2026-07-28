/**
 * main.js
 * ---------------------------------------------------------------------------
 * Entry point loaded by index.html (<script type="module" src="scripts/main.js">).
 * Boots the app without requiring any network services.
 * ---------------------------------------------------------------------------
 */

import { initApp } from "./app.js";

initApp();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}
