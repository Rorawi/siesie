"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell, ChevronDown, ClipboardList, MapPin, RefreshCw, Wrench } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import type { DispatchRequest, DispatchStatus, MechanicRecord } from "@/lib/dispatch";

const PAGE_SIZE = 5;

const statuses: { value: DispatchStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "assigned", label: "Assigned" },
  { value: "arrived", label: "Mechanic arrived" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
];

type AdminRequest = DispatchRequest & { photo_urls: string[] };
type QueueFilter = "requests" | "completed" | "cancelled";

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [mechanics, setMechanics] = useState<MechanicRecord[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mechanicName, setMechanicName] = useState("");
  const [mechanicPhone, setMechanicPhone] = useState("");
  const [savingMechanic, setSavingMechanic] = useState(false);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("requests");
  const [page, setPage] = useState(1);
  const [mobileView, setMobileView] = useState<"requests" | "mechanics">("requests");
  const filteredRequests = requests.filter((request) => {
    if (queueFilter === "completed") return request.status === "completed";
    if (queueFilter === "cancelled") return request.status === "cancelled" || request.status === "no_show";
    return request.status !== "completed" && request.status !== "cancelled" && request.status !== "no_show";
  });
  const pageCount = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const visibleRequests = filteredRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function changeFilter(filter: QueueFilter) {
    setQueueFilter(filter);
    setPage(1);
  }

  useEffect(() => {
    let active = true;
    let previousCount: number | null = null;
    async function load() {
      try {
        const [requestResponse, mechanicResponse] = await Promise.all([
          fetch("/api/admin/requests", { cache: "no-store" }),
          fetch("/api/admin/mechanics", { cache: "no-store" }),
        ]);
        if (!requestResponse.ok || !mechanicResponse.ok) throw new Error("Could not load the dispatch dashboard.");
        const nextRequests = await requestResponse.json() as AdminRequest[];
        const nextMechanics = await mechanicResponse.json() as MechanicRecord[];
        if (!active) return;
        if (previousCount !== null && nextRequests.length > previousCount) {
          setNotice(`${nextRequests.length - previousCount} new request${nextRequests.length - previousCount === 1 ? "" : "s"} received.`);
        }
        previousCount = nextRequests.length;
        setRequests(nextRequests);
        setMechanics(nextMechanics);
        if (nextMechanics[0]) {
          setMechanicName((current) => current || nextMechanics[0].name);
          setMechanicPhone((current) => current || nextMechanics[0].phone);
        }
        setError("");
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load requests.");
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }
    void load();
    const interval = window.setInterval(() => void load(), 12000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  async function refreshNow() {
    setRefreshing(true);
    try {
      const [requestResponse, mechanicResponse] = await Promise.all([
        fetch("/api/admin/requests", { cache: "no-store" }),
        fetch("/api/admin/mechanics", { cache: "no-store" }),
      ]);
      if (!requestResponse.ok || !mechanicResponse.ok) throw new Error("Could not refresh the dispatch dashboard.");
      setRequests(await requestResponse.json() as AdminRequest[]);
      setMechanics(await mechanicResponse.json() as MechanicRecord[]);
      setError("");
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Could not refresh requests.");
    } finally {
      setRefreshing(false);
    }
  }

  async function saveMechanic(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingMechanic(true);
    try {
      const response = await fetch("/api/admin/mechanics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: mechanics[0]?.id ?? "mechanic-puff-daddy", name: mechanicName, phone: mechanicPhone }),
      });
      const result = await response.json() as MechanicRecord | { error?: string };
      if (!response.ok || !("id" in result)) throw new Error((result as { error?: string }).error || "Could not save mechanic.");
      setMechanics((current) => current.map((mechanic) => mechanic.id === result.id ? result : mechanic));
      setNotice("Mechanic record updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save mechanic.");
    } finally {
      setSavingMechanic(false);
    }
  }

  async function updateRequest(id: string, update: { status?: DispatchStatus; assigned_mechanic_id?: string | null; location_label?: string; note?: string }) {
    const response = await fetch(`/api/admin/requests/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    const result = await response.json() as AdminRequest | { error?: string };
    if (!response.ok) throw new Error((result as { error?: string }).error || "Could not update request.");
    setRequests((current) => current.map((request) => request.id === id ? { ...request, ...result as AdminRequest } : request));
    setNotice("Request updated.");
  }

  return (
    <main className="min-h-screen bg-[#f7faf7] px-4 py-5 pb-[calc(96px+env(safe-area-inset-bottom))] text-[var(--ink)] sm:px-8 sm:py-8 lg:pb-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
          <div className="flex items-center gap-3">
            <Link href="/admin" aria-label="Back to operations" className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] bg-white hidden"><ArrowLeft className="h-4 w-4" /></Link>
            <div><BrandLogo compact /><p className="mt-1 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Manual dispatch · Requests</p></div>
          </div>
          <button onClick={() => void refreshNow()} disabled={refreshing} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-bold disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
        </header>

        {notice && <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-[#c8dabc] bg-[#eff7e9] px-4 py-3 text-sm font-semibold text-[#0b2f20]"><Bell className="h-4 w-4" />{notice}<button onClick={() => setNotice("")} className="ml-auto text-xs font-bold">Dismiss</button></div>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className={`${mobileView === "requests" ? "block" : "hidden"} lg:block`}>
            <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--muted)]">Reception desk</p><h1 className="mt-1 text-3xl font-black">Requests</h1></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[var(--muted)]">{requests.length} total</span></div>
            <div role="tablist" aria-label="Request queues" className="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-[var(--line)] bg-white p-1">
              {([{ id: "requests", label: "Requests", count: requests.filter((item) => !["completed", "cancelled", "no_show"].includes(item.status)).length }, { id: "completed", label: "Completed", count: requests.filter((item) => item.status === "completed").length }, { id: "cancelled", label: "Cancelled", count: requests.filter((item) => item.status === "cancelled" || item.status === "no_show").length }] as const).map((item) => <button key={item.id} role="tab" aria-selected={queueFilter === item.id} onClick={() => changeFilter(item.id)} className={`min-h-11 rounded-lg px-2 text-xs font-bold sm:text-sm ${queueFilter === item.id ? "bg-[#0b2f20] text-white" : "text-[var(--muted)] hover:bg-[#f6f8f5]"}`}>{item.label} <span className="ml-1 opacity-75">{item.count}</span></button>)}
            </div>
            {loading ? <p className="rounded-2xl border border-[var(--line)] bg-white p-6 text-sm text-[var(--muted)]">Loading requests…</p> : filteredRequests.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white p-10 text-center"><Bell className="mx-auto h-7 w-7 text-[#1d542f]" /><h2 className="mt-3 font-black">No {queueFilter} requests</h2><p className="mt-1 text-sm text-[var(--muted)]">Requests in this queue will appear here.</p></div> : <div className="space-y-3">{visibleRequests.map((request) => <RequestCard key={request.id} request={request} mechanics={mechanics} onUpdate={updateRequest} />)}</div>}
            {!loading && filteredRequests.length > 0 && <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--line)] bg-white px-4 py-3"><p className="text-xs text-[var(--muted)]">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRequests.length)} of {filteredRequests.length}</p><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="min-h-9 rounded-lg border border-[var(--line)] px-3 text-xs font-bold disabled:opacity-40">Previous</button><span className="flex min-h-9 items-center px-2 text-xs font-semibold text-[var(--muted)]">{page} / {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="min-h-9 rounded-lg border border-[var(--line)] px-3 text-xs font-bold disabled:opacity-40">Next</button></div></div>}
          </section>

          <aside className={`${mobileView === "mechanics" ? "block" : "hidden"} space-y-4 lg:block`}>
            <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
              <div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-[#0b2f20]" /><h2 className="font-black">Mechanics</h2></div>
              {mechanics.map((mechanic) => <div key={mechanic.id} className="mt-4 rounded-xl bg-[#f6f8f5] p-3"><p className="font-bold">{mechanic.name}</p><a href={`tel:${mechanic.phone.replace(/[^+\d]/g, "")}`} className="mt-1 inline-block text-sm font-semibold text-[#0b2f20]">{mechanic.phone} · Call mechanic</a><p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-[#1d542f]">{mechanic.active ? "Available for manual assignment" : "Inactive"}</p></div>)}
              <form onSubmit={saveMechanic} className="mt-4 space-y-3 border-t border-[var(--line)] pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Edit primary mechanic</p>
                <label className="block"><span className="sr-only">Mechanic name</span><input value={mechanicName} onChange={(event) => setMechanicName(event.target.value)} placeholder={mechanics[0]?.name ?? "Mechanic name"} required maxLength={120} className="min-h-11 w-full rounded-lg border border-[var(--line)] px-3 text-sm" /></label>
                <label className="block"><span className="sr-only">Mechanic phone</span><input value={mechanicPhone} onChange={(event) => setMechanicPhone(event.target.value)} placeholder={mechanics[0]?.phone ?? "Phone number"} required maxLength={24} className="min-h-11 w-full rounded-lg border border-[var(--line)] px-3 text-sm" /></label>
                <button disabled={savingMechanic} className="min-h-11 w-full rounded-lg bg-[#0b2f20] px-3 text-sm font-bold text-white disabled:opacity-60">{savingMechanic ? "Saving…" : "Save mechanic"}</button>
              </form>
            </section>
            <section className="rounded-2xl border border-[var(--line)] bg-white p-5"><h2 className="font-black">Dispatch steps</h2><ol className="mt-3 space-y-2 text-sm leading-6 text-[var(--muted)]"><li>1. Review issue and location.</li><li>2. Call the mechanic to brief and assign.</li><li>3. Update status as the job progresses.</li></ol></section>
          </aside>
        </div>
      </div>
      <nav aria-label="Admin sections" className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-white/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(23,33,31,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-2">
          <button type="button" onClick={() => setMobileView("requests")} aria-current={mobileView === "requests" ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-bold ${mobileView === "requests" ? "text-[#0b2f20]" : "text-[var(--muted)]"}`}><ClipboardList className="h-5 w-5" />Requests</button>
          <button type="button" onClick={() => setMobileView("mechanics")} aria-current={mobileView === "mechanics" ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-bold ${mobileView === "mechanics" ? "text-[#0b2f20]" : "text-[var(--muted)]"}`}><Wrench className="h-5 w-5" />Mechanics</button>
        </div>
      </nav>
    </main>
  );
}

function RequestCard({ request, mechanics, onUpdate }: { request: AdminRequest; mechanics: MechanicRecord[]; onUpdate: (id: string, update: { status?: DispatchStatus; assigned_mechanic_id?: string | null; location_label?: string; note?: string }) => Promise<void> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState(request.status);
  const [mechanicId, setMechanicId] = useState(request.assigned_mechanic_id ?? "");
  const [location, setLocation] = useState(request.location_label);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isCancelled = request.status === "cancelled" || request.status === "no_show";
  const isNoShow = request.status === "no_show";
  const isInProgress = request.status === "in_progress";
  const statusChipClass = request.status === "cancelled"
    ? "bg-red-100 text-red-800"
    : isNoShow
      ? "bg-gray-100 text-gray-500"
      : isInProgress
        ? "bg-[#fff3d4] text-[#916d16]"
        : "bg-[#eef4e9] text-[#0b2f20]";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onUpdate(request.id, { status, assigned_mechanic_id: mechanicId || null, location_label: location, note });
      setNote("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update this request.");
    } finally {
      setSaving(false);
    }
  }

  const mapUrl = request.latitude !== null && request.longitude !== null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${request.longitude - 0.008}%2C${request.latitude - 0.006}%2C${request.longitude + 0.008}%2C${request.latitude + 0.006}&layer=mapnik&marker=${request.latitude}%2C${request.longitude}`
    : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
      <div className="flex flex-nowrap items-center gap-3 border-b border-[var(--line)] p-4 sm:p-5">
        <button type="button" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black">{request.customer_name}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusChipClass}`}>{isNoShow ? "No-show · Closed" : request.status.replace("_", " ")}</span></div><p className="mt-1 text-sm text-[var(--muted)]">{request.customer_phone} · {request.service_type}</p><p className="mt-1 text-xs text-[var(--muted)]">{new Date(request.created_at).toLocaleString()}</p>{(request.status === "arrived" || request.status === "in_progress") && <p className="mt-2 inline-flex rounded-lg bg-[#eff7e9] px-3 py-2 text-sm font-bold text-[#0b2f20]">Customer verification code: {request.arrival_code}</p>}</div>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" aria-label={isOpen ? "Collapse request" : "Expand request"} aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)} className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--line)] text-[var(--muted)]">
            <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
          <a href={`tel:${request.customer_phone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-[var(--line)] px-2.5 py-2 text-xs font-bold sm:px-3 sm:text-sm">Call customer</a>
        </div>
      </div>
      {isOpen && <div id={`request-details-${request.id}`} className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_1fr]">
        <div><p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Issue</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{request.issue_description}</p>{request.notes && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-[#f6f8f5] p-3 text-sm leading-6"><strong>Notes:</strong> {request.notes}</p>}
          {request.photo_urls.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{request.photo_urls.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#1d542f]">View attached photo</a>)}</div>}
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#f6f8f5] p-3 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0b2f20]" /><div><p className="font-bold">Submitted location</p><p className="mt-1 text-[var(--muted)]">{request.location_label}</p>{request.latitude !== null && request.longitude !== null && <p className="mt-1 text-xs text-[var(--muted)]">{request.latitude.toFixed(5)}, {request.longitude.toFixed(5)}</p>}</div></div>
          {mapUrl ? <iframe title={`Admin location map for ${request.customer_name}`} src={mapUrl} loading="lazy" className="mt-3 h-52 w-full rounded-xl border border-[var(--line)]" /> : <div className="mt-3 grid h-32 place-items-center rounded-xl border border-dashed border-[var(--line)] bg-[#fafbf9] px-4 text-center text-xs text-[var(--muted)]">No GPS pin shared. Use the address/landmark or add location details below.</div>}
        </div>
        <div className="space-y-4">
          <form onSubmit={submit} className={`space-y-3 rounded-xl border border-[var(--line)] p-4 ${isCancelled ? "bg-[#f8f8f6]" : ""}`}>
            <h3 className="font-black">Manual dispatch update</h3>
            {isCancelled && <p className="text-xs font-semibold text-[var(--muted)]">This request is closed; dispatch updates are disabled.</p>}
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-[var(--muted)]">Status</span><select disabled={isCancelled} value={status} onChange={(event) => setStatus(event.target.value as DispatchStatus)} className="min-h-11 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60">{statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-[var(--muted)]">Assigned mechanic</span><select disabled={isCancelled} value={mechanicId} onChange={(event) => setMechanicId(event.target.value)} className="min-h-11 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"><option value="">Unassigned</option>{mechanics.map((mechanic) => <option key={mechanic.id} value={mechanic.id}>{mechanic.name} · {mechanic.phone}</option>)}</select></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-[var(--muted)]">Location / landmark (editable)</span><input disabled={isCancelled} value={location} onChange={(event) => setLocation(event.target.value)} maxLength={300} className="min-h-11 w-full rounded-lg border border-[var(--line)] px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-[var(--muted)]">Status note (optional)</span><input disabled={isCancelled} value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} placeholder="e.g. called mechanic at 10:15" className="min-h-11 w-full rounded-lg border border-[var(--line)] px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60" /></label>
            {error && <p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
            <button disabled={saving || isCancelled} className="min-h-11 w-full rounded-lg bg-[#0b2f20] px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Saving…" : "Save dispatch update"}</button>
          </form>
          <div className="rounded-xl bg-[#f6f8f5] p-4"><h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Status history</h3><ol className="mt-3 space-y-3">{request.status_history.map((event, index) => <li key={`${event.at}-${index}`} className="border-l-2 border-[#b9d2ae] pl-3"><p className="text-sm font-bold capitalize">{event.status.replace("_", " ")}</p><p className="mt-0.5 text-xs text-[var(--muted)]">{new Date(event.at).toLocaleString()}{event.note ? ` · ${event.note}` : ""}</p></li>)}</ol></div>
        </div>
      </div>}
    </article>
  );
}
