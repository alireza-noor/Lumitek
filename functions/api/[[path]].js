/* Lumitek v0.3.1 — Cloudflare Pages Function
   Bind a D1 database as DB and set GEMINI_API_KEY.
   Set ADMIN_EMAIL to the owner's email.
   Payment provider integration is intentionally adapter-based.
*/

const json = (data, status=200, extra={}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extra
    }
  });

const text = (s, status=200) =>
  new Response(s, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8"
    }
  });

function b64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);

  return btoa(s)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomId(n=18) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return b64url(a);
}

async function sha256Hex(input) {
  const b = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );

  return [...new Uint8Array(b)]
    .map(x => x.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password, salt) {
  const base = salt + ":" + password;
  return await sha256Hex(base);
}

async function authUser(request, env) {
  const h = request.headers.get("Authorization") || "";

  if (!h.startsWith("Bearer ") || !env.DB) {
    return null;
  }

  const sid = h.slice(7).trim();

  if (!sid) {
    return null;
  }

  const row = await env.DB.prepare(
    "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>? AND u.disabled=0"
  )
    .bind(sid, Date.now())
    .first();

  return row || null;
}

function publicUser(u) {
  if (!u) {
    return null;
  }

  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    coins: u.coins,
    xp: u.xp,
    level: u.level,
    vipUntil: u.vip_until,
    createdAt: u.created_at,
    lastLogin: u.last_login
  };
}

async function body(request) {
  try {
    return await request.json();
  } catch (e) {
    return {};
  }
}

async function signup(request, env) {
  const b = await body(request);

  const email = String(b.email || "")
    .trim()
    .toLowerCase();

  const password = String(b.password || "");

  const name =
    String(b.name || "").trim() ||
    email.split("@")[0];

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json({
      code: "errEmail",
      message: "Invalid email"
    }, 400);
  }

  if (password.length < 8) {
    return json({
      code: "errPass",
      message: "Password must be at least 8 characters"
    }, 400);
  }

  if (!env.DB) {
    return json({
      code: "db_missing",
      message: "D1 is not configured"
    }, 503);
  }

  const exists = await env.DB.prepare(
    "SELECT id FROM users WHERE email=?"
  )
    .bind(email)
    .first();

  if (exists) {
    return json({
      code: "errExists",
      message: "Account already exists"
    }, 409);
  }

  const salt = randomId(12);
  const hash = await hashPassword(password, salt);
  const id = randomId(16);
  const now = Date.now();

  const role =
    (env.ADMIN_EMAIL || "").trim().toLowerCase() === email
      ? "admin"
      : "user";

  await env.DB.prepare(
    "INSERT INTO users(id,email,name,password_hash,role,created_at,last_login) VALUES(?,?,?,?,?,?,?)"
  )
    .bind(
      id,
      email,
      name,
      salt + "$" + hash,
      role,
      now,
      now
    )
    .run();

  const sid = randomId(24);

  await env.DB.prepare(
    "INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)"
  )
    .bind(
      sid,
      id,
      now + 1000 * 60 * 60 * 24 * 30,
      now
    )
    .run();

  const newUser = await env.DB.prepare(
    "SELECT * FROM users WHERE id=?"
  )
    .bind(id)
    .first();

  return json({
    token: sid,
    user: publicUser(newUser)
  }, 201);
}

