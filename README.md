# Siesie

Siesie is an on-demand mechanic marketplace for Ghana: car help, wherever you are.

## Getting Started

The current launch phase uses manual dispatch:

- `/` marketing landing page and customer waitlist form
- `/app` customer request form with GPS sharing, Ghana place search, a draggable map pin, and a plain request-status screen
- `/admin/requests` receptionist queue with manual assignment, status history, location corrections, and admin-only GPS map
- `/admin` redirects to the Requests inbox

Mechanic and tow-operator recruitment is paused while launch starts with one mechanic. Existing provider records and APIs are retained, but no public provider signup appears on the site. `/provider` explains that provider tools are not live; it no longer shows the previous demo workspace. The mechanic is contacted by phone; no automatic matching or live tracking runs. The hero and app-preview illustrations are conceptual marketing artwork; customer requests receive manual dispatcher updates.

## Run locally

```bash
npm run dev
npm run lint
npm run build
```

Open `http://localhost:3000` for the landing page, `/app` for customer requests, and `/admin/requests` for manual dispatch.

## Manual dispatch setup

Create a Supabase project, then run `supabase/schema.sql` in its SQL editor. It creates the `mechanics` and `service_requests` tables, indexes, row-level security, a private `request-photos` bucket, and the initial Puff Daddy mechanic record. The SQL is safe to rerun and also upgrades the arrival-code/status columns. The app calls Supabase REST and Storage APIs server-side; the service-role key is never exposed to browser code.

Copy `.env.example` to `.env` and fill in the project URL and service-role key from **Supabase → Project Settings → API**. Keep the service-role key private and never use a `NEXT_PUBLIC_` prefix for it. Configure these variables before production use:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`
- `NEXT_PUBLIC_SIESIE_WHATSAPP_NUMBER` (international digits only, e.g. `233...`)
- `NEXT_PUBLIC_SIESIE_RECEPTION_PHONE` (optional public number shown if a request has waited 10 minutes)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — enables email delivery
- `SMTP_FROM` — sender address in email From: header (defaults to `SMTP_USER`)
- `OWNER_EMAIL` — inbox that receives new request and waitlist signup notifications

After setting `.env`, restart `npm run dev`. Requests will use Supabase when both server variables are present; without them they use local JSON files. For production, enter the same server variables in the hosting provider’s environment settings.

Customers can share GPS or search a Ghana place and confirm its coordinates with a map pin. A landmark or extra direction is optional; a text-only location cannot be submitted. The map uses Leaflet and OpenStreetMap. Place search uses the public Nominatim service only after an explicit customer search, caches results in memory, and spaces uncached searches by at least one second per running app instance. Search terms are sent to OpenStreetMap and this is disclosed beside the search field. Nominatim’s public policy applies a one-request-per-second limit across the whole application, so a multi-instance deployment with more search traffic will need shared rate limiting/caching or another provider. Set the optional server-only `NOMINATIM_BASE_URL` to a compatible search service if the provider changes; it defaults to `https://nominatim.openstreetmap.org`.

The business WhatsApp and receptionist numbers have not yet been provided, so the app won’t display an unconfirmed receptionist number. Once configured, WhatsApp location sharing is enabled and delayed requests offer a receptionist call link. An assigned mechanic’s configured phone can also be shown for delayed requests.

When the dispatcher marks a request `Arrived`, the customer and dispatcher see the same generated four-digit verification code. The customer shares it with the mechanic before service begins. The customer app’s SOS action calls Ghana Police directly at `191`; it never routes the emergency call through Siesie.

For local development without Supabase, requests and mechanic records are stored in `data/requests.json` and `data/mechanics.json`; uploaded photos are stored under `data/request-photos/`. This fallback is only for local/single-server testing. Use Supabase for durable hosted storage. Admin pages, admin APIs, exports, and local photo viewing require Basic Auth in production; set a strong `ADMIN_PASSWORD` before deployment. Basic Auth is bypassed during `next dev` so local testing does not prompt, even if `.env` contains `ADMIN_PASSWORD`.

## Customer waitlist lead capture

The landing page collects customer waitlist signups. During local/self-hosted use, waitlist entries are stored in `data/waitlist.json`; previously collected provider-interest entries remain in `data/providers.json` for future recruitment. CSV downloads and the protected lead view are available under `/admin/leads`.

Set `ADMIN_PASSWORD` before exposing the lead view or CSV exports. The browser will request Basic Auth credentials; use any username and the configured password. Keep `data/*.json` out of source control because these files contain personal information.

To send confirmation and owner notification emails, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. Set `OWNER_EMAIL` to the inbox that should receive new provider applications and customer signup notifications. Without SMTP settings, submissions are still saved, but email delivery is skipped and the customer form reports that status.

The JSON files are suitable for local development or a single self-hosted server with persistent disk. They are not durable storage on serverless hosting such as Vercel, where deployments can have ephemeral filesystems and multiple instances. Request storage uses Supabase when configured; the waitlist/provider lead storage remains local JSON for now. No hosting project is linked in this workspace yet.

## Product assumptions

- Accra is the seeded launch area.
- Commission is currently a configurable percentage represented by the shared pricing module.
- Cash payments are not enabled.
- The customer location picker and admin location view use OpenStreetMap; the customer picker uses Leaflet with a draggable/clickable pin.
- The current launch phase is manual dispatch with one mechanic; matching and mechanic app work are deferred.

See [BACKLOG.md](BACKLOG.md) for prioritized work and [NEXT_SESSION_PROMPT.md](NEXT_SESSION_PROMPT.md) to continue in another AI session.

## CSA Version 2 customer experience

The customer app at `/app` now centres on car care requests, dispatcher-confirmed availability and pricing, saved vehicle details, device-local home/work locations, and manual booking updates. It keeps the current request and location-search APIs. The provider route explains that provider tools are not live; the previous provider demo values are no longer presented as real. See [CSA_V2_NOTES.md](CSA_V2_NOTES.md) for the current service boundary and backend work still needed.
