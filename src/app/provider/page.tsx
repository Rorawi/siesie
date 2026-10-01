"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DEMO_MECHANIC, formatGhs } from "@/lib/config";
import { type DemoJob, DEMO_JOB_EVENT, readDemoJob, retryMatching, updateDemoJob } from "@/lib/demoJob";

export default function ProviderPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [job, setJob] = useState<DemoJob | null>(null);
  const [completionPin, setCompletionPin] = useState("");

  useEffect(() => {
    const syncJob = () => setJob(readDemoJob());
    syncJob();
    window.addEventListener(DEMO_JOB_EVENT, syncJob);
    window.addEventListener("storage", syncJob);
    return () => {
      window.removeEventListener(DEMO_JOB_EVENT, syncJob);
      window.removeEventListener("storage", syncJob);
    };
  }, []);

  const requestState = job?.status ?? "none";
  const hasIncomingRequest = requestState === "matching";

  return (
    <main className="min-h-screen bg-[#edf3ed] p-5 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/app"
              className="text-sm font-bold text-[var(--accent-dark)]"
            >
              ← Customer app
            </Link>
            <Link
              href="/admin"
              className="text-xs font-bold text-[var(--muted)]"
            >
              Operations dashboard →
            </Link>
        </div>
        <div className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex rounded-full bg-[var(--navy)] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">
              Mechanic app
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-tight">
              Good morning, {DEMO_MECHANIC.name.split(" ")[0]}.
            </h1>
            <p className="mt-2 text-[var(--muted)]">
              Manage requests, jobs, and earnings in one place.
            </p>
          </div>
          <button
            onClick={() => setIsOnline((value) => !value)}
            className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm"
          >
            <span
              className={`h-3 w-3 rounded-full ${isOnline ? "bg-[#78c844]" : "bg-slate-300"}`}
            />
            <span className="text-sm font-bold">
              {isOnline ? "Online" : "Offline"}
            </span>
            <span className="text-xs text-[var(--muted)]">Tap to change</span>
          </button>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat
            label="Today’s earnings"
            value={formatGhs(420)}
            detail="+18% this week"
          />
          <Stat label="Completed jobs" value="6" detail="4.9 average rating" />
          <Stat label="Acceptance rate" value="86%" detail="Top 20% in Accra" />
        </div>
        <section className="mt-6 rounded-[26px] bg-[var(--navy)] p-5 text-white shadow-sm sm:p-7">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--accent)]">
                {requestState === "none"
                  ? "No active request"
                  : requestState === "matching"
                  ? "Incoming request"
                  : requestState === "accepted"
                    ? "Accepted · Ready to navigate"
                    : requestState === "en_route"
                      ? "En route to customer"
                      : requestState === "arrived"
                        ? "Arrived · Inspection"
                        : requestState === "in_progress"
                          ? "Job in progress"
                          : requestState === "completed"
                            ? "Job completed"
                            : "Request declined"}
              </p>
              <h2 className="mt-2 text-2xl font-black">Emergency breakdown</h2>
              <p className="mt-2 text-sm text-white/60">
                2.4 km away · Customer rating 4.8
              </p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">
              {requestState === "matching" ? "00:18" : "Demo"}
            </span>
          </div>
          <div className="mt-6 grid gap-3 rounded-2xl bg-white/8 p-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-white/45">Pickup</p>
              <p className="mt-1 font-bold">Oxford Street, Osu</p>
            </div>
            <div>
              <p className="text-xs text-white/45">Vehicle</p>
              <p className="mt-1 font-bold">Toyota Corolla · GR 2044-22</p>
            </div>
            <div>
              <p className="text-xs text-white/45">Your payout</p>
              <p className="mt-1 font-bold text-[var(--accent)]">
                {formatGhs(120)}
              </p>
            </div>
          </div>
          {requestState === "in_progress" && <label className="mt-5 block"><span className="text-xs font-bold text-white/65">Customer completion PIN</span><input value={completionPin} onChange={(event) => setCompletionPin(event.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="Enter PIN shown in customer app" className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-white/35 focus:border-[var(--accent)]" /></label>}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              disabled={!isOnline || !hasIncomingRequest}
              onClick={() => updateDemoJob("accepted")}
              className="min-h-12 flex-1 rounded-xl bg-[var(--accent)] px-5 text-sm font-black text-[var(--accent-dark)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {requestState === "matching" ? "Accept request" : requestState === "accepted" ? "Accepted" : "Accept unavailable"}
            </button>
            <button
              disabled={!hasIncomingRequest}
              onClick={retryMatching}
              className="min-h-12 rounded-xl border border-white/15 px-5 text-sm font-bold text-white/70 disabled:opacity-40"
            >
              Decline
            </button>
            {requestState === "accepted" && <button onClick={() => updateDemoJob("en_route")} className="min-h-12 flex-1 rounded-xl bg-white/10 px-5 text-sm font-bold">Start navigation</button>}
            {requestState === "en_route" && <button onClick={() => updateDemoJob("arrived")} className="min-h-12 flex-1 rounded-xl bg-white/10 px-5 text-sm font-bold">Mark arrived</button>}
            {requestState === "arrived" && <button onClick={() => updateDemoJob("in_progress")} className="min-h-12 flex-1 rounded-xl bg-white/10 px-5 text-sm font-bold">Start job</button>}
            {requestState === "in_progress" && <button disabled={completionPin !== (job?.completionPin ?? "2468")} onClick={() => updateDemoJob("completed")} className="min-h-12 flex-1 rounded-xl bg-[var(--accent)] px-5 text-sm font-black text-[var(--accent-dark)] disabled:cursor-not-allowed disabled:opacity-40">Complete job</button>}
          </div>
        </section>
        <div className="mt-6 grid gap-4 sm:grid-cols-[1.2fr_.8fr]">
          <div className="map-grid min-h-[260px] rounded-[26px] border border-white p-5">
            <div className="flex items-center justify-between">
              <p className="rounded-full bg-white/90 px-3 py-2 text-xs font-bold shadow">
                Demand around you
              </p>
              <span className="rounded-full bg-white/90 px-3 py-2 text-xs text-[var(--muted)] shadow">
                Live
              </span>
            </div>
          </div>
          <div className="rounded-[26px] border border-[var(--line)] bg-white p-5">
            <p className="text-sm font-bold">Your next payout</p>
            <p className="mt-3 text-4xl font-black">{formatGhs(860)}</p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Available after completed jobs are confirmed.
            </p>
            <button className="mt-6 min-h-12 w-full rounded-xl border border-[var(--line)] text-sm font-bold">
              View earnings
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black">{value}</p>
      <p className="mt-2 text-xs text-[var(--muted)]">{detail}</p>
    </div>
  );
}
