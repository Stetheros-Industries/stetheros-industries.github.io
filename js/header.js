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
})();