async function signin(request, env) {
  const b = await body(request);

  const email = String(b.email || "")
    .trim()
    .toLowerCase();

  const password = String(b.password || "");

  if (!env.DB) {
    return json({
      code: "db_missing",
      message: "D1 is not configured"
    }, 503);
  }

  const u = await env.DB.prepare(
    "SELECT * FROM users WHERE email=?"
  )
    .bind(email)
    .first();

  if (!u || u.disabled) {
    return json({
      code: "errNoUser",
      message: "Account not found"
    }, 401);
  }

  const [salt, stored] =
    String(u.password_hash || "").split("$");

  if (
    !salt ||
    await hashPassword(password, salt) !== stored
  ) {
    return json({
      code: "errWrong",
      message: "Wrong password"
    }, 401);
  }

  const now = Date.now();

  await env.DB.prepare(
    "UPDATE users SET last_login=? WHERE id=?"
  )
    .bind(now, u.id)
    .run();

  const sid = randomId(24);

  await env.DB.prepare(
    "INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)"
  )
    .bind(
      sid,
      u.id,
      now + 1000 * 60 * 60 * 24 * 30,
      now
    )
    .run();

  u.last_login = now;

  return json({
    token: sid,
    user: publicUser(u)
  });
}

async function createPayment(request, env, user) {
  const b = await body(request);

  const amount = Math.round(Number(b.amount || 0));
  const type = String(b.type || "donation");

  if (!amount || amount < 1000) {
    return json({
      code: "bad_amount",
      message: "Invalid amount"
    }, 400);
  }

  if (!env.DB) {
    return json({
      code: "db_missing",
      message: "D1 is not configured"
    }, 503);
  }

  const id = randomId(16);
  const now = Date.now();

  const table =
    type === "donation"
      ? "donations"
      : "orders";

  if (type === "donation") {
    await env.DB.prepare(
      "INSERT INTO donations(id,user_id,amount,currency,status,supporter_name,created_at) VALUES(?,?,?,?,?,?,?)"
    )
      .bind(
        id,
        user?.id || null,
        amount,
        String(b.currency || "IRR"),
        "pending",
        String(b.supporterName || ""),
        now
      )
      .run();
  } else {
    await env.DB.prepare(
      "INSERT INTO orders(id,user_id,type,product_id,amount,currency,status,created_at) VALUES(?,?,?,?,?,?,?,?)"
    )
      .bind(
        id,
        user?.id || "",
        type,
        String(b.productId || ""),
        amount,
        String(b.currency || "IRR"),
        "pending",
        now
      )
      .run();
  }

  if (env.PAYMENT_GATEWAY_URL) {
    return json({
      configured: true,
      orderId: id,
      paymentUrl: null,
      message:
        "Payment adapter is configured but needs provider-specific request/verification code."
    }, 501);
  }

  return json({
    configured: false,
    orderId: id,
    code: "payment_not_configured",
    message:
      "Online payment is not configured yet. Add your gateway credentials and adapter on the server."
  }, 503);
}

async function verifyPayment(request, env, user) {
  return json({
    ok: false,
    code: "payment_not_configured",
    message:
      "Payment verification adapter is not configured."
  }, 501);
}

async function ai(request, env, user) {
  if (!env.AI) {
    return json({
      code: "ai_not_configured",
      message: "Workers AI is not configured"
    }, 503);
  }

  const b = await body(request);

  const messages =
    Array.isArray(b.messages)
      ? b.messages.slice(-20)
      : [];

  const fast = !!b.fast;

  const validMessages = messages.filter(function (m) {
    return m && m.role !== "system";
  });

  if (!validMessages.length) {
    return json({
      code: "empty",
      message: "No message"
    }, 400);
  }

  const system = messages.find(function (m) {
    return m && m.role === "system";
  });

  const promptParts = [];

  if (system) {
    promptParts.push(
      "System instruction:\n" +
      String(system.content || "")
    );
  }

  for (const m of validMessages) {
    const role =
      m.role === "assistant"
        ? "Assistant"
        : "User";

    const textValue =
      String(m.content || m.text || "");

    if (textValue) {
      promptParts.push(
        role + ":\n" + textValue
      );
    }
  }

  const prompt = promptParts.join("\n\n");

  const model = fast
    ? "@cf/zai-org/glm-4.7-flash"
    : "@cf/zai-org/glm-4.7-flash";

  const result = await env.AI.run(model, {
    messages: validMessages.map(function (m) {
      return {
        role:
          m.role === "assistant"
            ? "assistant"
            : "user",
        content:
          String(m.content || m.text || "")
      };
    }),
    max_tokens: 1200,
    temperature: 0.7
  });

  const textOut =
    result.choices[0].message.content;

  return new Response(
    JSON.stringify({
      text: textOut,
      model: model
    }),
    {
      status: 200,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8"
      }
    }
  );
}

