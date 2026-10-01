# Siesie Backlog

Last updated: 2026-10-01

Launch mode is Phase 1 manual dispatch: one mechanic, founder/receptionist coordinates requests by phone. The customer app has no live map, automatic matching, or mechanic app. Public mechanic/tow recruitment is intentionally hidden until the provider network is ready.

## Next up

- [ ] **Security: rotate the Supabase service-role key.** It was exposed in a chat attachment. Create a replacement in Supabase, update the local server environment and hosting environment, then revoke the exposed key. Never paste keys into chat or commit them.
- [ ] **Connect and verify Supabase persistence.** Apply `supabase/schema.sql`; confirm request creation, admin updates/status history, mechanics, and private photo uploads use Supabase. Confirm `.env` has the required server-only URL/key, without printing either value.
- [ ] **Configure launch contact numbers.** Add the confirmed Siesie WhatsApp and receptionist numbers; test the location-share link and delayed-request call actions.
- [ ] **Connect production email.** Configure SMTP and owner notification recipient; test confirmation and provider/request notifications.
- [ ] **Choose and link the hosting project.** Set production secrets, persistent storage, domain, and HTTPS; verify admin authentication and lead privacy in production.

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
