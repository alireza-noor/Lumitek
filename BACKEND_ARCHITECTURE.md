# Lumitek online architecture

Frontend: existing static HTML/CSS/JS + PWA
Backend: Cloudflare Pages Functions
Database: Cloudflare D1
AI: Gemini API through `/api/ai`
Authentication: server-side sessions
Payments: server-side adapter + verification (provider-specific)
Admin: `/pages/admin.html`

## Why payment is not marked as live
A real payment gateway requires your merchant credentials and a provider-specific request/verification flow. The code records `pending` transactions and refuses to claim success until the provider verifies them.

## Production checklist
- Create D1 and run `backend/schema.sql`.
- Bind D1 as `DB`.
- Add `GEMINI_API_KEY` as a Secret.
- Add `ADMIN_EMAIL`.
- Deploy Pages Functions.
- Test `/api/health`.
- Create the owner account using `ADMIN_EMAIL`.
- Choose a payment provider and implement its server adapter + callback verification.
- Replace stale canonical/OG URLs with the final Lumitek domain if necessary.
