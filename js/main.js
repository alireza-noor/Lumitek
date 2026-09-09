/* ============================================================
   Lumitek 0.7 — Core (profile v5, coins economy, VIP, AI plans,
   PWA/offline engine, auth hooks, store+weapons, achievements,
   checkout gateway, changelog, game scroll-lock)
   ============================================================ */
const profileKey = "lumitek_profile_v5";
const profileKeyV4 = "lumitek_profile_v4";
const legacyProfileKey = "lumitek_profile_v3";
const themeKey = "lumitek_theme";
const langKey = "lumitek_lang";
const noticeKey = "lumitek_notifications_v1";
const dailyKey = "lumitek_daily_claim";
const adKey = "lumitek_ad_reward";
const starterKey = "lumitek_starter10_v6";

/* ---- هوش مصنوعی لومیتک: هر سوال ۲ سکه ---- */
const AI_QUESTION_COST = 2;

/* ---- payment gateway config (real ZarinPal/IDPay) ----
   برای درگاه واقعی: merchant را ست کن و gateway را "zarinpal" یا "idpay" بگذار.
   تا آن موقع دکمه‌ها در حالت نمایشی کار می‌کنند. */
const LUMITEK_PAY_CONFIG = {
  gateway: "demo",          // "demo" | "zarinpal" | "idpay"
  merchantId: "",           // e.g. "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  currency: "IRT"
};

const COIN_PACKAGES = [
  { id: "pkg_s",  name: { fa: "بسته استارتر", en: "Starter Pack" },   coins: 500,   price: 49000,   icon: "🥉" },
  { id: "pkg_m",  name: { fa: "بسته نقره‌ای", en: "Silver Pack" },    coins: 1200,  price: 99000,   icon: "🥈", popular: true },
  { id: "pkg_l",  name: { fa: "بسته طلایی",   en: "Gold Pack" },      coins: 3000,  price: 199000,  icon: "🥇" },
  { id: "pkg_xl", name: { fa: "بسته ویژه",    en: "Mega Pack" },      coins: 7500,  price: 399000,  icon: "💎", best: true }
];
const VIP_PLAN = { price: 149000, days: 30 };

/* ---- بسته‌ها و اشتراک هوش مصنوعی لومیتک (پرداخت واقعی از فروشگاه) ---- */
const AI_PLANS = [
  { id: "ai_q50",  name: { fa: "بسته ۵۰ پرسش", en: "50 Questions" },        questions: 50,  price: 39000, icon: "💬" },
  { id: "ai_q150", name: { fa: "بسته ۱۵۰ پرسش", en: "150 Questions" },      questions: 150, price: 89000, icon: "🚀", popular: true },
  { id: "ai_q400", name: { fa: "بسته ۴۰۰ پرسش", en: "400 Questions" },      questions: 400, price: 199000, icon: "🏆" },
  { id: "ai_unl",  name: { fa: "نامحدود ۱ ماهه", en: "Unlimited — 1 month" }, unlimitedDays: 30, price: 149000, icon: "♾️", best: true }
];

const defaultProfile = {
  name: "Lumitek User",
  avatar: "🙂",
  title: "",
  accent: "",
  equippedGun: "",
  level: 1,
  xp: 0,
  coins: 10, /* هر کاربر جدید با ۱۰ سکه شروع می‌کند */
  gamesPlayed: 0,
  bests: {},
  inventory: [],
  badges: [],
  xpBoost: 0,
  vip: false,
  vipUntil: 0,
  coinSpent: 0,
  aiCredits: 0,
  aiUnlimitedUntil: 0,
  aiAsked: 0,
  createdAt: Date.now()
};

function defaultProfileCopy() {
  return JSON.parse(JSON.stringify(defaultProfile));
}

function getProfile() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(profileKey)); } catch (e) { raw = null; }
  if (!raw) { try { raw = JSON.parse(localStorage.getItem(profileKeyV4)); } catch (e) { raw = null; } }
  if (!raw) { try { raw = JSON.parse(localStorage.getItem(legacyProfileKey)); } catch (e) { raw = null; } }
  if (!raw || typeof raw !== "object") raw = {};
  const p = Object.assign(defaultProfileCopy(), raw);
  p.bests = raw && typeof raw.bests === "object" && raw.bests ? raw.bests : {};
  p.inventory = Array.isArray(raw && raw.inventory) ? raw.inventory : [];
  p.badges = Array.isArray(raw && raw.badges) ? raw.badges : [];
  p.level = Math.max(1, parseInt(p.level, 10) || 1);
  p.xp = Math.max(0, parseInt(p.xp, 10) || 0);
  p.coins = Math.max(0, parseInt(p.coins, 10) || 0);
  p.gamesPlayed = Math.max(0, parseInt(p.gamesPlayed, 10) || 0);
  p.xpBoost = Math.max(0, parseInt(p.xpBoost, 10) || 0);
  p.coinSpent = Math.max(0, parseInt(p.coinSpent, 10) || 0);
  p.vip = !!p.vip;
  p.vipUntil = parseInt(p.vipUntil, 10) || 0;
  if (p.vip && p.vipUntil && Date.now() > p.vipUntil) { p.vip = false; p.vipUntil = 0; }
  if (p.equippedGun && p.inventory && p.inventory.indexOf(p.equippedGun) === -1) p.equippedGun = "";
  p.aiCredits = Math.max(0, parseInt(p.aiCredits, 10) || 0);
  p.aiUnlimitedUntil = parseInt(p.aiUnlimitedUntil, 10) || 0;
  if (!p.createdAt) p.createdAt = Date.now();
  return p;
}

/* کاربران قبلی هم یک‌بار ۱۰ سکه هدیه بگیرند (مهاجرت v0.6) */
function grantStarterCoins() {
  try {
    if (localStorage.getItem(starterKey)) return;
    const p = getProfile();
    if (p.coins < 10) p.coins = 10;
    saveProfile(p);
    localStorage.setItem(starterKey, "1");
  } catch (e) {}
}

let _liveProfile = getProfile();

function saveProfile(p) {
  if (!p) p = _liveProfile;
  localStorage.setItem(profileKey, JSON.stringify(p));
  _liveProfile = p;
  renderProfile();
  document.dispatchEvent(new CustomEvent("lumitek:profilechange"));
}

function resetProfile() {
  localStorage.removeItem(profileKey);
  localStorage.removeItem(profileKeyV4);
  localStorage.removeItem(legacyProfileKey);
  _liveProfile = getProfile();
  saveProfile(_liveProfile);
}

/* ---------------- i18n bridge ---------------- */
function T(k) {
  if (window.LumiI18n) return LumiI18n.T(k);
  return k;
}

const translations = {
  fa: { home: "خانه", tools: "ابزارها", sports: "ورزش", tech: "فناوری", articles: "مقالات", games: "بازی‌ها", updates: "تغییرات", store: "استور", support: "پشتیبانی", profile: "پروفایل", language: "English", welcome: "به Lumitek خوش آمدی", profileTitle: "پروفایل کاربر", gamesTitle: "بازی‌های Lumitek", save: "ذخیره", close: "بستن", coins: "سکه", xp: "XP", level: "سطح", account: "حساب کاربری", donate: "حمایت مالی" },
  en: { home: "Home", tools: "Tools", sports: "Sports", tech: "Technology", articles: "Articles", games: "Games", updates: "Updates", store: "Store", support: "Support", profile: "Profile", language: "فارسی", welcome: "Welcome to Lumitek", profileTitle: "User Profile", gamesTitle: "Lumitek Games", save: "Save", close: "Close", coins: "Coins", xp: "XP", level: "Level", account: "Account", donate: "Donate" }
};

