"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  MapPin,
  Phone,
  RefreshCw,
  Wrench,
} from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import { CALLBACK_ALERT_MS, callbackUrgencyFor, serviceWorkerTitle } from "@/lib/config";
import type { DispatchRequest, DispatchStatus, MechanicRecord } from "@/lib/dispatch";

const PAGE_SIZE = 5;

const statuses: { value: DispatchStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "callback_confirmed", label: "Callback confirmed" },
  { value: "assigned", label: "Assigned" },
  { value: "arrived", label: "Mechanic arrived" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
];

type AdminRequest = DispatchRequest & { photo_urls: string[] };
type QueueFilter = "requests" | "scheduled" | "completed" | "cancelled";

/** ms since request was created with no callback confirmed */
function callbackAge(req: AdminRequest): number {
  if (req.callback_confirmed_at) return -1;
  return Date.now() - new Date(req.created_at).getTime();
}

/** Return the alert threshold for this request's service type */
function alertThreshold(req: AdminRequest): number {
  const serviceLabels = req.service_type.split(", ").map((s) => s.trim());
  const tier = callbackUrgencyFor(serviceLabels);
  return CALLBACK_ALERT_MS[tier];
}

function isCallbackOverdue(req: AdminRequest): boolean {
  const age = callbackAge(req);
  if (age < 0) return false;
  return age >= alertThreshold(req);
}

