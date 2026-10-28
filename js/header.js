// Keeps the header pinned while scrolling and tells the page how tall it is,
// so in-page links and the sticky side menus land below it.
(function () {
  "use strict";
  const band = document.querySelector(".band");
  if (!band) return;
  const root = document.documentElement;
  function size() { root.style.setProperty("--head-h", band.offsetHeight + "px"); }
  function shade() { band.classList.toggle("scrolled", window.scrollY > 4); }
  size(); shade();
  if (window.ResizeObserver) new ResizeObserver(size).observe(band);
  else window.addEventListener("resize", size);
  window.addEventListener("scroll", shade, { passive: true });
  // Anonymous counting (GoatCounter): events such as an opened item window or a Discord
  // click. Waits briefly for the counter script, which loads after the page.
  window.siTrack = function track(path, title, tries) {
    const gc = window.goatcounter;
    if (gc && gc.count) { try { gc.count({ path, title, event: true }); } catch (e) { /* ignore */ } return; }
    if ((tries || 0) < 20) setTimeout(() => track(path, title, (tries || 0) + 1), 500);
  };
  document.addEventListener("click", e => {
    if (e.target.closest("[data-discord]")) window.siTrack("discord-join", "Join the Discord server");
  });
  // The Discord invite can be changed in one place: window.DISCORD_URL in js/config.js.
  document.addEventListener("DOMContentLoaded", () => {
    if (window.DISCORD_URL) document.querySelectorAll("[data-discord]").forEach(a => { a.href = window.DISCORD_URL; });
  });
})();