/* Canonical catalog: hrefs از ریشه سایت (در جستجو خودکار به عمق صفحه تبدیل می‌شوند) */
const catalog = [
  ["خانه", "Home", "pages/index.html", "بخش"],
  ["ابزارها", "Tools", "pages/tools.html", "بخش"],
  ["فروشگاه / خرید سکه", "Store / Buy Coins", "pages/store.html", "بخش"],
  ["استور", "Store", "pages/store.html", "بخش"],
  ["خرید سکه", "Buy Coins", "pages/store.html", "بخش"],
  ["دانلود اپ", "Download", "pages/download.html", "بخش"],
  ["هوش مصنوعی لومیتک", "Lumitek AI", "pages/ai.html", "بخش"],
  ["چت هوش مصنوعی", "AI Chat", "pages/ai.html", "بخش"],
  ["حساب کاربری", "Account", "pages/account.html", "بخش"],
  ["دستاوردها", "Achievements", "pages/account.html", "بخش"],
  ["اسپورتک", "Sportek", "pages/sports.html", "بخش"],
  ["ورزش", "Sports", "pages/sports.html", "بخش"],
  ["اخبار ورزشی", "Sports News", "pages/sports.html", "بخش"],
  ["جدول لیگ‌ها", "League Standings", "pages/sports.html", "بخش"],
  ["جدول لیگ خلیج فارس", "PGPL Standings", "pages/sports.html", "جدول"],
  ["جدول پرمیرلیگ", "Premier League Table", "pages/sports.html", "جدول"],
  ["جدول لالیگا", "La Liga Table", "pages/sports.html", "جدول"],
  ["جدول سری آ", "Serie A Table", "pages/sports.html", "جدول"],
  ["جدول بوندسلیگا", "Bundesliga Table", "pages/sports.html", "جدول"],
  ["جدول لیگ ۱ فرانسه", "Ligue 1 Table", "pages/sports.html", "جدول"],
  ["جدول NBA", "NBA Standings", "pages/sports.html", "جدول"],
  ["جدول سوپرلیگ ترکیه", "Turkish League Table", "pages/sports.html", "جدول"],
  ["بازی‌های پیش رو", "Upcoming Matches", "pages/sports.html", "بخش"],
  ["اشتراک هوش مصنوعی", "AI Subscription", "pages/store.html#coins", "فروشگاه"],
  ["فناوری", "Technology", "pages/technology.html", "بخش"],
  ["مقالات", "Articles", "pages/articles.html", "بخش"],
  ["پشتیبانی هوشمند", "AI Support", "pages/support.html", "بخش"],
  ["حمایت مالی", "Donate", "pages/donate.html", "بخش"],
  ["دونیشن", "Donation", "pages/donate.html", "بخش"],
  ["تغییرات", "Announcements", "pages/announcements.html", "بخش"],
  ["درباره ما", "About", "pages/about.html", "بخش"],
  ["تماس", "Contact", "pages/contact.html", "بخش"],
  ["ماشین‌حساب مهندسی", "Engineering Calculator", "tools/calculator.html", "ابزار"],
  ["تبدیل واحد", "Unit Converter", "tools/converter.html", "ابزار"],
  ["تاریخ و زمان", "Date & Time", "tools/date-time.html", "ابزار"],
  ["تقویم ایران", "Iranian Calendar", "tools/calendar.html", "ابزار"],
  ["تاریخ شمسی", "Jalali Calendar", "tools/calendar.html", "ابزار"],
  ["تبدیل تاریخ", "Date Converter", "tools/calendar.html", "ابزار"],
  ["اوقات شرعی", "Prayer Times", "tools/prayer-times.html", "ابزار"],
  ["نماز", "Salah Times", "tools/prayer-times.html", "ابزار"],
  ["ساعت جهانی", "World Clock", "tools/world-clock.html", "ابزار"],
  ["درصد و تخفیف", "Percentage", "tools/percent.html", "ابزار"],
  ["محاسبه سن", "Age Calculator", "tools/age.html", "ابزار"],
  ["فاصله دو تاریخ", "Date Difference", "tools/age.html", "ابزار"],
  ["ابزار متن", "Text Tools", "tools/text-tools.html", "ابزار"],
  ["تولید رمز عبور", "Password Generator", "tools/password.html", "ابزار"],
  ["کرنومتر و تایمر", "Stopwatch & Timer", "tools/stopwatch.html", "ابزار"],
  ["لیست کارها", "To-Do List", "tools/todo.html", "ابزار"],
  ["BMI و سلامت", "BMI & Health", "tools/bmi.html", "ابزار"],
  ["محاسبه وام", "Loan Calculator", "tools/loan.html", "ابزار"],
  ["سود سپرده بانکی", "Deposit Interest", "tools/deposit.html", "ابزار"],
  ["آمار و احتمال", "Statistics & Probability", "tools/statistics.html", "ابزار"],
  ["میانگین و انحراف معیار", "Mean & Standard Deviation", "tools/statistics.html", "ابزار"],
  ["رسم نمودار تابع", "Function Plotter", "tools/function-plot.html", "ابزار"],
  ["حل معادله", "Equation Solver", "tools/equations.html", "ابزار"],
  ["معادله درجه دوم", "Quadratic Equation", "tools/equations.html", "ابزار"],
  ["ماتریس و بردار", "Matrix & Vector", "tools/matrix.html", "ابزار"],
  ["فیزیک و حل مسئله", "Physics Solver", "tools/physics.html", "ابزار"],
  ["بازی‌ها", "Games", "pages/games.html", "بازی"],
  ["آزمون واکنش", "Reaction Test", "pages/reaction.html", "بازی"],
  ["مسابقه اعداد", "Number Rush", "pages/number-rush.html", "بازی"],
  ["رنگ‌یار", "Color Tap", "pages/color-tap.html", "بازی"],
  ["ریاضی سریع", "Quick Math", "pages/quick-math.html", "بازی"],
  ["ترتیب", "Sequence", "pages/sequence.html", "بازی"],
  ["بازی مار", "Snake", "pages/snake.html", "بازی"],
  ["دوز", "Tic Tac Toe", "pages/tictactoe.html", "بازی"],
  ["۲۰۴۸", "2048", "pages/g2048.html", "بازی"],
  ["مین‌یاب", "Minesweeper", "pages/mines.html", "بازی"],
  ["آجرشکن", "Breakout", "pages/breakout.html", "بازی"],
  ["پازل ۱۵", "15-Puzzle", "pages/puzzle15.html", "بازی"],
  ["حدس کلمه", "Word Guess", "pages/wordguess.html", "بازی"],
  ["تیراندازی کیهانی", "Space Shooter", "pages/shooter.html", "بازی"],
  ["بازی تیراندازی", "Shooting Game", "pages/shooter.html", "بازی"],
  ["تیراندازی دقیق", "Precision Range", "pages/range.html", "بازی"],
  ["ماز / هزارتو", "Maze", "pages/maze.html", "بازی"],
  ["چهار در یک ردیف", "Connect Four", "pages/connect4.html", "بازی"],
  ["بزرگراه", "Highway Racer", "pages/drive.html", "بازی"],
  ["بازی ماشین", "Driving Game", "pages/drive.html", "بازی"],
  ["رالی شبانه", "Night Rally", "pages/rally.html", "بازی"],
  ["شکار گنج", "Treasure Hunt", "pages/adventure.html", "بازی"],
  ["بازی ماجراجویی", "Adventure Game", "pages/adventure.html", "بازی"],
  ["دونده ماجراجویی", "Cave Runner", "pages/runner.html", "بازی"],
  ["ضربات پنالتی", "Penalty Shootout", "pages/penalty.html", "بازی"],
  ["بازی فوتبال", "Football Game", "pages/penalty.html", "بازی"],
  ["بسکتبال", "Hoops Shot", "pages/hoops.html", "بازی"],
  ["آواتار استور", "Store Avatars", "pages/store.html", "فروشگاه"],
  ["عنوان پروفایل", "Profile Titles", "pages/store.html", "فروشگاه"],
  ["اسلحه و اسکین", "Weapons & Skins", "pages/store.html", "فروشگاه"],
  ["پاداش روزانه", "Daily Reward", "pages/store.html", "فروشگاه"],
  ["اشتراک VIP", "VIP Plan", "pages/store.html", "فروشگاه"]
];

/* ---------------- Store catalog ---------------- */
const RARITY = {
  common:    { fa: "معمولی",    en: "Common",    color: "#9aa8c1" },
  rare:      { fa: "کمیاب",     en: "Rare",      color: "#7ca7ff" },
  epic:      { fa: "حماسی",     en: "Epic",      color: "#b18cff" },
  legendary: { fa: "افسانه‌ای", en: "Legendary", color: "#ffc861" }
};

