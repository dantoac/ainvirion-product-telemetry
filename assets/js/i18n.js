/* =========================================================================
   i18n — minimal vanilla loader for static landings.
   - English text lives inline in HTML as the default fallback.
   - Other languages load from /locales/<lang>.json on demand.
   - Choice persists in localStorage.lang.
   ========================================================================= */

(function () {
  "use strict";

  const SUPPORTED = ["en", "es"];
  const DEFAULT_LANG = "en";
  const STORAGE_KEY = "lang";

  // Cache the original English fallback (so switching back to EN is instant
  // and we never re-fetch en.json — it's already in the DOM).
  const fallbackEN = new Map();
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    fallbackEN.set(el, el.textContent);
  });

  async function loadDict(lang) {
    if (lang === DEFAULT_LANG) return null;
    try {
      const res = await fetch(`locales/${lang}.json`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`[i18n] failed to load ${lang}:`, err);
      return null;
    }
  }

  function applyDict(dict) {
    // Build an effective dict that always returns a string for known keys
    // (English fallback for any missing entries) so other modules can read it.
    const effective = {};
    fallbackEN.forEach((text, el) => {
      const key = el.dataset.i18n;
      effective[key] = (dict && dict[key] != null) ? dict[key] : text;
    });
    window.__i18nDict = effective;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      el.textContent = effective[key];
    });
  }

  async function setLang(lang) {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
    const dict = await loadDict(lang);

    // If a non-English locale failed to load, fall back to English
    // so the UI language indicator stays consistent with the content.
    if (!dict && lang !== DEFAULT_LANG) {
      lang = DEFAULT_LANG;
    }

    applyDict(dict);

    document.documentElement.lang = lang;
    document.documentElement.dataset.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (_) {}

    document.querySelectorAll("[data-lang-switcher]").forEach((sel) => {
      if (sel.value !== lang) sel.value = lang;
    });
  }

  function detectInitialLang() {
    // 1. ?lang= query param wins
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("lang");
    if (fromUrl && SUPPORTED.includes(fromUrl)) return fromUrl;

    // 2. localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.includes(stored)) return stored;
    } catch (_) {}

    // 3. Browser language (only if it matches a supported one)
    const browser = (navigator.language || "en").slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(browser)) return browser;

    return DEFAULT_LANG;
  }

  // Bind switchers
  document.querySelectorAll("[data-lang-switcher]").forEach((sel) => {
    sel.addEventListener("change", (e) => setLang(e.target.value));
  });

  // Footer year
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  // Initial application
  setLang(detectInitialLang());
})();
