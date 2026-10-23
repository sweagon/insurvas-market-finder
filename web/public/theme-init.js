/* Apply stored/system preferences before first paint (avoids a theme flash). */
(function () {
  try {
    var t = localStorage.getItem("insurvas.theme");
    if (!t) {
      t = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    document.documentElement.dataset.theme = t;
    var d = localStorage.getItem("insurvas.density");
    if (d) document.documentElement.dataset.density = d;
    var r = localStorage.getItem("insurvas.reduceTransparency");
    if (r === "1") document.documentElement.dataset.reducedTransparency = "1";
  } catch (e) {}
})();