const STORE_ITEMS = [
  { id: "av_cool",  type: "avatar", emoji: "😎", price: 80,  rarity: "common" },
  { id: "av_fox",   type: "avatar", emoji: "🦊", price: 120, rarity: "common" },
  { id: "av_panda", type: "avatar", emoji: "🐼", price: 120, rarity: "common" },
  { id: "av_ghost", type: "avatar", emoji: "👻", price: 150, rarity: "common" },
  { id: "av_wolf",  type: "avatar", emoji: "🐺", price: 220, rarity: "rare" },
  { id: "av_wizard",type: "avatar", emoji: "🧙", price: 280, rarity: "rare" },
  { id: "av_robot", type: "avatar", emoji: "🤖", price: 200, rarity: "rare" },
  { id: "av_alien", type: "avatar", emoji: "👾", price: 200, rarity: "rare" },
  { id: "av_lion",  type: "avatar", emoji: "🦁", price: 300, rarity: "epic" },
  { id: "av_ninja", type: "avatar", emoji: "🥷", price: 340, rarity: "epic" },
  { id: "av_unicorn",type: "avatar", emoji: "🦄", price: 420, rarity: "epic" },
  { id: "av_phoenix",type: "avatar", emoji: "🔥", price: 450, rarity: "epic" },
  { id: "av_dragon",type: "avatar", emoji: "🐲", price: 500, rarity: "legendary" },
  { id: "av_king",  type: "avatar", emoji: "🤴", price: 650, rarity: "legendary" },
  { id: "ti_arcade", type: "title", label: { fa: "قهرمان آرکید", en: "Arcade Champion" }, price: 250, rarity: "rare" },
  { id: "ti_hunter", type: "title", label: { fa: "شکارچی رکورد", en: "Record Hunter" },   price: 400, rarity: "epic" },
  { id: "ti_sniper", type: "title", label: { fa: "تک‌تیرانداز کیهانی", en: "Cosmic Sniper" }, price: 450, rarity: "epic" },
  { id: "ti_star",   type: "title", label: { fa: "ستاره Lumitek", en: "Lumitek Star" }, price: 600, rarity: "epic" },
  { id: "ti_legend", type: "title", label: { fa: "افسانه Lumitek", en: "Lumitek Legend" },price: 900, rarity: "legendary" },
  { id: "ac_violet", type: "accent", value: "violet", label: { fa: "بنفش کهکشانی", en: "Galaxy Violet" }, price: 150, rarity: "rare" },
  { id: "ac_sunset", type: "accent", value: "sunset", label: { fa: "غروب آفتاب", en: "Sunset" },         price: 150, rarity: "rare" },
  { id: "ac_ocean",  type: "accent", value: "ocean",  label: { fa: "اقیانوس", en: "Ocean" },             price: 180, rarity: "rare" },
  { id: "ac_rose",   type: "accent", value: "rose",   label: { fa: "رز طلایی", en: "Golden Rose" },       price: 220, rarity: "rare" },
  { id: "ac_candy",  type: "accent", value: "candy",  label: { fa: "آب‌نباتی", en: "Candy" },             price: 250, rarity: "epic" },
  { id: "ac_emerald",type: "accent", value: "emerald",label: { fa: "زمرد", en: "Emerald" },              price: 320, rarity: "epic" },
  { id: "ac_gold",   type: "accent", value: "gold",   label: { fa: "طلایی پادشاهی", en: "Royal Gold" },   price: 600, rarity: "legendary" },
  { id: "ac_neon",   type: "accent", value: "neon",   label: { fa: "نئون سایبری", en: "Cyber Neon" },     price: 750, rarity: "legendary" },
  { id: "gun_ember",  type: "gun", label: { fa: "اسلحه شعله", en: "Ember Blaster" },   price: 300, rarity: "rare" },
  { id: "gun_frost",  type: "gun", label: { fa: "اسلحه یخی", en: "Frost Cannon" },     price: 300, rarity: "rare" },
  { id: "gun_toxic",  type: "gun", label: { fa: "اسلحه سمی", en: "Toxic Ray" },        price: 480, rarity: "epic" },
  { id: "gun_plasma", type: "gun", label: { fa: "تفنگ پلاسما", en: "Plasma Rifle" },   price: 700, rarity: "epic" },
  { id: "gun_rainbow",type: "gun", label: { fa: "لیزر رنگین‌کمان", en: "Rainbow Laser" }, price: 1000, rarity: "legendary" },
  { id: "boost_5",  type: "boost", games: 5,  label: { fa: "بوست ۲× XP (۵ بازی)", en: "2× XP Boost (5 games)" }, price: 100, rarity: "common" },
  { id: "boost_10", type: "boost", games: 10, label: { fa: "بوست ۲× XP (۱۰ بازی)", en: "2× XP Boost (10 games)" }, price: 180, rarity: "rare" }
];

/* اسکین اسلحه‌ها برای بازی تیراندازی کیهانی */
const GUN_SKINS = {
  default:     { bullet: "#76e6c3", glow: "rgba(118,230,195,.8)" },
  gun_ember:   { bullet: "#ff8a5c", glow: "rgba(255,138,92,.85)" },
  gun_frost:   { bullet: "#7cd5ff", glow: "rgba(124,213,255,.85)" },
  gun_toxic:   { bullet: "#9dff5c", glow: "rgba(157,255,92,.8)" },
  gun_plasma:  { bullet: "#c98bff", glow: "rgba(201,139,255,.85)" },
  gun_rainbow: { bullet: "rainbow", glow: "rgba(255,255,255,.9)" }
};

function equippedGun() {
  const p = getProfile();
  return (p.equippedGun && p.inventory.indexOf(p.equippedGun) !== -1) ? p.equippedGun : "default";
}

function getItem(id) {
  for (let i = 0; i < STORE_ITEMS.length; i++) if (STORE_ITEMS[i].id === id) return STORE_ITEMS[i];
  return null;
}

const ACCENTS = {
  violet: { a: "#b18cff", b: "#7ca7ff" },
  sunset: { a: "#ffb46b", b: "#ff7e91" },
  candy:  { a: "#ff8fd4", b: "#8fb7ff" },
  gold:   { a: "#ffc861", b: "#ffe29a" },
  ocean:  { a: "#4fc3f7", b: "#7ce6b0" },
  rose:   { a: "#ff7eb6", b: "#ffa07a" },
  emerald:{ a: "#50d68a", b: "#b4f06e" },
  neon:   { a: "#00e5ff", b: "#b2ff59" }
};

function applyAccent() {
  const p = getProfile();
  const el = document.documentElement;
  if (p.accent && ACCENTS[p.accent]) el.setAttribute("data-accent", p.accent);
  else el.removeAttribute("data-accent");
}

function levelTitle(level, lang) {
  const fa = level >= 20 ? "استاد" : level >= 10 ? "حرفه‌ای" : level >= 5 ? "کاوشگر" : "تازه‌کار";
  const en = level >= 20 ? "Master" : level >= 10 ? "Pro" : level >= 5 ? "Explorer" : "Rookie";
  return (lang || getLang()) === "fa" ? fa : en;
}

function currentTitle(p) {
  p = p || getProfile();
  if (p.title) {
    const item = getItem(p.title);
    if (item && p.inventory.indexOf(p.title) !== -1) {
      return (getLang() === "fa" ? item.label.fa : item.label.en);
    }
  }
  return levelTitle(p.level);
}

