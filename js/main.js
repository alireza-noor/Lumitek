/* ============================================================
   Lumitek 1.2 — Core (profile v5, coins economy, VIP, game skins,
   PWA/offline engine, auth hooks, store+weapons, achievements,
   checkout gateway, changelog, game scroll-lock,
   universal Game Bar: pause / help / restart / fullscreen)
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

/* هوش مصنوعی لومیتک: فقط با سکه — هر پرسش ۲ سکه (بدون اشتراک) */

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
  readArticles: [],
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
  p.readArticles = Array.isArray(raw && raw.readArticles) ? raw.readArticles : [];
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
  fa: { home: "خانه", tools: "ابزارها", sports: "ورزش", tech: "فناوری", articles: "مقالات", games: "بازی‌ها", updates: "تغییرات", store: "فروشگاه", support: "پشتیبانی", profile: "پروفایل", language: "English", welcome: "به Lumitek خوش آمدی", profileTitle: "پروفایل کاربر", gamesTitle: "بازی‌های Lumitek", save: "ذخیره", close: "بستن", coins: "سکه", xp: "XP", level: "سطح", account: "حساب کاربری", donate: "حمایت مالی" },
  en: { home: "Home", tools: "Tools", sports: "Sports", tech: "Technology", articles: "Articles", games: "Games", updates: "Updates", store: "Store", support: "Support", profile: "Profile", language: "فارسی", welcome: "Welcome to Lumitek", profileTitle: "User Profile", gamesTitle: "Lumitek Games", save: "Save", close: "Close", coins: "Coins", xp: "XP", level: "Level", account: "Account", donate: "Donate" }
};

