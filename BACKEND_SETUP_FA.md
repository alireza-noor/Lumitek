# Lumitek 0.3.1 — Online Backend Edition

این نسخه، Lumitek را برای تبدیل شدن از یک سایت استاتیک به یک وب‌اپ آنلاین آماده می‌کند.

## اضافه شده
- Cloudflare Pages Functions در مسیر `functions/api/`
- Cloudflare D1 schema در `backend/schema.sql`
- احراز هویت واقعی ایمیل/رمز با session سمت سرور
- نقش `admin` برای مالک سایت
- API پنل مدیریت: کاربران، آمار، سفارش‌ها، نقش و Coins
- API امن برای Gemini؛ کلید Gemini هرگز داخل فرانت‌اند قرار نمی‌گیرد
- زیرساخت سفارش و Donation با وضعیت `pending`
- زیرساخت Score/Notifications در D1
- PWA قبلی حفظ شده و برای نصب روی گوشی/کامپیوتر آماده است
- پرداخت عمداً «موفق» اعلام نمی‌شود تا درگاه واقعی متصل و verify سمت سرور پیاده شود.

## راه‌اندازی Cloudflare
1. پروژه فعلی Lumitek را در Cloudflare Pages نگه دار.
2. یک D1 Database بساز و نام آن را `lumitek-db` بگذار.
3. فایل `backend/schema.sql` را روی D1 اجرا کن.
4. در Pages > Settings > Functions، binding دیتابیس را با نام `DB` وصل کن.
5. متغیرهای محیطی/Secrets:
   - `GEMINI_API_KEY` = کلید Gemini
   - `ADMIN_EMAIL` = ایمیلی که باید حساب مالک باشد
   - اختیاری: `GEMINI_MODEL` و `GEMINI_FAST_MODEL`
6. Deploy کن.
7. آدرس `/api/health` را باز کن؛ باید JSON با `ok:true` ببینی.
8. با ایمیل `ADMIN_EMAIL` ثبت‌نام کن؛ حساب با نقش `admin` ساخته می‌شود.

## پرداخت
در این نسخه پرداخت واقعی هنوز به یک provider خاص قفل نشده است. دلیلش این است که merchant/API credentials و قوانین درگاه باید روی سرور تنظیم شوند. مسیر:
`POST /api/payments/create`
و callback/verify:
`POST /api/payments/verify`

بعد از انتخاب درگاه، فقط adapter سمت `functions/api/[[path]].js` تکمیل می‌شود؛ کلید درگاه داخل JS سایت قرار نمی‌گیرد.

## Gemini
صفحه AI می‌تواند در نسخه بعدی/با patch فرانت‌اند از `/api/ai` استفاده کند. کلید فقط در Secret سرور است.

## تست محلی
بدون D1 و Secrets، APIهای آنلاین طبیعی است که 503 بدهند. این نسخه همچنان فایل‌های استاتیک/PWA را حفظ می‌کند.

## مهم
`wrangler.toml` دارای placeholder برای `database_id` است. آن مقدار را از Cloudflare واقعی خودت بگیر؛ مقدار ساختگی را deploy نکن.


## APIهای جدید v0.3.1

- `GET /api/profile` — پروفایل و آمار کاربر
- `POST /api/games/score` — ثبت Score و اعطای XP از سمت سرور
- `GET /api/games/leaderboard?gameId=...` — رتبه‌بندی واقعی از D1
- `POST /api/rewards/daily` — دریافت روزانه 10 Coins و 5 XP، فقط یک‌بار در هر روز UTC
- `GET /api/store` — فهرست آیتم‌های فروشگاه فعال
- `POST /api/store/buy` — خرید اتمیک با Coins
- `GET /api/notifications` — اعلان‌های کاربر و اعلان‌های عمومی
- `POST /api/notifications/read` — علامت‌گذاری یک اعلان یا همه اعلان‌ها به‌عنوان خوانده‌شده

### نکته امنیتی Score

سرور اکنون `gameId` و Score را اعتبارسنجی می‌کند و Coins/XP را فقط خودش تغییر می‌دهد، اما هیچ API عمومیِ ثبت Score نمی‌تواند بدون منطق اختصاصی هر بازی ثابت کند که Score واقعاً در بازی به‌دست آمده است. برای ضدتقلب قوی، هر بازی باید بعداً یک روش server-authoritative یا challenge/verification مخصوص خودش داشته باشد.

### اجرای schema

`backend/schema.sql` را می‌توان روی دیتابیس D1 اجرا کرد. همه جدول‌های جدید با `IF NOT EXISTS` ساخته می‌شوند و جدول‌های v0.3.0 حذف نمی‌شوند.