/* ---------------- Achievements ---------------- */
const ACHIEVEMENTS = [
  { id: "first_game",  icon: "🎮", fa: "اولین بازی",        en: "First Game",     faDesc: "اولین بازی‌ات را انجام بده",        enDesc: "Play your first game",        check: p => p.gamesPlayed >= 1 },
  { id: "gamer_10",    icon: "🕹️", fa: "بازی‌خور",          en: "Gamer",          faDesc: "۱۰ بازی انجام بده",                 enDesc: "Play 10 games",               check: p => p.gamesPlayed >= 10 },
  { id: "gamer_50",    icon: "🏆", fa: "ماراتن بازی",       en: "Marathon",       faDesc: "۵۰ بازی انجام بده",                 enDesc: "Play 50 games",               check: p => p.gamesPlayed >= 50 },
  { id: "gamer_100",   icon: "👑", fa: "افسانه آرکید",      en: "Arcade Legend",  faDesc: "۱۰۰ بازی انجام بده",                enDesc: "Play 100 games",              check: p => p.gamesPlayed >= 100 },
  { id: "level_5",     icon: "⭐", fa: "سطح ۵",             en: "Level 5",        faDesc: "به سطح ۵ برس",                      enDesc: "Reach level 5",               check: p => p.level >= 5 },
  { id: "level_10",    icon: "🌟", fa: "سطح ۱۰",            en: "Level 10",       faDesc: "به سطح ۱۰ برس",                     enDesc: "Reach level 10",              check: p => p.level >= 10 },
  { id: "rich_500",    icon: "💰", fa: "ثروتمند",           en: "Rich",           faDesc: "۵۰۰ سکه جمع کن",                    enDesc: "Collect 500 coins",           check: p => p.coins >= 500 },
  { id: "rich_2000",   icon: "💎", fa: "میلیونر سکه",       en: "Coin Millionaire",faDesc: "۲۰۰۰ سکه جمع کن",                  enDesc: "Collect 2000 coins",          check: p => p.coins >= 2000 },
  { id: "reaction_pro",icon: "⚡", fa: "برق‌آسا",           en: "Lightning",      faDesc: "واکنش زیر ۲۵۰ میلی‌ثانیه",          enDesc: "Reaction under 250 ms",       check: p => p.bests.reaction != null && p.bests.reaction <= 250 },
  { id: "range_15",    icon: "🎯", fa: "تک‌تیرانداز دقیق",   en: "Sharpshooter",   faDesc: "۱۵ هدف در تیراندازی دقیق بزن",      enDesc: "Hit 15 targets in Range",     check: p => (p.bests.range || 0) >= 15 },
  { id: "runner_500",  icon: "🏃", fa: "دونده ماجراجو",     en: "Cave Runner",    faDesc: "۵۰۰ متر در دونده ماجراجویی بدو",    enDesc: "Run 500m in Cave Runner",      check: p => (p.bests.runner || 0) >= 500 },
  { id: "rally_1500",  icon: "🏁", fa: "راننده رالی",       en: "Rally Driver",   faDesc: "۱۵۰۰ متر در رالی شبانه بران",       enDesc: "Drive 1500m in Night Rally",   check: p => (p.bests.rally || 0) >= 1500 },
  { id: "hoops_10",    icon: "🏀", fa: "سه‌امتیازی",         en: "Three-Pointer",  faDesc: "۱۰ سبکت در بسکتبال بزن",            enDesc: "Score 10 baskets in Hoops",   check: p => (p.bests.hoops || 0) >= 10 },
  { id: "snake_30",    icon: "🐍", fa: "مار افسانه‌ای",     en: "Snake Legend",   faDesc: "امتیاز ۳۰ در بازی مار",             enDesc: "Score 30 in Snake",           check: p => (p.bests.snake || 0) >= 30 },
  { id: "ttt_5",       icon: "❌", fa: "استراتژیست",        en: "Strategist",     faDesc: "۵ بار کامپیوتر را شکست بده",        enDesc: "Beat the AI 5 times",         check: p => (p.bests.tttWins || 0) >= 5 },
  { id: "t2048_512",   icon: "🔢", fa: "ترکیب‌گر",          en: "Merger",         faDesc: "به کاشی ۵۱۲ در ۲۰۴۸ برس",           enDesc: "Reach the 512 tile in 2048",  check: p => (p.bests.g2048 || 0) >= 512 },
  { id: "t2048_2048",  icon: "🎉", fa: "شکارچی ۲۰۴۸",       en: "2048 Hunter",    faDesc: "به کاشی ۲۰۴۸ برس",                  enDesc: "Reach the 2048 tile",         check: p => (p.bests.g2048 || 0) >= 2048 },
  { id: "mines_win",   icon: "💣", fa: "مین‌یاب حرفه‌ای",    en: "Sapper",         faDesc: "یک بازی مین‌یاب را ببر",             enDesc: "Win one Minesweeper game",    check: p => (p.bests.mines || 0) >= 1 },
  { id: "breakout_3",  icon: "🧱", fa: "آجرشکن",            en: "Brick Breaker",  faDesc: "مرحله ۳ آجرشکن را رد کن",           enDesc: "Clear level 3 in Breakout",   check: p => (p.bests.breakout || 0) >= 3 },
  { id: "puzzle_win",  icon: "🧩", fa: "پازل‌باز",          en: "Puzzler",        faDesc: "پازل ۱۵ را حل کن",                  enDesc: "Solve the 15-Puzzle",         check: p => (p.bests.puzzle15 || 0) >= 1 },
  { id: "word_5",      icon: "📝", fa: "واژه‌یاب",          en: "Word Hunter",    faDesc: "۵ کلمه در حدس کلمه حل کن",          enDesc: "Solve 5 words in Word Guess", check: p => (p.bests.wordguess || 0) >= 5 },
  { id: "shopper",     icon: "🛍️", fa: "خریدار اول",        en: "First Purchase", faDesc: "اولین خریدت را از استور انجام بده", enDesc: "Buy your first store item",   check: p => p.inventory.length >= 1 },
  { id: "collector",   icon: "🎒", fa: "کلکسیونر",          en: "Collector",      faDesc: "۳ آیتم از استور داشته باش",         enDesc: "Own 3 store items",           check: p => p.inventory.length >= 3 },
  { id: "shooter_20",  icon: "🚀", fa: "تفنگدار فضایی",     en: "Space Gunner",   faDesc: "امتیاز ۲۰ در تیراندازی کیهانی",     enDesc: "Score 20 in Space Shooter",   check: p => (p.bests.shooter || 0) >= 20 },
  { id: "c4_win",      icon: "🔴", fa: "استراتژیست",        en: "Tactician",      faDesc: "۳ بار چهار در یک ردیف را ببر",      enDesc: "Win Connect Four 3 times",    check: p => (p.bests.connect4 || 0) >= 3 },
  { id: "maze_5",      icon: "🌀", fa: "راه‌یاب",           en: "Pathfinder",     faDesc: "۵ ماز را حل کن",                    enDesc: "Solve 5 mazes",               check: p => (p.bests.mazeSolves || 0) >= 5 },
  { id: "drive_500",   icon: "🏎️", fa: "راننده حرفه‌ای",    en: "Pro Racer",      faDesc: "۵۰۰ متر در بزرگراه بران",           enDesc: "Drive 500m in Highway",       check: p => (p.bests.drive || 0) >= 500 },
  { id: "adv_30",      icon: "🗺️", fa: "گنج‌یاب",           en: "Treasure Hunter",faDesc: "۳۰ سکه در شکار گنج جمع کن",         enDesc: "Collect 30 coins in Adventure", check: p => (p.bests.adventure || 0) >= 30 },
  { id: "penalty_5",   icon: "⚽", fa: "گلزن",              en: "Striker",        faDesc: "۵ پنالتی گل کن",                    enDesc: "Score 5 penalties",           check: p => (p.bests.penaltyGoals || 0) >= 5 },
  { id: "ai_ask",      icon: "✨", fa: "پرسشگر",            en: "Curious Mind",   faDesc: "از هوش مصنوعی لومیتک بپرس",          enDesc: "Ask Lumitek AI a question",   check: p => (p.aiAsked || 0) >= 1 },
  { id: "vip",         icon: "👑", fa: "عضو VIP",           en: "VIP Member",     faDesc: "اشتراک VIP بگیر",                   enDesc: "Buy a VIP subscription",      check: p => p.vip }
];

function checkAchievements(p) {
  p = p || getProfile();
  let unlocked = 0;
  ACHIEVEMENTS.forEach(function(a) {
    if (p.badges.indexOf(a.id) === -1) {
      let ok = false;
      try { ok = !!a.check(p); } catch (e) { ok = false; }
      if (ok) {
        p.badges.push(a.id);
        unlocked++;
        const name = getLang() === "fa" ? a.fa : a.en;
        addNotification(a.icon, T("m.achUnlocked") + ": " + name);
      }
    }
  });
  if (unlocked) saveProfile(p);
  return unlocked;
}

/* ---------------- Rewards & coins economy ---------------- */
function xpForNext(level) {
  return level * 100;
}

function addCoins(n, silent) {
  const p = getProfile();
  p.coins = Math.max(0, p.coins + n);
  saveProfile(p);
  if (!silent && n > 0) addNotification("🪙", T("m.coinAdded") + ": +" + n);
  return p.coins;
}

function spendCoins(n) {
  const p = getProfile();
  if (p.coins < n) return false;
  p.coins -= n;
  p.coinSpent = (p.coinSpent || 0) + n;
  saveProfile(p);
  return true;
}

function addReward(xp, coins) {
  const p = getProfile();
  if (p.xpBoost > 0) {
    xp = xp * 2;
    p.xpBoost -= 1;
    if (p.xpBoost === 0) addNotification("✨", T("m.boostOver"));
  }
  if (p.vip && coins > 0) coins = Math.round(coins * 1.1); // VIP: +10% سکه
  p.xp += xp;
  p.coins += coins;
  while (p.xp >= xpForNext(p.level)) {
    p.xp -= xpForNext(p.level);
    p.level += 1;
    addNotification("🎉", T("m.levelUp") + " " + p.level + " — " + levelTitle(p.level));
  }
  checkAchievements(p);
  saveProfile(p);
  return { xp: xp, coins: coins };
}

function updateBest(game, score, lowerBetter) {
  const p = getProfile();
  if (game == null || score == null) return false;
  const cur = p.bests[game];
  let isRecord = false;
  if (cur == null) isRecord = true;
  else if (lowerBetter ? score < cur : score > cur) isRecord = true;
  if (isRecord) {
    p.bests[game] = score;
    addNotification("🏆", T("m.record") + " — " + gameName(game));
    checkAchievements(p);
    saveProfile(p);
  }
  return isRecord;
}

const GAME_NAMES_FA = {
  reaction: "آزمون واکنش", numberrush: "مسابقه اعداد",
  colortap: "رنگ‌یار", quickmath: "ریاضی سریع", sequence: "ترتیب",
  snake: "مار", tictactoe: "دوز", tttWins: "دوز (بردها)",
  g2048: "۲۰۴۸", mines: "مین‌یاب", breakout: "آجرشکن",
  puzzle15: "پازل ۱۵", wordguess: "حدس کلمه",
  shooter: "تیراندازی کیهانی", maze: "ماز", connect4: "چهار در یک ردیف",
  drive: "بزرگراه", adventure: "شکار گنج", penalty: "ضربات پنالتی",
  range: "تیراندازی دقیق", runner: "دونده ماجراجویی", rally: "رالی شبانه", hoops: "بسکتبال",
  c4Wins: "چهار در یک ردیف (بردها)", mazeSolves: "ماز (حل‌شده)", penaltyGoals: "پنالتی (گل‌ها)"
};