/* Canonical catalog: hrefs از ریشه سایت (در جستجو خودکار به عمق صفحه تبدیل می‌شوند) */
const catalog = [
  ["خانه", "Home", "index.html", "بخش"],
  ["ابزارها", "Tools", "pages/tools.html", "بخش"],
  ["فروشگاه / خرید سکه", "Store / Buy Coins", "pages/store.html", "بخش"],
  ["فروشگاه", "Store", "pages/store.html", "بخش"],
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
  ["هوش مصنوعی لومیتک", "Lumitek AI", "pages/ai.html", "هوش مصنوعی"],
  ["اخبار دیجیتال", "Digital News", "pages/digital-news.html", "بخش"],
  ["اخبار فناوری", "Tech News", "pages/digital-news.html", "بخش"],
  ["فناوری", "Technology", "pages/technology.html", "بخش"],
  ["مقالات", "Articles", "pages/articles.html", "بخش"],
  ["پشتیبانی هوشمند", "AI Support", "pages/support.html", "بخش"],
  ["چرخ شانس و قرعه‌کشی", "Lucky Wheel", "tools/wheel.html", "ابزار"],
  ["قرعه‌کشی", "Raffle", "tools/wheel.html", "ابزار"],
  ["شمارش معکوس", "Countdown", "tools/countdown.html", "ابزار"],
  ["یادداشت سریع", "Quick Notes", "tools/notes.html", "ابزار"],
  ["بازی حافظه", "Memory Game", "pages/memory.html", "بازی"],
  ["ضربه‌گیر", "Whack-a-Mole", "pages/whack.html", "بازی"],
  ["سایمون", "Simon", "pages/simon.html", "بازی"],
  ["بازی سایمون", "Simon Memory", "pages/simon.html", "بازی"],
  ["چراغ‌ها", "Lights Out", "pages/tile-flip.html", "بازی"],
  ["پازل چراغ", "Lights Out Puzzle", "pages/tile-flip.html", "بازی"],
  ["داربسته", "Hangman", "pages/hangman.html", "بازی"],
  ["حدس کلمه داربسته", "Hangman Word", "pages/hangman.html", "بازی"],
  ["حدس عدد", "Guess Number", "pages/guess-number.html", "بازی"],
  ["بازی حدس عدد", "Number Guess", "pages/guess-number.html", "بازی"],
  ["شبکه واکنش", "Reaction Grid", "pages/reaction-grid.html", "بازی"],
  ["واکنش گرید", "Reflex Grid", "pages/reaction-grid.html", "بازی"],
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
  ["تپه‌نورد", "Hill Climb", "pages/hill.html", "بازی"],
  ["شکار گنج", "Treasure Hunt", "pages/adventure.html", "بازی"],
  ["بازی ماجراجویی", "Adventure Game", "pages/adventure.html", "بازی"],
  ["دونده ماجراجویی", "Cave Runner", "pages/runner.html", "بازی"],
  ["ضربات پنالتی", "Penalty Shootout", "pages/penalty.html", "بازی"],
  ["بازی فوتبال", "Football Game", "pages/penalty.html", "بازی"],
  ["بسکتبال", "Hoops Shot", "pages/hoops.html", "بازی"],
  ["جدول امتیازات بازی‌ها", "Games Leaderboard", "pages/leaderboard.html", "بخش"],
  ["لیدربرد", "Leaderboard", "pages/leaderboard.html", "بخش"],
  ["رتبه‌بندی بازیکنان", "Player Ranking", "pages/leaderboard.html", "بخش"],
  ["هدبال", "HeadBall", "pages/headball.html", "بازی"],
  ["بازی فوتبال تک‌به‌تک", "Head Ball Game", "pages/headball.html", "بازی"],
  ["بازی محبوب هدبال", "Popular HeadBall", "pages/headball.html", "بازی"],
  ["فشرده‌ساز عکس", "Image Compressor", "tools/image-compress.html", "ابزار"],
  ["کم کردن حجم عکس", "Compress Photo", "tools/image-compress.html", "ابزار"],
  ["عکس به Base64", "Image to Base64", "tools/imgbase64.html", "ابزار"],
  ["تست سرعت اینترنت", "Internet Speed Test", "tools/speedtest.html", "ابزار"],
  ["سرعت اینترنت", "Speed Test", "tools/speedtest.html", "ابزار"],
  ["سازنده QR کد", "QR Code Maker", "tools/qr.html", "ابزار"],
  ["بارکد QR", "QR Code", "tools/qr.html", "ابزار"],
  ["متن به گفتار", "Text to Speech", "tools/tts.html", "ابزار"],
  ["روخوانی متن", "Read Text Aloud", "tools/tts.html", "ابزار"],
  ["فرمت‌کننده JSON", "JSON Formatter", "tools/json.html", "ابزار"],
  ["ابزار جیسون", "JSON Tool", "tools/json.html", "ابزار"],
  ["شمارشگر کلمات", "Word Counter", "tools/wordcount.html", "ابزار"],
  ["تعداد حروف متن", "Character Count", "tools/wordcount.html", "ابزار"],
  ["آزمایشگر Regex", "Regex Tester", "tools/regex.html", "ابزار"],
  ["عبارات باقاعده", "Regular Expressions", "tools/regex.html", "ابزار"],
  ["محاسبه معدل", "GPA Calculator", "tools/gpa.html", "ابزار"],
  ["معدل نمرات", "Grade Average", "tools/gpa.html", "ابزار"],
  ["مترجم هوشمند", "Smart Translator", "tools/translate.html", "ابزار"],
  ["دیکشنری و ترجمه", "Dictionary & Translate", "tools/translate.html", "ابزار"],
  ["آواتار استور", "Store Avatars", "pages/store.html", "فروشگاه"],
  ["عنوان پروفایل", "Profile Titles", "pages/store.html", "فروشگاه"],
  ["اسلحه و اسکین", "Weapons & Skins", "pages/store.html", "فروشگاه"],
  ["اسکین بازی‌ها", "Game Skins", "pages/store.html", "فروشگاه"],
  ["پاداش روزانه", "Daily Reward", "pages/store.html", "فروشگاه"],
  ["اشتراک VIP", "VIP Plan", "pages/store.html", "فروشگاه"],
  ["آموزش پایتون", "Python Tutorial", "pages/articles.html", "مقاله"],
  ["آموزش HTML", "HTML Tutorial", "pages/articles.html", "مقاله"],
  ["آموزش CSS", "CSS Tutorial", "pages/articles.html", "مقاله"],
  ["آموزش جاوااسکریپت", "JavaScript Tutorial", "pages/articles.html", "مقاله"],
  ["میان‌برهای ویندوز", "Windows Shortcuts", "pages/articles.html", "مقاله"],
  ["رمز عبور قوی", "Strong Password", "pages/articles.html", "مقاله"],
  ["آموزش اکسل", "Excel Tutorial", "pages/articles.html", "مقاله"],
  ["پرامپت‌نویسی", "Prompt Writing", "pages/articles.html", "مقاله"],
  ["فیشینگ و امنیت اینترنت", "Phishing & Security", "pages/articles.html", "مقاله"],
  ["سریع‌تر کردن گوشی اندروید", "Speed Up Android", "pages/articles.html", "مقاله"],
  ["مقالات آموزشی کامپیوتر", "Computer Tutorials", "pages/articles.html", "مقاله"],
  ["آموزش CMD و خط فرمان", "CMD Tutorial", "pages/articles.html", "مقاله"],
  ["جستجوی حرفه‌ای در گوگل", "Google Search Tips", "pages/articles.html", "مقاله"],
  ["آموزش ایمیل و جیمیل", "Email & Gmail Guide", "pages/articles.html", "مقاله"],
  ["آموزش ورد", "Word Tutorial", "pages/articles.html", "مقاله"],
  ["بکاپ‌گیری از گوشی و کامپیوتر", "Backup Guide", "pages/articles.html", "مقاله"],
  ["راه‌اندازی وای‌فای و مودم", "Wi-Fi Setup Guide", "pages/articles.html", "مقاله"],
  ["آموزش TypeScript", "TypeScript Tutorial", "pages/articles.html", "مقاله"],
  ["آموزش React", "React Tutorial", "pages/articles.html", "مقاله"],
  ["آموزش SQL و پایگاه داده", "SQL & Database Tutorial", "pages/articles.html", "مقاله"],
  ["API و REST چیست", "What is REST API", "pages/articles.html", "مقاله"],
  ["داکر و کانتینر", "Docker & Containers", "pages/articles.html", "مقاله"],
  ["مدیر رمز عبور", "Password Manager", "pages/articles.html", "مقاله"],
  ["VPN و حریم خصوصی", "VPN & Privacy", "pages/articles.html", "مقاله"],
  ["رمزنگاری چطور کار می‌کند", "How Encryption Works", "pages/articles.html", "مقاله"],
  ["امنیت وای‌فای خانه", "Home Wi-Fi Security", "pages/articles.html", "مقاله"],
  ["بهینه‌سازی سرعت سایت و سئو", "Website Speed & SEO", "pages/articles.html", "مقاله"],
  ["مبدل اعداد رومی", "Roman Numeral Converter", "tools/roman.html", "ابزار"],
  ["اعداد رومی", "Roman Numerals", "tools/roman.html", "ابزار"],
  ["محاسبه انعام", "Tip Calculator", "tools/tip.html", "ابزار"],
  ["انعام رستوران", "Restaurant Tip", "tools/tip.html", "ابزار"],
  ["تقسیم صورت‌حساب", "Split Bill", "tools/tip.html", "ابزار"],
  ["تاس مجازی", "Virtual Dice", "tools/dice.html", "ابزار"],
  ["انداختن تاس", "Roll Dice", "tools/dice.html", "ابزار"],
  ["سود مرکب", "Compound Interest", "tools/compound-interest.html", "ابزار"],
  ["محاسبه سود مرکب", "Compound Interest Calculator", "tools/compound-interest.html", "ابزار"],
  ["بررسی فشار خون", "Blood Pressure Checker", "tools/blood-pressure.html", "ابزار"],
  ["دسته فشار خون", "BP Category", "tools/blood-pressure.html", "ابزار"],
  ["محاسبه آب روزانه", "Water Intake Calculator", "tools/water-intake.html", "ابزار"],
  ["آب مورد نیاز بدن", "Daily Water Need", "tools/water-intake.html", "ابزار"],
  ["سنجش قدرت رمز عبور", "Password Strength Checker", "tools/password-strength.html", "ابزار"],
  ["بررسی رمز عبور", "Check Password", "tools/password-strength.html", "ابزار"]
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
  { id: "av_owl",     type: "avatar", emoji: "🦉", price: 220, rarity: "rare" },
  { id: "av_tiger",   type: "avatar", emoji: "🐯", price: 240, rarity: "rare" },
  { id: "av_eagle",   type: "avatar", emoji: "🦅", price: 260, rarity: "rare" },
  { id: "av_koala",   type: "avatar", emoji: "🐨", price: 130, rarity: "common" },
  { id: "av_dragon2", type: "avatar", emoji: "🐉", price: 480, rarity: "epic" },
  { id: "av_frog",    type: "avatar", emoji: "🐸", price: 90,  rarity: "common" },
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
  { id: "sniper_night", type: "sniper", label: { fa: "اسنایپر شب‌شکن", en: "Night Sniper" },   price: 450, rarity: "rare" },
  { id: "sniper_ember", type: "sniper", label: { fa: "اسنایپر گداخته", en: "Ember Sniper" },   price: 700, rarity: "epic" },
  { id: "sniper_gold",  type: "sniper", label: { fa: "اسنایپر طلایی", en: "Golden Sniper" },   price: 1000, rarity: "legendary" },
  { id: "car_falcon",   type: "car",    label: { fa: "شاهین سرخ", en: "Red Falcon" },          price: 450, rarity: "rare" },
  { id: "car_neon",     type: "car",    label: { fa: "گران‌تور نئون", en: "Neon GT" },          price: 700, rarity: "epic" },
  { id: "car_gold",     type: "car",    label: { fa: "کلاسیک طلایی", en: "Golden Classic" },   price: 1000, rarity: "legendary" },
  { id: "hero_ninja",   type: "hero",   label: { fa: "نینجای سایه", en: "Shadow Ninja" },      price: 450, rarity: "rare" },
  { id: "hero_explorer",type: "hero",   label: { fa: "کاوشگر جزیره", en: "Island Explorer" },  price: 700, rarity: "epic" },
  { id: "hero_frost",   type: "hero",   label: { fa: "پیشتاز یخی", en: "Frost Scout" },        price: 1000, rarity: "legendary" },
  { id: "tower_magma",  type: "tower",  label: { fa: "برج مذاب", en: "Magma Tower" },          price: 450, rarity: "rare" },
  { id: "tower_toxic",  type: "tower",  label: { fa: "برج زهرآلود", en: "Toxic Tower" },       price: 700, rarity: "epic" },
  { id: "tower_frost",  type: "tower",  label: { fa: "برج یخی", en: "Frost Tower" },           price: 1000, rarity: "legendary" },
  { id: "av_monkey", type: "avatar", emoji: "🐵", price: 90,  rarity: "common" },
  { id: "av_octopus",type: "avatar", emoji: "🐙", price: 140, rarity: "common" },
  { id: "av_astronaut", type: "avatar", emoji: "🧑‍🚀", price: 260, rarity: "rare" },
  { id: "ti_monarch", type: "title", label: { fa: "فرمانروای آرکید", en: "Arcade Monarch" }, price: 550, rarity: "epic" },
  { id: "snake_ember",  type: "snake",    label: { fa: "مار آتشین", en: "Ember Snake" },       price: 350, rarity: "rare" },
  { id: "snake_neon",   type: "snake",    label: { fa: "مار نئون", en: "Neon Serpent" },       price: 700, rarity: "epic" },
  { id: "snake_gold",   type: "snake",    label: { fa: "اژدهای طلایی", en: "Golden Dragon" },  price: 1000, rarity: "legendary" },
  { id: "g2048_frost",  type: "g2048",    label: { fa: "۲۰۴۸ یخی", en: "Frost 2048" },         price: 350, rarity: "rare" },
  { id: "g2048_candy",  type: "g2048",    label: { fa: "۲۰۴۸ آب‌نباتی", en: "Candy 2048" },    price: 700, rarity: "epic" },
  { id: "mines_sand",   type: "mines",    label: { fa: "مین‌یاب کویری", en: "Desert Mines" },  price: 350, rarity: "rare" },
  { id: "mines_galaxy", type: "mines",    label: { fa: "مین‌یاب کهکشانی", en: "Galaxy Mines" }, price: 700, rarity: "epic" },
  { id: "breakout_retro", type: "breakout", label: { fa: "آجرشکن رترو", en: "Retro Breaker" },   price: 350, rarity: "rare" },
  { id: "breakout_neon",  type: "breakout", label: { fa: "آجرشکن نئون", en: "Neon Breaker" },    price: 700, rarity: "epic" },
  { id: "hoops_fire",   type: "hoops",    label: { fa: "توپ آتشین", en: "Fireball" },          price: 400, rarity: "rare" },
  { id: "hoops_gold",   type: "hoops",    label: { fa: "توپ طلایی", en: "Golden Ball" },       price: 1000, rarity: "legendary" },
  { id: "boost_5",  type: "boost", games: 5,  label: { fa: "بوست ۲× XP (۵ بازی)", en: "2× XP Boost (5 games)" }, price: 100, rarity: "common" },
  { id: "boost_10", type: "boost", games: 10, label: { fa: "بوست ۲× XP (۱۰ بازی)", en: "2× XP Boost (10 games)" }, price: 180, rarity: "rare" },
  /* اسکین‌های ۰٫۱٫۳ — برای تک‌تک بازی‌های باقی‌مانده */
  { id: "shooter_ember", type: "shooter", label: { fa: "سفینه گداخته", en: "Ember Ship" },       price: 350, rarity: "rare" },
  { id: "shooter_neon",  type: "shooter", label: { fa: "سفینه نئون", en: "Neon Ship" },         price: 700, rarity: "epic" },
  { id: "penalty_fire", type: "penalty", label: { fa: "توپ آتشین پنالتی", en: "Fire Penalty Ball" }, price: 350, rarity: "rare" },
  { id: "penalty_gold", type: "penalty", label: { fa: "توپ طلایی پنالتی", en: "Golden Penalty Ball" }, price: 1000, rarity: "legendary" },
  { id: "headball_fire", type: "headball", label: { fa: "توپ آتشین هدبال", en: "Fire HeadBall" },  price: 350, rarity: "rare" },
  { id: "headball_neon", type: "headball", label: { fa: "توپ نئون هدبال", en: "Neon HeadBall" },  price: 700, rarity: "epic" },
  { id: "maze_crystal", type: "maze", label: { fa: "هزارتوی بلورین", en: "Crystal Maze" },      price: 350, rarity: "rare" },
  { id: "maze_gold",    type: "maze", label: { fa: "هزارتوی طلایی", en: "Golden Maze" },        price: 700, rarity: "epic" },
  { id: "connect4_ocean", type: "connect4", label: { fa: "مهره‌های اقیانوسی", en: "Ocean Discs" }, price: 350, rarity: "rare" },
  { id: "connect4_sunset", type: "connect4", label: { fa: "مهره‌های غروب", en: "Sunset Discs" },  price: 700, rarity: "epic" },
  { id: "drive_sport", type: "drive", label: { fa: "خودرو اسپرت", en: "Sport Machine" },       price: 350, rarity: "rare" },
  { id: "drive_gold",  type: "drive", label: { fa: "خودرو طلایی", en: "Golden Machine" },      price: 700, rarity: "epic" },
  { id: "memory_mint", type: "memory", label: { fa: "کارت‌های نعنایی", en: "Mint Cards" },     price: 350, rarity: "rare" },
  { id: "memory_rose", type: "memory", label: { fa: "کارت‌های رز", en: "Rose Cards" },        price: 700, rarity: "epic" },
  { id: "ttt_neon", type: "tictactoe", label: { fa: "دوز نئونی", en: "Neon Tic-Tac-Toe" },     price: 350, rarity: "rare" },
  { id: "ttt_gold", type: "tictactoe", label: { fa: "دوز طلایی", en: "Golden Tic-Tac-Toe" },    price: 700, rarity: "epic" },
  /* آیتم‌های تکمیلی */
  { id: "av_cat",     type: "avatar", emoji: "🐱", price: 90,  rarity: "common" },
  { id: "av_penguin", type: "avatar", emoji: "🐧", price: 130, rarity: "common" },
  { id: "av_clown",   type: "avatar", emoji: "🤡", price: 170, rarity: "common" },
  { id: "av_vampire", type: "avatar", emoji: "🧛", price: 310, rarity: "rare" },
  { id: "ti_ace",     type: "title", label: { fa: "تک‌ستاره", en: "Lone Star" },           price: 320, rarity: "rare" },
  { id: "ti_master",  type: "title", label: { fa: "استاد بی‌رقیب", en: "Unrivaled Master" },price: 850, rarity: "legendary" },
  { id: "ac_cherry",  type: "accent", value: "cherry", label: { fa: "گیلاسی", en: "Cherry" },        price: 190, rarity: "rare" },
  { id: "ac_ice",     type: "accent", value: "ice",    label: { fa: "یخی قطبی", en: "Polar Ice" },   price: 280, rarity: "epic" },
  { id: "ac_lavender", type: "accent", value: "lavender", label: { fa: "بنفش کمرنگ", en: "Lavender" },  price: 200, rarity: "rare" },
  { id: "ac_forest",   type: "accent", value: "forest",   label: { fa: "جنگل تاریک", en: "Dark Forest" }, price: 280, rarity: "epic" },
  { id: "ac_berry",    type: "accent", value: "berry",    label: { fa: "توت‌رنگ", en: "Berry" },          price: 350, rarity: "epic" },
  { id: "ac_desert",   type: "accent", value: "desert",   label: { fa: "بیابان", en: "Desert" },           price: 220, rarity: "rare" },
  { id: "boost_20", type: "boost", games: 20, label: { fa: "بوست ۲× XP (۲۰ بازی)", en: "2× XP Boost (20 games)" }, price: 320, rarity: "epic" },
  /* اسکین‌های بیشتر برای هر بازی — تنوع بصری و گرافیکی قوی‌تر */
  { id: "sniper_steel",   type: "sniper", label: { fa: "اسنایپر فولادی", en: "Steel Sniper" },      price: 450,  rarity: "rare" },
  { id: "sniper_aurora",  type: "sniper", label: { fa: "اسنایپر شفق قطبی", en: "Aurora Sniper" },   price: 700,  rarity: "epic" },
  { id: "sniper_vortex",  type: "sniper", label: { fa: "اسنایپر گردابه", en: "Vortex Sniper" },     price: 1000, rarity: "legendary" },
  { id: "sniper_shadow",  type: "sniper", label: { fa: "اسنایپر سایه", en: "Shadow Sniper" },        price: 750,  rarity: "epic" },
  { id: "car_vortex",     type: "car",    label: { fa: "گران‌تور گردابه", en: "Vortex GT" },          price: 450,  rarity: "rare" },
  { id: "car_aurora",     type: "car",    label: { fa: "گران‌تور شفق قطبی", en: "Aurora GT" },        price: 700,  rarity: "epic" },
  { id: "car_shadow",     type: "car",    label: { fa: "گران‌تور سایه", en: "Shadow GT" },            price: 750,  rarity: "epic" },
  { id: "car_obsidian",   type: "car",    label: { fa: "گران‌تور ابسیدین", en: "Obsidian GT" },       price: 1000, rarity: "legendary" },
  { id: "hero_crystal",   type: "hero",   label: { fa: "قهرمان بلورین", en: "Crystal Hero" },        price: 450,  rarity: "rare" },
  { id: "hero_mystic",    type: "hero",   label: { fa: "قهرمان صوفی", en: "Mystic Hero" },           price: 700,  rarity: "epic" },
  { id: "hero_obsidian",  type: "hero",   label: { fa: "قهرمان ابسیدین", en: "Obsidian Hero" },      price: 750,  rarity: "epic" },
  { id: "hero_aurora",    type: "hero",   label: { fa: "قهرمان شفق قطبی", en: "Aurora Hero" },        price: 1000, rarity: "legendary" },
  { id: "tower_steel",    type: "tower",  label: { fa: "برج فولادی", en: "Steel Tower" },            price: 450,  rarity: "rare" },
  { id: "tower_aurora",   type: "tower",  label: { fa: "برج شفق قطبی", en: "Aurora Tower" },         price: 700,  rarity: "epic" },
  { id: "tower_vortex",   type: "tower",  label: { fa: "برج گردابه", en: "Vortex Tower" },           price: 750,  rarity: "epic" },
  { id: "tower_obsidian", type: "tower",  label: { fa: "برج ابسیدین", en: "Obsidian Tower" },         price: 1000, rarity: "legendary" },
  { id: "snake_vortex",   type: "snake",  label: { fa: "مار گردابه", en: "Vortex Serpent" },         price: 350,  rarity: "rare" },
  { id: "snake_aurora",   type: "snake",  label: { fa: "مار شفق قطبی", en: "Aurora Serpent" },       price: 700,  rarity: "epic" },
  { id: "snake_shadow",   type: "snake",  label: { fa: "مار سایه", en: "Shadow Serpent" },           price: 750,  rarity: "epic" },
  { id: "snake_mystic",   type: "snake",  label: { fa: "اژدهای صوفی", en: "Mystic Dragon" },          price: 1000, rarity: "legendary" },
  { id: "g2048_aurora",   type: "g2048",  label: { fa: "۲۰۴۸ شفق قطبی", en: "Aurora 2048" },         price: 350,  rarity: "rare" },
  { id: "g2048_neon",     type: "g2048",  label: { fa: "۲۰۴۸ نئون", en: "Neon 2048" },               price: 700,  rarity: "epic" },
  { id: "g2048_obsidian", type: "g2048",  label: { fa: "۲۰۴۸ ابسیدین", en: "Obsidian 2048" },        price: 750,  rarity: "epic" },
  { id: "g2048_rainbow",  type: "g2048",  label: { fa: "۲۰۴۸ رنگین‌کمان", en: "Rainbow 2048" },     price: 1000, rarity: "legendary" },
  { id: "mines_crystal",  type: "mines",  label: { fa: "مین‌یاب بلورین", en: "Crystal Mines" },     price: 350,  rarity: "rare" },
  { id: "mines_neon",     type: "mines",  label: { fa: "مین‌یاب نئون", en: "Neon Mines" },           price: 700,  rarity: "epic" },
  { id: "mines_obsidian", type: "mines",  label: { fa: "مین‌یاب ابسیدین", en: "Obsidian Mines" },    price: 750,  rarity: "epic" },
  { id: "mines_aurora",   type: "mines",  label: { fa: "مین‌یاب شفق قطبی", en: "Aurora Mines" },     price: 1000, rarity: "legendary" },
  { id: "breakout_aurora",   type: "breakout", label: { fa: "آجرشکن شفق قطبی", en: "Aurora Breaker" },     price: 350,  rarity: "rare" },
  { id: "breakout_plasma",   type: "breakout", label: { fa: "آجرشکن پلاسما", en: "Plasma Breaker" },       price: 700,  rarity: "epic" },
  { id: "breakout_obsidian", type: "breakout", label: { fa: "آجرشکن ابسیدین", en: "Obsidian Breaker" },    price: 750,  rarity: "epic" },
  { id: "breakout_rainbow",  type: "breakout", label: { fa: "آجرشکن رنگین‌کمان", en: "Rainbow Breaker" }, price: 1000, rarity: "legendary" },
  { id: "hoops_aurora",   type: "hoops",  label: { fa: "توپ شفق قطبی", en: "Aurora Ball" },          price: 400,  rarity: "rare" },
  { id: "hoops_plasma",   type: "hoops",  label: { fa: "توپ پلاسما", en: "Plasma Ball" },            price: 700,  rarity: "epic" },
  { id: "hoops_vortex",   type: "hoops",  label: { fa: "توپ گردابه", en: "Vortex Ball" },            price: 750,  rarity: "epic" },
  { id: "hoops_obsidian", type: "hoops",  label: { fa: "توپ ابسیدین", en: "Obsidian Ball" },         price: 1000, rarity: "legendary" },
  { id: "shooter_aurora",   type: "shooter", label: { fa: "سفینه شفق قطبی", en: "Aurora Ship" },         price: 350,  rarity: "rare" },
  { id: "shooter_plasma",   type: "shooter", label: { fa: "سفینه پلاسما", en: "Plasma Ship" },           price: 700,  rarity: "epic" },
  { id: "shooter_obsidian", type: "shooter", label: { fa: "سفینه ابسیدین", en: "Obsidian Ship" },       price: 750,  rarity: "epic" },
  { id: "shooter_rainbow",  type: "shooter", label: { fa: "سفینه رنگین‌کمان", en: "Rainbow Ship" },    price: 1000, rarity: "legendary" },
  { id: "penalty_aurora",   type: "penalty", label: { fa: "توپ شفق قطبی پنالتی", en: "Aurora Penalty Ball" },     price: 350,  rarity: "rare" },
  { id: "penalty_plasma",   type: "penalty", label: { fa: "توپ پلاسما پنالتی", en: "Plasma Penalty Ball" },       price: 700,  rarity: "epic" },
  { id: "penalty_vortex",   type: "penalty", label: { fa: "توپ گردابه پنالتی", en: "Vortex Penalty Ball" },       price: 750,  rarity: "epic" },
  { id: "penalty_obsidian", type: "penalty", label: { fa: "توپ ابسیدین پنالتی", en: "Obsidian Penalty Ball" },  price: 1000, rarity: "legendary" },
  { id: "headball_aurora",   type: "headball", label: { fa: "توپ شفق قطبی هدبال", en: "Aurora HeadBall" },     price: 350,  rarity: "rare" },
  { id: "headball_plasma",   type: "headball", label: { fa: "توپ پلاسما هدبال", en: "Plasma HeadBall" },       price: 700,  rarity: "epic" },
  { id: "headball_vortex",   type: "headball", label: { fa: "توپ گردابه هدبال", en: "Vortex HeadBall" },       price: 750,  rarity: "epic" },
  { id: "headball_obsidian", type: "headball", label: { fa: "توپ ابسیدین هدبال", en: "Obsidian HeadBall" },  price: 1000, rarity: "legendary" },
  { id: "maze_neon",      type: "maze",     label: { fa: "هزارتوی نئون", en: "Neon Maze" },            price: 350,  rarity: "rare" },
  { id: "maze_aurora",    type: "maze",     label: { fa: "هزارتوی شفق قطبی", en: "Aurora Maze" },     price: 700,  rarity: "epic" },
  { id: "maze_obsidian",  type: "maze",     label: { fa: "هزارتوی ابسیدین", en: "Obsidian Maze" },    price: 750,  rarity: "epic" },
  { id: "maze_vortex",    type: "maze",     label: { fa: "هزارتوی گردابه", en: "Vortex Maze" },        price: 1000, rarity: "legendary" },
  { id: "connect4_neon",      type: "connect4", label: { fa: "مهره‌های نئون", en: "Neon Discs" },            price: 350,  rarity: "rare" },
  { id: "connect4_aurora",    type: "connect4", label: { fa: "مهره‌های شفق قطبی", en: "Aurora Discs" },     price: 700,  rarity: "epic" },
  { id: "connect4_obsidian",  type: "connect4", label: { fa: "مهره‌های ابسیدین", en: "Obsidian Discs" },    price: 750,  rarity: "epic" },
  { id: "connect4_vortex",    type: "connect4", label: { fa: "مهره‌های گردابه", en: "Vortex Discs" },        price: 1000, rarity: "legendary" },
  { id: "drive_aurora",   type: "drive",    label: { fa: "خودرو شفق قطبی", en: "Aurora Machine" },    price: 350,  rarity: "rare" },
  { id: "drive_plasma",   type: "drive",    label: { fa: "خودرو پلاسما", en: "Plasma Machine" },      price: 700,  rarity: "epic" },
  { id: "drive_obsidian", type: "drive",    label: { fa: "خودرو ابسیدین", en: "Obsidian Machine" },    price: 750,  rarity: "epic" },
  { id: "drive_vortex",   type: "drive",    label: { fa: "خودرو گردابه", en: "Vortex Machine" },      price: 1000, rarity: "legendary" },
  { id: "memory_aurora",   type: "memory",   label: { fa: "کارت‌های شفق قطبی", en: "Aurora Cards" },  price: 350,  rarity: "rare" },
  { id: "memory_neon",     type: "memory",   label: { fa: "کارت‌های نئون", en: "Neon Cards" },         price: 700,  rarity: "epic" },
  { id: "memory_obsidian", type: "memory",   label: { fa: "کارت‌های ابسیدین", en: "Obsidian Cards" }, price: 750,  rarity: "epic" },
  { id: "memory_vortex",   type: "memory",   label: { fa: "کارت‌های گردابه", en: "Vortex Cards" },     price: 1000, rarity: "legendary" },
  { id: "ttt_aurora",    type: "tictactoe", label: { fa: "دوز شفق قطبی", en: "Aurora Tic-Tac-Toe" },  price: 350,  rarity: "rare" },
  { id: "ttt_plasma",    type: "tictactoe", label: { fa: "دوز پلاسما", en: "Plasma Tic-Tac-Toe" },     price: 700,  rarity: "epic" },
  { id: "ttt_obsidian",  type: "tictactoe", label: { fa: "دوز ابسیدین", en: "Obsidian Tic-Tac-Toe" }, price: 750,  rarity: "epic" },
  { id: "ttt_vortex",    type: "tictactoe", label: { fa: "دوز گردابه", en: "Vortex Tic-Tac-Toe" },     price: 1000, rarity: "legendary" },
  /* اسکین‌های بیشتر — تم‌های جدید برای تنوع بیشتر هر بازی */
  { id: "sniper_eclipse",    type: "sniper",    label: { fa: "اسنایپر کسوف", en: "Eclipse Sniper" },      price: 800,  rarity: "epic" },
  { id: "car_comet",         type: "car",       label: { fa: "گران‌تور دنبچه", en: "Comet GT" },            price: 800,  rarity: "epic" },
  { id: "hero_valkyrie",     type: "hero",      label: { fa: "قهرمان والکیری", en: "Valkyrie Hero" },      price: 800,  rarity: "epic" },
  { id: "tower_glacier",     type: "tower",     label: { fa: "برج یخ", en: "Glacier Tower" },              price: 800,  rarity: "epic" },
  { id: "snake_ruby",        type: "snake",     label: { fa: "مار یاقوتی", en: "Ruby Serpent" },          price: 800,  rarity: "epic" },
  { id: "g2048_sunset",      type: "g2048",     label: { fa: "۲۰۴۸ غروب", en: "Sunset 2048" },              price: 800,  rarity: "epic" },
  { id: "mines_emerald",     type: "mines",     label: { fa: "مین‌یاب زمردی", en: "Emerald Mines" },        price: 800,  rarity: "epic" },
  { id: "breakout_sapphire", type: "breakout", label: { fa: "آجرشکن یاقوتی", en: "Sapphire Breaker" },   price: 800,  rarity: "epic" },
  { id: "hoops_comet",       type: "hoops",     label: { fa: "توپ دنبچه", en: "Comet Ball" },              price: 800,  rarity: "epic" },
  { id: "shooter_meteor",    type: "shooter",   label: { fa: "سفینه شهاب‌سنگ", en: "Meteor Ship" },         price: 800,  rarity: "epic" },
  { id: "penalty_star",      type: "penalty",   label: { fa: "توپ ستاره پنالتی", en: "Star Penalty Ball" }, price: 800, rarity: "epic" },
  { id: "headball_star",     type: "headball",  label: { fa: "توپ ستاره هدبال", en: "Star HeadBall" },    price: 800,  rarity: "epic" },
  { id: "maze_ruby",         type: "maze",      label: { fa: "هزارتوی یاقوتی", en: "Ruby Maze" },          price: 800,  rarity: "epic" },
  { id: "connect4_emerald",  type: "connect4", label: { fa: "مهره‌های زمردی", en: "Emerald Discs" },     price: 800,  rarity: "epic" },
  { id: "drive_comet",       type: "drive",     label: { fa: "خودرو دنبچه", en: "Comet Machine" },          price: 800,  rarity: "epic" },
  { id: "memory_sunset",     type: "memory",    label: { fa: "کارت‌های غروب", en: "Sunset Cards" },        price: 800,  rarity: "epic" },
  { id: "ttt_sapphire",      type: "tictactoe", label: { fa: "دوز یاقوتی", en: "Sapphire Tic-Tac-Toe" },   price: 800,  rarity: "epic" }
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

/* اسکین‌های بازی‌های ۰.۸: اسنایپر، درگ‌ریس، جزیره گنج، دژبان */
const GAME_SKINS = {
  sniper_default: { scope: "#76e6c3", trail: "rgba(118,230,195,.8)" },
  sniper_night:   { scope: "#7cd5ff", trail: "rgba(124,213,255,.85)" },
  sniper_ember:   { scope: "#ff8a5c", trail: "rgba(255,138,92,.85)" },
  sniper_gold:    { scope: "#ffd166", trail: "rgba(255,209,102,.9)" },
  car_default:    { body: "#3f8cff", glow: "rgba(63,140,255,.6)" },
  car_falcon:     { body: "#ff5c5c", glow: "rgba(255,92,92,.6)" },
  car_neon:       { body: "#22e5a5", glow: "rgba(34,229,165,.6)" },
  car_gold:       { body: "#ffc861", glow: "rgba(255,200,97,.65)" },
  hero_default:   { skin: "#76e6c3", hat: "#3f8cff" },
  hero_ninja:     { skin: "#8f9bb3", hat: "#222433" },
  hero_explorer:  { skin: "#d9a066", hat: "#8a5a2b" },
  hero_frost:     { skin: "#9fd8ff", hat: "#4f7cb0" },
  tower_default:  { color: "#7ca7ff", shot: "rgba(124,167,255,.9)" },
  tower_magma:    { color: "#ff7a45", shot: "rgba(255,122,69,.9)" },
  tower_toxic:    { color: "#9dff5c", shot: "rgba(157,255,92,.85)" },
  tower_frost:    { color: "#7cd5ff", shot: "rgba(124,213,255,.9)" },
  /* اسکین‌های ۱.۱: مار، ۲۰۴۸، مین‌یاب، آجرشکن، بسکتبال */
  snake_default:   { head: "#76e6c3", body: "#3ecfae", glow: "rgba(118,230,195,.55)" },
  snake_ember:     { head: "#ff8a5c", body: "#ff5c3c", glow: "rgba(255,138,92,.6)" },
  snake_neon:      { head: "#22e5a5", body: "#b44cff", glow: "rgba(180,76,255,.65)" },
  snake_gold:      { head: "#ffd166", body: "#f0a83c", glow: "rgba(255,209,102,.7)" },
  g2048_default:   { bg: "#3b5163", tile: "#ffd166", high: "#ff8a5c" },
  g2048_frost:     { bg: "#274b63", tile: "#7cd5ff", high: "#c98bff" },
  g2048_candy:     { bg: "#5c3a63", tile: "#ff9ed2", high: "#7cf7c4" },
  mines_default:   { bg: "#2b3a4a", safe: "#35485c", flag: "#ff5c5c" },
  mines_sand:      { bg: "#5c4a33", safe: "#6e5a3f", flag: "#22e5a5" },
  mines_galaxy:    { bg: "#2e2a5c", safe: "#3d3880", flag: "#7cf7c4" },
  breakout_default:{ paddle: "#76e6c3", brick: "#ff8a5c", ball: "#ffffff" },
  breakout_retro:  { paddle: "#f2d16b", brick: "#e05c7c", ball: "#f2f2f2" },
  breakout_neon:   { paddle: "#22e5a5", brick: "#b44cff", ball: "#7cd5ff" },
  hoops_default:   { ball: "#ff9350", trail: "rgba(255,147,80,.7)" },
  hoops_fire:      { ball: "#ff5c3c", trail: "rgba(255,92,60,.8)" },
  hoops_gold:      { ball: "#ffd166", trail: "rgba(255,209,102,.85)" },
  /* اسکین‌های ۰.۱.۳ — بقیه‌ی بازی‌ها */
  shooter_default: { ship: "#76e6c3", bullet: "#ffd166" },
  shooter_ember:   { ship: "#ff8a5c", bullet: "#ff5c3c" },
  shooter_neon:    { ship: "#22e5a5", bullet: "#b44cff" },
  penalty_default: { ball: "#ffffff", glow: "rgba(255,255,255,.5)" },
  penalty_fire:    { ball: "#ff5c3c", glow: "rgba(255,92,60,.75)" },
  penalty_gold:    { ball: "#ffd166", glow: "rgba(255,209,102,.8)" },
  headball_default:{ ball: "#ffffff", trail: "rgba(255,255,255,.55)" },
  headball_fire:   { ball: "#ff5c3c", trail: "rgba(255,92,60,.8)" },
  headball_neon:   { ball: "#22e5a5", trail: "rgba(34,229,165,.8)" },
  maze_default:    { wall: "#3f8cff", player: "#76e6c3", exit: "#ffd166" },
  maze_crystal:    { wall: "#7cd5ff", player: "#c98bff", exit: "#7cf7c4" },
  maze_gold:       { wall: "#ffd166", player: "#fff3c4", exit: "#ff9350" },
  connect4_default:{ p1: "#ff5c5c", p2: "#ffd166", board: "#25324a" },
  connect4_ocean:  { p1: "#4fc3f7", p2: "#ffe29a", board: "#1d3a5f" },
  connect4_sunset: { p1: "#ff7e91", p2: "#ffb46b", board: "#4a2c4d" },
  drive_default:   { body: "#3f8cff", glow: "rgba(63,140,255,.6)" },
  drive_sport:     { body: "#22e5a5", glow: "rgba(34,229,165,.6)" },
  drive_gold:      { body: "#ffc861", glow: "rgba(255,200,97,.65)" },
  memory_default:  { back: "#3f8cff", back2: "#7ca7ff" },
  memory_mint:     { back: "#50d68a", back2: "#b4f06e" },
  memory_rose:     { back: "#ff7eb6", back2: "#ffa07a" },
  tictactoe_default:{ x: "#ff5c5c", o: "#76e6c3" },
  ttt_neon:        { x: "#00e5ff", o: "#b2ff59" },
  ttt_gold:        { x: "#ffd166", o: "#ffb46b" },
  /* اسکین‌های بصری بیشتر برای هر بازی — رنگ‌های زنده و متنوع */
  sniper_steel:    { scope: "#9aa8c1", trail: "rgba(154,168,193,.85)" },
  sniper_aurora:   { scope: "#7cf7c4", trail: "rgba(124,247,196,.9)" },
  sniper_vortex:   { scope: "#c98bff", trail: "rgba(201,139,255,.9)" },
  sniper_shadow:   { scope: "#4a5a7a", trail: "rgba(74,90,122,.85)" },
  car_vortex:       { body: "#c98bff", glow: "rgba(201,139,255,.6)" },
  car_aurora:       { body: "#7cf7c4", glow: "rgba(124,247,196,.65)" },
  car_shadow:       { body: "#3a3f5c", glow: "rgba(58,63,92,.7)" },
  car_obsidian:     { body: "#1a1d2e", glow: "rgba(80,80,120,.8)" },
  hero_crystal:    { skin: "#7cd5ff", hat: "#c98bff" },
  hero_mystic:     { skin: "#b18cff", hat: "#5c4a8a" },
  hero_obsidian:   { skin: "#3a3f5c", hat: "#1a1d2e" },
  hero_aurora:     { skin: "#7cf7c4", hat: "#4fc3f7" },
  tower_steel:     { color: "#9aa8c1", shot: "rgba(154,168,193,.9)" },
  tower_aurora:    { color: "#7cf7c4", shot: "rgba(124,247,196,.9)" },
  tower_vortex:    { color: "#c98bff", shot: "rgba(201,139,255,.9)" },
  tower_obsidian:  { color: "#3a3f5c", shot: "rgba(80,80,120,.9)" },
  snake_vortex:    { head: "#c98bff", body: "#8a5cff", glow: "rgba(201,139,255,.65)" },
  snake_aurora:    { head: "#7cf7c4", body: "#4fc3f7", glow: "rgba(124,247,196,.65)" },
  snake_shadow:    { head: "#3a3f5c", body: "#5a5f7c", glow: "rgba(58,63,92,.7)" },
  snake_mystic:    { head: "#b18cff", body: "#7c5cff", glow: "rgba(177,140,255,.7)" },
  g2048_aurora:    { bg: "#1a3a5c", tile: "#7cf7c4", high: "#c98bff" },
  g2048_neon:      { bg: "#1a1d2e", tile: "#22e5a5", high: "#ff5c8a" },
  g2048_obsidian:  { bg: "#1a1a1a", tile: "#3a3f5c", high: "#9aa8c1" },
  g2048_rainbow:   { bg: "#2e1a5c", tile: "#ffd166", high: "#ff5c5c" },
  mines_crystal:   { bg: "#1a3a5c", safe: "#274b63", flag: "#7cd5ff" },
  mines_neon:       { bg: "#1a1d2e", safe: "#2a2d4e", flag: "#22e5a5" },
  mines_obsidian:   { bg: "#1a1a1a", safe: "#2a2a2a", flag: "#9aa8c1" },
  mines_aurora:     { bg: "#2a1a5c", safe: "#3a2a6c", flag: "#7cf7c4" },
  breakout_aurora:   { paddle: "#7cf7c4", brick: "#c98bff", ball: "#ffffff" },
  breakout_plasma:   { paddle: "#c98bff", brick: "#ff5c8a", ball: "#7cd5ff" },
  breakout_obsidian: { paddle: "#3a3f5c", brick: "#9aa8c1", ball: "#ffd166" },
  breakout_rainbow:  { paddle: "#ff5c5c", brick: "#22e5a5", ball: "#ffd166" },
  hoops_aurora:    { ball: "#7cf7c4", trail: "rgba(124,247,196,.8)" },
  hoops_plasma:    { ball: "#c98bff", trail: "rgba(201,139,255,.8)" },
  hoops_vortex:    { ball: "#5c5cff", trail: "rgba(92,92,255,.8)" },
  hoops_obsidian:  { ball: "#3a3f5c", trail: "rgba(154,168,193,.8)" },
  shooter_aurora:    { ship: "#7cf7c4", bullet: "#4fc3f7" },
  shooter_plasma:    { ship: "#c98bff", bullet: "#ff5c8a" },
  shooter_obsidian:  { ship: "#3a3f5c", bullet: "#ffd166" },
  shooter_rainbow:   { ship: "#ffd166", bullet: "#ff5c8a" },
  penalty_aurora:    { ball: "#7cf7c4", glow: "rgba(124,247,196,.8)" },
  penalty_plasma:    { ball: "#c98bff", glow: "rgba(201,139,255,.8)" },
  penalty_vortex:    { ball: "#5c5cff", glow: "rgba(92,92,255,.8)" },
  penalty_obsidian:  { ball: "#3a3f5c", glow: "rgba(154,168,193,.8)" },
  headball_aurora:    { ball: "#7cf7c4", trail: "rgba(124,247,196,.8)" },
  headball_plasma:    { ball: "#c98bff", trail: "rgba(201,139,255,.8)" },
  headball_vortex:    { ball: "#5c5cff", trail: "rgba(92,92,255,.8)" },
  headball_obsidian:  { ball: "#3a3f5c", trail: "rgba(154,168,193,.8)" },
  maze_neon:        { wall: "#22e5a5", player: "#ff5c8a", exit: "#ffd166" },
  maze_aurora:      { wall: "#7cf7c4", player: "#4fc3f7", exit: "#c98bff" },
  maze_obsidian:    { wall: "#3a3f5c", player: "#9aa8c1", exit: "#ffd166" },
  maze_vortex:      { wall: "#c98bff", player: "#ff5c8a", exit: "#7cf7c4" },
  connect4_neon:      { p1: "#22e5a5", p2: "#ff5c8a", board: "#1a1d2e" },
  connect4_aurora:    { p1: "#7cf7c4", p2: "#c98bff", board: "#1a3a5c" },
  connect4_obsidian:  { p1: "#9aa8c1", p2: "#ffd166", board: "#1a1a1a" },
  connect4_vortex:    { p1: "#c98bff", p2: "#4fc3f7", board: "#2e1a5c" },
  drive_aurora:     { body: "#7cf7c4", glow: "rgba(124,247,196,.65)" },
  drive_plasma:     { body: "#c98bff", glow: "rgba(201,139,255,.65)" },
  drive_obsidian:   { body: "#3a3f5c", glow: "rgba(154,168,193,.7)" },
  drive_vortex:     { body: "#5c5cff", glow: "rgba(92,92,255,.65)" },
  memory_aurora:    { back: "#7cf7c4", back2: "#4fc3f7" },
  memory_neon:      { back: "#22e5a5", back2: "#ff5c8a" },
  memory_obsidian:  { back: "#3a3f5c", back2: "#9aa8c1" },
  memory_vortex:    { back: "#c98bff", back2: "#4fc3f7" },
  ttt_aurora:      { x: "#7cf7c4", o: "#c98bff" },
  ttt_plasma:      { x: "#c98bff", o: "#ff5c8a" },
  ttt_obsidian:    { x: "#9aa8c1", o: "#ffd166" },
  ttt_vortex:      { x: "#c98bff", o: "#4fc3f7" },
  /* اسکین‌های بیشتر — تم‌های جدید برای تنوع بیشتر */
  sniper_eclipse:    { scope: "#ff4d4d", trail: "rgba(255,77,77,.85)" },
  car_comet:         { body: "#a0c4ff", glow: "rgba(160,196,255,.6)" },
  hero_valkyrie:     { skin: "#ffd700", hat: "#ffffff" },
  tower_glacier:     { color: "#a0e8ff", shot: "rgba(160,232,255,.9)" },
  snake_ruby:        { head: "#e0245e", body: "#ff4d6d", glow: "rgba(224,36,94,.6)" },
  g2048_sunset:      { bg: "#3a2a4a", tile: "#ff8c5a", high: "#ffb367" },
  mines_emerald:     { bg: "#1a3a2a", safe: "#234a3a", flag: "#2ecc71" },
  breakout_sapphire: { paddle: "#3a7bd5", brick: "#5a9fff", ball: "#ffffff" },
  hoops_comet:       { ball: "#a0c4ff", trail: "rgba(160,196,255,.8)" },
  shooter_meteor:    { ship: "#ff6a3a", bullet: "#ffaa5a" },
  penalty_star:      { ball: "#fff4b0", glow: "rgba(255,244,176,.85)" },
  headball_star:     { ball: "#fff4b0", trail: "rgba(255,244,176,.8)" },
  maze_ruby:         { wall: "#e0245e", player: "#ff4d6d", exit: "#ffd700" },
  connect4_emerald:  { p1: "#2ecc71", p2: "#58d68a", board: "#1a3a2a" },
  drive_comet:       { body: "#a0c4ff", glow: "rgba(160,196,255,.65)" },
  memory_sunset:     { back: "#ff8c5a", back2: "#ffb367" },
  ttt_sapphire:      { x: "#3a7bd5", o: "#5a9fff" }
};
const GAME_SKIN_DEFAULTS = { sniper: "sniper_default", car: "car_default", hero: "hero_default", tower: "tower_default", snake: "snake_default", g2048: "g2048_default", mines: "mines_default", breakout: "breakout_default", hoops: "hoops_default", shooter: "shooter_default", penalty: "penalty_default", headball: "headball_default", maze: "maze_default", connect4: "connect4_default", drive: "drive_default", memory: "memory_default", tictactoe: "tictactoe_default" };
function migrateAiLegacy() {
  try {
    const raw = JSON.parse(localStorage.getItem("lumitek_profile_v5") || "null");
    if (!raw) return;
    let changed = false;
    if ((raw.aiCredits || 0) > 0) { raw.coins = (raw.coins || 0) + raw.aiCredits * 2; raw.aiCredits = 0; changed = true; }
    if (raw.aiUnlimitedUntil && raw.aiUnlimitedUntil > Date.now()) {
      const days = Math.ceil((raw.aiUnlimitedUntil - Date.now()) / 86400000);
      raw.coins = (raw.coins || 0) + days * 12; raw.aiUnlimitedUntil = 0; changed = true;
    }
    if (changed) localStorage.setItem("lumitek_profile_v5", JSON.stringify(raw));
  } catch (e) {}
}
migrateAiLegacy();

function equippedSkin(kind) {
  const p = getProfile();
  const eq = p["equipped_" + kind];
  if (eq && p.inventory && p.inventory.indexOf(eq) !== -1 && GAME_SKINS[eq]) return eq;
  return GAME_SKIN_DEFAULTS[kind] || "default";
}

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
  neon:     { a: "#00e5ff", b: "#b2ff59" },
  cherry:   { a: "#ff5c8a", b: "#ffb3c8" },
  ice:      { a: "#a0e8ff", b: "#d0f0ff" },
  lavender: { a: "#c8b6ff", b: "#e0d4ff" },
  forest:   { a: "#2e7d4f", b: "#52a374" },
  berry:    { a: "#d946ef", b: "#f0a6d8" },
  desert:   { a: "#d4a373", b: "#e9c89a" }
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
  { id: "hill_1000",   icon: "⛰️", fa: "تپه‌نورد",           en: "Hill Climber",   faDesc: "۱۰۰۰ متر در تپه‌نورد رانندگی کن",   enDesc: "Drive 1000m in Hill Climb",    check: p => (p.bests.hill || 0) >= 1000 },
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
  range: "تیراندازی دقیق", runner: "دونده ماجراجویی", hill: "تپه‌نورد", hoops: "بسکتبال",
  memory: "حافظه", whack: "ضربه‌گیر",
  headball: "هدبال", headballGoals: "هدبال (گل‌ها)",

  c4Wins: "چهار در یک ردیف (بردها)", mazeSolves: "ماز (حل‌شده)", penaltyGoals: "پنالتی (گل‌ها)",

  simon: "سایمون", tileflip: "چراغ‌ها",
  hangman: "داربسته (جان)", hangmanWins: "داربسته (بردها)",
  guessnumber: "حدس عدد", rgrid: "شبکه واکنش"
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
  version: "0.1.3",
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
  gameSkins: GAME_SKINS,
  skin: equippedSkin,
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
    },
    isLocked: function () { return locked; }
  };
})();