// ============================================================
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
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const alertedIds = useRef(new Set<string>());
  // tick every second to update overdue badges without a full reload
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 5_000);
    return () => window.clearInterval(id);
  }, []);

  // request Web Notification permission on mount
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifPermission(Notification.permission);
      return;
    }
    Notification.requestPermission().then((p) => setNotifPermission(p));
  }, []);

  // alert sound (inline AudioContext — no file needed)
  const playAlert = useRef(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(); osc.stop(ctx.currentTime + 0.6);
    } catch { /* no audio context */ }
  });

  // fire callback overdue alerts
  useEffect(() => {
    const overdue = requests.filter((r) => isCallbackOverdue(r) && !["completed", "cancelled", "no_show"].includes(r.status));
    for (const req of overdue) {
      if (alertedIds.current.has(req.id)) continue;
      alertedIds.current.add(req.id);
      playAlert.current();
      if (Notification.permission === "granted") {
        new Notification("⚠️ Callback overdue — Siesie dispatch", {
          body: `${req.customer_name} · ${req.service_type} · submitted ${Math.round(callbackAge(req) / 60_000)} min ago`,
          tag: `callback-${req.id}`,
        });
      }
    }
  }, [tick, requests]);

  const filteredRequests = requests.filter((r) => {
    if (queueFilter === "scheduled") return r.is_scheduled && !["completed", "cancelled", "no_show"].includes(r.status);
    if (queueFilter === "completed") return r.status === "completed";
    if (queueFilter === "cancelled") return r.status === "cancelled" || r.status === "no_show";
    return !r.is_scheduled && !["completed", "cancelled", "no_show"].includes(r.status);
  });
  const pageCount = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const visibleRequests = filteredRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function changeFilter(filter: QueueFilter) { setQueueFilter(filter); setPage(1); }

  async function load(quiet = false) {
    try {
      const [reqRes, mechRes] = await Promise.all([
        fetch("/api/admin/requests", { cache: "no-store" }),
        fetch("/api/admin/mechanics", { cache: "no-store" }),
      ]);
      if (!reqRes.ok || !mechRes.ok) throw new Error("Could not load the dispatch dashboard.");
      const nextRequests = await reqRes.json() as AdminRequest[];
      const nextMechanics = await mechRes.json() as MechanicRecord[];
      if (!quiet) {
        setRequests((prev) => {
          const prevCount = prev.filter((r) => !["completed", "cancelled", "no_show"].includes(r.status)).length;
          const nextCount = nextRequests.filter((r) => !["completed", "cancelled", "no_show"].includes(r.status)).length;
          if (prevCount > 0 && nextCount > prevCount) setNotice(`${nextCount - prevCount} new request${nextCount - prevCount === 1 ? "" : "s"} received.`);
          return nextRequests;
        });
      } else {
        setRequests(nextRequests);
      }
      setMechanics(nextMechanics);
      if (nextMechanics[0]) {
        setMechanicName((c) => c || nextMechanics[0].name);
        setMechanicPhone((c) => c || nextMechanics[0].phone);
      }
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(true);
    const id = window.setInterval(() => void load(true), 12_000);
    return () => window.clearInterval(id);
  }, []);

  async function refreshNow() {
    setRefreshing(true);
    await load(false);
  }

  async function saveMechanic(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSavingMechanic(true);
    try {
      const res = await fetch("/api/admin/mechanics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: mechanics[0]?.id ?? "mechanic-puff-daddy", name: mechanicName, phone: mechanicPhone }),
      });
      const result = await res.json() as MechanicRecord | { error?: string };
      if (!res.ok || !("id" in result)) throw new Error((result as { error?: string }).error || "Could not save mechanic.");
      setMechanics((m) => m.map((x) => x.id === (result as MechanicRecord).id ? (result as MechanicRecord) : x));
      setNotice("Mechanic record updated.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save mechanic."); }
    finally { setSavingMechanic(false); }
  }

  async function updateRequest(id: string, update: {
    status?: DispatchStatus;
    assigned_mechanic_id?: string | null;
    location_label?: string;
    note?: string;
    confirm_callback?: boolean;
    callback_note?: string;
  }) {
    const res = await fetch(`/api/admin/requests/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    const result = await res.json() as AdminRequest | { error?: string };
    if (!res.ok) throw new Error((result as { error?: string }).error || "Could not update request.");
    setRequests((curr) => curr.map((r) => r.id === id ? { ...r, ...result as AdminRequest } : r));
    setNotice("Request updated.");
  }

  const overdueCount = requests.filter((r) => isCallbackOverdue(r) && !["completed", "cancelled", "no_show"].includes(r.status)).length;

  return (
    <main className="min-h-screen bg-[#f7faf7] px-4 py-5 pb-[calc(96px+env(safe-area-inset-bottom))] text-[var(--ink)] sm:px-8 sm:py-8 lg:pb-8">
      <div className="mx-auto max-w-7xl">
        <AdminHeader active="requests" />
        <header className="mt-7 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--muted)]">Manual dispatch</p>
            <h1 className="mt-1 text-3xl font-black">Requests</h1>
          </div>
          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-black text-white animate-pulse">
                <AlertTriangle className="h-3.5 w-3.5" />{overdueCount} callback{overdueCount > 1 ? "s" : ""} overdue
              </span>
            )}
            {notifPermission === "denied" && (
              <span className="text-xs text-orange-700 font-semibold">Notifications blocked</span>
            )}
            <button onClick={() => void refreshNow()} disabled={refreshing} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-bold disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh
            </button>
          </div>
        </header>

        {notice && <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-[#c8dabc] bg-[#eff7e9] px-4 py-3 text-sm font-semibold text-[#0b2f20]"><Bell className="h-4 w-4" />{notice}<button onClick={() => setNotice("")} className="ml-auto text-xs font-bold">Dismiss</button></div>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className={`${mobileView === "requests" ? "block" : "hidden"} lg:block`}>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--muted)]">Reception desk</p><h2 className="mt-1 text-xl font-black">Dispatch queue</h2></div>
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[var(--muted)]">{requests.length} total</span>
            </div>

            {/* queue tabs */}
            <div role="tablist" className="mb-4 grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--line)] bg-white p-1.5 md:grid-cols-4">
              {([
                { id: "requests", label: "Immediate", count: requests.filter((r) => !r.is_scheduled && !["completed", "cancelled", "no_show"].includes(r.status)).length },
                { id: "scheduled", label: "Scheduled", count: requests.filter((r) => r.is_scheduled && !["completed", "cancelled", "no_show"].includes(r.status)).length },
                { id: "completed", label: "Done", count: requests.filter((r) => r.status === "completed").length },
                { id: "cancelled", label: "Cancelled", count: requests.filter((r) => r.status === "cancelled" || r.status === "no_show").length },
              ] as const).map((item) => (
                <button key={item.id} role="tab" aria-selected={queueFilter === item.id} onClick={() => changeFilter(item.id)}
                  className={`flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-xs font-bold sm:text-sm ${queueFilter === item.id ? "bg-[#0b2f20] text-white" : "text-[var(--muted)] hover:bg-[#f6f8f5]"}`}>
                  <span>{item.label}</span><span className={`min-w-5 rounded-full px-1.5 py-0.5 text-xs leading-none ${queueFilter === item.id ? "bg-white/15" : "bg-[#f2f5f1]"}`}>{item.count}</span>
                </button>
              ))}
            </div>

            {loading ? (
              <p className="rounded-2xl border border-[var(--line)] bg-white p-6 text-sm text-[var(--muted)]">Loading requests…</p>
            ) : filteredRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white p-10 text-center">
                <Bell className="mx-auto h-7 w-7 text-[#1d542f]" />
                <h2 className="mt-3 font-black">No {queueFilter} requests</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Requests in this queue will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleRequests.map((req) => (
                  <RequestCard key={req.id} request={req} mechanics={mechanics} onUpdate={updateRequest} tick={tick} />
                ))}
              </div>
            )}

            {!loading && filteredRequests.length > 0 && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--line)] bg-white px-4 py-3">
                <p className="text-xs text-[var(--muted)]">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRequests.length)} of {filteredRequests.length}</p>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="min-h-9 rounded-lg border border-[var(--line)] px-3 text-xs font-bold disabled:opacity-40">Previous</button>
                  <span className="flex min-h-9 items-center px-2 text-xs font-semibold text-[var(--muted)]">{page} / {pageCount}</span>
                  <button disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="min-h-9 rounded-lg border border-[var(--line)] px-3 text-xs font-bold disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </section>

          <aside className={`${mobileView === "mechanics" ? "block" : "hidden"} space-y-4 lg:block`}>
            {/* mechanic panel */}
            <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
              <div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-[#0b2f20]" /><h2 className="font-black">Mechanics</h2></div>
              {mechanics.map((m) => (
                <div key={m.id} className="mt-4 rounded-xl bg-[#f6f8f5] p-3">
                  <p className="font-bold">{m.name}</p>
                  <a href={`tel:${m.phone.replace(/[^+\d]/g, "")}`} className="mt-1 inline-block text-sm font-semibold text-[#0b2f20]">{m.phone} · Call</a>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-[#1d542f]">{m.active ? "Available" : "Inactive"}</p>
                </div>
              ))}
              <form onSubmit={saveMechanic} className="mt-4 space-y-3 border-t border-[var(--line)] pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Edit primary mechanic</p>
                <label className="block"><span className="sr-only">Mechanic name</span><input value={mechanicName} onChange={(e) => setMechanicName(e.target.value)} placeholder={mechanics[0]?.name ?? "Mechanic name"} required maxLength={120} className="min-h-11 w-full rounded-lg border border-[var(--line)] px-3 text-sm" /></label>
                <label className="block"><span className="sr-only">Phone</span><input value={mechanicPhone} onChange={(e) => setMechanicPhone(e.target.value)} placeholder={mechanics[0]?.phone ?? "Phone number"} required maxLength={24} className="min-h-11 w-full rounded-lg border border-[var(--line)] px-3 text-sm" /></label>
                <button disabled={savingMechanic} className="min-h-11 w-full rounded-lg bg-[#0b2f20] px-3 text-sm font-bold text-white disabled:opacity-60">{savingMechanic ? "Saving…" : "Save mechanic"}</button>
              </form>
            </section>

            {/* dispatch steps */}
            <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
              <h2 className="font-black">Dispatch steps</h2>
              <ol className="mt-3 space-y-2 text-sm leading-6 text-[var(--muted)]">
                <li>1. Review issue and location (flag manual pin).</li>
                <li>2. Call customer within 1–3 min to confirm location.</li>
                <li>3. Mark callback confirmed with a note.</li>
                <li>4. Brief the assigned service professional and update the request.</li>
                <li>5. Update status as job progresses.</li>
              </ol>
            </section>
          </aside>
        </div>
      </div>

      {/* mobile bottom nav */}
      <nav aria-label="Admin sections" className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-white/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(23,33,31,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-2">
          <button type="button" onClick={() => setMobileView("requests")} aria-current={mobileView === "requests" ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-bold ${mobileView === "requests" ? "text-[#0b2f20]" : "text-[var(--muted)]"}`}><ClipboardList className="h-5 w-5" />Requests</button>
          <button type="button" onClick={() => setMobileView("mechanics")} aria-current={mobileView === "mechanics" ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-bold ${mobileView === "mechanics" ? "text-[#0b2f20]" : "text-[var(--muted)]"}`}><Wrench className="h-5 w-5" />Mechanics</button>
        </div>
      </nav>
    </main>
  );
}
// ============================
function RequestCard({
  request, mechanics, onUpdate, tick,
}: {
  request: AdminRequest;
  mechanics: MechanicRecord[];
  onUpdate: (id: string, update: {
    status?: DispatchStatus;
    assigned_mechanic_id?: string | null;
    location_label?: string;
    note?: string;
    confirm_callback?: boolean;
    callback_note?: string;
  }) => Promise<void>;
  tick: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState(request.status);
  const [mechanicId, setMechanicId] = useState(request.assigned_mechanic_id ?? "");
  const [location, setLocation] = useState(request.location_label);
  const [note, setNote] = useState("");
  const [callbackNote, setCallbackNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmingCallback, setConfirmingCallback] = useState(false);
  const [cardError, setCardError] = useState("");

  const isCancelled = request.status === "cancelled" || request.status === "no_show";
  const workerTitle = serviceWorkerTitle(request.service_type);
  const isCarWash = request.service_type.toLowerCase().includes("car wash");
  const isNoShow = request.status === "no_show";
  const isInProgress = request.status === "in_progress";
  const callbackDone = Boolean(request.callback_confirmed_at);
  const overdue = isCallbackOverdue(request);
  const age = callbackAge(request);
  const ageMin = age > 0 ? Math.round(age / 60_000) : 0;
  const ageLabel = (() => {
    const totalMin = ageMin;
    const d = Math.floor(totalMin / 1440);
    const h = Math.floor((totalMin % 1440) / 60);
    const m = totalMin % 60;
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || parts.length === 0) parts.push(`${m}m`);
    return parts.join(" ");
  })();

  // status chip colour
  const chipClass = isCancelled
    ? "bg-red-100 text-red-800"
    : isNoShow ? "bg-gray-100 text-gray-500"
    : isInProgress ? "bg-[#fff3d4] text-[#916d16]"
    : overdue && !callbackDone ? "bg-red-100 text-red-700"
    : "bg-[#eef4e9] text-[#0b2f20]";

  // card border when overdue
  const cardBorder = overdue && !callbackDone && !isCancelled
    ? "border-red-400 ring-2 ring-red-300"
    : "border-[var(--line)]";

  async function confirmCallback() {
    setConfirmingCallback(true); setCardError("");
    try {
      await onUpdate(request.id, { confirm_callback: true, callback_note: callbackNote });
      setCallbackNote("");
    } catch (e) { setCardError(e instanceof Error ? e.message : "Could not confirm callback."); }
    finally { setConfirmingCallback(false); }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setCardError("");
    try {
      await onUpdate(request.id, { status, assigned_mechanic_id: mechanicId || null, location_label: location, note });
      setNote("");
    } catch (e) { setCardError(e instanceof Error ? e.message : "Could not update this request."); }
    finally { setSaving(false); }
  }

  const mapUrl = request.latitude !== null && request.longitude !== null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${request.longitude - 0.008}%2C${request.latitude - 0.006}%2C${request.longitude + 0.008}%2C${request.latitude + 0.006}&layer=mapnik&marker=${request.latitude}%2C${request.longitude}`
    : null;

  // suppress ts warning about tick being "unused" — it drives the overdue re-render
  void tick;

  return (
    <article className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${cardBorder}`}>
      <div className="flex flex-nowrap items-center gap-3 border-b border-[var(--line)] p-4 sm:p-5">
        <button type="button" aria-expanded={isOpen} onClick={() => setIsOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black">{request.customer_name}</h2>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${chipClass}`}>
                {isNoShow ? "No-show" : request.status.replace(/_/g, " ")}
              </span>
              {request.location_source === "manual_pin" && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">Manual pin — verify location</span>
              )}
              {request.is_scheduled && request.scheduled_at && (
                <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700"><CalendarClock className="h-3 w-3" />{new Date(request.scheduled_at).toLocaleString("en-GH", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              )}
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">{request.customer_phone} · {request.service_type}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{new Date(request.created_at).toLocaleString()}</p>
            {overdue && !callbackDone && !isCancelled && (
              <p className="mt-2 flex items-center gap-1 text-xs font-bold text-red-700"><AlertTriangle className="h-3.5 w-3.5" />Callback overdue · {ageLabel} since submission</p>
            )}
            {(request.status === "arrived" || request.status === "in_progress") && (
              <p className="mt-2 inline-flex rounded-lg bg-[#eff7e9] px-3 py-2 text-sm font-bold text-[#0b2f20]">Customer code: {request.arrival_code}</p>
            )}
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" aria-label={isOpen ? "Collapse" : "Expand"} onClick={() => setIsOpen((o) => !o)} className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--line)] text-[var(--muted)]">
            <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
          <a href={`tel:${request.customer_phone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 justify-center rounded-lg border border-[var(--line)] px-2.5 py-2 text-xs font-bold sm:px-3 sm:text-sm"><Phone className="h-3.5 w-3.5" />Call</a>
        </div>
      </div>

      {isOpen && (
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_1fr]">
          {/* left: issue + location */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{isCarWash ? "Booking details" : "Issue or service details"}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{request.issue_description}</p>
            {request.notes && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-[#f6f8f5] p-3 text-sm leading-6"><strong>Notes:</strong> {request.notes}</p>}
            {request.photo_urls.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {request.photo_urls.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#1d542f]">View photo</a>)}
              </div>
            )}
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#f6f8f5] p-3 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0b2f20]" />
              <div>
                <p className="font-bold">Location {request.location_source === "manual_pin" ? <span className="font-normal text-orange-700">(manual pin — verify)</span> : <span className="font-normal text-[#1d542f]">(GPS)</span>}</p>
                <p className="mt-1 text-[var(--muted)]">{request.location_label}</p>
                {request.latitude !== null && request.longitude !== null && <p className="mt-1 text-xs text-[var(--muted)]">{request.latitude.toFixed(5)}, {request.longitude.toFixed(5)}</p>}
              </div>
            </div>
            {mapUrl ? <iframe title={`Map for ${request.customer_name}`} src={mapUrl} loading="lazy" className="mt-3 h-52 w-full rounded-xl border border-[var(--line)]" /> : <div className="mt-3 grid h-32 place-items-center rounded-xl border border-dashed border-[var(--line)] bg-[#fafbf9] text-xs text-[var(--muted)]">No GPS data</div>}
          </div>

          {/* right: callback + dispatch controls */}
          <div className="space-y-4">
            {/* callback confirmation */}
            {!callbackDone && !isCancelled && (
              <div className={`rounded-xl border p-4 ${overdue ? "border-red-300 bg-red-50" : "border-[#c8dabc] bg-[#f2f8ed]"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Phone className={`h-4 w-4 ${overdue ? "text-red-600" : "text-[#0b2f20]"}`} />
                  <h3 className={`font-black text-sm ${overdue ? "text-red-700" : "text-[#0b2f20]"}`}>
                    {overdue ? `⚠️ Call customer now — ${ageLabel} overdue` : "Admin callback required"}
                  </h3>
                </div>
                <p className="text-xs text-[var(--muted)] mb-3">Call the customer to confirm their location and details before dispatching. You cannot assign a {workerTitle.toLowerCase()} until this is done.</p>
                <input
                  value={callbackNote}
                  onChange={(e) => setCallbackNote(e.target.value)}
                  maxLength={500}
                  placeholder="Callback note, e.g. confirmed at Oxford Street roundabout"
                  className="min-h-10 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm mb-2"
                />
                <button onClick={() => void confirmCallback()} disabled={confirmingCallback}
                  className="min-h-10 w-full rounded-lg bg-[#0b2f20] px-3 text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />{confirmingCallback ? "Confirming…" : "Mark callback confirmed"}
                </button>
              </div>
            )}

            {callbackDone && (
              <div className="flex items-start gap-2 rounded-xl border border-[#c8dabc] bg-[#f2f8ed] p-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0b2f20]" />
                <div>
                  <p className="font-bold text-[#0b2f20]">Callback confirmed {new Date(request.callback_confirmed_at!).toLocaleTimeString()}</p>
                  {request.callback_note && <p className="mt-1 text-xs text-[var(--muted)]">{request.callback_note}</p>}
                </div>
              </div>
            )}

            {/* dispatch form */}
            <form onSubmit={submit} className={`space-y-3 rounded-xl border border-[var(--line)] p-4 ${isCancelled ? "bg-[#f8f8f6]" : ""}`}>
              <h3 className="font-black">Dispatch update</h3>
              {isCancelled && <p className="text-xs font-semibold text-[var(--muted)]">This request is closed.</p>}

              <label className="block"><span className="mb-1.5 block text-xs font-bold text-[var(--muted)]">Status</span>
                <select disabled={isCancelled} value={status} onChange={(e) => setStatus(e.target.value as DispatchStatus)} className="min-h-11 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm disabled:opacity-60">
                  {statuses.map((o) => <option key={o.value} value={o.value}>{o.value === "arrived" ? `${workerTitle} arrived` : o.label}</option>)}
                </select>
              </label>

              <label className="block"><span className="mb-1.5 block text-xs font-bold text-[var(--muted)]">{workerTitle}</span>
                <select disabled={isCancelled} value={mechanicId} onChange={(e) => setMechanicId(e.target.value)} className="min-h-11 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm disabled:opacity-60">
                  <option value="">Unassigned</option>
                  {mechanics.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.phone}</option>)}
                </select>
              </label>

              <label className="block"><span className="mb-1.5 block text-xs font-bold text-[var(--muted)]">Location (editable)</span>
                <input disabled={isCancelled} value={location} onChange={(e) => setLocation(e.target.value)} maxLength={300} className="min-h-11 w-full rounded-lg border border-[var(--line)] px-3 text-sm disabled:opacity-60" />
              </label>

              <label className="block"><span className="mb-1.5 block text-xs font-bold text-[var(--muted)]">Status note (optional)</span>
                <input disabled={isCancelled} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder={`e.g. called ${workerTitle.toLowerCase()} at 10:15`} className="min-h-11 w-full rounded-lg border border-[var(--line)] px-3 text-sm disabled:opacity-60" />
              </label>

              {cardError && <p role="alert" className="text-xs font-semibold text-red-700">{cardError}</p>}
              <button disabled={saving || isCancelled} className="min-h-11 w-full rounded-lg bg-[#0b2f20] px-3 text-sm font-bold text-white disabled:opacity-40">{saving ? "Saving…" : "Save dispatch update"}</button>
            </form>

            {/* status history */}
            <div className="rounded-xl bg-[#f6f8f5] p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Status history</h3>
              <ol className="mt-3 space-y-3">
                {request.status_history.map((ev, i) => (
                  <li key={`${ev.at}-${i}`} className="border-l-2 border-[#b9d2ae] pl-3">
                    <p className="text-sm font-bold capitalize">{ev.status === "arrived" ? `${workerTitle} arrived` : ev.status.replace(/_/g, " ")}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">{new Date(ev.at).toLocaleString()}{ev.note ? ` · ${ev.note}` : ""}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