function gameName(game) {
  if (getLang() !== "fa") {
    const k = "gn." + game;
    const t = T(k);
    if (t !== k) return t;
  }
  return GAME_NAMES_FA[game] || game;
}

function markGamePlayed() {
  const p = getProfile();
  p.gamesPlayed += 1;
  checkAchievements(p);
  saveProfile(p);
}

/* Central reward API for games */
function gameReward(opts) {
  opts = opts || {};
  markGamePlayed();
  if (opts.game != null && opts.score != null) {
    updateBest(opts.game, opts.score, !!opts.lowerBetter);
  }
  return addReward(opts.xp || 0, opts.coins || 0);
}

/* ---------------- Compatibility bridge (old game code) ---------------- */
window.Lumitek = {
  version: "0.7",
  AI_COST: AI_QUESTION_COST,
  get profile() { return _liveProfile; },
  save: function() {
    const p = _liveProfile;
    if (p && typeof p.games === "number") { p.gamesPlayed += p.games; delete p.games; }
    checkAchievements(p);
    saveProfile(p);
  },
  reward: gameReward,
  best: updateBest,
  addCoins: addCoins,
  spendCoins: spendCoins,
  store: { items: STORE_ITEMS, buy: buyItem, equip: equipItem },
  guns: { skins: GUN_SKINS, equipped: equippedGun },
  achievements: ACHIEVEMENTS
};

/* ---------------- Game scroll lock (صفحه هنگام بازی جابه‌جا نشود) ---------------- */
window.GameScrollLock = (function () {
  var locked = false;
  function keyGuard(e) {
    if (!locked) return;
    var k = e.key;
    if (k === "ArrowUp" || k === "ArrowDown" || k === "ArrowLeft" || k === "ArrowRight" || k === " " || k === "Spacebar") {
      var t = (e.target && e.target.tagName) || "";
      if (t !== "INPUT" && t !== "TEXTAREA" && t !== "SELECT") e.preventDefault();
    }
  }
  function touchGuard(e) { if (locked) e.preventDefault(); }
  return {
    lock: function () {
      if (locked) return;
      locked = true;
      document.documentElement.classList.add("game-locked");
      document.addEventListener("keydown", keyGuard, { passive: false });
      document.addEventListener("touchmove", touchGuard, { passive: false });
    },
    unlock: function () {
      if (!locked) return;
      locked = false;
      document.documentElement.classList.remove("game-locked");
      document.removeEventListener("keydown", keyGuard);
      document.removeEventListener("touchmove", touchGuard);
    }
  };
})();

/* ---------------- Store engine ---------------- */
function buyItem(id) {
  const p = getProfile();
  const item = getItem(id);
  if (!item) return { ok: false, msg: T("m.notFound") };
  if (p.inventory.indexOf(id) !== -1) return { ok: false, msg: T("m.alreadyOwn") };
  if (p.coins < item.price) return { ok: false, msg: T("m.notEnough") + " (" + item.price + " 🪙)" };
  p.coins -= item.price;
  p.coinSpent = (p.coinSpent || 0) + item.price;
  p.inventory.push(id);
  if (item.type === "boost") p.xpBoost += item.games;
  checkAchievements(p);
  saveProfile(p);
  const label = item.emoji || (getLang() === "fa" ? item.label.fa : item.label.en);
  addNotification("🛍️", T("m.bought") + ": " + label);
  return { ok: true, msg: T("m.buyDone") };
}

function equipItem(id) {
  const p = getProfile();
  const item = getItem(id);
  if (!item) return { ok: false, msg: T("m.notFound") };
  if (p.inventory.indexOf(id) === -1) return { ok: false, msg: T("m.needBuy") };
  if (item.type === "avatar") p.avatar = item.emoji;
  else if (item.type === "title") p.title = (p.title === id ? "" : id);
  else if (item.type === "accent") p.accent = (p.accent === item.value ? "" : item.value);
  else if (item.type === "gun") p.equippedGun = (p.equippedGun === id ? "" : id);
  else if (item.type === "boost") return { ok: false, msg: T("m.boostAuto") };
  saveProfile(p);
  applyAccent();
  return { ok: true, msg: T("m.applied") };
}

/* ---------------- Lumitek AI access engine (سکه / اعتبار / نامحدود) ---------------- */
function aiAccessMode() {
  const p = getProfile();
  if (p.aiUnlimitedUntil && p.aiUnlimitedUntil > Date.now()) return "unlimited";
  if ((p.aiCredits || 0) > 0) return "credit";
  return "coins";
}
function aiCanAsk() {
  if (aiAccessMode() !== "coins") return true;
  return getProfile().coins >= AI_QUESTION_COST;
}
function aiConsumeQuestion() {
  const p = getProfile();
  const mode = aiAccessMode();
  if (mode === "unlimited") return { ok: true, mode: "unlimited" };
  if (mode === "credit") {
    p.aiCredits = Math.max(0, p.aiCredits - 1);
    saveProfile(p);
    return { ok: true, mode: "credit" };
  }
  if (spendCoins(AI_QUESTION_COST)) return { ok: true, mode: "coins" };
  return { ok: false };
}
function aiRefund(mode) {
  if (mode === "credit") {
    const p = getProfile();
    p.aiCredits = (p.aiCredits || 0) + 1;
    saveProfile(p);
  } else if (mode === "coins") {
    addCoins(AI_QUESTION_COST, true);
  }
}

/* ---------------- VIP & daily rewards (coins page) ---------------- */
function claimDaily() {
  const last = parseInt(localStorage.getItem(dailyKey), 10) || 0;
  if (Date.now() - last < 24 * 3600 * 1000) return { ok: false };
  const p = getProfile();
  const amount = p.vip ? 20 : 10;
  localStorage.setItem(dailyKey, String(Date.now()));
  addCoins(amount, true);
  addNotification("🎁", T("m.dailyClaimed").replace("{n}", amount));
  return { ok: true, amount: amount };
}

function canClaimDaily() {
  const last = parseInt(localStorage.getItem(dailyKey), 10) || 0;
  return Date.now() - last >= 24 * 3600 * 1000;
}

function claimAdReward() {
  const last = parseInt(localStorage.getItem(adKey), 10) || 0;
  if (Date.now() - last < 3600 * 1000) return { ok: false };
  localStorage.setItem(adKey, String(Date.now()));
  addCoins(20, true);
  addNotification("📺", T("coins.adDone"));
  return { ok: true };
}

function canClaimAd() {
  const last = parseInt(localStorage.getItem(adKey), 10) || 0;
  return Date.now() - last >= 3600 * 1000;
}

function applyPackagePurchase(id) {
  const pkg = COIN_PACKAGES.filter(function(x){ return x.id === id; })[0];
  if (!pkg) return;
  addCoins(pkg.coins, true);
  const name = getLang() === "fa" ? pkg.name.fa : pkg.name.en;
  addNotification("🪙", T("m.pkgBought").replace("{name}", name).replace("{n}", pkg.coins));
}

function applyVipPurchase() {
  const p = getProfile();
  p.vip = true;
  p.vipUntil = Date.now() + VIP_PLAN.days * 24 * 3600 * 1000;
  checkAchievements(p);
  saveProfile(p);
  addNotification("👑", T("m.welcomeVip"));
}

function applyAiPlanPurchase(id) {
  const plan = AI_PLANS.filter(function(x){ return x.id === id; })[0];
  if (!plan) return;
  const p = getProfile();
  if (plan.unlimitedDays) {
    const base = Math.max(Date.now(), p.aiUnlimitedUntil || 0);
    p.aiUnlimitedUntil = base + plan.unlimitedDays * 24 * 3600 * 1000;
  } else {
    p.aiCredits = (p.aiCredits || 0) + plan.questions;
  }
  checkAchievements(p);
  saveProfile(p);
  addNotification("✨", getLang() === "fa" ? "بسته هوش مصنوعی لومیتک فعال شد!" : "Lumitek AI plan activated!");
}

function buyPackage(id) {
  const pkg = COIN_PACKAGES.filter(function(x){ return x.id === id; })[0];
  if (!pkg) return { ok: false };
  const fa = getLang() === "fa";
  openCheckout({
    icon: pkg.icon,
    title: fa ? pkg.name.fa : pkg.name.en,
    desc: (fa ? "شارژ " : "Top-up: ") + pkg.coins.toLocaleString(fa ? "fa-IR" : "en-US") + " 🪙",
    amount: pkg.price,
    successText: fa ? "سکه‌ها به حساب شما اضافه شد." : "Coins added to your account.",
    onSuccess: function () {
      applyPackagePurchase(id);
      if (typeof renderCoins === "function") renderCoins();
    }
  });
  return { ok: true };
}

