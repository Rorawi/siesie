"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, CircleUserRound, ClipboardList, House, MapPin, Navigation, ShieldCheck, Siren } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { SERVICE_CATEGORIES } from "@/lib/config";
import type { DispatchStatus, StatusEvent } from "@/lib/dispatch";

type CustomerRequestStatus = {
  id: string;
  service_type: string;
  status: DispatchStatus;
  created_at: string;
  updated_at: string;
  status_history: StatusEvent[];
  support_contacts?: { name: string; phone: string }[];
  mechanic?: { name: string; phone: string } | null;
  arrival_code: string | null;
};

type CustomerProfile = { name: string; phone: string };
type Tab = "home" | "activity" | "account";

function readSavedProfile(): CustomerProfile {
  return { name: readRememberedName(), phone: "" };
}

function readRememberedName() {
  if (typeof window === "undefined") return "";
  if (window.localStorage.getItem("siesie:remember-name") !== "true") return "";
  try {
    return window.localStorage.getItem("siesie:customer-name") ?? "";
  } catch {
    return "";
  }
}

const statusDisplay: Record<DispatchStatus, { title: string; detail: string }> = {
  new: { title: "Request received", detail: "We’re arranging your mechanic. Our dispatcher will call you if we need more details." },
  reviewed: { title: "Request reviewed", detail: "Our dispatcher has reviewed your request and is arranging your mechanic." },
  assigned: { title: "Mechanic on the way", detail: "We’ve briefed the mechanic and arranged their visit." },
  arrived: { title: "Mechanic has arrived", detail: "Ask the mechanic for your arrival code and share it before work begins." },
  in_progress: { title: "Service in progress", detail: "Your mechanic is working on your vehicle." },
  completed: { title: "Service completed", detail: "Your request has been marked complete. Thank you for choosing Siesie." },
  cancelled: { title: "Request cancelled", detail: "This request was cancelled. Contact us if you still need help." },
  no_show: { title: "We couldn’t complete this visit", detail: "Please contact Siesie so our dispatcher can help arrange the next step." },
};

