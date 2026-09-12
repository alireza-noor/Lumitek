/* ============================================================
   LumiTek v0.2.1 — Aurora homepage animations (فقط صفحه اصلی)
   نسخه بدون نقاط متحرک و بدون نوار پیشرفت: رگباری‌های نرم،
   چرخش کلمات، تیلت سه‌بعدی، اسپات‌لایت و شمارنده آمار
   ============================================================ */
(function () {
  "use strict";
  var doc = document;
  if (!doc.querySelector(".au-hero")) return;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------------- 4) چرخش کلمات روتاتور ---------------- */
  var rotItems = Array.prototype.slice.call(doc.querySelectorAll(".au-rot-item"));
  if (rotItems.length > 1 && !reduceMotion) {
    var ri = 0;
    setInterval(function () {
      rotItems[ri].classList.remove("is-on");
      ri = (ri + 1) % rotItems.length;
      rotItems[ri].classList.add("is-on");
    }, 2300);
  }

  /* ---------------- 5) تیلت سه‌بعدی ---------------- */
  if (finePointer && !reduceMotion) {
    Array.prototype.forEach.call(doc.querySelectorAll("[data-tilt]"), function (el) {
      var max = 4;
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - .5;
        var py = (e.clientY - r.top) / r.height - .5;
        el.style.transform = "rotateX(" + (-py * max).toFixed(2) + "deg) rotateY(" + (px * max).toFixed(2) + "deg)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------------- 6) اسپات‌لایت کارت‌ها ---------------- */
  if (finePointer) {
    Array.prototype.forEach.call(doc.querySelectorAll("[data-spot]"), function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
        el.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
      }, { passive: true });
    });
  }

  /* ---------------- 8) شمارنده آمار (کادرهای رنگی) ---------------- */
  var stats = Array.prototype.slice.call(doc.querySelectorAll(".au-stat b[data-count]"));
  if (stats.length && "IntersectionObserver" in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, target = parseInt(el.getAttribute("data-count"), 10) || 0;
        var t0 = null;
        function step(ts) {
          if (!t0) t0 = ts;
          var k = Math.min(1, (ts - t0) / 1200);
          el.textContent = String(Math.round(target * (1 - Math.pow(1 - k, 3))));
          if (k < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        so.unobserve(el);
      });
    }, { threshold: .4 });
    stats.forEach(function (s) { so.observe(s); });
  }

  /* ---------------- 9) هاله دنبال‌کننده ماوس ---------------- */
  var glowEl = doc.getElementById("auCursorGlow");
  if (glowEl && finePointer && !reduceMotion && window.innerWidth > 900) {
    var gx = -600, gy = -600, tx = gx, ty = gy, running = false;
    window.addEventListener("pointermove", function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function loop() {
      gx += (tx - gx) * .09; gy += (ty - gy) * .09;
      glowEl.style.left = gx + "px"; glowEl.style.top = gy + "px";
      requestAnimationFrame(loop);
    })();
  }
})();
