/* Lumitek Backend Client v0.3.0
   Uses same-origin /api endpoints. No secrets are stored in this file. */
(function () {
  var API_BASE = window.LUMITEK_API_BASE || "/api";
  var TOKEN_KEY = "lumitek_backend_token_v1";

  function token() { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; } }
  function setToken(t) { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) {} }
  function enabled() { return !!API_BASE && API_BASE !== "DISABLED"; }

  function request(path, options) {
    options = options || {};
    var headers = options.headers || {};
    headers["Content-Type"] = "application/json";
    var t = token();
    if (t) headers["Authorization"] = "Bearer " + t;
    options.headers = headers;
    return fetch(API_BASE.replace(/\/$/, "") + path, options).then(function (r) {
      return r.text().then(function (txt) {
        var data = {};
        try { data = txt ? JSON.parse(txt) : {}; } catch (e) { data = { raw: txt }; }
        if (!r.ok) {
          var err = new Error(data.message || "Request failed");
          err.status = r.status; err.code = data.code || "api_error"; err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  function post(path, body) {
    return request(path, { method: "POST", body: JSON.stringify(body || {}) });
  }

  function signUp(email, password, name) {
    return post("/auth/signup", { email: email, password: password, name: name }).then(function (d) {
      if (d.token) setToken(d.token);
      return d.user || d;
    });
  }
  function signIn(email, password) {
    return post("/auth/signin", { email: email, password: password }).then(function (d) {
      if (d.token) setToken(d.token);
      return d.user || d;
    });
  }
  function signOut() {
    return post("/auth/signout", {}).catch(function () {}).then(function () { setToken(""); });
  }
  function me() { return request("/auth/me"); }
  function ai(messages, fast) { return post("/ai", { messages: messages, fast: !!fast }); }
  function paymentCreate(data) { return post("/payments/create", data); }
  function adminStats() { return request("/admin/stats"); }
  function adminUsers() { return request("/admin/users"); }
  function adminOrders() { return request("/admin/orders"); }
  function adminSetRole(userId, role) { return post("/admin/users/role", { userId: userId, role: role }); }
  function adminSetCoins(userId, coins) { return post("/admin/users/coins", { userId: userId, coins: coins }); }
  function health() { return request("/health"); }

  window.LumiBackend = {
    API_BASE: API_BASE, enabled: enabled, token: token, setToken: setToken,
    request: request, post: post, signUp: signUp, signIn: signIn, signOut: signOut,
    me: me, ai: ai, paymentCreate: paymentCreate,
    adminStats: adminStats, adminUsers: adminUsers, adminOrders: adminOrders,
    adminSetRole: adminSetRole, adminSetCoins: adminSetCoins, health: health
  };
})();