function buyVip() {
  const fa = getLang() === "fa";
  openCheckout({
    icon: "👑",
    title: fa ? "اشتراک VIP لومیتک" : "Lumitek VIP",
    desc: fa ? "۳۰ روز عضویت ویژه" : "30 days of VIP perks",
    amount: VIP_PLAN.price,
    successText: fa ? "اشتراک VIP شما فعال شد." : "Your VIP subscription is active.",
    onSuccess: function () {
      applyVipPurchase();
      if (typeof renderCoins === "function") renderCoins();
    }
  });
  return { ok: true };
}

function buyAiPlan(id) {
  const plan = AI_PLANS.filter(function(x){ return x.id === id; })[0];
  if (!plan) return { ok: false };
  const fa = getLang() === "fa";
  openCheckout({
    icon: plan.icon,
    title: fa ? plan.name.fa : plan.name.en,
    desc: fa ? "هوش مصنوعی لومیتک" : "Lumitek AI plan",
    amount: plan.price,
    successText: fa ? "بسته هوش مصنوعی شما فعال شد." : "Your AI plan is active.",
    onSuccess: function () {
      applyAiPlanPurchase(id);
      if (typeof renderCoins === "function") renderCoins();
    }
  });
  return { ok: true };
}

/* ---------------- Notifications (with read-tracking) ---------------- */
const noticeReadKey = "lumitek_notifications_read_v1";

function getReadAt() {
  return parseInt(localStorage.getItem(noticeReadKey), 10) || 0;
}
function unreadNotifications() {
  return getNotifications().filter(function (n) { return (n.ts || 0) > getReadAt(); });
}
function markAllNotificationsRead() {
  localStorage.setItem(noticeReadKey, String(Date.now()));
  renderNotifications();
}

function addNotification(icon, text) {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(noticeKey)) || []; } catch (e) {}
  list.unshift({ icon: icon, text: text, time: new Date().toLocaleString(getLang() === "fa" ? "fa-IR" : "en-US"), ts: Date.now() });
  localStorage.setItem(noticeKey, JSON.stringify(list.slice(0, 30)));
  renderNotifications();
}

function getNotifications() {
  try { return JSON.parse(localStorage.getItem(noticeKey)) || []; } catch (e) { return []; }
}

/* ---------------- Language ---------------- */
function getLang() {
  return localStorage.getItem(langKey) || "fa";
}

function setLang(lang) {
  localStorage.setItem(langKey, lang);
  applyLanguage();
}

function applyLanguage() {
  const lang = getLang();
  const t = translations[lang] || translations.fa;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";

  if (window.LumiI18n) LumiI18n.apply(document);

  document.querySelectorAll("[data-i18n-legacy]").forEach(function(el) {
    const key = el.getAttribute("data-i18n-legacy");
    if (t[key]) el.textContent = t[key];
  });

  const btn = document.querySelector("#languageToggle");
  if (btn) btn.textContent = lang === "fa" ? "EN" : "فارسی";

  const search = document.querySelector("#globalSearchInput");
  if (search) search.placeholder = T("head.searchPh");

  renderProfile();
  document.dispatchEvent(new CustomEvent("lumitek:langchange", { detail: { lang: lang } }));
}

/* ---------------- Profile rendering ---------------- */
function renderProfile() {
  const p = getProfile();
  document.querySelectorAll("[data-profile-name]").forEach(function(el){ el.textContent = p.name; });
  document.querySelectorAll("[data-profile-level]").forEach(function(el){ el.textContent = p.level; });
  document.querySelectorAll("[data-profile-xp]").forEach(function(el){ el.textContent = p.xp; });
  document.querySelectorAll("[data-profile-coins]").forEach(function(el){ el.textContent = p.coins.toLocaleString(getLang() === "fa" ? "fa-IR" : "en-US"); });
  document.querySelectorAll("[data-games-played]").forEach(function(el){ el.textContent = p.gamesPlayed; });
  document.querySelectorAll("[data-profile-avatar]").forEach(function(el){ el.textContent = p.avatar; });
  document.querySelectorAll("[data-profile-title]").forEach(function(el){ el.textContent = currentTitle(p); });
  const need = xpForNext(p.level);
  document.querySelectorAll("[data-profile-xpbar]").forEach(function(el){ el.style.width = Math.min(100, Math.round(p.xp / need * 100)) + "%"; });
  document.querySelectorAll("[data-profile-xptext]").forEach(function(el){ el.textContent = p.xp + " / " + need + " XP"; });
  document.querySelectorAll("[data-vip-badge]").forEach(function(el){ el.style.display = p.vip ? "inline-flex" : "none"; });
  renderAuthUI();
  if (typeof renderStoreBalance === "function") renderStoreBalance();
}

function renderNotifications() {
  const box = document.querySelector("#notificationList");
  const count = document.querySelector("#notificationCount");
  const unread = unreadNotifications();
  if (count) {
    count.textContent = unread.length > 9 ? "9+" : unread.length;
    count.style.display = unread.length ? "" : "none";
  }
  if (!box) return;
  const list = getNotifications();
  box.innerHTML = "";
  box.innerHTML = "";
  if (!list.length) {
    box.innerHTML = '<div class="empty-state">' + T("notif.empty") + '</div>';
    return;
  }
  list.forEach(function(n) {
    const item = document.createElement("div");
    item.className = "notification-item";
    item.innerHTML = "<span>" + n.icon + "</span><div><strong></strong><small></small></div>";
    item.querySelector("strong").textContent = n.text;
    item.querySelector("small").textContent = n.time;
    box.appendChild(item);
  });
}

/* ---------------- Search (v0.6 — تقویت‌شده) ---------------- */
function searchNormalize(s) {
  return (s || "").toString().toLowerCase()
    .replace(/\u200c/g, "")
    .replace(/[\u064a]/g, "\u06cc")
    .replace(/[\u0643]/g, "\u06a9")
    .replace(/[\u0622\u0623\u0625]/g, "\u0627")
    .replace(/[\u0640]/g, "")
    .replace(/[\u06F0-\u06F9]/g, function(d) { return String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48); })
    .replace(/\s+/g, " ")
    .trim();
}