export default function ManualDispatchCustomer() {
  const [tab, setTab] = useState<Tab>("home");
  const [requestId, setRequestId] = useState(() => typeof window === "undefined" ? "" : window.localStorage.getItem("siesie:active-request-id") ?? "");
  const [request, setRequest] = useState<CustomerRequestStatus | null>(null);
  const [requestBannerDismissed, setRequestBannerDismissed] = useState(false);
  const [statusToast, setStatusToast] = useState<{ title: string; detail: string } | null>(null);
  const lastStatus = useRef<DispatchStatus | null>(null);
  const [profile, setProfile] = useState<CustomerProfile>(readSavedProfile);
  const [rememberName, setRememberName] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("siesie:remember-name") === "true");
  const [customerName, setCustomerName] = useState(readRememberedName);
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [locationState, setLocationState] = useState<"idle" | "requesting" | "shared" | "unavailable">("idle");
  const [formState, setFormState] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const whatsAppNumber = process.env.NEXT_PUBLIC_SIESIE_WHATSAPP_NUMBER ?? "";

  useEffect(() => {
    if (!requestId) {
      return;
    }
    let active = true;
    async function loadStatus() {
      try {
        const response = await fetch(`/api/requests?id=${encodeURIComponent(requestId)}`, { cache: "no-store" });
        if (response.status === 404) {
          window.localStorage.removeItem("siesie:active-request-id");
          if (active) { setRequestId(""); setRequest(null); }
          return;
        }
        if (!response.ok) return;
        const nextRequest = await response.json() as CustomerRequestStatus;
        if (!active) return;
        if (lastStatus.current !== null && lastStatus.current !== nextRequest.status) {
          setStatusToast(statusDisplay[nextRequest.status]);
          setRequestBannerDismissed(false);
        }
        lastStatus.current = nextRequest.status;
        setRequest(nextRequest);
        if (nextRequest.status === "completed") setTab("activity");
      } catch {
        // Keep the last visible status if the network is temporarily unavailable.
      }
    }
    void loadStatus();
    const timer = window.setInterval(() => void loadStatus(), 10_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [requestId]);

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationState("unavailable");
      return;
    }
    setLocationState("requesting");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(coords.latitude);
        setLongitude(coords.longitude);
        setLocationState("shared");
      },
      () => setLocationState("unavailable"),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  }

  function toggleService(id: string) {
    setSelectedServices((current) => current.includes(id) ? current.filter((service) => service !== id) : [...current, id]);
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const typedLocation = String(data.get("location_label") ?? "").trim();
    if (latitude === null && !typedLocation) {
      setFormState({ type: "error", message: "Share your location or enter a landmark or address to continue." });
      setLocationState("unavailable");
      return;
    }
    setSubmitting(true);
    setFormState(null);
    data.set("location_label", typedLocation || "GPS location shared");
    if (latitude !== null && longitude !== null) {
      data.set("latitude", String(latitude));
      data.set("longitude", String(longitude));
    }
    selectedServices.forEach((service) => data.append("services", service));
    try {
      const response = await fetch("/api/requests", { method: "POST", body: data });
      const result = await response.json() as { id?: string; message?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error || "We couldn’t submit your request. Please try again.");
      const nextProfile = { name: String(data.get("customer_name") ?? ""), phone: String(data.get("customer_phone") ?? "") };
      window.localStorage.setItem("siesie:active-request-id", result.id);
      if (rememberName) {
        window.localStorage.setItem("siesie:remember-name", "true");
        window.localStorage.setItem("siesie:customer-name", nextProfile.name);
      } else {
        window.localStorage.removeItem("siesie:remember-name");
        window.localStorage.removeItem("siesie:customer-name");
      }
      setProfile(nextProfile);
      setCustomerName(rememberName ? nextProfile.name : "");
      setCustomerPhone("");
      setSelectedServices([]);
      setLatitude(null);
      setLongitude(null);
      setLocationLabel("");
      setLocationState("idle");
      setRequestBannerDismissed(false);
      lastStatus.current = "new";
      setStatusToast(null);
      setRequestId(result.id);
      setFormState({ type: "success", message: result.message || "Request received — we’re arranging your mechanic." });
      setTab("activity");
      form.reset();
    } catch (error) {
      setFormState({ type: "error", message: error instanceof Error ? error.message : "We couldn’t submit your request." });
    } finally {
      setSubmitting(false);
    }
  }

  function startNewRequest() {
    window.localStorage.removeItem("siesie:active-request-id");
    setRequestId("");
    setRequest(null);
    setRequestBannerDismissed(false);
    lastStatus.current = null;
    setStatusToast(null);
    setTab("home");
    setLatitude(null);
    setLongitude(null);
    setLocationLabel("");
    setLocationState("idle");
    setCustomerName(rememberName ? readRememberedName() : "");
    setCustomerPhone("");
    setSelectedServices([]);
    setFormState(null);
  }

  const encodedMessage = encodeURIComponent(`Hi Siesie, I need help with my car. My request reference is ${requestId || "not submitted yet"}. I could not share my location in the app. Please let me share my live location here.`);
  const whatsappHref = whatsAppNumber
    ? `https://wa.me/${whatsAppNumber.replace(/\D/g, "")}?text=${encodedMessage}`
    : null;

  return (
    <main className="min-h-screen bg-white pb-[calc(76px+env(safe-area-inset-bottom))] pt-[68px] text-[var(--ink)]">
      {statusToast && <div role="status" className="fixed inset-x-4 top-[78px] z-40 mx-auto flex max-w-xl items-start gap-3 rounded-xl border border-[#cddfc4] bg-[#f2f8ed] p-4 shadow-lg"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0b2f20]" /><div className="min-w-0 flex-1"><p className="font-bold">{statusToast.title}</p><p className="mt-1 text-sm text-[var(--muted)]">{statusToast.detail}</p></div><button type="button" onClick={() => setStatusToast(null)} aria-label="Dismiss notification" className="text-sm font-bold text-[#0b2f20]">Dismiss</button></div>}
      <header className="fixed inset-x-0 top-0 z-50 h-[68px] border-b border-[var(--line)] bg-white/95 backdrop-blur">
        <div className="relative mx-auto grid h-full max-w-6xl grid-cols-3 items-center px-5 sm:px-8">
          <div><Link href="/" aria-label="Back to Siesie landing page" className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)]"><ArrowLeft className="h-4 w-4" /></Link></div>
          <Link href="/app" aria-label="Siesie customer app" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><BrandLogo compact /></Link>
          <div />
        </div>
      </header>

      {tab === "home" ? (
        <section className="mx-auto max-w-3xl px-5 py-7 sm:px-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#edf6e6] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1d542f]"><span className="h-2 w-2 rounded-full bg-[#508b38]" />Customer request</span>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Tell us what your car needs.</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">A Siesie dispatcher will review your request and arrange a mechanic by phone.</p>

          {request && request.status !== "completed" && (!requestBannerDismissed || request.status === "in_progress") && <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#cfdfc7] bg-[#f4f8f1] p-4"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0b2f20]" /><div className="min-w-0 flex-1"><p className="font-bold">{statusDisplay[request.status].title}</p><p className="mt-1 text-sm text-[var(--muted)]">{request.service_type} · Reference {request.id.slice(0, 8)}</p></div><button onClick={() => { if (request.status !== "in_progress") setRequestBannerDismissed(true); setTab("activity"); }} className="text-sm font-bold text-[#0b2f20]">View</button></div>}

          <form onSubmit={submitRequest} className="mt-5 space-y-5 rounded-[22px] border border-[var(--line)] bg-white p-5 shadow-sm sm:p-6">
            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className="mb-1.5 block text-xs font-bold text-[var(--muted)]">Your name *</span><input name="customer_name" value={customerName} onChange={(event) => { const value = event.target.value; setCustomerName(value); if (rememberName) window.localStorage.setItem("siesie:customer-name", value); }} required maxLength={120} autoComplete="name" className="min-h-12 w-full rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[#0b2f20]" placeholder="Full name" /></label>
              <label><span className="mb-1.5 block text-xs font-bold text-[var(--muted)]">Phone number *</span><input name="customer_phone" type="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} required maxLength={24} autoComplete="tel" className="min-h-12 w-full rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[#0b2f20]" placeholder="024 000 0000" /></label>
            </div>

            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-[var(--muted)]"><input type="checkbox" role="switch" checked={rememberName} onChange={(event) => { const checked = event.target.checked; setRememberName(checked); if (checked) { window.localStorage.setItem("siesie:remember-name", "true"); if (customerName) window.localStorage.setItem("siesie:customer-name", customerName); } else { window.localStorage.removeItem("siesie:remember-name"); window.localStorage.removeItem("siesie:customer-name"); } }} className="h-5 w-5 accent-[#0b2f20]" />Remember my name on this device</label>

            <fieldset><legend className="text-sm font-black">What service do you need?</legend><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{SERVICE_CATEGORIES.map((service) => <label key={service.id} className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm font-semibold ${selectedServices.includes(service.label) ? "border-[#0b2f20] bg-[#f0f7e9] text-[#0b2f20]" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}><input type="checkbox" checked={selectedServices.includes(service.label)} onChange={() => toggleService(service.label)} className="h-4 w-4 accent-[#0b2f20]" /><Image src={service.logo} alt="" width={28} height={28} className="h-7 w-7 shrink-0 object-contain" /><span className="min-w-0 leading-tight">{service.shortLabel}</span></label>)}</div></fieldset>

            <label className="block"><span className="mb-1.5 block text-sm font-black">Describe the issue <span className="font-normal text-[var(--muted)]">(optional)</span></span><textarea name="issue_description" rows={4} maxLength={3000} className="w-full rounded-xl border border-[var(--line)] px-3 py-3 text-sm leading-6 outline-none focus:border-[#0b2f20]" placeholder="Tell us what happened, your car make/model, and anything the mechanic should know." /></label>

            <section className="rounded-xl border border-[var(--line)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-black">Where should we send help? *</h2><p className="mt-1 text-xs leading-5 text-[var(--muted)]">We’ll ask your device to share its location. We don’t show your location on a customer map.</p></div><button type="button" onClick={requestLocation} disabled={locationState === "requesting"} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-[#0b2f20] px-3 text-sm font-bold text-white disabled:opacity-60"><Navigation className="h-4 w-4" />{locationState === "requesting" ? "Getting location…" : "Share my location"}</button></div>
              {locationState === "shared" && <p role="status" className="mt-3 text-sm font-semibold text-[#0b2f20]">Location shared securely with the dispatcher.</p>}
              {locationState === "unavailable" && <p role="status" className="mt-3 text-sm text-[var(--muted)]">Location permission wasn’t available. Enter an address or landmark, or send it to us on WhatsApp.</p>}
              <label className="mt-4 block"><span className="mb-1.5 block text-xs font-bold text-[var(--muted)]">Landmark / address {latitude === null ? "*" : "(optional)"}</span><input name="location_label" value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} maxLength={300} className="min-h-12 w-full rounded-lg border border-[var(--line)] px-3 text-sm outline-none focus:border-[#0b2f20]" placeholder="e.g. near Oxford Street, Osu" /></label>
              {whatsappHref ? <a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#0b2f20]"><MapPin className="h-4 w-4" />Share my live location on WhatsApp</a> : <p className="mt-3 text-xs leading-5 text-[var(--muted)]">WhatsApp location sharing will be available when Siesie’s business number is configured. You can enter your landmark above.</p>}
            </section>

            <label className="block"><span className="mb-1.5 block text-sm font-black">Photos and notes <span className="font-normal text-[var(--muted)]">(optional)</span></span><input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple className="block w-full text-sm file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-[#edf6e6] file:px-3 file:font-bold file:text-[#0b2f20]" /><span className="mt-1 block text-xs text-[var(--muted)]">Up to 3 photos, 5 MB each.</span><textarea name="notes" rows={2} maxLength={2000} className="mt-3 w-full rounded-lg border border-[var(--line)] px-3 py-3 text-sm outline-none focus:border-[#0b2f20]" placeholder="Anything else the dispatcher should know?" /></label>

            {formState && <p role={formState.type === "error" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-sm font-semibold ${formState.type === "success" ? "bg-[#eff7e9] text-[#0b2f20]" : "bg-red-50 text-red-800"}`}>{formState.message}</p>}
            <button disabled={submitting} className="min-h-12 w-full rounded-xl bg-[#0b2f20] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Sending request…" : "Send request"}</button>
          </form>
          <div className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]"><ShieldCheck className="h-4 w-4 text-[#0b2f20]" />A Siesie dispatcher coordinates your request manually. No payment is collected in this demo.</div>
        </section>
      ) : tab === "activity" ? (
        <ActivityView request={request} requestId={requestId} onNewRequest={startNewRequest} />
      ) : (
        <AccountView profile={profile} />
      )}
      <a href="tel:191" aria-label="SOS: call Ghana Police on 191" title="Emergency: call Ghana Police directly" className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-5 z-50 inline-flex h-12 items-center gap-2 rounded-full bg-red-700 px-4 text-sm font-black text-white shadow-lg ring-4 ring-white sm:right-8"><Siren className="h-4 w-4" />SOS · 191</a>
      <BottomNav activeTab={tab} onChange={setTab} />
    </main>
  );
}

function ActivityView({ request, requestId, onNewRequest }: { request: CustomerRequestStatus | null; requestId: string; onNewRequest: () => void }) {
  const current = request ? statusDisplay[request.status] : null;
  return (
    <section className="mx-auto min-h-[calc(100dvh-144px)] w-full max-w-4xl px-5 py-8 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Request status</p><h1 className="mt-2 text-3xl font-black">Activity</h1>
      {request && (request.status === "arrived" || request.status === "in_progress") && request.arrival_code && <div className="mt-5 rounded-xl border border-[#cddfc4] bg-[#f2f8ed] p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#0b2f20]">Arrival verification code</p><p className="mt-1 text-3xl font-black tracking-[0.2em] text-[#0b2f20]">{request.arrival_code}</p><p className="mt-1 text-sm text-[var(--muted)]">Share this with the mechanic to confirm you’re meeting the right person.</p></div>}
      {request && request.mechanic && request.status !== "completed" && request.status !== "cancelled" && request.status !== "no_show" && (
        <div className="mt-5 flex items-center justify-between rounded-xl border border-[#cddfc4] bg-[#f2f8ed] p-4">
          <div>
            <p className="text-sm font-bold text-[#0b2f20]">{request.mechanic.name}</p>
            <p className="text-xs text-[var(--muted)]">Your assigned mechanic</p>
          </div>
          <a href={`tel:${request.mechanic.phone.replace(/[^+\d]/g, "")}`} className="flex h-10 items-center justify-center rounded-lg bg-[#0b2f20] px-4 text-sm font-bold text-white">Call mechanic</a>
        </div>
      )}
      {request && current ? <article className="mt-6 rounded-[22px] border border-[var(--line)] bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#edf6e6] text-[#0b2f20]"><ClipboardList className="h-5 w-5" /></div><div className="min-w-0 flex-1"><span className="rounded-full bg-[#eff7e9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0b2f20]">{request.status.replace("_", " ")}</span><h2 className="mt-3 text-xl font-black">{current.title}</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{current.detail}</p><p className="mt-4 border-t border-[var(--line)] pt-4 text-sm font-semibold">{request.service_type}</p><p className="mt-1 text-xs text-[var(--muted)]">Reference {request.id}</p>{request.status_history.length > 0 && <ol className="mt-5 space-y-3 border-l-2 border-[#d8e6d0] pl-4">{request.status_history.map((entry, index) => <li key={`${entry.at}-${index}`}><p className="text-sm font-bold capitalize">{statusDisplay[entry.status].title}</p><p className="mt-0.5 text-xs text-[var(--muted)]">{new Date(entry.at).toLocaleString()}</p></li>)}</ol>}{request.support_contacts && request.support_contacts.length > 0 && <div role="status" className="mt-5 rounded-xl border border-[#d8e6d0] bg-[#f4f8f1] p-4"><h3 className="font-bold">Need an update?</h3><p className="mt-1 text-sm leading-5 text-[var(--muted)]">Your request is taking longer than expected. Call us and we’ll follow up.</p><div className="mt-3 flex flex-wrap gap-2">{request.support_contacts.map((contact) => <a key={`${contact.name}-${contact.phone}`} href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} className="min-h-10 rounded-lg bg-[#0b2f20] px-3 py-2 text-sm font-bold text-white">Call {contact.name}</a>)}</div></div>}</div></div>{request.status === "completed" && <button onClick={onNewRequest} className="mt-6 min-h-11 w-full rounded-xl border border-[var(--line)] text-sm font-bold">Request another service</button>}</article> : <div className="mt-6 rounded-[20px] border border-dashed border-[var(--line)] bg-white px-5 py-10 text-center"><ClipboardList className="mx-auto h-8 w-8 text-[#0b2f20]" /><h2 className="mt-3 font-black">No active request</h2><p className="mt-1 text-sm text-[var(--muted)]">Submit a request and we’ll keep your status updated here.</p><button onClick={onNewRequest} className="mt-4 min-h-11 rounded-lg bg-[#0b2f20] px-4 text-sm font-bold text-white">Make a request</button>{requestId && <p className="mt-3 text-xs text-[var(--muted)]">Last reference: {requestId}</p>}</div>}
    </section>
  );
}

function AccountView({ profile }: { profile: CustomerProfile }) {
  return <section className="mx-auto min-h-[calc(100dvh-144px)] w-full max-w-4xl px-5 py-8 sm:px-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Your details</p><h1 className="mt-2 text-3xl font-black">Account</h1><div className="mt-6 flex items-center gap-4 rounded-[20px] border border-[var(--line)] bg-white p-5 shadow-sm"><div className="grid h-14 w-14 place-items-center rounded-full bg-[#edf6e6] text-lg font-black text-[#0b2f20]">{profile.name ? profile.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() : "SI"}</div><div><p className="font-black">{profile.name || "Siesie customer"}</p><p className="mt-1 text-sm text-[var(--muted)]">{profile.phone || "Phone number not added"}</p></div></div><div className="mt-4 rounded-[20px] border border-[var(--line)] bg-white px-4"><p className="flex min-h-14 items-center justify-between text-sm"><span className="font-bold">Service model</span><span className="text-[var(--muted)]">Manual dispatch</span></p></div></section>;
}

function BottomNav({ activeTab, onChange }: { activeTab: Tab; onChange: (tab: Tab) => void }) {
  const items = [
    { id: "home" as const, label: "Home", icon: House },
    { id: "activity" as const, label: "Activity", icon: ClipboardList },
    { id: "account" as const, label: "Account", icon: CircleUserRound },
  ];
  return <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-white/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(23,33,31,0.08)] backdrop-blur"><div className="mx-auto grid max-w-6xl grid-cols-3">{items.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => onChange(id)} aria-current={activeTab === id ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-bold transition ${activeTab === id ? "text-[#0b2f20]" : "text-[var(--muted)]"}`}><Icon className="h-5 w-5" strokeWidth={activeTab === id ? 2.5 : 1.8} />{label}</button>)}</div></nav>;
}

