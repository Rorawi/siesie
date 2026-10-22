# Siesie Backlog

Last updated: 2026-10-13

Launch mode is Phase 1 manual dispatch: one mechanic, founder/receptionist coordinates requests by phone. The customer app supports GPS and a static location search/pin picker, but has no automatic matching, live tracking, or mechanic app. Public mechanic/tow recruitment is intentionally hidden until the provider network is ready.

## Next up

- [ ] **Security: rotate the Supabase service-role key first.** It was exposed in a chat attachment. Create a replacement in Supabase, update local `.env` and Vercel env settings, then revoke the exposed key. Never copy the value into chat, source, or logs.
- [ ] **Set production environment variables on Vercel.** The live 500 (customer requests) and 503 (admin/requests) errors are caused by missing env vars on Vercel. Add these in **Vercel → Project → Settings → Environment Variables** and redeploy:
  - `SUPABASE_URL` — your Supabase project URL
  - `SUPABASE_SERVICE_ROLE_KEY` — server-only service-role key (never use `NEXT_PUBLIC_`)
  - `ADMIN_PASSWORD` — a strong password for the admin dashboard Basic Auth
  - `NEXT_PUBLIC_SIESIE_WHATSAPP_NUMBER` — optional, enables WhatsApp location link
  - `NEXT_PUBLIC_SIESIE_RECEPTION_PHONE` — optional, shown after 10-min stale requests
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `OWNER_EMAIL` — optional, enables email notifications
- [ ] **Configure WhatsApp number.** Receptionist phone (`0532332643`) is already set. Add the confirmed Siesie WhatsApp number (international format, e.g. `233XXXXXXXXX`) to `NEXT_PUBLIC_SIESIE_WHATSAPP_NUMBER` in `.env` and Vercel; test the location-share link in the customer form.
- [ ] **Connect production email.** Code is wired up: new requests and waitlist signups send owner notifications; waitlist also sends customer confirmations. Add SMTP credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `OWNER_EMAIL`) to `.env` and Vercel, then test end-to-end delivery.

## Phase 1 Improvements

- [ ] Before location-search traffic grows or runs on multiple instances, add shared Nominatim rate limiting/caching or switch to a geocoding provider with a suitable quota.
- [ ] Add focused end-to-end coverage for customer request submission, status toasts, arrival verification code, SOS, pagination, and cancelled/no-show protections.
- [ ] Confirm Ghana emergency-call guidance and the direct police number with an authoritative local source before public launch.
- [ ] Add an admin-visible storage/connection health indicator and a clear recovery path when Supabase is unavailable.
- [ ] Test photo upload and signed photo viewing against the configured private Supabase Storage bucket.

## Later: Provider Network

- [ ] Reopen mechanic/tow recruitment when preparing to onboard a second or third provider; restore the public form only with an active vetting/review process.
- [ ] Define provider vetting requirements and document/manual checks before granting access.
- [ ] Build a provider workspace only after providers agree to use it; add opt-in location sharing only after the manual launch phase proves the need.
- [ ] Consider automated matching and live tracking only after the provider network and consent model are ready.

## Done

- [x] Manual customer request intake, location fallback, optional photos/notes, and plain request status.
- [x] Customer GPS or OpenStreetMap/Nominatim Ghana place search with map pin adjustment; coordinates are required and manual pins are flagged for callback verification.
- [x] Admin request inbox, manual mechanic assignment/status/history, editable location, and admin-only GPS map.
- [x] Arrival verification code shared with customer only after the mechanic is marked arrived.
- [x] Direct customer SOS call action (currently links to Ghana Police 191; verify before launch).
- [x] Hide public mechanic/tow recruitment during one-mechanic launch.
- [x] Replace the landing-page live-match mock with the mechanic/customer illustration and clarify that app imagery is conceptual for Phase 1.
- [x] Confirmed Supabase connection works (REST + Storage APIs respond correctly with service-role key).
- [x] Fixed service label truncation in customer request form ("Breakdown" was clipped in 2-col grid; added `min-w-0`).
- [x] Removed debug `console.log` from `proxy.ts` that was leaking config state to production logs.
- [x] Fixed all lint errors (prefer-const in requests route, unused imports and unescaped entity in page.tsx).
- [x] Created `.env.example` documenting all required and optional env vars (was missing; referenced in README).
- [x] Fixed README: corrected `.env.local` → `.env`, added SMTP/OWNER_EMAIL to documented variable list.
- [x] Wired owner notification email on new service request submission (`POST /api/requests`); fire-and-forget, safe to use without SMTP configured.
- [x] Receptionist phone (`0532332643`) confirmed in `.env`; WhatsApp number still needs to be provided.