function resolveSearchHref(h) {
  if (!h) return h;
  var inPages = /\/pages\//.test(location.pathname);
  var inTools = /\/tools\//.test(location.pathname);
  if (!inPages && !inTools) return h;
  if (inPages) return h.replace(/^pages\//, "").replace(/^tools\//, "../tools/");
  if (inTools) return h.replace(/^tools\//, "").replace(/^pages\//, "../pages/");
  return h;
}

function setupSearch() {
  const input = document.querySelector("#globalSearchInput");
  const results = document.querySelector("#searchResults");
  if (!input || !results) return;
  var selIdx = -1;

  function score(item, q) {
    var fa = searchNormalize(item[0]), en = searchNormalize(item[1]);
    var s = 0;
    if (fa === q || en === q) s = 100;
    else if (fa.indexOf(q) === 0 || en.indexOf(q) === 0) s = 80;
    else {
      var words = q.split(" ");
      var all = fa + " " + en;
      var hit = 0;
      words.forEach(function(w) { if (w && all.indexOf(w) !== -1) hit++; });
      if (hit === words.length) s = 60;
      else if (hit > 0) s = 30 * hit / words.length;
    }
    if (s > 0 && (item[3] === "ابزار" || item[3] === "بازی")) s += 4;
    return s;
  }

  function mark(text, q) {
    var out = "";
    var nq = searchNormalize(q);
    var idx = searchNormalize(text).indexOf(nq);
    if (idx === -1 || !nq) return text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    var plain = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    var realIdx = idx;
    return plain.slice(0, realIdx) + "<mark>" + plain.slice(realIdx, realIdx + q.length) + "</mark>" + plain.slice(realIdx + q.length);
  }

  function runSearch() {
    const q = searchNormalize(input.value);
    results.innerHTML = "";
    selIdx = -1;
    if (!q) {
      results.classList.remove("show");
      return;
    }
    var matches = catalog.map(function(x) { return [score(x, q), x]; })
      .filter(function(x) { return x[0] > 0; })
      .sort(function(a, b) { return b[0] - a[0]; })
      .slice(0, 9)
      .map(function(x) { return x[1]; });

    if (!matches.length) {
      results.innerHTML = '<div class="search-empty">' + T("m.searchEmpty") + '</div>';
    } else {
      matches.forEach(function(x, i) {
        const a = document.createElement("a");
        a.href = resolveSearchHref(x[2]);
        a.setAttribute("data-idx", i);
        a.innerHTML = '<span class="sr-tag">' + (x[3] || "") + '</span><strong></strong><span></span>';
        a.querySelector("strong").innerHTML = mark(x[0], input.value.trim());
        a.querySelector("span").textContent = x[1];
        results.appendChild(a);
      });
    }
    results.classList.add("show");
  }

  input.addEventListener("input", runSearch);
  input.addEventListener("focus", function() { if (input.value.trim()) runSearch(); });
  input.addEventListener("keydown", function(e) {
    var items = results.querySelectorAll("a");
    if (e.key === "Escape") {
      input.value = "";
      results.classList.remove("show");
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!items.length) return;
      selIdx = e.key === "ArrowDown" ? Math.min(selIdx + 1, items.length - 1) : Math.max(selIdx - 1, 0);
      items.forEach(function(x, i) { x.classList.toggle("sel", i === selIdx); });
      items[selIdx].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      if (selIdx >= 0 && items[selIdx]) { e.preventDefault(); items[selIdx].click(); }
      else if (items.length === 1) { e.preventDefault(); items[0].click(); }
    }
  });
  document.addEventListener("click", function(e) {
    if (!results.contains(e.target) && e.target !== input) results.classList.remove("show");
  });
}

/* ---------------- Profile modal ---------------- */
function setupProfile() {
  const modal = document.querySelector("#profileModal");
  const open = document.querySelector("#profileButton");
  const close = document.querySelector("#profileClose");
  const save = document.querySelector("#profileSave");
  const input = document.querySelector("#profileNameInput");
  if (!modal || !open) return;

  open.addEventListener("click", function() {
    const p = getProfile();
    if (input) input.value = p.name;
    modal.classList.add("show");
  });
  if (close) close.addEventListener("click", function(){ modal.classList.remove("show"); });
  modal.addEventListener("click", function(e){ if (e.target === modal) modal.classList.remove("show"); });
  if (save) save.addEventListener("click", function() {
    const p = getProfile();
    if (input) p.name = input.value.trim() || "Lumitek User";
    saveProfile(p);
    addNotification("👤", T("m.profileSaved"));
    modal.classList.remove("show");
  });

  const authOpenBtn = document.querySelector("#pmAuthButton");
  if (authOpenBtn) authOpenBtn.addEventListener("click", function() {
    modal.classList.remove("show");
    const am = document.querySelector("#authModal");
    if (am && window.LumiAuth) {
      if (window.LumiAuth.currentUser()) { window.location.href = document.body.getAttribute("data-pagesprefix") === "1" ? "account.html" : "pages/account.html"; return; }
      am.classList.add("show");
    } else if (am) am.classList.add("show");
  });
  const pmLogout = document.querySelector("#pmLogout");
  if (pmLogout) pmLogout.addEventListener("click", function() {
    if (window.LumiAuth) window.LumiAuth.signOut();
  });
}

/* ---------------- Notifications panel ---------------- */
function setupNotifications() {
  const button = document.querySelector("#notificationButton");
  const panel = document.querySelector("#notificationPanel");
  if (!button || !panel) return;
  button.addEventListener("click", function() {
    panel.classList.toggle("show");
    renderNotifications();
    if (panel.classList.contains("show")) {
      /* کاربر اعلان‌ها را دید — دایره قرمز پاک می‌شود */
      setTimeout(markAllNotificationsRead, 600);
    }
  });
  document.addEventListener("click", function(e) {
    if (!panel.contains(e.target) && !button.contains(e.target)) panel.classList.remove("show");
  });
}

/* ---------------- Changelog (تغییرات نسخه‌ها در هدر) ---------------- */
const LUMITEK_VERSIONS = [
  { v: "0.7", fa: "لوگوی جدید در هدر، اسپورتک با جدول لیگ‌ها و بازی‌های پیش رو، ۴ بازی جدید، ماشین‌حساب مهندسی کامل، درگاه پرداخت فروشگاه، ارتقای ابزارها و هوش مصنوعی قوی‌تر", en: "New header logo, Sportek with league tables & fixtures, 4 new games, full engineering calculator, store checkout, upgraded tools and stronger AI" },
  { v: "0.6", fa: "فروشگاه کامل (سکه، اسلحه، اسکین)، ۶ بازی و ۹ ابزار جدید، هوش مصنوعی لومیتک با هزینه ۲ سکه", en: "Full store (coins, guns, skins), 6 new games & 9 new tools, Lumitek AI at 2 coins per question" },
  { v: "0.5", fa: "موتور آفلاین، نصب PWA، فروشگاه سکه و VIP، ورود با گوگل", en: "Offline engine, PWA install, coin store & VIP, Google sign-in" },
  { v: "0.4", fa: "استور، حساب کاربری، اخبار زنده ورزشی، پشتیبانی هوشمند", en: "Store, user account, live sports news, AI support" },
  { v: "0.3", fa: "طراحی مجدد، جستجوی سراسری، اعلان‌ها، تم روز/شب", en: "Redesign, global search, notifications, day/night theme" },
  { v: "0.2", fa: "نسخه اولیه با ابزارها، بازی‌ها، XP و سکه", en: "Initial release with tools, games, XP and coins" }
];

function renderChangelog() {
  const box = document.querySelector("#changelogList");
  if (!box) return;
  box.innerHTML = "";
  LUMITEK_VERSIONS.forEach(function (v, i) {
    const item = document.createElement("div");
    item.className = "cl-item";
    const fa = getLang() === "fa";
    item.innerHTML = '<div class="cl-top"><span class="cl-v">v' + v.v + '</span>' +
      (i === 0 ? '<span class="cl-new">' + (fa ? "جدید" : "New") + '</span>' : '') + '</div>' +
      '<p class="cl-desc"></p>';
    item.querySelector(".cl-desc").textContent = fa ? v.fa : v.en;
    box.appendChild(item);
  });
  const link = box.parentElement.querySelector(".cl-all");
  if (link) link.href = resolveSearchHref("pages/announcements.html");
}

function setupChangelog() {
  const button = document.querySelector("#changelogButton");
  const panel = document.querySelector("#changelogPanel");
  if (!button || !panel) return;
  renderChangelog();
  button.addEventListener("click", function (e) {
    e.stopPropagation();
    panel.classList.toggle("show");
    renderChangelog();
    const np = document.querySelector("#notificationPanel");
    if (np && panel.classList.contains("show")) np.classList.remove("show");
  });
  document.addEventListener("click", function (e) {
    if (!panel.contains(e.target) && !button.contains(e.target)) panel.classList.remove("show");
  });
  document.addEventListener("lumitek:langchange", renderChangelog);
}

/* ---------------- Theme (day/night) ---------------- */
function applyTheme(theme) {
  if (theme === "light") document.documentElement.classList.add("light");
  else document.documentElement.classList.remove("light");
  document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#f4f7fb" : "#070b15");
  const btn = document.querySelector("#themeToggle");
  if (btn) btn.textContent = theme === "light" ? "🌙" : "☀️";
}

function setupTheme() {
  const btn = document.querySelector("#themeToggle");
  applyTheme(localStorage.getItem(themeKey) === "light" ? "light" : "dark");
  if (!btn) return;
  btn.addEventListener("click", function() {
    const isLight = document.documentElement.classList.contains("light");
    const next = isLight ? "dark" : "light";
    applyTheme(next);
    localStorage.setItem(themeKey, next);
  });
}

/* ---------------- Mobile menu ---------------- */
function setupMobileMenu() {
  const toggle = document.querySelector("#menuToggle");
  const nav = document.querySelector("#mainNav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", function(e) {
    e.stopPropagation();
    document.body.classList.toggle("nav-open");
  });
  document.addEventListener("click", function(e) {
    if (document.body.classList.contains("nav-open") && !nav.contains(e.target) && !toggle.contains(e.target)) {
      document.body.classList.remove("nav-open");
    }
  });
  nav.addEventListener("click", function(e) {
    if (e.target.closest("a")) document.body.classList.remove("nav-open");
  });
}

/* ---------------- PWA + offline engine ---------------- */
function setupPWA() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "http:" && location.protocol !== "https:") return;
  const depth = (document.querySelector('script[src*="js/main.js"]') || {}).getAttribute ? null : null;
  var swUrl = "sw.js";
  var scripts = document.querySelectorAll("script[src]");
  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i].src.indexOf("main.js") !== -1) {
      swUrl = scripts[i].src.replace(/js\/main\.js.*$/, "sw.js");
      break;
    }
  }
  navigator.serviceWorker.register(swUrl).catch(function() {});

  var banner = document.querySelector("#offlineBanner");
  function showBanner(on) {
    if (!banner) return;
    banner.classList.toggle("show", !!on);
  }
  function update() { showBanner(!navigator.onLine); }
  window.addEventListener("online", function() { update(); addNotification("✅", getLang() === "fa" ? "اتصال اینترنت برقرار شد." : "Back online."); });
  window.addEventListener("offline", function() { update(); addNotification("🔌", getLang() === "fa" ? "اتصال اینترنت قطع شد — حالت آفلاین فعال است." : "You are offline — offline mode is on."); });
  update();
}

