/* =========================================================================
   Navbar — scroll morph + theme toggle
   ========================================================================= */

(function () {
  "use strict";

  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  // --- Scroll morph: standard → island pill ---
  const SCROLL_THRESHOLD = 80;
  let lastState = "top";

  function syncState() {
    const next = window.scrollY > SCROLL_THRESHOLD ? "scrolled" : "top";
    if (next !== lastState) {
      navbar.dataset.state = next;
      lastState = next;
    }
  }

  syncState();
  window.addEventListener("scroll", syncState, { passive: true });

  // --- Theme toggle ---
  const THEME_KEY = "theme";
  const root = document.documentElement;

  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (_) {
      return null;
    }
  }

  function applyTheme(theme) {
    if (theme === "light" || theme === "dark") {
      root.setAttribute("data-theme", theme);
    } else {
      root.removeAttribute("data-theme");
    }
  }

  function currentEffectiveTheme() {
    const explicit = root.getAttribute("data-theme");
    if (explicit) return explicit;
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  // Apply stored theme on load; default to dark when unset.
  applyTheme(getStoredTheme() || "dark");

  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = currentEffectiveTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (_) {}
    });
  });

  // --- Mobile drawer ---
  const toggleBtn = document.querySelector("[data-nav-toggle]");
  const drawer = document.getElementById("nav-drawer");
  const overlay = document.querySelector("[data-nav-overlay]");

  if (toggleBtn && drawer && overlay) {
    const drawerLinks = drawer.querySelectorAll("[data-nav-link]");
    let isOpen = false;
    let prevBodyOverflow = "";

    function getFocusable() {
      return Array.from(
        drawer.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
    }

    function openDrawer() {
      if (isOpen) return;
      isOpen = true;

      drawer.hidden = false;
      overlay.hidden = false;
      // Force reflow so the transition plays.
      void drawer.offsetWidth;

      drawer.dataset.open = "true";
      overlay.dataset.open = "true";
      drawer.setAttribute("aria-hidden", "false");
      toggleBtn.setAttribute("aria-expanded", "true");

      prevBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const focusables = getFocusable();
      if (focusables.length > 0) {
        focusables[0].focus();
      }

      document.addEventListener("keydown", onKeydown);
    }

    function closeDrawer({ returnFocus = true } = {}) {
      if (!isOpen) return;
      isOpen = false;

      drawer.dataset.open = "false";
      overlay.dataset.open = "false";
      drawer.setAttribute("aria-hidden", "true");
      toggleBtn.setAttribute("aria-expanded", "false");

      document.body.style.overflow = prevBodyOverflow;

      document.removeEventListener("keydown", onKeydown);

      // Hide after transition completes so they don't catch focus/clicks.
      const hideAfter = () => {
        if (!isOpen) {
          drawer.hidden = true;
          overlay.hidden = true;
        }
        drawer.removeEventListener("transitionend", hideAfter);
      };
      drawer.addEventListener("transitionend", hideAfter);
      // Fallback if transitionend doesn't fire.
      setTimeout(() => {
        if (!isOpen) {
          drawer.hidden = true;
          overlay.hidden = true;
        }
      }, 500);

      if (returnFocus) {
        toggleBtn.focus();
      }
    }

    function onKeydown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDrawer();
        return;
      }
      if (e.key === "Tab") {
        const focusables = getFocusable();
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    toggleBtn.addEventListener("click", () => {
      if (isOpen) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    overlay.addEventListener("click", () => closeDrawer());

    drawerLinks.forEach((link) => {
      link.addEventListener("click", () => {
        // Let the browser navigate to the anchor, then close without stealing focus.
        closeDrawer({ returnFocus: false });
      });
    });

    // If viewport grows past mobile, ensure drawer is closed.
    const mql = window.matchMedia("(min-width: 881px)");
    const onMqlChange = (e) => {
      if (e.matches && isOpen) closeDrawer({ returnFocus: false });
    };
    if (mql.addEventListener) {
      mql.addEventListener("change", onMqlChange);
    } else if (mql.addListener) {
      mql.addListener(onMqlChange);
    }
  }
})();