async function profile(request, env, user) {
  if (!user) {
    return json({
      code: "unauthorized",
      message: "Authentication required"
    }, 401);
  }

  return json({
    user: publicUser(user)
  });
}

async function gameScore(request, env, user) {
  if (!user) {
    return json({
      code: "unauthorized",
      message: "Authentication required"
    }, 401);
  }

  if (!env.DB) {
    return json({
      code: "db_missing",
      message: "D1 is not configured"
    }, 503);
  }

  const b = await body(request);

  const gameId =
    String(b.gameId || "").trim();

  const score =
    Math.floor(Number(b.score));

  if (
    !gameId ||
    !Number.isFinite(score) ||
    score < 0
  ) {
    return json({
      code: "bad_request",
      message: "Invalid gameId or score"
    }, 400);
  }

  const id = randomId(16);
  const now = Date.now();

  await env.DB.prepare(
    "INSERT INTO game_scores(id,user_id,game_id,score,created_at) VALUES(?,?,?,?,?)"
  )
    .bind(
      id,
      user.id,
      gameId,
      score,
      now
    )
    .run();

  return json({
    ok: true,
    score: {
      id: id,
      gameId: gameId,
      score: score,
      createdAt: now
    }
  }, 201);
}

async function gameLeaderboard(request, env, user) {
  if (!env.DB) {
    return json({
      code: "db_missing",
      message: "D1 is not configured"
    }, 503);
  }

  const url = new URL(request.url);

  const gameId =
    String(
      url.searchParams.get("gameId") || ""
    ).trim();

  if (!gameId) {
    return json({
      code: "bad_request",
      message: "gameId is required"
    }, 400);
  }

  const r = await env.DB.prepare(
    "SELECT gs.user_id, u.name, gs.game_id, MAX(gs.score) AS score FROM game_scores gs JOIN users u ON u.id=gs.user_id WHERE gs.game_id=? GROUP BY gs.user_id, gs.game_id ORDER BY score DESC LIMIT 100"
  )
    .bind(gameId)
    .all();

  return json({
    gameId: gameId,
    leaderboard: r.results || []
  });
}

async function dailyReward(request, env, user) {
  if (!user) {
    return json({
      code: "unauthorized",
      message: "Authentication required"
    }, 401);
  }

  if (!env.DB) {
    return json({
      code: "db_missing",
      message: "D1 is not configured"
    }, 503);
  }

  const now = new Date();

  const rewardDate =
    now.toISOString().slice(0, 10);

  const existing = await env.DB.prepare(
    "SELECT id FROM daily_rewards WHERE user_id=? AND reward_date=?"
  )
    .bind(user.id, rewardDate)
    .first();

  if (existing) {
    return json({
      ok: false,
      code: "already_claimed",
      message: "Daily reward already claimed"
    }, 409);
  }

  const id = randomId(16);

  await env.DB.prepare(
    "UPDATE users SET coins=coins+10,xp=xp+5 WHERE id=?"
  )
    .bind(user.id)
    .run();

  await env.DB.prepare(
    "INSERT INTO daily_rewards(id,user_id,reward_date,coins,xp,created_at) VALUES(?,?,?,?,?,?)"
  )
    .bind(
      id,
      user.id,
      rewardDate,
      10,
      5,
      Date.now()
    )
    .run();

  const updated = await env.DB.prepare(
    "SELECT coins,xp,level FROM users WHERE id=?"
  )
    .bind(user.id)
    .first();

  return json({
    ok: true,
    reward: {
      coins: 10,
      xp: 5,
      date: rewardDate
    },
    user: updated
  });
}

