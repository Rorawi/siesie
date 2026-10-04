# Siesie Backlog

Last updated: 2026-10-04

Launch mode is Phase 1 manual dispatch: one mechanic, founder/receptionist coordinates requests by phone. The customer app has no live map, automatic matching, or mechanic app. Public mechanic/tow recruitment is intentionally hidden until the provider network is ready.

## Next up

- [ ] **Set production environment variables on Vercel.** The live 500 (customer requests) and 503 (admin/requests) errors are caused by missing env vars on Vercel. Add these in **Vercel → Project → Settings → Environment Variables** and redeploy:
  - `SUPABASE_URL` — your Supabase project URL
  - `SUPABASE_SERVICE_ROLE_KEY` — server-only service-role key (never use `NEXT_PUBLIC_`)
  - `ADMIN_PASSWORD` — a strong password for the admin dashboard Basic Auth
  - `NEXT_PUBLIC_SIESIE_WHATSAPP_NUMBER` — optional, enables WhatsApp location link
  - `NEXT_PUBLIC_SIESIE_RECEPTION_PHONE` — optional, shown after 10-min stale requests
- [ ] **Security: rotate the Supabase service-role key.** It was exposed in a chat attachment. Create a replacement in Supabase, update local `.env` and Vercel env settings, then revoke the exposed key.
- [ ] **Configure launch contact numbers.** Add the confirmed Siesie WhatsApp and receptionist numbers; test the location-share link and delayed-request call actions.
- [ ] **Connect production email.** Configure SMTP and owner notification recipient; test confirmation and provider/request notifications.

## Phase 1 Improvements

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
- [x] Admin request inbox, manual mechanic assignment/status/history, editable location, and admin-only GPS map.
- [x] Arrival verification code shared with customer only after the mechanic is marked arrived.
- [x] Direct customer SOS call action (currently links to Ghana Police 191; verify before launch).
- [x] Hide public mechanic/tow recruitment during one-mechanic launch.
- [x] Confirmed Supabase connection works (REST + Storage APIs respond correctly with service-role key).
- [x] Fixed service label truncation in customer request form ("Breakdown" was clipped in 2-col grid; added `min-w-0`).
- [x] Removed debug `console.log` from `proxy.ts` that was leaking config state to production logs.
- [x] Fixed all lint errors (prefer-const in requests route, unused imports and unescaped entity in page.tsx).
