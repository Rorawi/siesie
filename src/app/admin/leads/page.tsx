import Link from "next/link";
import { getProviderEntries, getWaitlistEntries } from "@/lib/leadStorage";

export default async function LeadsAdminPage() {
  const waitlistEntries = await getWaitlistEntries();
  const providerEntries = await getProviderEntries();

  return (
    <main className="min-h-screen bg-[var(--paper)] px-5 py-10 text-[var(--ink)] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Admin</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Lead capture</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="/api/waitlist/export" className="rounded-xl bg-[var(--navy)] px-4 py-2 text-sm font-bold text-white">Export waitlist CSV</a>
            <a href="/api/providers/export" className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold text-[var(--ink)]">Export provider CSV</a>
            <Link href="/" className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold text-[var(--ink)]">Back to landing page</Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-[28px] border border-[var(--line)] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black">Customer waitlist</h2>
              <span className="rounded-full bg-[#ebf9d7] px-2.5 py-1 text-xs font-bold text-[var(--accent-dark)]">{waitlistEntries.length} entries</span>
            </div>

            {waitlistEntries.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No customer signups yet.</p>
            ) : (
              <div className="space-y-3">
                {waitlistEntries.slice(0, 12).map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-[var(--line)] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black">{entry.name || "Anonymous"}</p>
                      <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{new Date(entry.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">{entry.email}</p>
                    {entry.city ? <p className="mt-1 text-xs text-[var(--muted)]">{entry.city}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-[var(--line)] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black">Provider interest</h2>
              <span className="rounded-full bg-[#ebf9d7] px-2.5 py-1 text-xs font-bold text-[var(--accent-dark)]">{providerEntries.length} entries</span>
            </div>

            {providerEntries.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No mechanic or tow operator applications yet.</p>
            ) : (
              <div className="space-y-3">
                {providerEntries.slice(0, 12).map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-[var(--line)] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black">{entry.fullName}</p>
                      <span className="rounded-full border border-[var(--line)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{entry.type}</span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">{entry.phone}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{entry.area} · {entry.yearsOfExperience} years</p>
                    <p className="mt-2 text-xs text-[var(--muted)]">Services: {entry.servicesOffered.join(", ") || "Not listed"}</p>
                    {entry.note ? <p className="mt-2 text-xs text-[var(--muted)]">Note: {entry.note}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