/* ---------------- Game Over overlay (صفحه پایان حرفه‌ای برای همه بازی‌ها) ----------------
   پایان هر بازی حالا مثل بازی‌های واقعی نمایش داده می‌شود: برد یا باخت، امتیاز، جایزه و
   دکمه‌های «بازی دوباره» و «بستن». با نمایش این صفحه، قفل اسکرول هم خودکار برداشته می‌شود
   تا کاربر هیچ‌وقت در صفحه گیر نکند. */
/* Small bilingual helper used by game-over overlay calls: fa("English","فارسی") */
window.fa = function (en, faText) { return getLang() === "fa" ? faText : en; };
window.LumitekGameOver = (function () {
  var el = null, confettiTimer = null;

  function ensure() {
    if (el) return el;
    el = document.createElement("div");
    el.className = "lt-go";
    el.innerHTML =
      '<div class="lt-go-card">' +
      '  <div class="lt-go-burst" aria-hidden="true"></div>' +
      '  <div class="lt-go-emoji">🎮</div>' +
      '  <h2 class="lt-go-title">—</h2>' +
      '  <p class="lt-go-sub muted"></p>' +
      '  <div class="lt-go-stats"></div>' +
      '  <p class="lt-go-reward"></p>' +
      '  <div class="lt-go-actions">' +
      '    <button type="button" class="primary-btn lt-go-replay">↻ بازی دوباره</button>' +
      '    <button type="button" class="ghost-btn lt-go-close">بستن</button>' +
      '    <a class="ghost-btn lt-go-home" href="games.html">همه بازی‌ها</a>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(el);
    el.querySelector(".lt-go-close").addEventListener("click", hide);
    el.addEventListener("click", function (e) { if (e.target === el) hide(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && el.classList.contains("show")) hide();
    });
    return el;
  }

  function confetti() {
    var card = el.querySelector(".lt-go-card");
    var colors = ["#76e6c3", "#7ca7ff", "#ffc861", "#ff8fd4", "#b18cff"];
    for (var i = 0; i < 26; i++) {
      (function (i) {
        var c = document.createElement("i");
        c.className = "lt-go-confetti";
        c.style.background = colors[i % colors.length];
        c.style.left = (8 + Math.random() * 84) + "%";
        c.style.animationDelay = (Math.random() * .5) + "s";
        c.style.transform = "rotate(" + Math.random() * 360 + "deg)";
        card.appendChild(c);
        setTimeout(function () { c.remove(); }, 2600);
      })(i);
    }
  }

  function fixHref(a) {
    var inPages = /\/pages\//.test(location.pathname);
    if (inPages) a.href = "games.html";
    else a.href = "pages/games.html";
  }

  function show(opts) {
    opts = opts || {};
    var box = ensure();
    var fa = getLang() === "fa";
    var win = !!opts.win;
    box.querySelector(".lt-go-emoji").textContent = opts.emoji || (win ? "🏆" : "💀");
    box.querySelector(".lt-go-title").textContent = opts.title || (win ? (fa ? "آفرین! بردی 🎉" : "Victory! 🎉") : (fa ? "پایان بازی!" : "Game Over"));
    box.querySelector(".lt-go-sub").textContent = opts.sub || "";
    var stats = box.querySelector(".lt-go-stats");
    stats.innerHTML = "";
    (opts.stats || []).forEach(function (s) {
      var d = document.createElement("div");
      d.innerHTML = "<span></span><b></b>";
      d.querySelector("span").textContent = s[0];
      d.querySelector("b").textContent = s[1];
      stats.appendChild(d);
    });
    box.querySelector(".lt-go-reward").textContent = opts.reward || "";
    var replay = box.querySelector(".lt-go-replay");
    var newReplay = replay.cloneNode(true);
    replay.parentNode.replaceChild(newReplay, replay);
    newReplay.addEventListener("click", function () { hide(); if (opts.onRestart) opts.onRestart(); else location.reload(); });
    fixHref(box.querySelector(".lt-go-home"));
    box.querySelector(".lt-go-home").textContent = fa ? "همه بازی‌ها" : "All games";
    newReplay.textContent = fa ? "↻ بازی دوباره" : "↻ Play again";
    box.querySelector(".lt-go-close").textContent = fa ? "بستن" : "Close";
    box.classList.remove("win", "lose");
    box.classList.add("show", win ? "win" : "lose");
    try { window.GameScrollLock && GameScrollLock.unlock(); } catch (e) {}
    try { window.LumitekGameBar && document.documentElement.classList.remove("lt-paused"); } catch (e) {}
    if (win) confetti();
  }

  function hide() {
    if (!el) return;
    el.classList.remove("show");
    if (confettiTimer) { clearTimeout(confettiTimer); confettiTimer = null; }
  }

  return { show: show, hide: hide };
})();

/* ---------------- Game start centering (بازی موقع شروع دقیقا وسط صفحه) ----------------
   با زدن دکمه «شروع بازی» در هر بازی، صفحه به‌سمت بوم بازی اسکرول می‌شود تا
   بازی دقیقا وسط دید قرار بگیرد (آماده برای حالت تمام‌صفحه/قفل صفحه). */
document.addEventListener("click", function (e) {
  const gbtn = e.target.closest && e.target.closest("button.gamebutton, button[id$='Start'], button[id$='start']");
  if (!gbtn) return;
  const target = document.querySelector("canvas") || document.querySelector(".gamebox") || document.querySelector(".game");
  if (!target) return;
  setTimeout(function () {
    try {
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    } catch (err) {
      target.scrollIntoView(true);
      window.scrollBy(0, (window.innerHeight - target.getBoundingClientRect().height) / 3);
    }
  }, 60);
}, true);

/* ---------------- Universal Game Bar v1.2 — for ALL games ----------------
   هر بازی حالا یک نوار کنترل ثابت دارد: راهنما ❓ / توقف ⏸ / شروع دوباره ↻ / تمام‌صفحه ⛶
   توقف واقعی است: زمان (Date.now و performance.now) فریز می‌شود و
   setTimeout / setInterval / requestAnimationFrame صف می‌شوند — بدون دست‌زدن به کد بازی‌ها. */
