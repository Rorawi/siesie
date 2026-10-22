# CSA Version 2 implementation notes

## Customer experience delivered

- `/app` is a responsive customer workspace with Home, Bookings, My car, and Profile navigation.
- The guided request flow covers the current mechanic, roadside, and car-wash request types, plain-language issue details, optional photos, a preferred time for services that support it, map/GPS location, contact details, and a final review.
- “Explain my car problem” is a guided symptom prompt, not an AI diagnosis. It adds a plain-language description to the request and includes safety-oriented wording for smoke or overheating.
- A request is sent to the existing `/api/requests` route. The dispatcher continues to confirm the service area, provider, appointment, and price by phone. The app does not take payment.
- Booking status is read from the existing API and refreshed periodically. Provider details and the arrival verification code appear only when the API supplies them. There is no simulated provider movement.
- Vehicle profiles and saved home/work coordinates are stored in the current browser. Selected vehicle details are included in the existing request notes field so the current API and database schema remain compatible.
- The `/provider` route now reports that provider tools are not available. The previous route was a local demo with hardcoded jobs, earnings, location, and performance figures.
- Existing admin dispatch routes and APIs remain in place; they continue to use the existing request and mechanic records.

## Service and data boundaries

- The customer catalogue only offers service types already accepted by the request API and present in the current shared configuration. A customer can submit another request in plain language for dispatcher review.
- Towing is explicitly unavailable during the current launch phase. The API’s legacy `Tow truck` value is not presented as bookable.
- Although the configuration contains historical `priceFrom` values, they are not treated as a verified price list and are not displayed. The dispatcher confirms a price before work begins; additional work requires customer approval.
- Additional-work approval is not a structured app flow yet. The dispatcher must confirm a revised price with the customer verbally; no approval decision is stored by the current API.
- The current backend has no customer authentication or account model. This device can retain only the latest request reference, not a complete cross-device booking history.
- There is no structured vehicle table, service-record or receipt data, maintenance schedule, quote approval endpoint, customer cancellation endpoint, or payment integration. MoMo, card payment, refunds, and payout flows are not implemented in this customer experience.
- Service area and appointment availability are not checked automatically. Accra is the launch area described in the existing project documentation; the dispatcher confirms exact coverage and any preferred time.
- Status updates are manual dispatcher updates. Location search uses the existing OpenStreetMap/Nominatim route. Live provider tracking and automatic matching are not connected.

## Operations area status

- `/admin/requests` supports the existing manual dispatch workflow: immediate and scheduled queues, callback confirmation, assigning a configured mechanic, request status updates, and request history.
- `/admin/leads` shows the latest customer waitlist and provider-interest records and exports the full lists as CSV. These are leads, not verified customers or providers.
- Admin pages now share a Siesie operations header and navigation. Customer account management, provider verification, service/pricing/coverage configuration, complaints, refunds, payouts, and review moderation still need backend records and operational flows before they can be represented as working controls.
- Production admin routes are protected by the existing `ADMIN_PASSWORD` Basic Authentication check. Local development bypasses this check.

## Local development

Run `npm run dev` and open `http://localhost:3000/app`. `npm run build` uses Next.js’s supported Webpack build option because this environment’s default Turbopack build panicked while processing the existing Leaflet CSS worker. No new package dependencies were added.
