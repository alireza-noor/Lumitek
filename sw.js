/* ============================================================
   Lumitek 0.7 — Service Worker (موتور آفلاین)
   ------------------------------------------------------------
   استراتژی:
   • App shell (صفحات/CSS/JS/آیکون‌ها): stale-while-revalidate
     → اول از کش (فوری + آفلاین)، بعد در پس‌زمینه بروزرسانی.
   • صفحات ناوبری: network-first با fallback به کش → همیشه
     تازه‌ترین نسخه؛ اگر اینترنت نبود از کش اجرا می‌شود.
   • درخواست‌های خبری و AI: network-first با کش runtime
     → آخرین پاسخ موفق همیشه برای حالت آفلاین می‌ماند.
   ============================================================ */
var CACHE = "lumitek-v0.7.0";
var RUNTIME = "lumitek-runtime-v0.7.0";

var CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/i18n.js",
  "./js/main.js",
  "./js/auth.js",
  "./assets/icons/favicon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/logo-lt.png",
  "./assets/icons/logo-mark-lg.png",
  "./pages/ai.html",
  "./pages/tools.html",
  "./pages/games.html",
  "./pages/store.html",
  "./pages/download.html",
  "./pages/sports.html",
  "./pages/account.html",
  "./pages/support.html",
  "./pages/donate.html",
  "./pages/technology.html",
  "./pages/articles.html",
  "./pages/announcements.html",
  "./pages/about.html",
  "./pages/contact.html",
  "./pages/shooter.html",
  "./pages/maze.html",
  "./pages/connect4.html",
  "./pages/drive.html",
  "./pages/adventure.html",
  "./pages/penalty.html",
  "./pages/range.html",
  "./pages/runner.html",
  "./pages/rally.html",
  "./pages/hoops.html",
  "./pages/reaction.html",
  "./pages/number-rush.html",
  "./pages/color-tap.html",
  "./pages/quick-math.html",
  "./pages/sequence.html",
  "./pages/snake.html",
  "./pages/tictactoe.html",
  "./pages/g2048.html",
  "./pages/mines.html",
  "./pages/breakout.html",
  "./pages/puzzle15.html",
  "./pages/wordguess.html",
  "./tools/calculator.html",
  "./tools/converter.html",
  "./tools/date-time.html",
  "./tools/calendar.html",
  "./tools/prayer-times.html",
  "./tools/world-clock.html",
  "./tools/statistics.html",
  "./tools/function-plot.html",
  "./tools/equations.html",
  "./tools/matrix.html",
  "./tools/deposit.html",
  "./tools/physics.html",
  "./tools/percent.html",
  "./tools/age.html",
  "./tools/text-tools.html",
  "./tools/password.html",
  "./tools/stopwatch.html",
  "./tools/todo.html",
  "./tools/bmi.html",
  "./tools/loan.html"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(CORE.map(function (url) {
        return c.add(new Request(url, { cache: "reload" })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE && k !== RUNTIME) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  /* AI و خبری: network-first + runtime cache (برای آفلاین) */
  var isAI = url.hostname.indexOf("pollinations") !== -1;
  var isNews = url.hostname.indexOf("rss2json") !== -1;
  var isCross = url.hostname !== location.hostname && req.mode === "cors";
  if (isAI || isNews || (isCross && url.hostname.indexOf("fontnegar") === -1 && url.hostname.indexOf("gstatic") === -1 && url.hostname.indexOf("fonts.googleapis") === -1)) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(RUNTIME).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req);
      })
    );
    return;
  }

  /* فونت‌های خارجی: cache-first */
  if (url.hostname.indexOf("fontnegar") !== -1 || url.hostname.indexOf("fonts.gstatic") !== -1 || url.hostname.indexOf("fonts.googleapis") !== -1) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(RUNTIME).then(function (c) { c.put(req, copy); });
          return res;
        }).catch(function () { return hit; });
      })
    );
    return;
  }

  /* صفحات ناوبری: network-first، fallback به کش */
  if (req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") !== -1) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match("./index.html");
        });
      })
    );
    return;
  }

  /* بقیه (CSS/JS/آیکون): stale-while-revalidate */
  e.respondWith(
    caches.match(req).then(function (hit) {
      var fetching = fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () { return hit; });
      return hit || fetching;
    })
  );
});