window.LumitekGameBar = (function () {
  var paused = false;
  var _DateNow = Date.now.bind(Date);
  var _perfNow = performance.now.bind(performance);
  var dateOffset = 0, perfOffset = 0, frozenDate = 0, frozenPerf = 0;
  var pendingST = [], stSeq = 1, stMap = {};
  var rafQ = [];
  var _ST = window.setTimeout, _SI = window.setInterval, _CT = window.clearTimeout;
  var _RAF = window.requestAnimationFrame.bind(window);

  Date.now = function () { return paused ? frozenDate : _DateNow() + dateOffset; };
  performance.now = function () { return paused ? frozenPerf : _perfNow() + perfOffset; };

  window.setTimeout = function (fn, ms) {
    var args = Array.prototype.slice.call(arguments, 2);
    var id = stSeq++;
    var wrapped = function () {
      if (paused) { pendingST.push({ id: id, fn: fn, args: args }); return; }
      if (typeof fn === "function") fn.apply(null, args);
    };
    if (paused) { pendingST.push({ id: id, fn: fn, args: args }); return id; }
    stMap[id] = _ST(wrapped, ms);
    return id;
  };
  window.clearTimeout = function (id) {
    if (paused) {
      for (var i = pendingST.length - 1; i >= 0; i--) if (pendingST[i].id === id) pendingST.splice(i, 1);
    }
    if (stMap[id]) { _CT(stMap[id]); delete stMap[id]; }
  };
  window.setInterval = function (fn, ms) {
    var args = Array.prototype.slice.call(arguments, 2);
    var wrapped = function () {
      if (paused) return;
      if (typeof fn === "function") fn.apply(null, args);
    };
    return _SI(wrapped, ms);
  };
  window.requestAnimationFrame = function (cb) {
    if (paused) { rafQ.push(cb); return 0; }
    return _RAF(function (t) {
      if (paused) { rafQ.push(cb); return; }
      cb(t);
    });
  };

  function doPause() {
    if (paused) return;
    paused = true;
    frozenDate = _DateNow() + dateOffset;
    frozenPerf = _perfNow() + perfOffset;
    document.documentElement.classList.add("lt-paused");
  }
  function doResume() {
    if (!paused) return;
    paused = false;
    dateOffset = frozenDate - _DateNow();
    perfOffset = frozenPerf - _perfNow();
    var q = rafQ.slice(); rafQ.length = 0;
    q.forEach(function (cb) { _RAF(function (t) { cb(t); }); });
    var p = pendingST.slice(); pendingST.length = 0;
    p.forEach(function (o) {
      _ST(function () { if (typeof o.fn === "function") o.fn.apply(null, o.args); }, 0);
    });
    document.documentElement.classList.remove("lt-paused");
  }
  function isPaused() { return paused; }

  /* ---------- per-game help ---------- */
  var HELP = {
    snake:    { n: "🐍 بازی مار", fa: { goal: "سیب‌ها را بخور تا بزرگ‌تر شوی؛ به دیوار و بدن خودت نزن.", ctrl: "کلیدهای جهت‌نما یا WASD · موبایل: سوایپ روی زمین یا دکمه‌های لمسی", tip: "با هر سیب سرعت بیشتر می‌شود؛ از همان اول وسط زمین بازی کن.", xp: "تا ۱۶۰ XP و ۳۰ سکه" }, en: { goal: "Eat apples to grow; don't hit walls or yourself.", ctrl: "Arrow keys or WASD · Mobile: swipe on the board or on-screen pad", tip: "Each apple speeds you up; stay near the middle.", xp: "Up to 160 XP & 30 coins" } },
    g2048:    { n: "🔢 ۲۰۴۸", fa: { goal: "خانه‌های هم‌عدد را ترکیب کن و به کاشی ۲۰۴۸ برس.", ctrl: "کلیدهای جهت‌نما · موبایل: سوایپ در هر جهت", tip: "بزرگ‌ترین عدد را همیشه در یک گوشه نگه دار.", xp: "تا ۱۲۰ XP و ۲۵ سکه" }, en: { goal: "Merge equal tiles and reach 2048.", ctrl: "Arrow keys · Mobile: swipe", tip: "Keep your biggest tile in one corner.", xp: "Up to 120 XP & 25 coins" } },
    mines:    { n: "💣 مین‌یاب", fa: { goal: "با منطق خانه‌های امن را باز کن و همه مین‌ها را پرچم بزن.", ctrl: "کلیک = باز کردن · کلیک راست یا دکمه 🚩 = پرچم", tip: "عدد هر خانه یعنی تعداد مین‌های اطرافش؛ از خانه‌های قطعی شروع کن.", xp: "تا ۱۴۰ XP و ۳۰ سکه" }, en: { goal: "Open safe cells with logic and flag every mine.", ctrl: "Click = reveal · Right-click or 🚩 = flag", tip: "A number shows mines around it; start from certain cells.", xp: "Up to 140 XP & 30 coins" } },
    breakout: { n: "🧱 آجرشکن", fa: { goal: "با توپ همه آجرها را بشکن و توپ را نگذار پایین بیفتد.", ctrl: "حرکت ماوس یا کلیدهای چپ/راست · موبایل: کشیدن انگشت", tip: "زاویه برخورد با لبه‌های راکت تندتر است — با لبه بزن تا کنترل بهتری داری.", xp: "تا ۱۵۰ XP و ۳۵ سکه" }, en: { goal: "Break all bricks with the ball; don't drop it.", ctrl: "Mouse or ←/→ keys · Mobile: drag", tip: "Hitting with paddle edges gives sharper angles.", xp: "Up to 150 XP & 35 coins" } },
    puzzle15: { n: "🧮 پازل ۱۵", fa: { goal: "خانه‌ها را طوری جابه‌جا کن که ۱ تا ۱۵ مرتب شوند.", ctrl: "کلیک روی خانه کنار خالی یا کلیدهای جهت‌نما", tip: "اول سطر اول را کامل کن، بعد سطر دوم — مثل کتاب‌چیدن!", xp: "تا ۱۲۰ XP و ۲۵ سکه" }, en: { goal: "Slide tiles to order 1–15.", ctrl: "Tap a tile next to the gap or arrow keys", tip: "Solve the first row, then the second — like shelving books!", xp: "Up to 120 XP & 25 coins" } },
    wordguess:{ n: "📝 حدس کلمه", fa: { goal: "با حدس‌های محدود، کلمه مخفی را پیدا کن.", ctrl: "تایپ حروف با کیبورد یا کلیک روی حروف", tip: "حروف پرتکرار فارسی (ا، ر، ن، م) را اول امتحان کن.", xp: "تا ۱۱۰ XP و ۲۵ سکه" }, en: { goal: "Guess the hidden word before attempts run out.", ctrl: "Type letters or tap them", tip: "Try frequent letters first.", xp: "Up to 110 XP & 25 coins" } },
    memory:   { n: "🧠 بازی حافظه", fa: { goal: "جفت‌های یکسان را با کمترین حرکت پیدا کن.", ctrl: "کلیک روی کارت‌ها برای برگرداندن", tip: "محل کارت‌ها را با اسم بلند بگو — حافظه شنیداری قوی‌تر است!", xp: "تا ۱۰۰ XP و ۲۰ سکه" }, en: { goal: "Find all matching pairs with fewest moves.", ctrl: "Tap cards to flip", tip: "Say card positions out loud — audio memory helps!", xp: "Up to 100 XP & 20 coins" } },
    whack:    { n: "🔨 ضربه‌گیر", fa: { goal: "در ۳۰ ثانیه به موش‌ها بزن؛ سوسماری که بیاید نزن و از بمب دور بمان!", ctrl: "کلیک/لمس روی خانه‌ها", tip: "موش +۲ ، سوسمار −۳ و بمب −۲ — عجله نکن، درست بزن.", xp: "تا ۱۳۰ XP و ۳۰ سکه" }, en: { goal: "In 30s whack moles; avoid lizards and bombs!", ctrl: "Tap the cells", tip: "Mole +2, lizard −3, bomb −2 — aim before you tap.", xp: "Up to 130 XP & 30 coins" } },
    headball: { n: "⚽ هدبال", fa: { goal: "فوتبال تک‌به‌تک! ۵ گل بزن و برنده شو.", ctrl: "چپ/راست برای حرکت · بالا یا W برای پرش · Space یا دکمه ⚽ برای شوت · موبایل: دکمه‌های لمسی", tip: "بعد از پرش، شوت هوایی از بالای حریف رد می‌شود!", xp: "هر گل XP دارد؛ برد تا ۱۵۰ XP و ۴۰ سکه" }, en: { goal: "1v1 head football — score 5 goals to win.", ctrl: "←/→ move · ↑ or W jump · Space or ⚽ to kick · Mobile: on-screen buttons", tip: "Jump-then-kick sends the ball over your rival!", xp: "XP per goal; win up to 150 XP & 40 coins" } },
    shooter:  { n: "🚀 تیراندازی کیهانی", fa: { goal: "سفینه‌ها و شهاب‌ها را بزن و زنده بمان.", ctrl: "چپ/راست حرکت · Space شلیک · موبایل: دکمه‌های لمسی", tip: "به گروه‌ها شلیک کن تا با یک گلوله چندتایی بزنی.", xp: "تا ۱۶۰ XP و ۳۵ سکه" }, en: { goal: "Shoot ships & meteors and survive.", ctrl: "←/→ move · Space shoot · Mobile: on-screen buttons", tip: "Line up shots to hit groups.", xp: "Up to 160 XP & 35 coins" } },
    sniper:   { n: "🎯 تک‌تیرانداز", fa: { goal: "در هر مرحله هدف‌های متحرک را قبل از تمام‌شدن زمان بزن.", ctrl: "نشانه‌گیری با ماوس/لمس · کلیک = شلیک", tip: "هدف‌های کوچک امتیاز بیشتری دارند؛ آرام و دقیق بزن.", xp: "تا ۱۴۰ XP و ۳۰ سکه" }, en: { goal: "Hit moving targets before time runs out.", ctrl: "Aim with mouse/touch · Click to shoot", tip: "Small targets score more — slow and steady.", xp: "Up to 140 XP & 30 coins" } },
    range:    { n: "🎯 تیراندازی دقیق", fa: { goal: "با فاصله و باد حساب کن و مرکز هدف را بزن.", ctrl: "نشانه‌گیری و کلیک/لمس", tip: "جهت باد را با فلش پایین صفحه چک کن.", xp: "تا ۱۳۰ XP و ۳۰ سکه" }, en: { goal: "Mind distance & wind; hit the bullseye.", ctrl: "Aim and click/tap", tip: "Check the wind arrow each round.", xp: "Up to 130 XP & 30 coins" } },
    maze:     { n: "🌀 ماز", fa: { goal: "هرمز را در هزارتو پیدا کن و به خروجی برس.", ctrl: "کلیدهای جهت‌نما · موبایل: سوایپ یا دکمه‌های لمسی", tip: "دیوار سمت راست را دنبال کن — قانون کلاسیک خروج از هزارتو!", xp: "تا ۱۲۰ XP و ۲۵ سکه" }, en: { goal: "Find the exit of the maze.", ctrl: "Arrow keys · Mobile: swipe or pad", tip: "Follow the right wall — the classic maze trick!", xp: "Up to 120 XP & 25 coins" } },
    connect4: { n: "🔴 چهار در یک ردیف", fa: { goal: "چهار مهره خودت را در یک خط قرار بده — ردیف، ستون یا قطر.", ctrl: "کلیک روی ستون برای انداختن مهره", tip: "وسط صفحه ارزشمندترین خانه است؛ اول آن را بگیر.", xp: "تا ۱۲۰ XP و ۲۵ سکه" }, en: { goal: "Line up four of your discs — row, column or diagonal.", ctrl: "Click a column to drop", tip: "The centre column is gold — take it early.", xp: "Up to 120 XP & 25 coins" } },
    tictactoe:{ n: "❌ دوز", fa: { goal: "سه علامت در یک ردیف بچین و ربات را شکست بده.", ctrl: "کلیک روی خانه‌ها", tip: "گوشه‌ها را اول بگیر؛ اگر ربات وسط رفت، جایش را قفل کن.", xp: "تا ۹۰ XP و ۲۰ سکه" }, en: { goal: "Get three in a row against the bot.", ctrl: "Tap the cells", tip: "Take corners first.", xp: "Up to 90 XP & 20 coins" } },
    drive:    { n: "🏎️ بزرگراه", fa: { goal: "بین ماشین‌ها رد شو و مسافت بیشتری طی کن.", ctrl: "چپ/راست برای تغییر لاین · موبایل: لمس دو سمت صفحه", tip: "لاین وسط بیشترین جای مانور را دارد.", xp: "تا ۱۵۰ XP و ۳۵ سکه" }, en: { goal: "Dodge traffic and go as far as you can.", ctrl: "←/→ to change lane · Mobile: tap sides", tip: "Middle lane gives the most room.", xp: "Up to 150 XP & 35 coins" } },
    hill:     { n: "⛰️ تپه‌نورد", fa: { goal: "بنزین کم نیاور و تا دورترین نقطه پیش برو.", ctrl: "چپ/راست = گاز و ترمز · موبایل: دکمه‌های لمسی", tip: "در سرپایینی گاز بده و در پرش تعادل را با کلیدها حفظ کن.", xp: "تا ۱۵۰ XP و ۳۵ سکه" }, en: { goal: "Don't run out of fuel; travel far.", ctrl: "←/→ gas & brake · Mobile: pad", tip: "Gas downhill; balance in mid-air.", xp: "Up to 150 XP & 35 coins" } },
    adventure:{ n: "🗺️ شکار گنج", fa: { goal: "گنج‌ها را جمع کن و از خطرها فرار کن.", ctrl: "کلیدهای جهت‌نما · موبایل: دکمه‌های لمسی", tip: "اول نقشه را بگرد تا جای گنج‌ها را حفظ شوی.", xp: "تا ۱۴۰ XP و ۳۰ سکه" }, en: { goal: "Collect treasures and avoid dangers.", ctrl: "Arrow keys · Mobile: pad", tip: "Memorize treasure spots first.", xp: "Up to 140 XP & 30 coins" } },
    island:   { n: "🏝️ جزیره گنج", fa: { goal: "در جزیره بگرد، سکه جمع کن و از تله‌ها جان سالم ببر.", ctrl: "کلیدهای جهت‌نما · موبایل: دکمه‌های لمسی", tip: "لبه‌های نقشه معمولاً امن‌ترند.", xp: "تا ۱۴۰ XP و ۳۰ سکه" }, en: { goal: "Explore the island, grab coins, dodge traps.", ctrl: "Arrow keys · Mobile: pad", tip: "Map edges are usually safer.", xp: "Up to 140 XP & 30 coins" } },
    runner:   { n: "🏃 دونده ماجراجویی", fa: { goal: "مانع‌ها را بپر و تا دورترین مسافت بدو.", ctrl: "Space/بالا = پرش · پایین = سُرخوردن · موبایل: لمس صفحه", tip: "قبل از مانع بپر نه داخلش؛ ریتم بگیر.", xp: "تا ۱۳۰ XP و ۳۰ سکه" }, en: { goal: "Jump obstacles and run far.", ctrl: "Space/↑ jump · ↓ slide · Mobile: tap", tip: "Jump before the obstacle, not into it.", xp: "Up to 130 XP & 30 coins" } },
    penalty:  { n: "⚽ ضربات پنالتی", fa: { goal: "پنالتی‌ها را گل کن و دروازه را هم نگه دار.", ctrl: "جهت را انتخاب کن و کلیک/لمس بزن — هم شوت هم فای", tip: "دروازه‌بان به الگوی ضربه‌های قبلی‌ات گوش می‌دهد؛ الگو را عوض کن.", xp: "تا ۱۳۰ XP و ۳۰ سکه" }, en: { goal: "Score penalties and save them too.", ctrl: "Pick a direction and tap — shoot & save", tip: "The keeper reads your pattern; vary your shots.", xp: "Up to 130 XP & 30 coins" } },
    hoops:    { n: "🏀 بسکتبال", fa: { goal: "در زمان محدود تا جایی که می‌توانی امتیاز بگیر.", ctrl: "کشیدن انگشت/ماوس برای پرتاب (زاویه و قدرت)", tip: "زاویه ۴۵ درجه و قدرت متوسط = بیشترین شانس گل.", xp: "تا ۱۳۰ XP و ۳۰ سکه" }, en: { goal: "Score as many baskets as you can in time.", ctrl: "Drag to shoot (angle & power)", tip: "45° with medium power scores most.", xp: "Up to 130 XP & 30 coins" } },
    td:       { n: "🗼 برج دفاعی", fa: { goal: "با چیدن برج‌ها، مانع عبور موج‌های دشمن شو.", ctrl: "برج را انتخاب و روی زمین بچین · دکمه موج برای شروع", tip: "برج را در پیچ‌های مسیر بچین تا دشمن بیشتر زیر آتش بماند.", xp: "تا ۱۶۰ XP و ۳۵ سکه" }, en: { goal: "Place towers to stop enemy waves.", ctrl: "Pick a tower, place it, start the wave", tip: "Towers at path corners cover more ground.", xp: "Up to 160 XP & 35 coins" } },
    dragrace: { n: "🏁 مسابقه شتاب", fa: { goal: "در تعویض دنده‌های دقیق، حریف را شکست بده.", ctrl: "در نوار سبز دنده عوض کن — کلیک یا Space", tip: "تعویض داخل نوار سبز = بوست؛ عجله باعث دنده‌خوردن می‌شود.", xp: "تا ۱۳۰ XP و ۳۰ سکه" }, en: { goal: "Shift gears perfectly and beat the rival.", ctrl: "Shift inside the green zone — click or Space", tip: "Perfect shifts give boost; early shifts grind.", xp: "Up to 130 XP & 30 coins" } },
    reaction: { n: "⚡ آزمون واکنش", fa: { goal: "به‌محض سبز شدن صفحه سریع کلیک کن.", ctrl: "کلیک/لمس صفحه", tip: "مکث کن و نفس بگیر — ضدزنگ زدن بهتر از زودزدن است.", xp: "تا ۹۰ XP و ۲۰ سکه" }, en: { goal: "Click the moment the screen turns green.", ctrl: "Tap the screen", tip: "Anticipation is false-starting — react, don't guess.", xp: "Up to 90 XP & 20 coins" } },
    numberrush:{ n: "🎯 مسابقه اعداد", fa: { goal: "اعداد را به‌ترتیب و سریع پیدا کن.", ctrl: "کلیک/لمس اعداد", tip: "چشم را از مرکز شل نکن؛ ردیف پایین را با چشم کناری پوشش بده.", xp: "تا ۱۰۰ XP و ۲۰ سکه" }, en: { goal: "Tap numbers in order, fast.", ctrl: "Tap the numbers", tip: "Scan in rows; use peripheral vision.", xp: "Up to 100 XP & 20 coins" } },
    colortap: { n: "🟦 رنگ‌یار", fa: { goal: "فقط دکمه رنگ درست را بزن — سرعت فزاینده!", ctrl: "کلیک/لمس", tip: "اسم رنگ را بخوان نه رنگ قبلی را؛ مغزت را گول نزن.", xp: "تا ۱۰۰ XP و ۲۰ سکه" }, en: { goal: "Tap only the correct color — ever faster!", ctrl: "Tap the right button", tip: "Read the word, ignore the old color.", xp: "Up to 100 XP & 20 coins" } },
    quickmath:{ n: "🔢 ریاضی سریع", fa: { goal: "در وقت محدود بیشترین جواب درست را بزن.", ctrl: "تایپ یا انتخاب گزینه", tip: "ضرب‌های ۵ و ۹ را حفظ باش — بیشترین تکرار آنجاست.", xp: "تا ۱۱۰ XP و ۲۵ سکه" }, en: { goal: "Answer as many as you can in time.", ctrl: "Type or pick an option", tip: "Memorize ×5 and ×9 patterns.", xp: "Up to 110 XP & 25 coins" } },
    sequence: { n: "🧩 ترتیب", fa: { goal: "ترتیب چراغ‌ها را حفظ کن و تکرارش کن.", ctrl: "کلیک/لمس دکمه‌ها", tip: "هر چراغ را با یک کلمه یادداشت کن؛ حلقه ذهنی بساز.", xp: "تا ۱۲۰ XP و ۲۵ سکه" }, en: { goal: "Memorize and repeat the light sequence.", ctrl: "Tap the pads", tip: "Name each pad aloud; build a mental loop.", xp: "Up to 120 XP & 25 coins" } }
  };

  function buildBar(gameId) {
    var bar = document.createElement("div");
    bar.className = "lt-gamebar";
    bar.innerHTML =
      '<button type="button" class="lt-gb-btn lt-gb-help" title="راهنما / Help">❓<span class="lt-gb-lbl">راهنما</span></button>' +
      '<button type="button" class="lt-gb-btn lt-gb-pause" title="توقف / ادامه"><span class="lt-gb-ico">⏸</span><span class="lt-gb-lbl">توقف</span></button>' +
      '<button type="button" class="lt-gb-btn lt-gb-restart" title="شروع دوباره">↻<span class="lt-gb-lbl">دوباره</span></button>' +
      '<button type="button" class="lt-gb-btn lt-gb-fs" title="تمام‌صفحه">⛶<span class="lt-gb-lbl">تمام‌صفحه</span></button>';
    document.body.appendChild(bar);

    var veil = document.createElement("div");
    veil.className = "lt-pause-veil";
    veil.innerHTML = '<div class="lt-pause-card"><div class="lt-pause-ico">⏸</div>' +
      '<h3>' + (getLang() === "fa" ? "بازی متوقف شد" : "Game Paused") + '</h3>' +
      '<p class="muted">' + (getLang() === "fa" ? "زمان بازی فریز شده — هر وقت آماده بودی ادامه بده." : "Game time is frozen — resume whenever you're ready.") + '</p>' +
      '<button type="button" class="primary-btn lt-pause-resume">▶ ' + (getLang() === "fa" ? "ادامه بازی" : "Resume") + '</button>' +
      '<button type="button" class="ghost-btn lt-pause-restart">↻ ' + (getLang() === "fa" ? "شروع دوباره" : "Restart") + '</button></div>';
    document.body.appendChild(veil);

    var help = document.createElement("div");
    help.className = "modal lt-help-modal";
    help.innerHTML = '<div class="modal-card modal-small lt-help-card">' +
      '<button class="modal-close lt-help-close">×</button>' +
      '<div class="lt-help-head"><span class="lt-help-emoji">🎮</span><h3 class="lt-help-title"></h3></div>' +
      '<div class="lt-help-sec"><b>🎯 ' + (getLang() === "fa" ? "هدف" : "Goal") + '</b><p class="lt-help-goal"></p></div>' +
      '<div class="lt-help-sec"><b>🎮 ' + (getLang() === "fa" ? "کنترل‌ها" : "Controls") + '</b><p class="lt-help-ctrl"></p></div>' +
      '<div class="lt-help-sec"><b>💡 ' + (getLang() === "fa" ? "نکته حرفه‌ای" : "Pro tip") + '</b><p class="lt-help-tip"></p></div>' +
      '<div class="lt-help-sec lt-help-xprow"><b>🎁 ' + (getLang() === "fa" ? "جایزه" : "Reward") + '</b><p class="lt-help-xp"></p></div>' +
      '<p class="muted lt-help-note">⏸ ' + (getLang() === "fa" ? "هر وقت بخواهی با دکمه توقف در پایین صفحه بازی را نگه دار — کلید P هم کار می‌کند." : "Pause anytime with the button at the bottom — the P key works too.") + '</p>' +
      '</div>';
    document.body.appendChild(help);

    var nativeSel = document.body.getAttribute("data-native-pause");
    var pauseBtn = bar.querySelector(".lt-gb-pause");

    function setPausedUI(on) {
      pauseBtn.querySelector(".lt-gb-ico").textContent = on ? "▶" : "⏸";
      pauseBtn.querySelector(".lt-gb-lbl").textContent = on ? (getLang() === "fa" ? "ادامه" : "Resume") : (getLang() === "fa" ? "توقف" : "Pause");
      if (!nativeSel) veil.classList.toggle("show", on);
    }

    function togglePause() {
      if (nativeSel) {
        var native = document.querySelector(nativeSel);
        if (native) native.click();
        return;
      }
      if (paused) doResume(); else doPause();
      setPausedUI(paused);
    }

    pauseBtn.addEventListener("click", togglePause);
    veil.querySelector(".lt-pause-resume").addEventListener("click", togglePause);
    veil.querySelector(".lt-pause-restart").addEventListener("click", function () { location.reload(); });

    bar.querySelector(".lt-gb-restart").addEventListener("click", function () { location.reload(); });
    bar.querySelector(".lt-gb-fs").addEventListener("click", function () {
      var el = document.querySelector(".game .gamebox") || document.querySelector(".gamebox") || document.documentElement;
      try {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      } catch (e) {}
    });
    bar.querySelector(".lt-gb-help").addEventListener("click", function () { openHelp(); });

    function fillHelp() {
      var h = HELP[gameId] || null;
      var lang = getLang() === "fa" ? "fa" : "en";
      var d = h ? h[lang] : null;
      help.querySelector(".lt-help-title").textContent = h ? h.n : (getLang() === "fa" ? "این بازی" : "This game");
      help.querySelector(".lt-help-goal").textContent = d ? d.goal : (lang === "fa" ? "روی دکمه شروع بزن و با کنترل‌ها بازی کن." : "Press start and play with the controls.");
      help.querySelector(".lt-help-ctrl").textContent = d ? d.ctrl : (lang === "fa" ? "کلیدهای جهت‌نما و کلیک/لمس." : "Arrow keys, click or touch.");
      help.querySelector(".lt-help-tip").textContent = d ? d.tip : "";
      help.querySelector(".lt-help-xp").textContent = d ? d.xp : "";
      var em = (h && h.n) ? h.n.split(" ")[0] : "🎮";
      help.querySelector(".lt-help-emoji").textContent = em;
    }
    function openHelp() { fillHelp(); help.classList.add("show"); }

    help.querySelector(".lt-help-close").addEventListener("click", function () { help.classList.remove("show"); });
    help.addEventListener("click", function (e) { if (e.target === help) help.classList.remove("show"); });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && help.classList.contains("show")) { help.classList.remove("show"); return; }
      var t = e.target && e.target.tagName;
      if (t === "INPUT" || t === "TEXTAREA") return;
      if (e.key === "p" || e.key === "P" || e.key === "چ") { e.preventDefault(); togglePause(); }
    });
    /* بازی‌هایی که پاز داخلی دارند (مثل کشورگشایی) وضعیتشان را به نوار خبر می‌دهند */
    document.addEventListener("lumitek:nativepause", function (e) {
      setPausedUI(!!(e.detail && e.detail.paused));
    });
    document.addEventListener("lumitek:langchange", function () {
      setPausedUI(paused);
      if (help.classList.contains("show")) fillHelp();
    });

    /* راهنمای کوچک اولین بار */
    try {
      var seen = parseInt(localStorage.getItem("lumitek_gamebar_hint") || "0", 10);
      if (seen < 3) {
        bar.classList.add("hinting");
        setTimeout(function () { bar.classList.remove("hinting"); }, 6500);
        localStorage.setItem("lumitek_gamebar_hint", String(seen + 1));
      }
    } catch (e) {}
  }

  function init() {
    var box = document.querySelector(".game .gamebox") || document.querySelector(".gamebox");
    var gamePane = document.querySelector(".game");
    var isGame = document.body.hasAttribute("data-game") || (gamePane && (box || gamePane.querySelector("canvas")));
    if (!isGame) return;
    var id = document.body.getAttribute("data-game") || (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
    if (id === "1") id = (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
    id = id.replace(/-/g, ""); /* quick-math → quickmath */
    buildBar(id);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  return { pause: doPause, resume: doResume, isPaused: isPaused };
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
  else if (GAME_SKIN_DEFAULTS[item.type]) p["equipped_" + item.type] = (p["equipped_" + item.type] === id ? "" : id);
  else if (item.type === "boost") return { ok: false, msg: T("m.boostAuto") };
  saveProfile(p);
  applyAccent();
  return { ok: true, msg: T("m.applied") };
}

/* ---------------- Lumitek AI access engine (سکه / اعتبار / نامحدود) ---------------- */
function aiAccessMode() { return "coins"; }
function aiCanAsk() {
  return getProfile().coins >= AI_QUESTION_COST;
}
function aiConsumeQuestion() {
  const p = getProfile();
  const mode = "coins";
  if (spendCoins(AI_QUESTION_COST)) return { ok: true, mode: "coins" };
  return { ok: false };
}
function aiRefund(mode) {
  if (mode === "coins") {
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

function buyPackage(id) {
  const pkg = COIN_PACKAGES.filter(function(x){ return x.id === id; })[0];
  if (!pkg) return { ok: false };
  const fa = getLang() === "fa";
  openCheckout({
    icon: pkg.icon,
    title: fa ? pkg.name.fa : pkg.name.en,
    desc: (fa ? "شارژ " : "Top-up: ") + pkg.coins.toLocaleString(fa ? "fa-IR" : "en-US") + " 🪙",
    amount: pkg.price,
    productId: pkg.id,
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
    productId: "vip-30",
    successText: fa ? "اشتراک VIP شما فعال شد." : "Your VIP subscription is active.",
    onSuccess: function () {
      applyVipPurchase();
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
  const signedOut = window.LumiAuth ? !window.LumiAuth.currentUser() : false;
  document.querySelectorAll("[data-profile-name]").forEach(function(el){
    el.textContent = signedOut ? (getLang() === "fa" ? "ورود / ثبت‌نام" : "Sign in / Up") : p.name;
  });
  document.querySelectorAll("#profileButton").forEach(function(el){ el.classList.toggle("signedout", signedOut); });
  document.querySelectorAll("[data-profile-level]").forEach(function(el){ el.textContent = p.level; });
  document.querySelectorAll("[data-profile-xp]").forEach(function(el){ el.textContent = p.xp; });
  document.querySelectorAll("[data-profile-coins]").forEach(function(el){ el.textContent = p.coins.toLocaleString(getLang() === "fa" ? "fa-IR" : "en-US"); });
  document.querySelectorAll("[data-games-played]").forEach(function(el){ el.textContent = p.gamesPlayed; });
  document.querySelectorAll("[data-profile-avatar]").forEach(function(el){ el.textContent = signedOut ? "👤" : p.avatar; });
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
    else if (fa.indexOf(q) === 0 || en.indexOf(q) === 0) s = 85;
    else if (fa.indexOf(q) !== -1 || en.indexOf(q) !== -1) s = 70;
    else {
      var words = q.split(" ").filter(function(w){ return w.length > 1; });
      var all = fa + " " + en;
      var hit = 0;
      words.forEach(function(w) { if (w && all.indexOf(w) !== -1) hit++; });
      if (hit === words.length && words.length > 0) s = 60;
      else if (hit > 0) s = 30 * hit / Math.max(1, words.length);
      else {
        /* تطبیق فازی: هر کاراکتر q به‌ترتیب در متن موجود باشد */
        var sources = [fa, en];
        for (var si = 0; si < sources.length; si++) {
          var src = sources[si];
          var qi = 0;
          for (var ci = 0; ci < src.length && qi < q.length; ci++) {
            if (src[ci] === q[qi]) qi++;
          }
          if (qi === q.length && q.length >= 3) { s = Math.max(s, 25 + qi * 3); break; }
        }
        /* تطبیق پیشوندی برای زیررشته‌ها */
        if (s === 0 && q.length >= 2) {
          for (var k = 0; k < sources.length; k++) {
            var src2 = sources[k];
            for (var p = 0; p <= src2.length - q.length; p++) {
              var slice = src2.substr(p, q.length);
              var same = 0;
              for (var r = 0; r < q.length; r++) if (slice[r] === q[r]) same++;
              if (same >= Math.ceil(q.length * 0.7)) { s = Math.max(s, 15 + same * 2); break; }
            }
            if (s > 0) break;
          }
        }
      }
    }
    if (s > 0 && (item[3] === "ابزار" || item[3] === "بازی")) s += 4;
    return s;
  }

  function mark(text, q) {
    var plain = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    var nq = searchNormalize(q);
    if (!nq) return plain;
    var normText = searchNormalize(text);
    var idx = normText.indexOf(nq);
    if (idx !== -1) {
      return plain.slice(0, idx) + "<mark>" + plain.slice(idx, idx + q.length) + "</mark>" + plain.slice(idx + q.length);
    }
    /* اگر تطبیق مستقیم نبود، کلمات را مارک کن */
    var words = q.split(" ").filter(function(w){ return w.length > 1; });
    var result = plain;
    words.forEach(function(w) {
      var nw = searchNormalize(w);
      var pos = 0;
      while (true) {
        var npos = searchNormalize(result.slice(pos)).indexOf(nw);
        if (npos === -1) break;
        var realPos = pos + npos;
        result = result.slice(0, realPos) + "<mark>" + result.slice(realPos, realPos + w.length) + "</mark>" + result.slice(realPos + w.length);
        pos = realPos + w.length + 11; /* 11 = طول <mark></mark> */
      }
    });
    return result;
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
      .slice(0, 16)
      .map(function(x) { return x[1]; });

    var tagIcon = { "ابزار": "🧰", "بازی": "🎮", "بخش": "📦", "جدول": "🏆", "مقاله": "📚", "فروشگاه": "🛍️", "هوش مصنوعی": "✨", "خبر": "📰", "ورزش": "🏆" };
    if (!matches.length) {
      results.innerHTML = '<div class="search-empty">' + T("m.searchEmpty") + '</div>' +
        '<div class="search-hint">' + (getLang() === "fa"
          ? '💡 کلمه‌های کوتاه‌تر یا مرتبط امتحان کن — یا از <a href="pages/games.html">بازی‌ها</a> و <a href="pages/tools.html">ابزارها</a> شروع کن.'
          : '💡 Try shorter or related words — or start from <a href="pages/games.html">Games</a> and <a href="pages/tools.html">Tools</a>.') + '</div>';
    } else {
      matches.forEach(function(x, i) {
        const a = document.createElement("a");
        a.href = resolveSearchHref(x[2]);
        a.setAttribute("data-idx", i);
        var tag = x[3] || "";
        var icon = tagIcon[tag] || "•";
        a.innerHTML = '<span class="sr-tag">' + icon + " " + tag + '</span><strong class="sr-title"></strong><span class="sr-sub"></span>';
        a.querySelector(".sr-title").innerHTML = mark(x[0], input.value.trim());
        a.querySelector(".sr-sub").textContent = x[1];
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
      else if (items.length) { e.preventDefault(); items[0].click(); }
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
    if (window.LumiAuth && !window.LumiAuth.currentUser() && typeof window.LumiAuth.openModal === "function") {
      window.LumiAuth.openModal();
      return;
    }
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
  {
    v: "0.2.1",
    fa: "نسخه ۰٫۲٫۱: چرخش بی‌وقفه بازی‌ها، موج‌های پیوسته، جست‌وجو فقط در صفحه اصلی و پانوشت تمیزتر",
    en: "Version 0.2.1: seamless game rotation, solid waves, search on the homepage only and a cleaner footer",
    items: {
      fa: [
        "چرخش کارت‌های بازی در صفحه اصلی به یک حلقه بی‌نهایت بدون پرش تبدیل شد؛ تکرار حرکت برای بازدیدکننده محسوس نیست",
        "کارت‌های «بازی‌های محبوب لومیتک» اکنون در یک ردیف یکپارچه نمایش داده می‌شوند و همه بازی‌ها را با چرخشی آرام و پیوسته نشان می‌دهند",
        "خطوط موج بالای بخش اول صفحه اصلی بازطراحی شد؛ تعداد خطوط بیشتر شد، خط‌چین حذف و خطوط پیوسته با درخشش نرم جایگزین شد",
        "در بخش «امکانات» صفحه اصلی، عبارت «اخبار» به «اخبار دیجیتال» تغییر کرد",
        "در صفحه مقالات، بین کادر «نسخه پی‌دی‌اف مقاله‌ها» و بخش «آموزش‌های گام‌به‌گام» فاصله مناسبی اضافه شد",
        "در پانوشت همه صفحه‌ها، پیوند «اخبار دیجیتال» بدون ایموجی نمایش داده می‌شود",
        "بخش «فناوری» از پانوشت همه صفحه‌ها حذف شد",
        "بخش جست‌وجوی سایت اکنون تنها در صفحه اصلی نمایش داده می‌شود",
        "متن معرفی نسخه ۰٫۲٫۰ در تغییرات نسخه‌ها اصلاح شد"
      ],
      en: [
        "The game-card rotation on the homepage became a seamless infinite loop — the repetition is invisible to visitors",
        "The Popular Games cards are now shown in one continuous row, presenting every game with a calm, endless rotation",
        "The wave lines above the first homepage section were rebuilt: more lines, no dashes — solid strokes with a soft glow",
        "In the homepage Features rotator, the News item was renamed to Digital News",
        "On the Articles page, a comfortable gap was added between the PDF box and the Step-by-Step Tutorials section",
        "The Digital News link in the footer of every page is now shown without an emoji",
        "The Technology section was removed from the footer of all pages",
        "The site search section now appears only on the homepage",
        "The summary text of version 0.2.0 in the changelog was corrected"
      ]
    }
  },
  {
    v: "0.2.0",
    fa: "نسخه ۰٫۲٫۰: بازطراحی صفحه اصلی، بهبود پی‌دی‌اف مقاله‌ها و حذف امکانات اضافی",
    en: "Version 0.2.0: homepage redesign, better article PDFs and removal of unneeded features",
    items: {
      fa: [
        "گرافیک لوگوی صفحه اصلی بازطراحی شد؛ قاب و خطوط اضافه اطراف لوگو حذف و هاله نوری نرم جایگزین شد",
        "بالای بخش اول صفحه اصلی، خطوط موج‌دار دیجیتال متحرک اضافه شد تا حس دیجیتال بودن سایت در نگاه اول منتقل شود",
        "برچسب نسخه زیر لوگو اکنون فاصله مناسبی با لوگو دارد",
        "عددهای کوچک زیر دکمه «شروع تجربه» حذف شد؛ آمار تنها در بخش «اعداد، خودشان حرف می‌زنند» نمایان می‌شود",
        "در بخش آمار، دایره‌های رنگی حذف شد؛ خط رنگی اکنون کاملاً دور کل کادر هر آمار کشیده می‌شود",
        "کارت‌های بخش «بازی‌های محبوب» به صورت نوار متحرک و چرخان نمایان می‌شوند",
        "بج «زنده» بخش اسپورتک از بالای راست به بالای چپ کارت انتقال یافت",
        "منوی تنظیمات سایت به کلی حذف شد و هدر به حالت افقی استاندارد بازگشت",
        "آیکون کنار «پشتیبانی» در هدر حذف شد",
        "آیکون پشتیبانی شناور گوشه صفحه دوباره به ربات قبلی بازگشت و برچسب اضافه حذف شد",
        "مقاله‌ها دیگر نوار خبری چرخان ندارند; نوار از بخش مقالات حذف شد",
        "نوار پیشرفت مطالعه تنها در صفحه مقاله نمایان می‌شود و از صفحه اصلی حذف شد",
        "جایزه پنج سکه‌ای «خواندم و یاد گرفتم» از صفحه مقاله حذف شد",
        "دانلود پی‌دی‌اف مقاله‌ها اکنون ۵۰ سکه است",
        "طراحی فایل پی‌دی‌اف مقاله‌ها کاملاً حرفه‌ای شد؛ فونت پی‌دی‌اف با فونت سایت یکسان است (شبنم برای فارسی و Inter برای انگلیسی)",
        "در هدر صفحه اصلی، عبارت «ساخته‌شده برای» به «امکانات» تغییر کرد",
        "گزینه «دانلود کامل سورس» از صفحه دانلود حذف شد",
        "متن این تغییرات به سبک رسمی نوشته شده است"
      ],
      en: [
        "The homepage logo graphic was redesigned; the extra frame and lines around the logo were replaced with a soft glowing halo",
        "Animated digital wave lines were added to the top of the first homepage section to convey the digital feel of the site at first glance",
        "The version pill beneath the logo now keeps a comfortable distance from the logo",
        "The small numbers under the Start button were removed; stats appear only in the Numbers Speak for Themselves section",
        "In the stats section the colored circles were removed; the colored line now runs around the whole stat card",
        "The cards in the Popular Games section now move as rotating marquees",
        "The LIVE badge of the Sportek card moved from the top right to the top left",
        "The site settings menu was removed completely and the header returned to the standard horizontal layout",
        "The icon next to Support in the header was removed",
        "The floating support button in the corner is the friendly robot again and its text tag was removed",
        "Articles no longer show the rotating news ticker; the ticker was removed from the Articles section",
        "The reading progress bar now appears only on article pages, never on the homepage",
        "The read-and-learn five-coin reward was removed from article pages",
        "Article PDF downloads now cost 50 coins",
        "The article PDF design was rebuilt to a professional standard; the PDF uses the same fonts as the site (Shabnam for Persian, Inter for English)",
        "The Built-for label on the homepage was changed to Features",
        "The full source download option was removed from the download page",
        "These release notes were written in a formal tone"
      ]
    }
  },
  {
    v: "0.1.9",
    fa: "نسخه ۰٫۱٫۹: هدر یکدست در دو زبان، انتقال نوار خبری به بخش مقالات، پنل تنظیمات سایت و دانلود پی‌دی‌اف مقاله‌ها با سکه",
    en: "Version 0.1.9: a consistent header in both languages, the news ticker moved to Articles, a site settings panel and coin-based article PDF downloads",
    items: {
      fa: [
        "اندازه و چیدمان هدر در زبان‌های فارسی و انگلیسی یکدست و فشرده شد؛ همه بخش‌ها در یک ردیف منظم قرار می‌گیرند",
        "نوار خبری متحرک از صفحه اصلی حذف و به بخش مقالات منتقل شد؛ جای نوار دقیقاً زیر هدر است",
        "رنگ نوار خبری در پوسته روشن تیره‌تر شد تا خوانایی بهتری داشته باشد؛ پوسته تیره بدون تغییر ماند",
        "پیش‌نمایش داشبورد از صفحه اصلی حذف شد",
        "گرافیک لوگوی صفحه اصلی ساده و تمیز شد؛ حلقه‌های چرخان و نشان‌های اطراف آن حذف و یک قاب نوری ملایم جایگزین شد",
        "برچسب «حمایت» اکنون همیشه کنار قلب گوشه پایین صفحه نمایش داده می‌شود",
        "پنل «تنظیمات سایت» با دکمه چرخ‌دنده کنار حساب کاربری به هدر همه صفحه‌ها اضافه شد",
        "تنظیمات سایت شامل چیدمان هدر (افقی، عمودی راست، عمودی چپ یا خودکار)، اندازه متن، خاموش‌کردن انیمیشن‌ها و پنهان‌کردن نوار خبری است",
        "دانلود نسخه پی‌دی‌اف مقاله‌ها اضافه شد؛ هر پی‌دی‌اف با ۱۵ سکه فعال می‌شود و خرید در همان مرورگر برای همیشه باقی می‌ماند",
        "در صفحه حمایت مالی، سطح‌های طلایی و برنزی حذف شد؛ حمایت اکنون در سه روش ریالی، ارز خارجی (دلار و یورو) و رمزارز ارائه می‌شود",
        "در صفحه پشتیبانی، راهنمای ثبت تیکت و ارتباط با کارشناسان از طریق صفحه «تماس با ما» اضافه شد",
        "نام منبع «نارنجی» از فهرست رسانه‌های ایرانی اخبار دیجیتال حذف شد",
        "آیکون‌های بله و ایتا در پانوشت اکنون دقیقاً در وسط کادر خود قرار می‌گیرند",
        "آیکون کوچک تنظیمات کنار دکمه حساب کاربری در هدر نشست",
        "متن‌های تغییرات نسخه‌ها به سبک رسمی بازنویسی شد"
      ],
      en: [
        "The header is now compact and consistent in both Persian and English — every section sits in one tidy row",
        "The moving news ticker left the homepage and moved to the Articles section, placed exactly beneath the header",
        "The ticker received a darker shade in the light theme for better readability; the dark theme is unchanged",
        "The dashboard preview window was removed from the homepage",
        "The homepage logo graphic was cleaned up — the spinning rings and badges around it were replaced with a soft glowing frame",
        "The word “Donate” is now always displayed next to the heart in the bottom corner",
        "A “Site settings” panel joined the header of every page, via a gear button right next to the account button",
        "Settings include header layout (horizontal, vertical right, vertical left or automatic), text size, motion effects on/off and ticker on/off",
        "Article PDF downloads arrived: each PDF unlocks for 15 coins and the purchase is kept in the same browser forever",
        "On the donate page the gold and bronze tiers were removed; support is now offered as Rial, foreign currency (USD/EUR) or cryptocurrency",
        "The support page gained a formal guide for submitting tickets and reaching the team through the Contact Us page",
        "The “Narenji” source was removed from the Iranian digital-news sources list",
        "The Bale and Eitaa icons in the footer are now perfectly centered inside their boxes",
        "A small settings icon now sits beside the account button in the header",
        "All version changelog texts were rewritten in a formal tone"
      ]
    }
  },
  {
    v: "0.1.8",
    fa: "نسخه ۰٫۱٫۸: بازطراحی صفحه اصلی، اصلاح عنوان صفحه‌ها و تقویت اسپورتک",
    en: "Version 0.1.8: homepage redesign, corrected page titles and a stronger Sportek",
    items: {
      fa: [
        "انیمیشن نقطه‌های متحرک پس‌زمینه صفحه اصلی حذف شد؛ هاله‌های نرم و شفاف تنها افکت پس‌زمینه هستند",
        "لوگوی لومیتک در آغاز صفحه اصلی بزرگ و با یک انیمیشن تمیز نمایش داده می‌شود",
        "گالری بازی‌ها با کارت‌های گرادیانی جدید، نشان «محبوب»، فلش راهنما و افکت درخشش بازطراحی شد",
        "بخش «خرید سکه» به صفحه اصلی اضافه شد تا پکیج‌های سکه مستقیماً از صفحه اصلی به فروشگاه متصل شوند",
        "عنوان صفحه حمایت مالی اصلاح شد و دیگر «اخبار دیجیتال» نمایش داده نمی‌شود؛ پرسش‌های متداول آن نیز ترجمه شد",
        "ابزار اوقات شرعی و قطب‌نمای قبله از فهرست ابزارها حذف شد",
        "نام فارسی ابزارهای مبدل اعداد رومی، انعام و صورت‌حساب، تاس مجازی، سود مرکب، فشار خون، آب روزانه و سنجش قدرت رمز اصلاح شد؛ عنوان و توضیح چهار ابزار دیگر نیز درست شد",
        "آیکون صورتک با هدفون به دکمه پشتیبانی گوشه صفحه اضافه شد؛ برچسب «پشتیبانی» کنار آن و یک آیکون کوچک کنار گزینه «پشتیبانی» در هدر قرار گرفت",
        "برچسب «حمایت» کنار قلب گوشه پایین صفحه نمایش داده می‌شود",
        "رنگ پیوند «حمایت مالی» در هدر به حالت پیش‌فرض بازگشت و تنها با قرارگرفتن نشانگر ماوس صورتی‌قرمز می‌شود",
        "روبیکا از پانوشت حذف شد؛ بله و ایتا با نشان‌های هم‌اندازه، رنگی و بدون متن نمایش داده می‌شوند",
        "عنوان «تماس» در هدر و پانوشت به «تماس با ما» تغییر کرد",
        "نوار پیشرفت مطالعه مقاله‌ها اکنون دقیقاً زیر هدر و به‌صورت تمام‌عرض نمایش داده می‌شود",
        "اندازه هدر انگلیسی بهینه شد تا همه بخش‌ها در یک ردیف و در همه پنجره‌ها قابل مشاهده باشند",
        "اسپورتک گسترش یافت: برای کشتی، وزنه‌برداری، شنا، دو و میدانی، کبدی، شطرنج، واترپلو، تیراندازی با کمان، اسنوکر، ژیمناستیک و اسکی جدول اضافه شد؛ بیس‌بال، کریکت، گلف و اسکواش نیز اضافه شدند و شمار جدول‌ها به ۴۰ رسید",
        "نمایش ستون امتیاز در جدول رده‌بندی اسپورتک اصلاح شد",
        "چهار مقاله جدید اضافه شد: هنر پرامپت‌نویسی، ورود دو مرحله‌ای، کار عمیق و راهنمای خرید کامپیوتر؛ مجموعه مقاله‌ها اکنون ۶۰ عنوان است",
        "کارت‌های ابزارها و بازی‌ها گرافیک جدید گرفتند: نوار بالایی درخشان، هاله گوشه و جابه‌جایی نرم؛ سازگاری با گوشی و رایانه نیز بهتر شد"
      ],
      en: [
        "The moving background dots were removed from the homepage; the soft aurora blobs are the only background effect",
        "The Lumitek logo now opens the homepage large, with a clean animation",
        "The games gallery was redesigned with new gradient cards, a “Popular” badge, guiding arrows and a hover glow",
        "A “Buy coins” section joined the homepage, linking coin packs straight to the store",
        "The Donate page title was corrected — it no longer opens as “Digital News”; its FAQ is now fully translated",
        "The prayer-times tool and qibla compass were removed from the tools list",
        "Persian names were fixed for the Roman numeral converter, tip & bill, virtual dice, compound interest, blood pressure, water intake and password-strength tools; four more tools received correct titles and descriptions",
        "A mascot face with headphones was added to the corner support button; a “Support” label sits beside it and a small mascot icon sits next to “Support” in the header",
        "The word “Donate” is now displayed next to the heart button in the corner",
        "The header “Donate” link returned to its default color and only turns pink-red on hover",
        "Rubika was removed from the footer; Bale and Eitaa are shown as equal-sized, colored, text-free icons",
        "“Contact” in the header and footer was renamed to “Contact Us”",
        "The article reading progress bar is now displayed full-width directly beneath the header",
        "The English header was optimized so every section stays in one tidy row at all window sizes",
        "Sportek expanded: tables were added for wrestling, weightlifting, swimming, athletics, kabaddi, chess, water polo, archery, snooker, gymnastics and skiing; baseball, cricket, golf and squash joined — 40 tables in total",
        "The points column in the Sportek ranking table was fixed",
        "Four new articles joined the library: the art of prompting, two-factor sign-in, deep work and a PC buying guide — 60 articles in total",
        "Tool and game cards received new graphics: a glowing top bar, corner halo and smooth motion; responsiveness on phones and desktops improved"
      ]
    }
  },
  {
    v: "0.1.7",
    fa: "نسخه ۰٫۱٫۷: مدل جدید صفحه اصلی «آرورا» — پس‌زمینه ذرات ثابت، پنجره داشبورد شیشه‌ای، تیکر متحرک، بنتو گرید و گالری بازی‌ها",
    en: "Version 0.1.7: new \u201cAurora\u201d homepage model — live particle background, glassy dashboard window, moving tickers, bento grid and a games gallery",
    items: {
      fa: [
        "مدل صفحه اصلی کاملاً عوض شد: چیدمان جدید «آرورا» با هرو وسط‌چین، پس‌زمینه ذرات ثابت متصل به هم با واکنش به ماوس و رگباری‌های آبی/زرد/سبز",
        "پنجره داشبورد شیشه‌ای جدید جایگزین اورب شد: دموی چت هوش مصنوعی با حباب‌های متحرک، نمودار خودکشو، سکه و XP چرخان و بج زنده",
        "چرخش کلمات در هرو: ابزارها، بازی‌ها، مقالات، اخبار و هوش مصنوعی هر ۲ ثانیه عوض می‌شوند",
        "دو ردیف تیکر بی‌نهایت با جهت مخالف هم — ابزار، سکه، XP، اسپورتک، اخبار و... با لهجه‌های زرد و سبز",
        "بنتو گرید جدید با اندازه‌های متفاوت برای کارت‌ها + اسپات‌لایت دنبال‌کننده ماوس و تیلت سه‌بعدی",
        "آیکون‌های متحرک در هر کارت: شناور، چرخش سکه، بونس، لرزش، رینگ پالس و ریل ایموجی بازی‌ها",
        "گالری خودکار بازی‌ها با دو ردیف مخالف + توقف هنگام هاور و بزرگ‌نمایی کارت",
        "بخش «چرا لومیتک؟» با ۴ کاشی شیشه‌ای و رینگ‌های آماری SVG که هنگام اسکرول پر می‌شوند",
        "نوار پیشرفت اسکرول، ستاره‌های چشمک‌زن، هاله دنبال‌کننده ماوس، انیمیشن تایپ URL و FAQ دو ستونه",
        "رنگ‌بندی: آبی همچنان رنگ اصلی قالب + لهجه‌های زرد و سبز در بج‌ها، رینگ‌ها و کلمات کلیدی",
        "پشتیبانی کامل از حالت روشن، RTL/LTR، کاهش حرکت (accessibility) و موبایل"
      ],
      en: [
        "Homepage layout fully replaced: new \u201cAurora\u201d model with a centered hero, mouse-reactive constellation particle background and blue/yellow/green aurora blobs",
        "A glassy dashboard window replaces the orb: AI chat demo with animated bubbles, self-drawing chart, spinning coin & XP, LIVE badge",
        "Hero word rotator: Tools, Games, Articles, News and AI swap every ~2 seconds",
        "Two opposite-direction infinite tickers — Tools, Coins, XP, Sportek, News and more with yellow/green accents",
        "New bento grid with mixed card sizes + mouse-following spotlight and 3D tilt",
        "Animated icons in every card: float, coin flip, bounce, shake, ring pulse and a games emoji rail",
        "Auto-scrolling games gallery with two opposite rows + hover pause and card zoom",
        "New \u201cWhy Lumitek?\u201d glass tiles and SVG stat rings that fill on scroll",
        "Scroll progress bar, twinkling stars, cursor glow, URL typing animation and two-column FAQ",
        "Colors: blue stays the primary template color + yellow and green accents on badges, rings and keywords",
        "Full support for light mode, RTL/LTR, reduced-motion accessibility and mobile"
      ]
    }
  },
  {
    v: "0.1.5",
    fa: "نسخه ۰٫۱٫۵: حذف المان مستطیلی بالای صفحه اصلی، اصلاح کلیک ویجت حمایت، رنگ بله به سبز-آبی، آیکون پشتیبانی جدید",
    en: "Version 0.1.5: removed rectangular hero badge, fixed donate widget click, Bale blue-green color, new support icon",
    items: {
      fa: [
        "المان مستطیلی بالای صفحه اصلی (هیرو بج) حذف شد — حالا صفحه اصلی مستقیم با تیتر و توضیحات شروع می‌شود",
        "ویجت حمایت مالی پایین چپ اصلاح شد: کلیک روی آن حالا به‌درستی به صفحه‌ی «حمایت مالی» می‌رود (مشکل رفتن به صفحه‌ی اخبار دیجیتال حل شد) و متن «حمایت» دوباره نمایش داده می‌شود",
        "آیکون پشتیبانی گوشه راست پایین با یک طراحی کاملاً جدید جایگزین شد: یک دایره‌ی گرادیانی با علامت سوال سفید درون آن (به‌جای ربات قبلی)",
        "لینک «حمایت مالی» به هدر اضافه شد — حالا کنار «پشتیبانی» در هدر قرار دارد و دسترسی سریع به صفحه‌ی حمایت فراهم می‌کند",
        "رنگ بله در فوتر به سبز-آبی (#00B8A6) تغییر کرد — ایتا نارنجی (#EF7F1A) و روبیکا با SVG چندرنگ اصلی باقی ماند",
        "همه‌ی آیکون‌های شبکه‌های اجتماعی در فوتر هم‌اندازه شدند (۲۶×۲۶ پیکسل) و روبیکا دیگه کوچک‌تر نیست",
        "آپارات از فوتر حذف شده است",
        "هدر انگلیسی از لحاظ اندازه بهینه شد — تمام لینک‌ها در هر دو زبان فارسی و انگلیزی هم‌اندازه و همیشه قابل‌مشاهده",
        "کلمه‌ی نامفهوم «آیکون کنار تب مرورگر» در تغییرات نسخه‌ی ۰٫۱٫۴ با عبارت روشن «آیکون کنار تب مرورگر» جایگزین شد تا همه بفهمند"
      ],
      en: [
        "Removed the rectangular hero badge at the top of the homepage — the page now starts directly with the title and lead",
        "Donate widget at bottom-left fixed: clicking it now correctly navigates to the Donate page (the bug that sent it to Digital News is gone) and the \"Donate\" label is back",
        "Bottom-right support icon replaced with a brand new design: a gradient circle with a white question mark (replacing the previous robot)",
        "A \"Donate\" link was added to the header — now next to \"Support\" in the nav for quick access to the donate page",
        "Bale color in the footer changed to blue-green (#00B8A6) — Eitaa stays orange (#EF7F1A) and Rubika retains its original multicolor SVG",
        "All three social icons in the footer are now the same size (26×26 px) and Rubika is no longer smaller",
        "Aparat has been removed from the footer",
        "English header sizing optimized — every nav link is now the same size and always visible in both Persian and English",
        "The unclear term \"favicon\" in the 0.1.4 changelog was replaced with the clearer phrase \"browser-tab icon\""
      ]
    }
  },
  {
    v: "0.1.4",
    fa: "نسخه ۰٫۱٫۴: هدر پاک‌سازی‌شده، هوش مصنوعی لومیتک فعال، آیکون کنار تب مرورگر با لوگوی اصلی، اصلاح رنگ‌بندی و تقویت گرافیک",
    en: "Version 0.1.4: clean header, working Lumitek AI, browser-tab icon replaced with main logo, color fixes and stronger graphics",
    items: {
      fa: [
        "هدر سایت پاک‌سازی شد: فقط بخش‌های اصلی باقی ماند (خانه، ابزار، بازی، فروشگاه، اسپورتک، اخبار دیجیتال، لومیتک ای‌آی، دانلود، مقالات، تغییرات، درباره ما، تماس و پشتیبانی) و همگی در فارسی و انگلیسی معلوم می‌شوند",
        "هوش مصنوعی لومیتک کامل بازنویسی شد و حالا واقعاً کار می‌کند: پاسخ‌های هوشمند، فارسی و انگلیسی، برای هر سوال",
        "آیکون کنار تب مرورگر با لوگوی اصلی لومیتک جایگزین شد — حالا کنار تب مرورگر هم همان لوگوی زیبای اصلی دیده می‌شود",
        "آیکون پشتیبانی گوشه راست پایین با یک نسخه‌ی مدرن‌تر، گرادیان‌دار و با گرافیک بهتر جایگزین شد",
        "ویجت حمایت مالی پایین چپ ساده شد — فقط یک دکمه قلب کوچک بدون متن اضافه و بدون مزاحمت برای محتوا",
        "آپارات از شبکه‌های اجتماعی فوتر حذف شد؛ بله با رنگ آبی-آکوای روشن، ایتا با نارنجی #EF7F1A و روبیکا با SVG اصلی که داشتیم",
        "بگ تضاد رنگ در حالت روشن (Light) رفع شد: متن‌های سفید سیاه شدند، دایره‌های پیشرفت و سایر عناصر حالا در هر دو تم خوانا هستند",
        "المان مستطیلی بالای صفحه اصلی بازطراحی شد و حالت طبیعی‌تر و زیباتری پیدا کرد",
        "نوار نوتیفیکیشن آپدیت سایت در صفحه اصلی نوسازی شد تا به‌جای متن قدیمی، واقعیت نسخه‌ی ۰٫۱٫۴ را نشان دهد",
        "ابزارهای موجود بهبود یافتند و چند ابزار تازه و مفید به مجموعه افزوده شد",
        "بازی‌ها از لحاظ گرافیکی تقویت شدند و آیتم‌های فروشگاه برای هر بازی با تنوع بیشتر و گرافیک قوی‌تر آماده شد",
        "اسکین‌های فروشگاه که به‌درستی کار نمی‌کردند تعمیر شدند و همگی حالا قابل تجهیز و استفاده هستند"
      ],
      en: [
        "Header cleaned up: only the main sections remain (Home, Tools, Games, Store, Sports, Digital News, Lumitek AI, Download, Articles, Updates, About, Contact, Support) — all visible in both Persian and English",
        "Lumitek AI was completely rewritten and now actually works: smart responses, Persian and English, for any question",
        "Browser favicon replaced with the main Lumitek logo — the same beautiful logo now appears next to the browser tab",
        "Support icon at bottom-right replaced with a more modern, gradient-styled version with better graphics",
        "Donate widget at bottom-left simplified — just a small heart button with no extra text, no interference with content",
        "Aparat removed from social media; Bale now uses aqua-blue, Eitaa orange #EF7F1A and Rubika the exact SVG we provided",
        "Light theme contrast bug fixed: white text now turns dark, progress circles and other elements are readable in both themes",
        "Rectangular element at the top of the homepage redesigned with a more natural, prettier look",
        "Update notification bar on the homepage refreshed so it reflects version 0.1.4 instead of stale text",
        "Existing tools improved and several fresh, useful tools added to the collection",
        "Games graphically enhanced; store items for each game now come with more variety and stronger graphics",
        "Broken store skins fixed — they can now be equipped and used properly"
      ]
    }
  },
  {
    v: "0.1.3",
    fa: "نگارش تازه: پالایش چهره‌ی سایت، تقویت فروشگاه، ابزارها و مقالات",
    en: "New release: refined look, stronger store, tools and articles",
    items: {
      fa: [
        "رابط کاربری بازی‌ها به‌کلی نو شد: پایان هر بازی با صفحه‌ای زیبا و حرفه‌ای نمایش داده می‌شود — نتیجه، جایزه و دکمه‌ی آغاز دوباره در یک قاب یکپارچه 🎮",
        "مشکل قفل‌شدن صفحه هنگام بازی به‌طور کامل رفع شد؛ پس از پایان بازی، صفحه آزاد می‌شود و کاربر بدون هیچ مانعی می‌تواند به گشت‌وگذار ادامه دهد",
        "هدر سایت منسجم شد: همه‌ی بخش‌ها در یک سطر و در یک راستا قرار می‌گیرند و دیگر هیچ گزینه‌ای به سطر بعدی نمی‌لغزد",
        "مشکل سرخ‌شدن ناخواسته‌ی صفحه در حرکت‌های تند ماوس برطرف گردید و تجربه‌ی کاربری نرم‌تر از پیش است",
        "بازی کشورگشایی آنلاین از مجموعه‌ی بازی‌ها حذف شد تا جای خود را به تجربه‌های بهتر بدهد",
        "در بازی هدبال، پینِ بالای صفحه برداشته شد و در عوض نشانِ «محبوب» بر کارت بازی نشست ⚽",
        "ایراد بازنشدن صفحه‌ی مقاله‌ها به‌طور کامل رفع شد؛ اکنون هر مقاله در صفحه‌ای کامل و آراست گشوده می‌شود",
        "دوازده مقاله‌ی تازه در حوزه‌های فناوری، برنامه‌نویسی و امنیت به مجموعه افزوده شد (۴۴ مقاله)",
        "پنج ابزار کاربردی جدید: فرمت‌کننده‌ی JSON، شمارشگر واژه‌ها، آزمایشگر Regex، محاسبه‌گر معدل و مترجم هوشمند",
        "فروشگاه بسط یافت: برای هر بازی اسکین اختصاصی فراهم شد و چینش اجناس با سرفصل‌های دسته‌ای منظم‌تر شد",
        "متن به گفتار فارسی‌تر و هوشمندتر شد: انتخاب زبان، چینش خودکار راست‌به‌چپ یا چپ‌به‌راست و صدای فارسی",
        "جستجوی سایت بازطراحی شد؛ سریع‌تر، دقیق‌تر و با پوشش کامل بازی‌ها، ابزارها و مقاله‌ها",
        "اسپورتک شش رشته‌ی تازه‌وارد دیگر: شطرنج، واترپلو، تیراندازی با کمان، اسنوکر، ژیمناستیک و اسکی",
        "شماره‌گذاری نسخه‌ها از آغاز تا امروز به قالب سه‌رقمی استاندارد (۰٫۰٫۱ تا ۰٫۱٫۳) بازنویسی شد"
      ],
      en: [
        "Games UI rebuilt: every match now ends with a polished game-over screen — result, rewards and a replay button in one elegant frame 🎮",
        "Fixed the screen-lock issue for good: when a game ends, the page unlocks instantly and browsing flows freely again",
        "The header is now perfectly aligned: every section sits on a single row and nothing slips to the next line",
        "Fixed the unwanted red flicker caused by fast mouse movements — the whole site now feels smoother",
        "The online Conquest game has been retired from the games collection",
        "HeadBall no longer sits pinned at the top; instead it proudly wears a “Popular” tag on its card ⚽",
        "Fixed the bug where article pages failed to open — every article now opens as a full, well-crafted page",
        "Twelve new articles on technology, programming and security join the library (44 total)",
        "Five brand-new tools: JSON Formatter, Word Counter, Regex Tester, GPA Calculator and Smart Translator",
        "The Store expands: every game now has its own skin, and items are neatly organized under category headings",
        "Text-to-Speech is smarter: language picker, automatic RTL/LTR alignment and Persian voice support",
        "Site search is upgraded — faster, sharper and covering every game, tool and article",
        "Sportek adds six more sports: Chess, Water Polo, Archery, Snooker, Gymnastics and Skiing",
        "Version numbers across the site now follow the standard three-part scheme (0.0.1 to 0.1.3)"
      ]
    }
  },
  {
    v: "0.1.2",
    fa: "نوار کنترل بازی‌ها، مقالات تمام‌صفحه و جدول افتخارات",
    en: "Game control bar, full-page articles and the leaderboard",
    items: {
      fa: [
        "همه‌ی بازی‌ها به نوار کنترل یکپارچه مجهز شدند: توقف واقعی، راهنمای گام‌به‌گام، آغاز دوباره و نمایش تمام‌صفحه",
        "چهره‌ی همه‌ی بازی‌ها نوسازی شد؛ پس‌زمینه‌های محیطی، قاب‌های شیشه‌ای و دکمه‌های درخشان",
        "بازی ورزشی «هدبال» به خانواده پیوست — فوتبال تک‌به‌تک با حریفی هوشمند که با هر گل تیزتر می‌شود",
        "بازی کشورگشایی سه سطح سختی، پایتخت‌ها و افکت‌های تصویری و صدای تازه گرفت",
        "جدول افتخارات بازی‌ها فراهم شد؛ رتبه‌ی هر کاربر بر پایه‌ی XP و سطح، با هفت درجه از تازه‌کار تا افسانه",
        "مقاله‌ها به صفحه‌ای کامل کوچ کردند: فهرست مطالب، نوار پیشرفت مطالعه و پیوند به مقاله‌های بعدی و پیشین",
        "متن مقاله‌ها چندین برابر عمیق‌تر شد و شش موضوع تازه بدان افزوده گشت",
        "آشفتگی اخبار رشته‌های ورزشی اسپورتک از بن رفع شد؛ هر رشته تنها خبرهای خود را می‌بیند",
        "دکمه‌ی ورود با گوگل که در پس‌زمینه‌ی روشن ناپیدا بود، هم‌چهرگی با دکمه‌ی مایکروسافت شد",
        "زبانِ «فروشگاه» در هدر فارسی‌وار شد و آغازین‌ترین جمله‌ی صفحه‌ی خانه بازنویسی گشت"
      ],
      en: [
        "Every game now carries a unified control bar: true pause, step-by-step help, restart and fullscreen",
        "All games received a visual makeover — ambient backgrounds, glass frames and glowing buttons",
        "The sports game “HeadBall” joins the family — a 1v1 head football against a rival that sharpens with every goal",
        "Conquest gained three difficulty levels, capitals and fresh visual and sound effects",
        "A games leaderboard arrived: every player ranked by XP and level across seven tiers, Rookie to Legend",
        "Articles moved to full pages: table of contents, reading progress and previous/next navigation",
        "Article texts grew several times deeper and six new topics were added",
        "The Sportek cross-sport news mix-up was fixed at its root; each sport sees only its own feed",
        "The Google sign-in button, once invisible on light backgrounds, now matches the Microsoft button",
        "The header’s store label became native Persian and the homepage tagline was rewritten"
      ]
    }
  },
  {
    v: "0.1.1",
    fa: "بازی کشورگشایی، هوش مصنوعی سریع‌تر و ابزارهای تازه",
    en: "Conquest game, faster AI and new tools",
    items: {
      fa: [
        "بازی «کشورگشایی» با نقشه‌ی زنده، رقبای ربات و لابی آنلاین‌نما به مجموعه افزوده شد",
        "هوش مصنوعی چابک‌تر شد: پاسخ‌ها لحظه‌به‌لحظه نوشته می‌شوند و دکمه‌ی توقف و حالت سریع در دسترس است",
        "پشتیبانی زیرک‌تر گشت و پرسش‌های دشوار را به موتور هوش مصنوعی واقعی می‌سپارد",
        "ربات دوست‌داشتنی پشتیبانی در گوشه‌ی سایت نشست و جای آیکون پیام را گرفت",
        "پنج ابزار تازه: فشرده‌ساز تصویر، تبدیل عکس به Base64، سنجش سرعت اینترنت، سازنده‌ی QR و متن به گفتار",
        "اسکین‌های تازه برای مار، ۲۰۴۸، مین‌یاب، آجرشکن و بسکتبال به فروشگاه رسید",
        "مقاله‌ها دسته‌بندی شدند و شش آموزش تازه بدان افزوده گشت",
        "اسپورتک پنج رشته‌ی دیگر پوشش داد: کشتی، وزنه‌برداری، شنا، دو و میدانی و کبدی",
        "حساب کاربری استوارتر شد: سنجش نیروی رمز، پاسداری از تلاش‌های ناموفق و امکان تغییر رمز"
      ],
      en: [
        "The “Conquest” game arrived with a living map, bot rivals and a lobby that feels online",
        "AI grew nimbler: answers stream word by word, with a stop button and fast mode at hand",
        "Support became sharper, handing hard questions to a real AI engine",
        "A charming robot took the corner of the site in place of the old message icon",
        "Five new tools: Image Compressor, Image to Base64, Speed Test, QR Maker and Text-to-Speech",
        "New skins for Snake, 2048, Minesweeper, Breakout and Hoops reached the Store",
        "Articles were categorized and six fresh tutorials were added",
        "Sportek now covers five more sports: wrestling, weightlifting, swimming, athletics and kabaddi",
        "User accounts grew sturdier: password strength, failed-attempt protection and password change"
      ]
    }
  },
  {
    v: "0.1.0",
    fa: "اخبار دیجیتال، پیوند با OpenAI و گام‌های بزرگ تازه",
    en: "Digital News, OpenAI connection and major strides",
    items: {
      fa: [
        "بخش «اخبار دیجیتال» با خبرهای زنده گشوده شد و پیوندش در هدر همه‌ی صفحه‌ها نشست",
        "اخبار تنها از سایت‌های ایرانی گرد می‌آید: دیجیاتو، زومیت، مهر و دیگران",
        "نام منبع حقیقی هر خبر اکنون نشان داده می‌شود",
        "اسپورتک به‌طور اختصاصی به ورزش مردان پرداخت و اخبار بانوان خودکار پالایش می‌شود",
        "با زدن «شروع بازی»، بازی درست در میانه‌ی صفحه قرار می‌گیرد",
        "هوش مصنوعی به APIهای OpenAI پیوند خورد و پنل تنظیم، انتخاب مدل و آزمون اتصال گرفت",
        "دو بازی تازه: حافظه و ضربه‌گیر",
        "سه ابزار تازه: چرخ شانس، شمارش معکوس و یادداشت سریع",
        "شش مقاله‌ی فناوری تازه: گیت و گیت‌هاب، کروم، هوش مصنوعی مولد، امنیت گوشی، رایانش ابری و بلاکچین",
        "پشتیبانی به پایان هدر رفت و «دیجیتال گروپ» جای «دیجیتال هاب» را گرفت"
      ],
      en: [
        "The “Digital News” section opened with live feeds and took its place in every page header",
        "News is gathered only from Iranian sites: Digiato, Zoomit, Mehr and more",
        "The true source name is now displayed for every headline",
        "Sportek became dedicated to men’s sports, filtering women’s sports news automatically",
        "Pressing “Start” now centers the game precisely on screen",
        "Lumitek AI connected to OpenAI APIs with a settings panel, model picker and connection test",
        "Two new games: Memory and Whack-a-Mole",
        "Three new tools: Lucky Wheel, Countdown and Quick Notes",
        "Six new tech articles: Git & GitHub, Chrome, Generative AI, phone security, cloud computing and blockchain",
        "Support moved to the end of the header and “Digital Group” replaced “Digital Hub”"
      ]
    }
  },
  {
    v: "0.0.9",
    fa: "تپه‌نورد، پرسش‌های متداول و یکدستی چهره‌ی صفحات",
    en: "Hill Climb, FAQ and a unified look",
    items: {
      fa: [
        "بازی «تپه‌نورد» جای رالی شبانه را گرفت — رانندگی فیزیکی بر فراز تپه‌ها با مدیریت سوخت",
        "بخش «پرسش‌های متداول» با پاسخ‌هایی کامل به صفحه‌ی خانه افزوده شد",
        "حباب شناور پشتیبانی در گوشه‌ی سایت نشست تا پاسخ بدون خروج از صفحه برسد",
        "عنوان همه‌ی صفحه‌ها یکدست و زیبا شد",
        "پیوند «تغییرات» و «مقالات» به منوی هدر همه‌ی صفحه‌ها افزوده شد",
        "ترجمه‌ی انگلیسی بخش‌های بازمانده کامل شد و اعداد در حالت انگلیسی لاتین شدند",
        "لوگوی لومیتک به پنجره‌ی ورود راه یافت",
        "ذخیره‌ی خودکار حساب کاربری جایگزین راهنماهای دستی شد",
        "شش مقاله‌ی آموزشی تازه: CMD، جستجوی گوگل، ایمیل، Word، پشتیبان‌گیری و وای‌فای",
        "طراحی تازه‌ای برای شبکه‌های اجتماعی در پانوشت نشست و واکنش‌گرایی موبایل بهبود یافت"
      ],
      en: [
        "“Hill Climb” took the place of Night Rally — physics driving over hills with fuel to manage",
        "An FAQ section with complete answers joined the homepage",
        "A floating support bubble settled in the corner for quick answers",
        "Every page title became unified and beautiful",
        "“Changes” and “Articles” links joined the header menu on all pages",
        "The remaining English translations were completed and digits turned Latin in EN mode",
        "The Lumitek logo found its way into the sign-in dialog",
        "Automatic account saving replaced manual setup hints",
        "Six new tutorials: CMD, Google search, email, Word, backups and Wi-Fi",
        "A fresh footer social design landed and mobile responsiveness improved"
      ]
    }
  },
  {
    v: "0.0.8",
    fa: "چهار بازی و چهار ابزار و ده مقاله تازه، اسکین‌ها و ورود با مایکروسافت",
    en: "Four games, four tools, ten articles, skins and Microsoft sign-in",
    items: {
      fa: [
        "چهار بازی تازه: تک‌تیرانداز حرفه‌ای، گنج جزیره، دژبان و درگ‌ریس",
        "اسکین‌های اختصاصی بازی‌ها به فروشگاه رسید: اسنایپر، ماشین، قهرمان و برج",
        "چهار ابزار تازه: تایپ‌سنجی، تایمر پومودورو، رنگ‌ساز و مبدل مبنا و هش",
        "ده مقاله‌ی آموزشی کامل با خواندن درون‌سایتی و پاداش سکه",
        "اسپورتک چهار رشته و هشت جدول لیگ تازه گرفت و اخبار هر رشته تخصصی شد",
        "ورود مهمان و ورود با مایکروسافت به صفحه‌ی ورود شکوه بخشید",
        "شبکه‌های اجتماعی ایرانی در پانوشت همه‌ی صفحه‌ها نشستند",
        "اشتراک هوش مصنوعی برداشته شد — هر پرسش تنها دو سکه"
      ],
      en: [
        "Four new games: Pro Sniper, Treasure Island, Tower Defense and Drag Race",
        "Dedicated game skins reached the Store: sniper, car, hero and tower",
        "Four new tools: Typing test, Pomodoro timer, Color studio, Base & hash converter",
        "Ten complete in-site tutorials with a coin reward for reading",
        "Sportek added four sports and eight league tables with per-sport news",
        "Guest sign-in and Microsoft sign-in graced the login page",
        "Iranian social networks settled into every footer",
        "The AI subscription was lifted — only two coins per question"
      ]
    }
  },
  {
    v: "0.0.7",
    fa: "لوگوی نو، اسپورتک کامل و درگاه پرداخت",
    en: "New logo, full Sportek and payment gateway",
    items: {
      fa: [
        "لوگوی تازه‌ی لومیتک در هدر همه‌ی صفحه‌ها نشست",
        "بخش ورزش به‌کلی بازآفرینی شد و نام «اسپورتک» با گزینش رشته بر آن گذاشتند",
        "جدول چهارده لیگ و بازی‌های پیش‌رو با دکمه‌ی «بروزرسانی همه» فراهم شد",
        "چهار بازی تازه: تیراندازی دقیق، دونده ماجراجویی، رالی شبانه و بسکتبال",
        "ماشین‌حساب مهندسی کامل با چیدمانی منظم ساخته شد",
        "درگاه پرداخت فروشگاه برای سکه و VIP گشوده شد",
        "دکمه‌ی تغییرات نسخه‌ها در هدر نشست و اعلان‌های خوانده‌شده گردید",
        "لغزش صفحه هنگام بازی مهار شد و پشتیبانی از کلیدهای WASD افزوده گشت"
      ],
      en: [
        "A new Lumitek logo settled into every header",
        "The sports section was wholly reborn as “Sportek” with a sport picker",
        "Fourteen league tables and upcoming fixtures arrived with a “Refresh all” button",
        "Four new games: Precision Range, Cave Runner, Night Rally and Hoops Shot",
        "A full engineering calculator was built with an orderly layout",
        "The store checkout gateway opened for coins and VIP",
        "A changelog button landed in the header with read-state notifications",
        "Page scrolling during play was tamed and WASD support added"
      ]
    }
  },
  {
    v: "0.0.6",
    fa: "هوش مصنوعی لومیتک، فروشگاه کامل و بازی‌ها و ابزارهای فراوان",
    en: "Lumitek AI, full store and many new games & tools",
    items: {
      fa: [
        "هوش مصنوعی لومیتک زاده شد — آنلاین و توانا، هر پرسش دو سکه",
        "فروشگاه کامل با تب شارژ سکه، اسلحه و اسکین گشوده شد",
        "شش بازی تازه آمد و بازی‌ها در هفت دسته چیده شدند",
        "نُه ابزار تازه: تقویم ایران، اوقات شرعی، ساعت جهانی، آمار و دیگران",
        "آغاز راه با ده سکه و پاداش روزانه‌ی ده سکه‌ای",
        "جستجوی سراسری تقویت شد و جنبش‌های تازه به همه‌ی سایت رسید"
      ],
      en: [
        "Lumitek AI was born — online and capable, two coins per question",
        "A full store opened with coin top-up, weapons and skins tabs",
        "Six new games arrived and games were sorted into seven categories",
        "Nine new tools: Iranian calendar, prayer times, world clock, statistics and more",
        "The journey starts with ten coins and a ten-coin daily reward",
        "Global search was strengthened and fresh animations swept the site"
      ]
    }
  },
  {
    v: "0.0.5",
    fa: "موتور آفلاین، نصب PWA و فروشگاه سکه",
    en: "Offline engine, PWA install and coin store",
    items: {
      fa: [
        "موتور آفلاین با سرویس‌ورکر ساخته شد — سایت بی‌اینترنت نیز می‌تپد",
        "نصب به‌سان اپلیکیشن (PWA) و صفحه‌ی دانلود فراهم شد",
        "فروشگاه سکه با چهار بسته و اشتراک VIP گشوده شد",
        "ورود با گوگل یا ایمیل و رمز میسر شد",
        "پنج بازی و هشت ابزار تازه افزوده شد",
        "ترجمه‌ی کامل انگلیسی و رفع کاستی‌های تم روز و شب انجام شد"
      ],
      en: [
        "An offline engine with Service Worker was built — the site beats without internet",
        "Installable app (PWA) and a Download page were provided",
        "A coin store opened with four packages and a VIP subscription",
        "Sign-in with Google or email and password became possible",
        "Five new games and eight new tools were added",
        "Complete English translation and day/night theme fixes landed"
      ]
    }
  },
  {
    v: "0.0.4",
    fa: "استور، حساب کاربری و اخبار زنده‌ی ورزشی",
    en: "Store, user account and live sports news",
    items: {
      fa: ["استور با آواتار و عنوان اختصاصی گشوده شد", "حساب کاربری کامل با دستاوردها ساخته شد", "اخبار زنده‌ی ورزشی به سایت رسید", "پشتیبانی هوشمند راه افتاد", "بازی مار و دوز افزوده شد"],
      en: ["The store opened with avatars and custom titles", "A full account with achievements was built", "Live sports news reached the site", "The AI support assistant started working", "Snake and Tic-Tac-Toe games were added"]
    }
  },
  {
    v: "0.0.3",
    fa: "طراحی دوباره، جستجوی سراسری و تم روز و شب",
    en: "Redesign, global search and day/night theme",
    items: {
      fa: ["رابط کاربری از نو طراحی شد", "جستجوی سراسری برقرار شد", "سامانه‌ی اعلان‌ها و پروفایل ساخته شد", "تم روشن و تیره فراهم گشت"],
      en: ["The UI was redesigned from scratch", "Global search was established", "Notifications and profile systems were built", "Light and dark themes arrived"]
    }
  },
  {
    v: "0.0.2",
    fa: "نگارش نخست با ابزارها، بازی‌ها و سکه",
    en: "First release with tools, games and coins",
    items: {
      fa: ["گروه ابزارها، ورزش و فناوری شکل گرفت", "بازی‌های نخستین افزوده شدند", "سامانه‌ی XP و سکه برپا شد", "صفحه‌ی حمایت گشوده شد"],
      en: ["The tools, sports and technology group took shape", "The first games were added", "The XP and coins system was raised", "The donation page opened"]
    }
  },
  {
    v: "0.0.1",
    fa: "تولد لومیتک — نخستین سنگ‌بنای گروه دیجیتال",
    en: "The birth of Lumitek — the first cornerstone",
    items: {
      fa: ["سایت لومیتک با بخش‌های بنیادین آغاز به کار کرد"],
      en: ["The Lumitek website started with its foundational sections"]
    }
  }
];

/* ساخت آکاردئون مشترک برای پنل هدر و صفحه تغییرات */
function buildVersionAccordion(container, latestOpen) {
  container.innerHTML = "";
  const fa = getLang() === "fa";
  LUMITEK_VERSIONS.forEach(function (v, i) {
    const item = document.createElement("div");
    item.className = "cl-item" + (i === 0 ? " latest" : "");
    if (i === 0 && latestOpen) item.classList.add("open");
    const top = document.createElement("button");
    top.className = "cl-top";
    top.type = "button";
    top.innerHTML = '<span class="cl-v">v' + v.v + '</span>' +
      (i === 0 ? '<span class="cl-new">' + (fa ? "جدید" : "New") + '</span>' : '') +
      '<span class="cl-sum"></span>' +
      '<span class="cl-chev" aria-hidden="true">▾</span>';
    top.querySelector(".cl-sum").textContent = fa ? v.fa : v.en;
    top.addEventListener("click", function () { item.classList.toggle("open"); });

    const body = document.createElement("div");
    body.className = "cl-body";
    const items = (v.items && (fa ? v.items.fa : v.items.en)) || [];
    if (items.length) {
      body.innerHTML = '<div class="cl-listT">' + T("ch.listTitle") + '</div><ul class="cl-list">' +
        items.map(function () { return "<li></li>"; }).join("") + '</ul>';
      const lis = body.querySelectorAll(".cl-list li");
      lis.forEach(function (li, k) { li.textContent = items[k]; });
    } else {
      const p = document.createElement("p");
      p.className = "cl-desc";
      p.textContent = fa ? v.fa : v.en;
      body.appendChild(p);
    }
    item.appendChild(top);
    item.appendChild(body);
    container.appendChild(item);
  });
}

function renderChangelog() {
  const box = document.querySelector("#changelogList");
  if (!box) return;
  buildVersionAccordion(box, true);
  const link = box.parentElement.querySelector(".cl-all");
  if (link) link.href = resolveSearchHref("pages/announcements.html");
}

/* صفحه کامل تغییرات (announcements.html) */
function renderVersionsPage() {
  const box = document.querySelector("#versionsPage");
  if (!box) return;
  buildVersionAccordion(box, true);
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
  if (window.LumiBackend && LumiBackend.enabled()) {
    var isDonation = !!(opts && opts.type === "donation");
    var current = window.LumiAuth && LumiAuth.currentUser ? LumiAuth.currentUser() : null;
    LumiBackend.paymentCreate({
      type: isDonation ? "donation" : "purchase",
      productId: opts && opts.productId ? opts.productId : "",
      amount: opts && opts.amount ? opts.amount : 0,
      currency: "IRR",
      supporterName: opts && opts.supporterName ? opts.supporterName : ""
    }).then(function(res) {
      if (res && res.paymentUrl) {
        window.location.href = res.paymentUrl;
        return;
      }
      alert(getLang() === "fa"
        ? "پرداخت آنلاین هنوز درگاه واقعی ندارد. ابتدا درگاه را در Backend تنظیم کن."
        : "Online payment is not connected yet. Configure the payment gateway in the backend first.");
    }).catch(function(err) {
      alert((err && err.message) || (getLang() === "fa" ? "شروع پرداخت ممکن نشد." : "Could not start payment."));
    });
    return;
  }
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

/* ---------------- Page head unifier (عنوان همه صفحات مثل صفحه بازی‌ها) ---------------- */
function setupPageHeads() {
  document.querySelectorAll("main.page").forEach(function (main) {
    if (main.querySelector(":scope > .page-head")) return;
    const first = main.firstElementChild;
    if (!first || !first.classList.contains("eyebrow")) return;
    const parts = [first];
    let next = first.nextElementSibling;
    if (next && (next.tagName === "H1" || next.classList.contains("store-top"))) {
      parts.push(next);
      next = next.nextElementSibling;
      if (next && next.tagName === "P" && (next.classList.contains("muted") || next.hasAttribute("data-i18n"))) parts.push(next);
    }
    if (parts.length < 2) return;
    const wrap = document.createElement("section");
    wrap.className = "page-head reveal in";
    main.insertBefore(wrap, first);
    parts.forEach(function (el) { wrap.appendChild(el); });
  });
}

/* ---------------- Support widget (پشتیبانی شناور گوشه صفحه) ---------------- */
function logoUrl() {
  const s = document.querySelector('script[src*="main.js"]');
  if (s && s.src) return s.src.replace(/js\/main\.js.*$/, "") + "assets/icons/logo-lt.png";
  return "assets/icons/logo-lt.png";
}

const SUP_KB = [
  { keys: ["سلام", "درود", "hi", "hello", "hey"],
    fa: "سلام! 👋 من دستیار لومیتک هستم. درباره سکه، فروشگاه، بازی‌ها، حساب کاربری یا نصب اپ هر سوال داری بپرس!",
    en: "Hi! 👋 I'm the Lumitek assistant. Ask me anything about coins, the store, games, your account or installing the app!" },
  { keys: ["سکه", "coin", "پول", "پاداش", "روزانه"],
    fa: "🪙 سکه از سه راه می‌گیری:\n۱) بازی کن — هر بازی XP و سکه دارد و رکورد زدن جایزه بیشتری می‌دهد.\n۲) پاداش روزانه: هر ۲۴ ساعت ۱۰ سکه از تب «شارژ سکه» فروشگاه.\n۳) شارژ فوری از پلن‌های استارتر تا ویژه در همان تب.",
    en: "🪙 You earn coins in three ways:\n1) Play — every game gives XP & coins; records pay more.\n2) Daily reward: 10 coins every 24h from the Store's Top-up tab.\n3) Instant top-ups from Starter to Mega packs in the same tab." },
  { keys: ["استور", "store", "اسکین", "skin", "خرید", "آواتار", "shop"],
    fa: "🛍️ در فروشگاه آواتار، اسلحه، اسکین بازی‌ها، رنگ سایت، عنوان اختصاصی و بوست XP هست. اسکین را بخر، از همان‌جا تجهیز کن و بازی کن — ظاهر بازی خودکار عوض می‌شود!",
    en: "🛍️ The Store has avatars, weapons, game skins, site colors, custom titles and XP boosts. Buy a skin, equip it there and play — the game's look updates automatically!" },
  { keys: ["بازی", "game", "تیراندازی", "رانندگی", "تپه", "ماجراجویی", "هدبال", "محبوب"],
    fa: "🎮 لومیتک ۲۹ بازی در ۷ دسته دارد — از تیراندازی کیهانی و تپه‌نورد تا هدبال محبوب و مین‌یاب؛ همه با XP، سکه، رکورد، دستاورد و جدول افتخارات. صفحه بازی‌ها را باز کن!",
    en: "🎮 Lumitek has 29 games in 7 categories — from Space Shooter and Hill Climb to the popular HeadBall and Minesweeper; all with XP, coins, records, achievements and a leaderboard. Open the Games page!" },
  { keys: ["ورود", "ثبت نام", "ثبت‌نام", "حساب", "account", "login", "sign", "مهمان", "رمز", "گوگل", "مایکروسافت"],
    fa: "👤 می‌توانی با گوگل، مایکروسافت، ایمیل یا حتی مهمان وارد شوی. همه‌چیز (سکه، XP، رکوردها و خریدها) به‌صورت خودکار روی همین دستگاه ذخیره می‌شود — هیچ کار اضافه‌ای لازم نیست!",
    en: "👤 You can sign in with Google, Microsoft, email or as a guest. Everything (coins, XP, records and purchases) is saved automatically on this device — nothing extra needed!" },
  { keys: ["نصب", "دانلود", "اپ", "install", "download", "pwa", "آفلاین", "offline"],
    fa: "⬇️ از صفحه «دانلود» می‌توانی لومیتک را مثل یک اپ واقعی روی گوشی و کامپیوتر نصب کنی؛ بعد از نصب حتی بدون اینترنت هم کار می‌کند.",
    en: "⬇️ From the Download page you can install Lumitek like a real app on your phone or computer; once installed it even works offline." },
  { keys: ["ورزش", "اسپورتک", "sport", "لیگ", "اخبار", "news", "فوتبال"],
    fa: "🏆 اسپورتک اخبار زنده‌ی مرتبط با هر رشته، جدول ۴۰ لیگ (خلیج فارس، پرمیرلیگ، لالیگا، NBA و...) و بازی‌های پیش رو را با یک دکمه «بروزرسانی همه» نشان می‌دهد.",
    en: "🏆 Sportek shows live news per sport, 40 league tables (PGPL, Premier League, La Liga, NBA...) and upcoming matches — with one \u201cRefresh everything\u201d button." },
  { keys: ["هوش مصنوعی", "ai", "چت", "سوال از"],
    fa: "✨ هوش مصنوعی لومیتک بدون اشتراک است — هر سوال فقط ۲ سکه! اگر سکه نداری از بازی‌ها یا پاداش روزانه شارژ کن.",
    en: "✨ Lumitek AI needs no subscription — each question is just 2 coins! Out of coins? Earn them by playing or claim the daily reward." },
  { keys: ["حمایت", "donate", "پرداخت", "vip"],
    fa: "❤️ حمایت مالی کاملاً اختیاری است و با درگاه بانکی یا رمزارز از صفحه حمایت ممکن است. اشتراک VIP هم در فروشگاه است: سکه بیشتر و ۱۰٪ پاداش اضافه.",
    en: "❤️ Donations are fully optional, paid via bank gateway or crypto on the Donate page. VIP is in the Store too: more coins and a 10% reward bonus." },
  { keys: ["تم", "شب", "روشن", "theme", "زبان", "انگلیسی", "english", "فارسی", "language"],
    fa: "🎨 با دکمه ☀️/🌙 تم را عوض کن و با دکمه EN کل سایت دوزبانه می‌شود؛ فونت، جهت و اعداد خودکار تنظیم می‌شوند.",
    en: "🎨 Use ☀️/🌙 to switch themes and the EN button to make the whole site bilingual; fonts, direction and digits adapt automatically." }
];

function supAnswer(q) {
  const fa = getLang() === "fa";
  const text = (q || "").toLowerCase();
  let best = null, bestScore = 0;
  SUP_KB.forEach(function (item) {
    let score = 0;
    item.keys.forEach(function (k) { if (text.indexOf(k.toLowerCase()) !== -1) score += k.length; });
    if (score > bestScore) { bestScore = score; best = item; }
  });
  if (!best) return fa
    ? "🤔 جواب دقیقش را اینجا ندارم! دستیار کامل پشتیبانی ۲۴ ساعته جوابت را می‌دهد — دکمه «صفحه کامل پشتیبانی» را بالای همین پنجره بزن یا سوالت را واضح‌تر بنویس."
    : "🤔 I don't have that exact answer here! The full 24/7 support assistant can help — tap \u201cFull support page\u201d at the top of this panel, or rephrase your question.";
  return fa ? best.fa : best.en;
}

/* آیکون ربات پشتیبانی گوشه راست پایین (v0.2.0 — بازگشت ربات دوست‌داشتنی) */
function robotFaceSvg(size) {
  size = size || 32;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 48 48" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="rbg" x1="10" y1="10" x2="38" y2="42"><stop stop-color="#4f8cff"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs>' +
    '/* آنتن */'.replace(/\/\*|\*\//g, '') +
    '<line x1="24" y1="4.8" x2="24" y2="9.6" stroke="#38bdf8" stroke-width="2.6" stroke-linecap="round"/>' +
    '<circle cx="24" cy="4.8" r="2.9" fill="#38bdf8"/>' +
    '/* سر ربات */'.replace(/\/\*|\*\//g, '') +
    '<rect x="7.5" y="9.5" width="33" height="26" rx="9.5" fill="url(#rbg)"/>' +
    '<rect x="10.8" y="12.8" width="26.4" height="17.5" rx="7" fill="#0b1830" opacity=".5"/>' +
    '/* چشم‌ها و لبخند */'.replace(/\/\*|\*\//g, '') +
    '<circle cx="17.6" cy="21.4" r="3.5" fill="#eaf4ff"/>' +
    '<circle cx="30.4" cy="21.4" r="3.5" fill="#eaf4ff"/>' +
    '<circle cx="18.3" cy="22" r="1.8" fill="#0b1830"/>' +
    '<circle cx="31.1" cy="22" r="1.8" fill="#0b1830"/>' +
    '<path d="M18.6 26.8 q5.4 3.6 10.8 0" stroke="#9fd0ff" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '/* گوش‌های کناری */'.replace(/\/\*|\*\//g, '') +
    '<rect x="3.6" y="17.6" width="4.8" height="11" rx="2.4" fill="#38bdf8"/>' +
    '<rect x="39.6" y="17.6" width="4.8" height="11" rx="2.4" fill="#38bdf8"/>' +
    '</svg>';
}

function setupSupportWidget() {
  if (/support\.html|ai\.html/.test(location.pathname)) return;
  if (document.querySelector(".sup-fab")) return;

  const fab = document.createElement("button");
  fab.className = "sup-fab";
  fab.type = "button";
  fab.setAttribute("aria-label", T("wgt.open"));
  fab.innerHTML = '<span class="sup-i">' + robotFaceSvg(34) + '</span><span class="sup-x">✕</span>';
  document.body.appendChild(fab);

  const panel = document.createElement("div");
  panel.className = "sup-panel";
  panel.setAttribute("role", "dialog");
  panel.innerHTML =
    '<div class="sup-head">' +
    '<img class="sup-logo" alt="Lumitek" src="' + logoUrl() + '">' +
    '<div class="sup-head-t"><b>' + T("wgt.title") + '</b><small>' + T("wgt.min") + '</small></div>' +
    '<a class="sup-full" data-sup-full href="#" title="' + T("wgt.full") + '">↗</a>' +
    '</div>' +
    '<div class="sup-msgs"></div>' +
    '<div class="sup-chips"></div>' +
    '<div class="sup-input"><input type="text" maxlength="300"><button type="button" class="primary-btn">' + T("wgt.send") + '</button></div>';
  document.body.appendChild(panel);

  const msgs = panel.querySelector(".sup-msgs");
  const input = panel.querySelector(".sup-input input");
  const sendBtn = panel.querySelector(".sup-input button");
  const chips = panel.querySelector(".sup-chips");
  const fullLink = panel.querySelector("[data-sup-full]");
  fullLink.href = resolveSearchHref("pages/support.html");
  let greeted = false;

  function chipLabels() {
    return getLang() === "fa"
      ? ["🪙 سکه چطور بگیرم؟", "🛍️ فروشگاه و اسکین‌ها", "🎮 بازی‌ها", "👤 ورود و حساب", "⬇️ نصب اپ"]
      : ["🪙 How to earn coins?", "🛍️ Store & skins", "🎮 Games", "👤 Sign-in & account", "⬇️ Install the app"];
  }
  function renderChips() {
    chips.innerHTML = "";
    chipLabels().forEach(function (label) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      chips.appendChild(b);
    });
  }
  function addMsg(text, role) {
    const d = document.createElement("div");
    d.className = "sup-msg " + (role === "user" ? "user" : "bot");
    d.textContent = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function ask(q) {
    q = (q || "").trim();
    if (!q) return;
    addMsg(q, "user");
    input.value = "";
    const t = document.createElement("div");
    t.className = "sup-msg bot typing";
    t.innerHTML = "<i></i><i></i><i></i>";
    msgs.appendChild(t);
    msgs.scrollTop = msgs.scrollHeight;
    /* ۱.۱ — اگر جواب دقیق در دانش داخلی بود، همان لحظه؛ وگرنه به موتور AI واقعی می‌سپاریم */
    const fa = getLang() === "fa";
    const text = q.toLowerCase();
    let best = null, bestScore = 0;
    SUP_KB.forEach(function (item) {
      let score = 0;
      item.keys.forEach(function (k) { if (text.indexOf(k.toLowerCase()) !== -1) score += k.length; });
      if (score > bestScore) { bestScore = score; best = item; }
    });
    if (best && bestScore >= 6) {
      setTimeout(function () { t.remove(); addMsg(fa ? best.fa : best.en, "bot"); }, 420);
      return;
    }
    /* موتور AI آنلاین (پاسخ باز، سریع) */
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 14000);
    const sys = fa
      ? "تو دستیار شاد و کوتاه‌گوی وب‌سایت لومیتک هستی — یک گروه دیجیتال با ۲۹ بازی، ۳۷ ابزار، فروشگاه سکه و اسکین، اسپورتک با ۲۵ رشته ورزشی و ۴۰ لیگ، اخبار دیجیتال ایرانی، ۶۰ مقاله آموزشی و هوش مصنوعی. به فارسی خلاص و دوستانه جواب بده (حداکثر ۳ جمله). اگر سوال درباره لومیتک نبود هم مفید جواب بده."
      : "You are the cheerful, concise assistant of Lumitek — a digital group with 29 games, 37 tools, a coin & skins store, Sportek with 25 sports and 40 leagues, Iranian digital news, 60 articles and AI. Reply briefly and friendly in English (max 3 sentences). Be helpful even if the question is not about Lumitek.";
    fetch("https://text.pollinations.ai/" + encodeURIComponent(q) + "?model=openai-fast&referrer=lumitek&system=" + encodeURIComponent(sys), ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { if (!r.ok) throw new Error("s"); return r.text(); })
      .then(function (txt) {
        clearTimeout(timer);
        t.remove();
        addMsg((txt && txt.trim().length > 2) ? txt.trim() : supAnswer(q), "bot");
      })
      .catch(function () {
        clearTimeout(timer);
        t.remove();
        addMsg(supAnswer(q), "bot");
      });
  }
  function greet() {
    if (greeted) return;
    greeted = true;
    addMsg(T("wgt.hello"), "bot");
    renderChips();
  }
  function setOpen(on) {
    panel.classList.toggle("show", on);
    fab.classList.toggle("on", on);
    if (on) { greet(); setTimeout(function () { input.focus(); }, 150); }
  }

  fab.addEventListener("click", function () { setOpen(!panel.classList.contains("show")); });
  sendBtn.addEventListener("click", function () { ask(input.value); });
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") ask(input.value); });
  chips.addEventListener("click", function (e) { if (e.target.tagName === "BUTTON") ask(e.target.textContent); });
  document.addEventListener("lumitek:langchange", function () {
    panel.querySelector(".sup-head-t b").textContent = T("wgt.title");
    panel.querySelector(".sup-head-t small").textContent = T("wgt.min");
    panel.querySelector(".sup-input button").textContent = T("wgt.send");
    input.placeholder = T("wgt.ph");
    fab.setAttribute("aria-label", T("wgt.open"));
    renderChips();
  });
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
  setupPageHeads();
  setupSupportWidget();

  const languageToggle = document.querySelector("#languageToggle");
  if (languageToggle) languageToggle.addEventListener("click", function() {
    setLang(getLang() === "fa" ? "en" : "fa");
  });

  if (window.LumiAuth && window.LumiAuth.onChange) {
    window.LumiAuth.onChange(function() { renderProfile(); });
  }

  const notifyFirst = localStorage.getItem("lumitek_first_notice_v21");
  if (!notifyFirst) {
    addNotification("🛠️", getLang() === "fa"
      ? "Lumitek 0.3.0 نصب شد: چرخش بی‌وقفه و یک‌ردیفی بازی‌های محبوب، موج‌های پیوسته و درخشان، جست‌وجو فقط در صفحه اصلی و پانوشت تمیزتر."
      : "Lumitek 0.3.0 is out: a single seamless row of rotating popular games, solid glowing waves, search on the homepage only and a cleaner footer.");
    localStorage.setItem("lumitek_first_notice_v21", "1");
  }
});