/* ---------------- Auth UI glue ---------------- */
function renderAuthUI() {
  var user = window.LumiAuth ? window.LumiAuth.currentUser() : null;
  var area = document.querySelector("#pmAuthArea");
  var btnIn = document.querySelector("#pmAuthButton");
  var btnOut = document.querySelector("#pmLogout");
  var emailEl = document.querySelector("#pmAuthEmail");
  if (area) {
    if (user) {
      area.classList.add("signed");
      if (btnIn) btnIn.style.display = "none";
      if (btnOut) btnOut.style.display = "";
      if (emailEl) { emailEl.textContent = (user.name || "") + " · " + user.email; emailEl.style.display = ""; }
    } else {
      area.classList.remove("signed");
      if (btnIn) btnIn.style.display = "";
      if (btnOut) btnOut.style.display = "none";
      if (emailEl) emailEl.style.display = "none";
    }
  }
}


/* ---------------- Newsletter (footer) ---------------- */
function setupNewsletter() {
  const form = document.querySelector("#newsletterForm");
  if (!form) return;
  form.addEventListener("submit", function(e) {
    e.preventDefault();
    const input = form.querySelector("input");
    if (!input || !input.value.trim()) return;
    input.value = "";
    addNotification("📬", T("m.newsletterOk"));
  });
}

/* ---------------- Checkout (درگاه پرداخت فروشگاه / دونیشن) ----------------
   درگاه نمایشی کامل با رسید و کد پیگیری. برای اتصال واقعی:
   LUMITEK_PAY_CONFIG را در بالای همین فایل با merchant زرین‌پال/آیدی‌پی ست کن. */
function openCheckout(opts) {
  const old = document.getElementById("lumiCheckout");
  if (old) old.remove();
  const fa = getLang() === "fa";
  const amount = opts.amount || 0;
  const fmtN = amount.toLocaleString(fa ? "fa-IR" : "en-US");

  const ov = document.createElement("div");
  ov.id = "lumiCheckout";
  ov.className = "modal ck-modal";
  ov.innerHTML =
    '<div class="modal-card ck-card">' +
    '<button class="modal-close" id="ckClose">×</button>' +
    '<div class="ck-step ck-step-form">' +
    '  <div class="ck-head"><span class="ck-icon">' + (opts.icon || "💳") + '</span><div><h3 id="ckTitle"></h3><p class="muted ck-sub" id="ckDesc"></p></div></div>' +
    '  <div class="ck-amount-row"><span>' + (fa ? "مبلغ قابل پرداخت" : "Amount due") + '</span><b id="ckAmount"></b></div>' +
    '  <label class="ck-label">' + (fa ? "انتخاب درگاه پرداخت" : "Choose payment gateway") + '</label>' +
    '  <div class="ck-gates">' +
    '    <button class="ck-gate active" data-g="zarinpal"><b>زرین‌پال</b><small>ZarinPal</small></button>' +
    '    <button class="ck-gate" data-g="idpay"><b>آیدی‌پی</b><small>IDPay</small></button>' +
    '  </div>' +
    '  <div class="api-note ck-note">🔒 ' + (fa ? "پرداخت امن — این نسخه، درگاه نمایشی است. برای فعال‌سازی پرداخت واقعی، شناسه درگاه (Merchant) را در تنظیمات سایت وارد کن." : "Secure demo checkout — add your merchant ID in site settings for live payments.") + '</div>' +
    '  <button class="primary-btn" id="ckPay" style="width:100%">' + (fa ? "پرداخت " : "Pay ") + fmtN + (fa ? " تومان" : " Toman") + '</button>' +
    '</div>' +
    '<div class="ck-step ck-step-busy" style="display:none;text-align:center;padding:34px 0">' +
    '  <div class="ck-spinner"></div><p id="ckBusyText" style="font-weight:800">' + (fa ? "در حال انتقال به درگاه پرداخت..." : "Redirecting to the gateway...") + '</p>' +
    '</div>' +
    '<div class="ck-step ck-step-done" style="display:none;text-align:center;padding:10px 0">' +
    '  <div class="ck-check">✓</div>' +
    '  <h3>' + (fa ? "پرداخت با موفقیت انجام شد" : "Payment successful") + '</h3>' +
    '  <p class="muted ck-sub" id="ckDoneText"></p>' +
    '  <div class="ck-txid">' + (fa ? "کد پیگیری" : "Tracking ID") + ': <b id="ckTxid" dir="ltr"></b></div>' +
    '  <button class="primary-btn" id="ckDone" style="width:100%;margin-top:14px">' + (fa ? "تکمیل و بستن" : "Done") + '</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(ov);
  requestAnimationFrame(function () { ov.classList.add("show"); });

  ov.querySelector("#ckTitle").textContent = opts.title || (fa ? "پرداخت سفارش" : "Order payment");
  ov.querySelector("#ckDesc").textContent = opts.desc || "";
  ov.querySelector("#ckAmount").textContent = fmtN + (fa ? " تومان" : " Toman");

  function close() { ov.classList.remove("show"); setTimeout(function () { ov.remove(); }, 200); }
  ov.querySelector("#ckClose").onclick = close;
  ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
  ov.querySelectorAll(".ck-gate").forEach(function (g) {
    g.onclick = function () {
      ov.querySelectorAll(".ck-gate").forEach(function (x) { x.classList.remove("active"); });
      g.classList.add("active");
    };
  });
  ov.querySelector("#ckPay").onclick = function () {
    const form = ov.querySelector(".ck-step-form"), busy = ov.querySelector(".ck-step-busy");
    form.style.display = "none"; busy.style.display = "";
    setTimeout(function () {
      busy.style.display = "none";
      const done = ov.querySelector(".ck-step-done");
      done.style.display = "";
      const txid = "LMT-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(Math.random() * 900 + 100);
      ov.querySelector("#ckTxid").textContent = txid;
      ov.querySelector("#ckDoneText").textContent = opts.successText || (fa ? "سفارش شما فعال شد." : "Your order is now active.");
      addNotification("💳", (fa ? "پرداخت موفق: " : "Payment OK: ") + (opts.title || ""));
    }, 1700);
  };
  ov.querySelector("#ckDone").onclick = function () {
    close();
    if (opts.onSuccess) opts.onSuccess();
    renderProfile();
  };
  return ov;
}

/* ---------------- Scroll reveal + stat counters (v0.6) ---------------- */
window.LumiReveal = {
  scan: function(scope) {
    var els = (scope || document).querySelectorAll(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function(el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function(el) { io.observe(el); });
  },
  counters: function(scope) {
    var els = (scope || document).querySelectorAll("[data-count]");
    els.forEach(function(el) {
      var target = parseInt(el.getAttribute("data-count"), 10) || 0;
      var started = false;
      function run() {
        if (started) return;
        started = true;
        var t0 = null, dur = 1300;
        function tick(ts) {
          if (!t0) t0 = ts;
          var k = Math.min(1, (ts - t0) / dur);
          k = 1 - Math.pow(1 - k, 3);
          el.textContent = Math.round(target * k).toLocaleString(getLang() === "fa" ? "fa-IR" : "en-US");
          if (k < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }
      if (!("IntersectionObserver" in window)) { run(); return; }
      var io = new IntersectionObserver(function(entries) {
        entries.forEach(function(en) { if (en.isIntersecting) { run(); io.disconnect(); } });
      }, { threshold: 0.4 });
      io.observe(el);
    });
  }
};

function setupReveal() {
  window.LumiReveal.scan(document);
  window.LumiReveal.counters(document);
}

/* ---------------- Boot ---------------- */
document.addEventListener("DOMContentLoaded", function() {
  _liveProfile = getProfile();
  grantStarterCoins();
  checkAchievements(_liveProfile);
  applyAccent();
  applyTheme(localStorage.getItem(themeKey) === "light" ? "light" : "dark");
  setupTheme();
  setupMobileMenu();
  setupSearch();
  setupProfile();
  setupNotifications();
  renderProfile();
  renderNotifications();
  applyLanguage();
  setupPWA();
  setupNewsletter();
  setupReveal();
  setupChangelog();

  const languageToggle = document.querySelector("#languageToggle");
  if (languageToggle) languageToggle.addEventListener("click", function() {
    setLang(getLang() === "fa" ? "en" : "fa");
  });

  if (window.LumiAuth && window.LumiAuth.onChange) {
    window.LumiAuth.onChange(function() { renderProfile(); });
  }

  const notifyFirst = localStorage.getItem("lumitek_first_notice_v7");
  if (!notifyFirst) {
    addNotification("🚀", getLang() === "fa"
      ? "Lumitek 0.7 منتشر شد: لوگوی جدید، اسپورتک با جدول لیگ‌ها، ۴ بازی جدید، ماشین‌حساب مهندسی کامل و درگاه پرداخت!"
      : "Lumitek 0.7 is out: new logo, Sportek league tables, 4 new games, full engineering calculator and store checkout!");
    localStorage.setItem("lumitek_first_notice_v7", "1");
  }
});
