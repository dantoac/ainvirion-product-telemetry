/* =========================================================================
   Product Theater — tab switching, auto-rotation, restart-on-view
   ========================================================================= */

(function () {
  "use strict";

  const theater = document.querySelector("[data-pt]");
  if (!theater) return;

  const tabs = Array.from(theater.querySelectorAll("[data-pt-tab]"));
  const panels = Array.from(theater.querySelectorAll("[data-pt-panel]"));
  if (!tabs.length || !panels.length) return;

  // Per-tab auto-rotate durations (ms). Keep in sync with CSS animation duration.
  const AUTO_INTERVALS = [7000, 7000, 7000];
  const prefersReduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let activeIndex = 0;
  let timer = null;
  // If the user asked for reduced motion, don't auto-rotate at all —
  // auto-panel-swapping is itself motion, regardless of CSS keyframes.
  let autoRotate = !prefersReduce;

  function currentDuration() {
    return AUTO_INTERVALS[activeIndex] || 7000;
  }

  function resetProgress(tab) {
    const bar = tab && tab.querySelector("[data-pt-progress]");
    if (!bar) return;
    // Remove running class, force reflow, then (optionally) re-add.
    bar.classList.remove("is-running");
    void bar.offsetWidth;
  }

  function startProgress() {
    const tab = tabs[activeIndex];
    const bar = tab && tab.querySelector("[data-pt-progress]");
    if (!bar) return;
    bar.style.setProperty("--pt-progress-duration", currentDuration() + "ms");
    // Force reflow so animation restarts when class re-applied.
    bar.classList.remove("is-running");
    void bar.offsetWidth;
    bar.classList.add("is-running");
    tab.classList.remove("is-paused");
  }

  function stopProgress({ paused = false } = {}) {
    tabs.forEach((tab) => {
      const bar = tab.querySelector("[data-pt-progress]");
      if (bar) bar.classList.remove("is-running");
      tab.classList.toggle("is-paused", paused && tab.classList.contains("is-active"));
    });
  }

  function setActive(idx, { manual = false } = {}) {
    activeIndex = (idx + panels.length) % panels.length;

    tabs.forEach((tab, i) => {
      const isActive = i === activeIndex;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
      if (!isActive) {
        tab.classList.remove("is-paused");
        resetProgress(tab);
      }
    });

    panels.forEach((panel, i) => {
      if (i === activeIndex) {
        panel.removeAttribute("hidden");
        // Force reflow trick: remove + read + add → animations restart
        panel.classList.remove("is-active");
        void panel.offsetWidth;
        panel.classList.add("is-active");
      } else {
        panel.classList.remove("is-active");
        panel.setAttribute("hidden", "");
      }
    });

    if (manual) {
      tabs[activeIndex].focus();
      autoRotate = false;
      clearTimer();
      // Manual mode: show the paused/static indicator on the active tab.
      stopProgress({ paused: true });
    }
  }

  function next() {
    setActive(activeIndex + 1);
    // After advancing, if auto-rotate is still on, reschedule for the
    // (possibly different) next interval and restart the progress bar.
    if (autoRotate) {
      startTimer();
    }
  }

  function startTimer() {
    clearTimer();
    if (!autoRotate) return;
    timer = window.setTimeout(next, currentDuration());
    startProgress();
  }

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  // Wire tabs: click + WAI-ARIA tablist keyboard pattern
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => setActive(i, { manual: true }));

    tab.addEventListener("keydown", (e) => {
      let next = -1;
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowUp":
          next = (i - 1 + tabs.length) % tabs.length;
          break;
        case "ArrowRight":
        case "ArrowDown":
          next = (i + 1) % tabs.length;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = tabs.length - 1;
          break;
      }
      if (next >= 0) {
        e.preventDefault();
        setActive(next, { manual: true });
      }
    });
  });

  // Pause when out of view, resume when in view; also restart on re-enter
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Re-trigger animation on the active panel
            const active = panels[activeIndex];
            if (active) {
              active.classList.remove("is-active");
              void active.offsetWidth;
              active.classList.add("is-active");
            }
            startTimer();
          } else {
            clearTimer();
            stopProgress();
          }
        });
      },
      { threshold: 0.35 }
    );
    io.observe(theater);
  } else {
    startTimer();
  }

  // Pause when tab is hidden
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearTimer();
      stopProgress();
    } else if (autoRotate) {
      startTimer();
    }
  });

  // Initial state
  setActive(0);
})();

/* =========================================================================
   Copy buttons — generic [data-copy-btn] inside [data-copy-target]
   Reads text from [data-copy-source], swaps label, flashes container.
   ========================================================================= */

(function () {
  "use strict";

  const RESET_MS = 1600;

  document.querySelectorAll("[data-copy-btn]").forEach((btn) => {
    const container = btn.closest("[data-copy-target]");
    const source = container && container.querySelector("[data-copy-source]");
    const label = btn.querySelector("[data-copy-label]");
    if (!source || !label) return;

    const originalText = label.textContent;
    let resetTimer = null;

    function resolveLabel(key) {
      // Pull from the active i18n dict via fallback: attribute on the page if present
      const langDict = window.__i18nDict;
      if (langDict && langDict[key]) return langDict[key];
      return null;
    }

    btn.addEventListener("click", async () => {
      const text = source.textContent.replace(/\u00a0/g, " ").trim();
      let ok = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          ok = true;
        }
      } catch (_) {
        ok = false;
      }

      if (ok) {
        const doneText = resolveLabel("common.copy.done") || "copied";
        label.textContent = doneText;
        btn.classList.add("is-done");
        if (container) container.classList.add("is-copied");
      } else {
        const fallback = resolveLabel("common.copy.fallback") || "press ⌘C";
        label.textContent = fallback;
        // Select the source text for manual copy
        const range = document.createRange();
        range.selectNodeContents(source);
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }

      clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        const idleText = resolveLabel("common.copy.idle") || originalText;
        label.textContent = idleText;
        btn.classList.remove("is-done");
        if (container) container.classList.remove("is-copied");
      }, RESET_MS);
    });
  });
})();
