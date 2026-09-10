/**
 * COHO OpsHub — Theme Controller (Light / Dark Mode)
 */

const Theme = {
  getPreference() {
    const saved = localStorage.getItem("coho_theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  },

  apply(theme) {
    const isDark = theme === "dark";
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("coho_theme", theme);
    this.updateToggleIcons(theme);
  },

  toggle() {
    const current = document.documentElement.classList.contains("dark") ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    this.apply(next);
  },

  updateToggleIcons(theme) {
    const isDark = theme === "dark";
    document.querySelectorAll(".theme-toggle-btn").forEach(btn => {
      btn.innerHTML = isDark 
        ? `<span class="text-amber-400">☀️</span><span class="sr-only">Switch to Light Mode</span>` 
        : `<span class="text-slate-600">🌙</span><span class="sr-only">Switch to Dark Mode</span>`;
      btn.title = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";
    });
  },

  init() {
    const initialTheme = this.getPreference();
    this.apply(initialTheme);

    // Listen for OS theme changes if user has no explicit preference
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (!localStorage.getItem("coho_theme")) {
        this.apply(e.matches ? "dark" : "light");
      }
    });
  }
};

// Immediate execution to prevent flash of wrong theme
Theme.init();