async function store(request, env, user) {
  if (!env.DB) {
    return json({
      code: "db_missing",
      message: "D1 is not configured"
    }, 503);
  }

  const r = await env.DB.prepare(
    "SELECT id,name,description,price,stock,created_at FROM store_items WHERE active=1 ORDER BY price ASC"
  ).all();

  return json({
    items: r.results || []
  });
}

async function storeBuy(request, env, user) {
  if (!user) {
    return json({
      code: "unauthorized",
      message: "Authentication required"
    }, 401);
  }

  if (!env.DB) {
    return json({
      code: "db_missing",
      message: "D1 is not configured"
    }, 503);
  }

  const b = await body(request);

  const itemId =
    String(b.itemId || "").trim();

  if (!itemId) {
    return json({
      code: "bad_request",
      message: "itemId is required"
    }, 400);
  }

  const item = await env.DB.prepare(
    "SELECT id,name,description,price,stock,active FROM store_items WHERE id=?"
  )
    .bind(itemId)
    .first();

  if (!item || !item.active) {
    return json({
      code: "item_not_found",
      message: "Store item not found"
    }, 404);
  }

  if (
    item.stock !== null &&
    item.stock !== undefined &&
    item.stock <= 0
  ) {
    return json({
      code: "out_of_stock",
      message: "Item is out of stock"
    }, 409);
  }

  const price =
    Math.max(
      0,
      Math.floor(Number(item.price))
    );

  const result = await env.DB.prepare(
    "UPDATE users SET coins=coins-? WHERE id=? AND coins>=?"
  )
    .bind(
      price,
      user.id,
      price
    )
    .run();

  if (
    !result.meta ||
    result.meta.changes !== 1
  ) {
    return json({
      code: "insufficient_coins",
      message: "Not enough Coins"
    }, 409);
  }

  const purchaseId = randomId(16);

  if (
    item.stock !== null &&
    item.stock !== undefined
  ) {
    await env.DB.prepare(
      "UPDATE store_items SET stock=stock-1 WHERE id=? AND stock>0"
    )
      .bind(itemId)
      .run();
  }

  await env.DB.prepare(
    "INSERT INTO purchases(id,user_id,item_id,price,created_at) VALUES(?,?,?,?,?)"
  )
    .bind(
      purchaseId,
      user.id,
      itemId,
      price,
      Date.now()
    )
    .run();

  const updated = await env.DB.prepare(
    "SELECT coins,xp,level FROM users WHERE id=?"
  )
    .bind(user.id)
    .first();

  return json({
    ok: true,
    purchase: {
      id: purchaseId,
      itemId: itemId,
      price: price
    },
    user: updated
  }, 201);
}

/* =========================================================
   NOTIFICATIONS
   ========================================================= */

async function notifications(request, env, user) {
  if (!user) {
    return json({
      code: "unauthorized",
      message: "Authentication required"
    }, 401);
  }

  if (!env.DB) {
    return json({
      code: "db_missing",
      message: "D1 is not configured"
    }, 503);
  }

  const r = await env.DB.prepare(
    "SELECT id,user_id,title,body,read_at,created_at FROM notifications WHERE user_id IS NULL OR user_id=? ORDER BY created_at DESC LIMIT 100"
  )
    .bind(user.id)
    .all();

  return json({
    notifications: r.results || []
  });
}

