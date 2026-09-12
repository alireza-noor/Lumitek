/* Lumitek v0.3.0 — Cloudflare Pages Function
   Bind a D1 database as DB and set GEMINI_API_KEY.
   Set ADMIN_EMAIL to the owner's email.
   Payment provider integration is intentionally adapter-based: add your
   gateway credentials/server calls in createPayment() and verifyPayment(). */

const json = (data, status=200, extra={}) =>
  new Response(JSON.stringify(data), { status, headers: {"content-type":"application/json; charset=utf-8", ...extra} });

const text = (s, status=200) => new Response(s, {status, headers: {"content-type":"text/plain; charset=utf-8"}});

function b64url(bytes) {
  let s=""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function randomId(n=18) {
  const a = new Uint8Array(n); crypto.getRandomValues(a); return b64url(a);
}
async function sha256Hex(input) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function hashPassword(password, salt) {
  const base = salt + ":" + password;
  return await sha256Hex(base);
}
async function authUser(request, env) {
  const h = request.headers.get("Authorization") || "";
  if (!h.startsWith("Bearer ") || !env.DB) return null;
  const sid = h.slice(7).trim();
  if (!sid) return null;
  const row = await env.DB.prepare(
    "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>? AND u.disabled=0"
  ).bind(sid, Date.now()).first();
  return row || null;
}
function publicUser(u) {
  if (!u) return null;
  return {id:u.id,email:u.email,name:u.name,role:u.role,coins:u.coins,xp:u.xp,level:u.level,vipUntil:u.vip_until,createdAt:u.created_at,lastLogin:u.last_login};
}
async function body(request) {
  try { return await request.json(); } catch(e) { return {}; }
}

async function signup(request, env) {
  const b=await body(request); const email=String(b.email||"").trim().toLowerCase();
  const password=String(b.password||""); const name=String(b.name||"").trim() || email.split("@")[0];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({code:"errEmail",message:"Invalid email"},400);
  if (password.length<8) return json({code:"errPass",message:"Password must be at least 8 characters"},400);
  if (!env.DB) return json({code:"db_missing",message:"D1 is not configured"},503);
  const exists=await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
  if (exists) return json({code:"errExists",message:"Account already exists"},409);
  const salt=randomId(12), hash=await hashPassword(password,salt), id=randomId(16), now=Date.now();
  const role=(env.ADMIN_EMAIL||"").trim().toLowerCase()===email ? "admin" : "user";
  await env.DB.prepare("INSERT INTO users(id,email,name,password_hash,role,created_at,last_login) VALUES(?,?,?,?,?,?,?)")
    .bind(id,email,name,salt+"$"+hash,role,now,now).run();
  const sid=randomId(24);
  await env.DB.prepare("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)").bind(sid,id,now+1000*60*60*24*30,now).run();
  return json({token:sid,user:publicUser(await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(id).first())},201);
}

async function signin(request, env) {
  const b=await body(request); const email=String(b.email||"").trim().toLowerCase(); const password=String(b.password||"");
  if (!env.DB) return json({code:"db_missing",message:"D1 is not configured"},503);
  const u=await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
  if (!u || u.disabled) return json({code:"errNoUser",message:"Account not found"},401);
  const [salt,stored]=String(u.password_hash||"").split("$");
  if (!salt || await hashPassword(password,salt)!==stored) return json({code:"errWrong",message:"Wrong password"},401);
  const now=Date.now(); await env.DB.prepare("UPDATE users SET last_login=? WHERE id=?").bind(now,u.id).run();
  const sid=randomId(24); await env.DB.prepare("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)").bind(sid,u.id,now+1000*60*60*24*30,now).run();
  u.last_login=now;
  return json({token:sid,user:publicUser(u)});
}

async function createPayment(request, env, user) {
  const b=await body(request);
  const amount=Math.round(Number(b.amount||0));
  const type=String(b.type||"donation");
  if (!amount || amount<1000) return json({code:"bad_amount",message:"Invalid amount"},400);
  if (!env.DB) return json({code:"db_missing",message:"D1 is not configured"},503);

  /* IMPORTANT: this endpoint never pretends a payment succeeded.
     Connect your chosen gateway here and return its official payment URL. */
  const id=randomId(16), now=Date.now();
  const table=type==="donation" ? "donations" : "orders";
  if (type==="donation") {
    await env.DB.prepare("INSERT INTO donations(id,user_id,amount,currency,status,supporter_name,created_at) VALUES(?,?,?,?,?,?,?)")
      .bind(id,user?.id||null,amount,String(b.currency||"IRR"),"pending",String(b.supporterName||""),now).run();
  } else {
    await env.DB.prepare("INSERT INTO orders(id,user_id,type,product_id,amount,currency,status,created_at) VALUES(?,?,?,?,?,?,?,?)")
      .bind(id,user?.id||"",type,String(b.productId||""),amount,String(b.currency||"IRR"),"pending",now).run();
  }

  if (env.PAYMENT_GATEWAY_URL) {
    /* Provider-specific implementation goes here. Never put a secret in frontend JS. */
    return json({configured:true, orderId:id, paymentUrl:null,
      message:"Payment adapter is configured but needs provider-specific request/verification code."},501);
  }
  return json({configured:false,orderId:id,code:"payment_not_configured",
    message:"Online payment is not configured yet. Add your gateway credentials and adapter on the server."},503);
}

async function verifyPayment(request, env, user) {
  /* Provider-specific callback/verification belongs here.
     Only after official verification should status become paid and benefits be granted. */
  return json({ok:false,code:"payment_not_configured",message:"Payment verification adapter is not configured."},501);
}

async function ai(request, env, user) {
  if (!env.GEMINI_API_KEY) return json({code:"ai_not_configured",message:"GEMINI_API_KEY is not configured"},503);
  const b=await body(request);
  const messages=Array.isArray(b.messages)?b.messages.slice(-20):[];
  const fast=!!b.fast;
  const contents=messages.filter(m=>m && m.role!=="system").map(m=>({
    role:m.role==="assistant"?"model":"user",
    parts:[{text:String(m.content||m.text||"")}]
  }));
  if (!contents.length) return json({code:"empty",message:"No message"},400);
  const system=messages.find(m=>m.role==="system");
  const model=fast ? (env.GEMINI_FAST_MODEL||"gemini-2.5-flash") : (env.GEMINI_MODEL||"gemini-2.5-flash");
  const payload={contents, generationConfig:{temperature:0.7,maxOutputTokens:1200}};
  if (system) payload.systemInstruction={parts:[{text:String(system.content||"")}]};
  const url="https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(env.GEMINI_API_KEY);
  const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
  const d=await r.json();
  if (!r.ok) return json({code:"gemini_error",message:d?.error?.message||"Gemini request failed"},502);
  const textOut=d?.candidates?.[0]?.content?.parts?.map(x=>x.text||"").join("")||"";
  if (!textOut) return json({code:"empty_ai",message:"Gemini returned no text"},502);
  return json({text:textOut,model:model});
}

async function admin(request, env, path, user) {
  if (!user || user.role!=="admin") return json({code:"forbidden",message:"Admin access required"},403);
  if (path==="/admin/stats") {
    const [u,o,d,s]=await Promise.all([
      env.DB.prepare("SELECT COUNT(*) c FROM users").first(),
      env.DB.prepare("SELECT COUNT(*) c FROM orders WHERE status='paid'").first(),
      env.DB.prepare("SELECT COUNT(*) c FROM donations WHERE status='paid'").first(),
      env.DB.prepare("SELECT COALESCE(SUM(amount),0) total FROM donations WHERE status='paid'").first()
    ]);
    return json({users:u?.c||0,paidOrders:o?.c||0,paidDonations:d?.c||0,donationTotal:s?.total||0});
  }
  if (path==="/admin/users") {
    const r=await env.DB.prepare("SELECT id,email,name,role,coins,xp,level,created_at,last_login,disabled FROM users ORDER BY created_at DESC LIMIT 500").all();
    return json({users:r.results||[]});
  }
  if (path==="/admin/orders") {
    const r=await env.DB.prepare("SELECT o.*,u.email,u.name FROM orders o LEFT JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 500").all();
    return json({orders:r.results||[]});
  }
  if (path==="/admin/users/role" || path==="/admin/users/coins") {
    const b=await body(request);
    if (!b.userId) return json({code:"bad_request"},400);
    if (path.endsWith("/role")) {
      const role=b.role==="admin"?"admin":"user";
      await env.DB.prepare("UPDATE users SET role=? WHERE id=?").bind(role,b.userId).run();
    } else {
      const coins=Math.max(0,Math.floor(Number(b.coins)));
      await env.DB.prepare("UPDATE users SET coins=? WHERE id=?").bind(coins,b.userId).run();
    }
    return json({ok:true});
  }
  return json({code:"not_found"},404);
}

export async function onRequest(context) {
  const {request,env}=context;
  const url=new URL(request.url); const path=url.pathname.replace(/^\/api/,"")||"/";
  if (path==="/health" && request.method==="GET") return json({ok:true,service:"Lumitek API",version:"0.3.0",time:Date.now()});
  if (!path || path==="/") return json({ok:true,service:"Lumitek API",version:"0.3.0"});
  const user=await authUser(request,env);

  if (request.method==="POST" && path==="/auth/signup") return signup(request,env);
  if (request.method==="POST" && path==="/auth/signin") return signin(request,env);
  if (request.method==="POST" && path==="/auth/signout") {
    const h=request.headers.get("Authorization")||""; if(h.startsWith("Bearer ")&&env.DB) await env.DB.prepare("DELETE FROM sessions WHERE id=?").bind(h.slice(7)).run();
    return json({ok:true});
  }
  if (request.method==="GET" && path==="/auth/me") return user ? json({user:publicUser(user)}) : json({user:null},401);
  if (request.method==="POST" && path==="/ai") return ai(request,env,user);
  if (request.method==="POST" && path==="/payments/create") return createPayment(request,env,user);
  if (request.method==="POST" && path==="/payments/verify") return verifyPayment(request,env,user);
  if (path.startsWith("/admin/")) return admin(request,env,path,user);
  return json({code:"not_found",message:"API route not found"},404);
}
