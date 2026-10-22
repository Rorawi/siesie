import { ArrowDownToLine, Info, UsersRound, Wrench } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import { getProviderEntries, getWaitlistEntries } from "@/lib/leadStorage";

export default async function LeadsAdminPage() {
  const waitlistEntries = await getWaitlistEntries();
  const providerEntries = await getProviderEntries();

  return (
    <main className="min-h-screen bg-[#f7faf7] px-4 py-5 text-[var(--ink)] sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <AdminHeader active="leads" />
        <div className="mb-7 mt-7 flex flex-col gap-4 border-b border-[var(--line)] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Growth and provider onboarding</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Lead capture</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Review customer signups and provider interest. Export the complete lists when you need to follow up outside this workspace.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/api/waitlist/export" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#174b35] px-4 text-sm font-bold text-white transition hover:bg-[#123d2c]"><ArrowDownToLine className="h-4 w-4" />Waitlist CSV</a>
            <a href="/api/providers/export" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-bold text-[var(--ink)] transition hover:bg-[#f1f5ef]"><ArrowDownToLine className="h-4 w-4" />Provider CSV</a>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[#fbfcfa] px-5 py-4">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf5e9] text-[#174b35]"><UsersRound className="h-5 w-5" /></span><div><h2 className="font-black">Customer waitlist</h2><p className="mt-0.5 text-xs text-[var(--muted)]">Latest 12 signups</p></div></div>
              <span className="rounded-lg bg-[#edf5e9] px-2.5 py-1.5 text-xs font-bold text-[#174b35]">{waitlistEntries.length} total</span>
            </div>

            {waitlistEntries.length === 0 ? (
              <div className="px-5 py-12 text-center"><UsersRound className="mx-auto h-7 w-7 text-[#91a394]" /><h3 className="mt-3 font-bold">No customer signups yet</h3><p className="mt-1 text-sm text-[var(--muted)]">New waitlist entries will appear here.</p></div>
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {waitlistEntries.slice(0, 12).map((entry) => (
                  <div key={entry.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="truncate font-bold">{entry.name || "Anonymous"}</p><p className="mt-1 truncate text-sm text-[var(--muted)]">{entry.email}</p></div>
                      <time dateTime={entry.createdAt} className="shrink-0 pt-0.5 text-xs text-[var(--muted)]">{new Date(entry.createdAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}</time>
                    </div>
                    {entry.city ? <p className="mt-2 text-xs font-semibold text-[#536258]">{entry.city}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[#fbfcfa] px-5 py-4">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f4f1e8] text-[#746442]"><Wrench className="h-5 w-5" /></span><div><h2 className="font-black">Provider interest</h2><p className="mt-0.5 text-xs text-[var(--muted)]">Latest 12 applications</p></div></div>
              <span className="rounded-lg bg-[#f4f1e8] px-2.5 py-1.5 text-xs font-bold text-[#746442]">{providerEntries.length} total</span>
            </div>

            {providerEntries.length === 0 ? (
              <div className="px-5 py-12 text-center"><Wrench className="mx-auto h-7 w-7 text-[#a59a7b]" /><h3 className="mt-3 font-bold">No provider applications yet</h3><p className="mt-1 text-sm text-[var(--muted)]">Mechanic and tow operator interest will appear here.</p></div>
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {providerEntries.slice(0, 12).map((entry) => (
                  <div key={entry.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="truncate font-bold">{entry.fullName}</p><p className="mt-1 text-sm text-[var(--muted)]">{entry.phone}</p></div>
                      <span className="shrink-0 rounded-lg bg-[#f4f1e8] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#746442]">{entry.type}</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-[#536258]">{entry.area} · {entry.yearsOfExperience} years of experience</p>
                    <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Services: {entry.servicesOffered.join(", ") || "Not listed"}</p>
                    {entry.note ? <p className="mt-2 rounded-lg bg-[#f7faf7] px-3 py-2 text-xs leading-5 text-[#536258]">{entry.note}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
        <p className="mt-5 flex items-center gap-2 text-xs text-[var(--muted)]"><Info className="h-3.5 w-3.5" />Only the latest 12 records appear here; CSV exports include the full lists.</p>
      </div>
    </main>
  );
}