async function notificationsRead(request, env, user) {
  if (!user) {
    return json({
      code: "unauthorized",
      message: "Authentication required"
    }, 401);
  }

  if (!env.DB) {
    return json({
      code: "db_missing",
      message: "D1 is not configured"
    }, 503);
  }

  const b = await body(request);

  const notificationId =
    String(
      b.notificationId ||
      b.id ||
      ""
    ).trim();

  if (!notificationId) {
    return json({
      code: "bad_request",
      message: "notificationId is required"
    }, 400);
  }

  if (notificationId === "all") {
    await env.DB.prepare(
      "UPDATE notifications SET read_at=? WHERE read_at IS NULL AND (user_id IS NULL OR user_id=?)"
    )
      .bind(
        Date.now(),
        user.id
      )
      .run();

    return json({
      ok: true,
      marked: "all"
    });
  }

  await env.DB.prepare(
    "UPDATE notifications SET read_at=? WHERE id=? AND (user_id IS NULL OR user_id=?)"
  )
    .bind(
      Date.now(),
      notificationId,
      user.id
    )
    .run();

  return json({
    ok: true,
    marked: notificationId
  });
}

export async function onRequest(context) {
  const {
    request,
    env
  } = context;

  const url = new URL(request.url);

  const path =
    url.pathname.replace(/^\/api/, "") || "/";

  if (
    path === "/health" &&
    request.method === "GET"
  ) {
    return json({
      ok: true,
      service: "Lumitek API",
      version: "0.3.1",
      time: Date.now()
    });
  }

  if (
    path === "/" &&
    request.method === "GET"
  ) {
    return json({
      ok: true,
      service: "Lumitek API",
      version: "0.3.1"
    });
  }

  const user =
    await authUser(request, env);

  if (
    request.method === "POST" &&
    path === "/auth/signup"
  ) {
    return signup(request, env);
  }

  if (
    request.method === "POST" &&
    path === "/auth/signin"
  ) {
    return signin(request, env);
  }

  if (
    request.method === "POST" &&
    path === "/auth/signout"
  ) {
    const h =
      request.headers.get("Authorization") || "";

    if (
      h.startsWith("Bearer ") &&
      env.DB
    ) {
      await env.DB.prepare(
        "DELETE FROM sessions WHERE id=?"
      )
        .bind(
          h.slice(7).trim()
        )
        .run();
    }

    return json({
      ok: true
    });
  }

  if (
    request.method === "GET" &&
    path === "/auth/me"
  ) {
    return user
      ? json({
          user: publicUser(user)
        })
      : json({
          user: null
        }, 401);
  }

  if (
    request.method === "GET" &&
    path === "/profile"
  ) {
    return profile(
      request,
      env,
      user
    );
  }

  if (
    request.method === "POST" &&
    path === "/games/score"
  ) {
    return gameScore(
      request,
      env,
      user
    );
  }

  if (
    request.method === "GET" &&
    path === "/games/leaderboard"
  ) {
    return gameLeaderboard(
      request,
      env,
      user
    );
  }

  if (
    request.method === "POST" &&
    path === "/rewards/daily"
  ) {
    return dailyReward(
      request,
      env,
      user
    );
  }

  if (
    request.method === "GET" &&
    path === "/store"
  ) {
    return store(
      request,
      env,
      user
    );
  }

  if (
    request.method === "POST" &&
    path === "/store/buy"
  ) {
    return storeBuy(
      request,
      env,
      user
    );
  }

  if (
    request.method === "GET" &&
    path === "/notifications"
  ) {
    return notifications(
      request,
      env,
      user
    );
  }

  if (
    request.method === "POST" &&
    path === "/notifications/read"
  ) {
    return notificationsRead(
      request,
      env,
      user
    );
  }

  if (
    request.method === "POST" &&
    path === "/ai"
  ) {
    return ai(
      request,
      env,
      user
    );
  }

  if (
    request.method === "POST" &&
    path === "/payments/create"
  ) {
    return createPayment(
      request,
      env,
      user
    );
  }

  if (
    request.method === "POST" &&
    path === "/payments/verify"
  ) {
    return verifyPayment(
      request,
      env,
      user
    );
  }

  if (path.startsWith("/admin/")) {
    return admin(
      request,
      env,
      path,
      user
    );
  }

  return json({
    code: "not_found",
    message: "API route not found"
  }, 404);
}