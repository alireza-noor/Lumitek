/* ============================================================
   Lumitek 0.8 — Auth (demo mode + Firebase-ready)
   ------------------------------------------------------------
   حالت فعلی: "demo" — حساب‌ها روی localStorage همین مرورگر
   ذخیره می‌شوند (ایمیل + رمز هش‌شده با SHA-256 + salt).

   🔥 اتصال Firebase واقعی (ورود واقعی گوگل و ایمیل):
   ۱) در console.firebase.google.com یک پروژه بساز و Authentication
      را فعال کن (Google + Email/Password providers).
   ۲) Web App بساز و config را در AUTH_CONFIG زیر قرار بده.
   ۳) اسکریپت‌های Firebase را در <head> صفحات اضافه کن:
      <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
      <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
   ۴) همین و! بقیه کار را این ماژول خودکار انجام می‌دهد.
   ============================================================ */
window.LumiAuth = (function () {
  var AUTH_CONFIG = {
    provider: "demo",   // "demo" | "firebase"
    firebase: {
      apiKey: "",
      authDomain: "",
      projectId: "",
      appId: ""
    }
  };

  var USERS_KEY = "lumitek_auth_users_v1";
  var SESSION_KEY = "lumitek_auth_session_v1";
  var LOCK_KEY = "lumitek_auth_lock_v1";
  var MAX_FAILS = 5, LOCK_MS = 60000;
  var _listeners = [];

  function users() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

  /* ---- ۱.۱: قفل بعد از تلاش‌های ناموفق ---- */
  function lockState(email) {
    try { return JSON.parse(localStorage.getItem(LOCK_KEY) || "{}")[email] || { fails: 0, until: 0 }; } catch (e) { return { fails: 0, until: 0 }; }
  }
  function setLock(email, st) {
    try {
      var all = JSON.parse(localStorage.getItem(LOCK_KEY) || "{}");
      all[email] = st;
      localStorage.setItem(LOCK_KEY, JSON.stringify(all));
    } catch (e) {}
  }
  function checkLock(email) {
    var st = lockState(email);
    if (st.until > Date.now()) return Math.ceil((st.until - Date.now()) / 1000);
    return 0;
  }
  function registerFail(email) {
    var st = lockState(email);
    st.fails = (st.fails || 0) + 1;
    if (st.fails >= MAX_FAILS) { st.until = Date.now() + LOCK_MS; st.fails = 0; }
    setLock(email, st);
  }
  function clearFails(email) { setLock(email, { fails: 0, until: 0 }); }

  /* ---- ۱.۱: سنجش قدرت رمز (۰ تا ۴) ---- */
  function passScore(pw) {
    if (!pw) return 0;
    var s = 0;
    if (pw.length >= 6) s++;
    if (pw.length >= 10) s++;
    if (/[a-zA-Z]/.test(pw) && /\d/.test(pw)) s++;
    if (/[^a-zA-Z0-9]/.test(pw) || (/[A-Z]/.test(pw) && /[a-z]/.test(pw))) s++;
    return s;
  }

  function emit() {
    var cur = currentUser();
    _listeners.forEach(function (fn) { try { fn(cur); } catch (e) {} });
  }

  function onChange(fn) { if (typeof fn === "function") _listeners.push(fn); }

  function currentUser() {
    try {
      var s = JSON.parse(localStorage.getItem(SESSION_KEY));
      return s && s.email ? s : null;
    } catch (e) { return null; }
  }

  function setSession(u) {
    if (u) {
      /* ۱.۱: ثبت آخرین ورود */
      try {
        var all = users();
        if (all[u.email]) { all[u.email].lastLogin = Date.now(); saveUsers(all); }
      } catch (e) {}
      localStorage.setItem(SESSION_KEY, JSON.stringify({ email: u.email, name: u.name, provider: u.provider, at: Date.now() }));
    }
    else localStorage.removeItem(SESSION_KEY);
    syncProfile(u);
    emit();
  }

  function syncProfile(u) {
    if (!u) return;
    try {
      var p = getProfile();
      if (p.name === "Lumitek User" && u.name) { p.name = u.name; saveProfile(p); }
    } catch (e) {}
  }

  function hash(pass, salt) {
    if (window.crypto && crypto.subtle && crypto.subtle.digest && window.isSecureContext !== false) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + "::" + pass)).then(function (buf) {
        return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
      });
    }
    /* fallback ساده برای محیط‌های بدون crypto.subtle (مثل file:// در برخی مرورگرها) */
    var h = 5381, s = salt + "::" + pass;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return Promise.resolve("fnv" + h.toString(16));
  }

  function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }

  function signUp(email, pass, name) {
    if (window.LumiBackend && LumiBackend.enabled()) {
      return LumiBackend.signUp(email, pass, name).then(function(u) {
        setSession(u);
        return u;
      }).catch(function(err) {
        if (err && err.code) return Promise.reject(err);
        return Promise.reject({ code: "errWrong" });
      });
    }
    if (AUTH_CONFIG.provider === "firebase") return fbSignUp(email, pass, name);
    email = (email || "").trim().toLowerCase();
    name = (name || "").trim() || email.split("@")[0];
    if (!validEmail(email)) return Promise.reject({ code: "errEmail" });
    if (!pass || pass.length < 6) return Promise.reject({ code: "errPass" });
    var all = users();
    if (all[email]) return Promise.reject({ code: "errExists" });
    var salt = Math.random().toString(36).slice(2, 10);
    return hash(pass, salt).then(function (h) {
      all[email] = { email: email, name: name, salt: salt, hash: h, provider: "email", createdAt: Date.now() };
      saveUsers(all);
      setSession(all[email]);
      return all[email];
    });
  }

  function signIn(email, pass) {
    if (window.LumiBackend && LumiBackend.enabled()) {
      return LumiBackend.signIn(email, pass).then(function(u) {
        setSession(u);
        return u;
      }).catch(function(err) {
        if (err && err.code) return Promise.reject(err);
        return Promise.reject({ code: "errWrong" });
      });
    }
    if (AUTH_CONFIG.provider === "firebase") return fbSignIn(email, pass);
    email = (email || "").trim().toLowerCase();
    if (!validEmail(email)) return Promise.reject({ code: "errEmail" });
    var lockSec = checkLock(email);
    if (lockSec > 0) return Promise.reject({ code: "errLocked", secs: lockSec });
    var all = users();
    var u = all[email];
    if (!u) return Promise.reject({ code: "errNoUser" });
    return hash(pass || "", u.salt).then(function (h) {
      if (h !== u.hash) { registerFail(email); return Promise.reject({ code: "errWrong" }); }
      clearFails(email);
      setSession(u);
      return u;
    });
  }

  /* ---- ۱.۱: تغییر رمز عبور با تأیید رمز قبلی ---- */
  function changePassword(email, oldPass, newPass) {
    email = (email || "").trim().toLowerCase();
    if (AUTH_CONFIG.provider === "firebase") return Promise.reject({ code: "errWrong" });
    var all = users();
    var u = all[email];
    if (!u) return Promise.reject({ code: "errNoUser" });
    if (!newPass || newPass.length < 6) return Promise.reject({ code: "errPass" });
    return hash(oldPass || "", u.salt).then(function (h) {
      if (h !== u.hash) return Promise.reject({ code: "errWrong" });
      var salt = Math.random().toString(36).slice(2, 10);
      return hash(newPass, salt).then(function (h2) {
        all[email].salt = salt;
        all[email].hash = h2;
        saveUsers(all);
        return true;
      });
    });
  }

  /* ---- ۱.۱: حذف کامل حساب با تأیید رمز ---- */
  function deleteAccount(email, pass) {
    email = (email || "").trim().toLowerCase();
    var all = users();
    var u = all[email];
    if (!u) return Promise.reject({ code: "errNoUser" });
    if (u.provider === "microsoft" || u.provider === "google") {
      delete all[email]; saveUsers(all); setSession(null); return Promise.resolve(true);
    }
    return hash(pass || "", u.salt).then(function (h) {
      if (h !== u.hash) return Promise.reject({ code: "errWrong" });
      delete all[email];
      saveUsers(all);
      clearFails(email);
      setSession(null);
      return true;
    });
  }

  /* ورود با گوگل — در حالت نمایشی یک حساب گوگل محلی می‌سازد/وارد می‌کند.
     با Firebase واقعی، از popup گوگل استفاده می‌شود. */
  function signInGuest() {
    if (AUTH_CONFIG.provider === "firebase") return Promise.reject({ code: "errWrong" });
    var email = "guest@lumitek.local";
    var u = { email: email, name: "مهمان", provider: "guest", createdAt: Date.now() };
    var users = usersObj();
    if (!users[email]) { users[email] = u; saveUsers(users); }
    setSession(u);
    return Promise.resolve();
  }

  function usersObj() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; } catch (e) { return {}; }
  }

  function signInMicrosoft(email) {
    email = (email || "").trim().toLowerCase();
    if (!validEmail(email)) return Promise.reject({ code: "errEmail" });
    if (AUTH_CONFIG.provider === "firebase") return Promise.reject({ code: "errWrong" });
    var users = usersObj();
    var u = users[email];
    if (u && u.provider === "local") return Promise.reject({ code: "errTaken" });
    if (!u) {
      u = { email: email, name: email.split("@")[0], provider: "microsoft", createdAt: Date.now() };
      users[email] = u; saveUsers(users);
    }
    setSession(u);
    return Promise.resolve();
  }

  function signInGoogle() {
    if (AUTH_CONFIG.provider === "firebase" && window.firebase) {
      var provider = new firebase.auth.GoogleAuthProvider();
      return firebase.auth().signInWithPopup(provider).then(function (res) {
        var u = { email: res.user.email, name: res.user.displayName || res.user.email.split("@")[0], provider: "google" };
        setSession(u);
        return u;
      });
    }
    /* demo */
    var all = users();
    var email = "google.user@demo.lumitek";
    var u = all[email];
    if (!u) {
      u = { email: email, name: "Google User", provider: "google", createdAt: Date.now() };
      all[email] = u; saveUsers(all);
    }
    setSession(u);
    return Promise.resolve(u);
  }

  function signOut() {
    if (window.LumiBackend && LumiBackend.enabled()) {
      return LumiBackend.signOut().then(function(){ setSession(null); return true; });
    }
    if (AUTH_CONFIG.provider === "firebase" && window.firebase) firebase.auth().signOut();
    setSession(null);
    return Promise.resolve();
  }

  /* --- firebase wrappers --- */
  function fbSignUp(email, pass, name) {
    return firebase.auth().createUserWithEmailAndPassword(email, pass).then(function (res) {
      if (name) return res.user.updateProfile({ displayName: name }).then(function () {
        var u = { email: email, name: name, provider: "password" }; setSession(u); return u;
      });
      var u = { email: email, name: email.split("@")[0], provider: "password" }; setSession(u); return u;
    });
  }
  function fbSignIn(email, pass) {
    return firebase.auth().signInWithEmailAndPassword(email, pass).then(function (res) {
      var u = { email: res.user.email, name: res.user.displayName || res.user.email.split("@")[0], provider: "password" };
      setSession(u); return u;
    });
  }

  /* --- UI: auth modal --- */
  function msLogo() {
    return '<svg width="18" height="18" viewBox="0 0 23 23"><rect x="1" y="1" width="10" height="10" fill="#F25022"/><rect x="12" y="1" width="10" height="10" fill="#7FBA00"/><rect x="1" y="12" width="10" height="10" fill="#00A4EF"/><rect x="12" y="12" width="10" height="10" fill="#FFB900"/></svg>';
  }
  function ensureModal() {
    if (document.querySelector("#authModal")) return;
    var logoSrc = "assets/icons/logo-lt.png";
    var sc = document.querySelector('script[src*="auth.js"]');
    if (sc && sc.src) logoSrc = sc.src.replace(/js\/auth\.js.*$/, "") + "assets/icons/logo-lt.png";
    var m = document.createElement("div");
    m.id = "authModal";
    m.className = "modal";
    m.innerHTML =
      '<div class="modal-card modal-small">' +
      '<button class="modal-close" data-auth-close>×</button>' +
      '<div class="auth-brand"><img class="auth-brand-logo" src="' + logoSrc + '" alt="Lumitek" width="44" height="44"><h3 class="auth-title">ورود به Lumitek</h3></div>' +
      '<div data-auth-main>' +
      '<div class="auth-oauth-row">' +
      '<button class="google-btn" data-auth-google>' +
      '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>' +
      '<span>ادامه با گوگل</span></button>' +
      '<button class="ms-btn" data-auth-ms>' + msLogo() + '<span>ورود با مایکروسافت</span></button>' +
      '</div>' +
      '<button class="guest-btn" data-auth-guest>👤 <span>ورود سریع به عنوان مهمان</span></button>' +
      '<div class="auth-or"><span></span><i data-i18n="auth.or">یا با ایمیل</i><span></span></div>' +
      '<div class="auth-tabs"><button data-auth-tab="in" class="active">ورود</button><button data-auth-tab="up">ثبت‌نام</button></div>' +
      '<div data-auth-mode="in">' +
      '<label class="auth-field-label" data-i18n="auth.emailLabel">ایمیل</label>' +
      '<input data-auth-email type="email" autocomplete="email" placeholder="ایمیل" style="display:block;width:100%;margin-bottom:14px">' +
      '<label class="auth-field-label" data-i18n="auth.passLabel">رمز عبور</label>' +
      '<div class="auth-pass-wrap" style="display:block;width:100%"><input data-auth-pass type="password" autocomplete="current-password" placeholder="رمز عبور" style="width:100%"><button type="button" class="auth-eye" data-auth-eye tabindex="-1">👁</button></div>' +
      '</div>' +
      '<div data-auth-mode="up" style="display:none">' +
      '<label class="auth-field-label" data-i18n="auth.nameLabel">نام نمایشی</label>' +
      '<input data-auth-name type="text" maxlength="24" placeholder="نام نمایشی" style="display:block;width:100%;margin-bottom:14px">' +
      '<label class="auth-field-label" data-i18n="auth.emailLabel">ایمیل</label>' +
      '<input data-auth-email2 type="email" autocomplete="email" placeholder="ایمیل" style="display:block;width:100%;margin-bottom:14px">' +
      '<label class="auth-field-label" data-i18n="auth.passLabel">رمز عبور</label>' +
      '<div class="auth-pass-wrap" style="display:block;width:100%"><input data-auth-pass2 type="password" autocomplete="new-password" placeholder="رمز عبور (حداقل ۶ کاراکتر)" style="width:100%"><button type="button" class="auth-eye" data-auth-eye tabindex="-1">👁</button></div>' +
      '<div class="auth-strength" data-auth-strength style="display:none">' +
      '<div class="auth-strength-track"><i data-auth-strength-fill></i></div>' +
      '<span data-auth-strength-label></span>' +
      '</div>' +
      '</div>' +
      '<div class="auth-error" data-auth-error style="display:none"></div>' +
      '<button class="primary-btn" style="width:100%;margin-top:8px" data-auth-submit>ورود</button>' +
      '</div>' +
      '<div data-auth-msstep style="display:none">' +
      '<p class="auth-ms-lead" data-i18n="auth.msLead">برای ورود با مایکروسافت، ایمیل اکانت خود را وارد کن:</p>' +
      '<label class="auth-field-label">ایمیل مایکروسافت</label>' +
      '<input data-auth-msemail type="email" autocomplete="email" dir="ltr" placeholder="you@outlook.com" style="display:block;width:100%;margin-bottom:14px">' +
      '<div class="auth-error" data-auth-error2 style="display:none"></div>' +
      '<button class="ms-btn ms-solid" style="width:100%;justify-content:center" data-auth-msgo>' + msLogo() + '<span>ادامه با مایکروسافت</span></button>' +
      '<button class="ghost-btn" style="width:100%;margin-top:8px" data-auth-msback>بازگشت</button>' +
      '</div>' +
      '<p class="auth-note">🔒 اطلاعاتت به‌صورت خودکار روی همین دستگاه ذخیره می‌شود — لازم نیست کار دیگری انجام دهی.</p>' +
      '</div>';
    document.body.appendChild(m);
    translateModal(m);
    wireModal(m);
  }

  function translateModal(m) {
    if (!window.LumiI18n) return;
    m.querySelector(".auth-title").textContent = T("auth.title");
    m.querySelector("[data-auth-google] span").textContent = T("auth.google");
    m.querySelector("[data-auth-ms] span").textContent = T("auth.ms") || "ورود با مایکروسافت";
    m.querySelector("[data-auth-guest] span").textContent = T("auth.guest") || "ورود سریع به عنوان مهمان";
    m.querySelector("[data-i18n='auth.or']").textContent = T("auth.or");
    var tabs = m.querySelectorAll(".auth-tabs button");
    tabs[0].textContent = T("auth.signinTab"); tabs[1].textContent = T("auth.signupTab");
    m.querySelector("[data-auth-email]").placeholder = T("auth.email");
    m.querySelector("[data-auth-pass]").placeholder = T("auth.pass");
    m.querySelector("[data-auth-name]").placeholder = T("auth.name");
    m.querySelector("[data-auth-email2]").placeholder = T("auth.email");
    m.querySelector("[data-auth-pass2]").placeholder = T("auth.pass");
    m.querySelector("[data-auth-submit]").textContent = T("auth.signinBtn");
    m.querySelector(".auth-note").textContent = T("auth.demoNote");
    var lead = m.querySelector("[data-i18n='auth.msLead']");
    if (lead) lead.textContent = T("auth.msLead") || "برای ورود با مایکروسافت، ایمیل اکانت خود را وارد کن:";
    /* ترجمه‌ی لیبل‌های فیلد */
    m.querySelectorAll(".auth-field-label[data-i18n='auth.emailLabel']").forEach(function(el){ el.textContent = T("auth.emailLabel"); });
    m.querySelectorAll(".auth-field-label[data-i18n='auth.passLabel']").forEach(function(el){ el.textContent = T("auth.passLabel"); });
    m.querySelectorAll(".auth-field-label[data-i18n='auth.nameLabel']").forEach(function(el){ el.textContent = T("auth.nameLabel"); });
  }

  function showMsStep(m, on) {
    m.querySelector("[data-auth-main]").style.display = on ? "none" : "";
    m.querySelector("[data-auth-msstep]").style.display = on ? "" : "none";
  }

  var mode = "in";

  function strengthLabel(score) {
    if (score <= 1) return T("auth.stWeak") || "ضعیف";
    if (score === 2) return T("auth.stMed") || "متوسط";
    if (score === 3) return T("auth.stGood") || "خوب";
    return T("auth.stStrong") || "عالی! 💪";
  }

  function paintStrength(m) {
    var wrap = m.querySelector("[data-auth-strength]");
    var pass = m.querySelector("[data-auth-pass2]");
    if (!wrap || !pass) return;
    if (!pass.value) { wrap.style.display = "none"; return; }
    var score = passScore(pass.value);
    wrap.style.display = "";
    var fill = m.querySelector("[data-auth-strength-fill]");
    var colors = ["#ff5c7c", "#ff9e5c", "#ffd166", "#22e5a5", "#76e6c3"];
    fill.style.width = (score / 4 * 100) + "%";
    fill.style.background = colors[score];
    m.querySelector("[data-auth-strength-label]").textContent = strengthLabel(score);
  }

  function wireModal(m) {
    m.addEventListener("input", function (e) {
      if (e.target && e.target.hasAttribute && e.target.hasAttribute("data-auth-pass2")) paintStrength(m);
    });
    m.addEventListener("click", function (e) {
      if (e.target === m || e.target.hasAttribute("data-auth-close")) { m.classList.remove("show"); showMsStep(m, false); return; }
      var g = e.target.closest("[data-auth-google]");
      if (g) {
        setLoading(g, true);
        signInGoogle().then(function () { ok(); }).catch(function (err) { showErr(err && err.code); }).finally(function () { setLoading(g, false); });
        return;
      }
      var ms = e.target.closest("[data-auth-ms]");
      if (ms) { showMsStep(m, true); var f = m.querySelector("[data-auth-msemail]"); setTimeout(function(){ f && f.focus(); }, 60); return; }
      var back = e.target.closest("[data-auth-msback]");
      if (back) { showMsStep(m, false); return; }
      var msgo = e.target.closest("[data-auth-msgo]");
      if (msgo) {
        setLoading(msgo, true);
        signInMicrosoft(m.querySelector("[data-auth-msemail]").value)
          .then(function () { showMsStep(m, false); ok(); })
          .catch(function (err) { var el = m.querySelector("[data-auth-error2]"); el.textContent = err && err.code ? T("auth." + err.code) : T("auth.errWrong"); el.style.display = "block"; })
          .finally(function () { setLoading(msgo, false); });
        return;
      }
      var guest = e.target.closest("[data-auth-guest]");
      if (guest) {
        setLoading(guest, true);
        signInGuest().then(function () { ok(); }).catch(function (err) { showErr(err && err.code); }).finally(function () { setLoading(guest, false); });
        return;
      }
      var eye = e.target.closest("[data-auth-eye]");
      if (eye) {
        var inp = eye.parentElement.querySelector("input");
        if (inp) { inp.type = inp.type === "password" ? "text" : "password"; eye.textContent = inp.type === "password" ? "👁" : "🙈"; }
        return;
      }
      var tab = e.target.closest("[data-auth-tab]");
      if (tab) {
        mode = tab.getAttribute("data-auth-tab");
        m.querySelectorAll("[data-auth-tab]").forEach(function (b) { b.classList.toggle("active", b === tab); });
        m.querySelector("[data-auth-mode='in']").style.display = mode === "in" ? "" : "none";
        m.querySelector("[data-auth-mode='up']").style.display = mode === "up" ? "" : "none";
        m.querySelector("[data-auth-submit]").textContent = mode === "in" ? T("auth.signinBtn") : T("auth.signupBtn");
        hideErr();
        return;
      }
      if (e.target.closest("[data-auth-submit]")) submit(m);
    });
    m.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target.tagName === "INPUT") {
        var inMs = m.querySelector("[data-auth-msstep]").style.display !== "none";
        if (inMs) { if (e.target === m.querySelector("[data-auth-msemail]")) { var go = m.querySelector("[data-auth-msgo]"); go && go.click(); } return; }
        submit(m);
      }
    });
  }

  function submit(m) {
    hideErr();
    var email = m.querySelector(mode === "in" ? "[data-auth-email]" : "[data-auth-email2]").value.trim();
    var pass = m.querySelector(mode === "in" ? "[data-auth-pass]" : "[data-auth-pass2]").value;
    var name = mode === "up" ? m.querySelector("[data-auth-name]").value.trim() : "";
    var btn = m.querySelector("[data-auth-submit]");
    setLoading(btn, true);
    var p = mode === "in" ? signIn(email, pass) : signUp(email, pass, name);
    p.then(function () { ok(); }).catch(function (err) { showErr(err && err.code, err && err.secs); })
     .finally(function () { setLoading(btn, false); });
  }

  function ok() {
    var m = document.querySelector("#authModal");
    if (m) m.classList.remove("show");
    addNotification("✅", T("auth.welcome") + " " + (currentUser() || {}).name + " 👋");
  }

  function showErr(code, extra) {
    var m = document.querySelector("#authModal");
    if (!m) return;
    var el = m.querySelector("[data-auth-error]");
    var txt = code ? T("auth." + code) : T("auth.errWrong");
    if (code === "errLocked" && extra) {
      txt = (T("auth.errLocked") || "تلاش‌های ناموفق زیاد بود — لطفاً بعداً دوباره امتحان کن.") + " ⏳ " + extra + "s";
    }
    el.textContent = txt;
    el.style.display = "block";
  }
  function hideErr() {
    var m = document.querySelector("#authModal");
    if (!m) return;
    var el = m.querySelector("[data-auth-error]");
    if (el) el.style.display = "none";
  }
  function setLoading(btn, on) {
    if (!btn) return;
    btn.disabled = on;
    btn.style.opacity = on ? ".6" : "";
  }

  function openModal() {
    ensureModal();
    translateModal(document.querySelector("#authModal"));
    hideErr();
    document.querySelector("#authModal").classList.add("show");
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-auth-open]");
      if (t) { openModal(); }
    });
    if (window.LumiI18n) {
      document.addEventListener("lumitek:langchange", function () {
        var m = document.querySelector("#authModal");
        if (m) translateModal(m);
      });
    }
  });

  return {
    AUTH_CONFIG: AUTH_CONFIG,
    currentUser: currentUser,
    signIn: signIn,
    signUp: signUp,
    signInGoogle: signInGoogle,
    signOut: signOut,
    onChange: onChange,
    openModal: openModal,
    /* ۱.۱ */
    changePassword: changePassword,
    deleteAccount: deleteAccount,
    passScore: passScore,
    lastLoginOf: function (email) {
      var all = users();
      return all[(email || "").toLowerCase()] ? all[(email || "").toLowerCase()].lastLogin || 0 : 0;
    }
  };
})();
