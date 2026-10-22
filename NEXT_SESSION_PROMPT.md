# Next Session Prompt

Continue work on Siesie, an on-demand car-help service in Ghana.

Before coding, read `README.md`, `BACKLOG.md`, and the applicable `AGENTS.md` instructions. The active launch mode is Phase 1 manual dispatch: one mechanic, with the founder/receptionist reviewing requests and coordinating by phone. Customer requests are submitted through `/app`; the dispatcher queue is `/admin/requests`.

Start with the highest-priority unchecked item in `BACKLOG.md`. The immediate priority is security: rotate the Supabase service-role key that was exposed in a chat attachment before using it for new deployment configuration. Then verify production env settings and request persistence. Never print, quote, commit, or ask the user to paste secret values in chat. Check only whether required keys are configured; tell the user to add them directly to local/hosting secret settings.

Preserve existing customer/request data. Do not overwrite or delete request records during testing. Use clearly synthetic test records and remove only those exact test records afterward.

Do not restore public mechanic/tow recruitment until the user is preparing to onboard more providers. The customer request form uses GPS or a static OpenStreetMap place-search/pin picker; do not add automatic matching, live customer tracking, or a mechanic mobile app in Phase 1. The hero and app-preview images are conceptual marketing artwork only, not a claim of live matching, ETA, or tracking. Keep public claims consistent with manual dispatch.

After each task:
- Update `BACKLOG.md`: mark completed items, record blockers/decisions, and add newly discovered follow-up work.
- Run focused lint/build/tests and report the results.
- Keep README setup instructions in sync with actual configuration and behavior.

Keep Supabase service-role credentials server-only and never add them to a `NEXT_PUBLIC_` variable. Production admin access must remain protected.
