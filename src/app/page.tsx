"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { ArrowRight, BadgeCheck, CarFront, CheckCircle2, Clock3, MapPinned, ShieldCheck, Star, Users } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

const steps = [
  {
    title: "Tell us what you need",
    text: "Choose the service and share your location in seconds.",
    icon: CarFront,
  },
  {
    title: "Our dispatcher arranges help",
    text: "A Siesie dispatcher reviews your request and briefs the mechanic by phone.",
    icon: Users,
  },
  {
    title: "Get clear status updates",
    text: "We’ll let you know when your mechanic is on the way, has arrived, and completes the service.",
    icon: Clock3,
  },
];

const reasons = [
  "Verified, vetted help for drivers who want peace of mind",
  "Clear pricing before the work starts",
  "Clear dispatcher updates as your request progresses",
  "Support for roadside emergencies, diagnostics and regular maintenance",
];

export default function HomePage() {
  const [waitlistState, setWaitlistState] = useState<{ type: "idle" | "success" | "error"; message: string }>({ type: "idle", message: "" });
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  async function handleWaitlistSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setWaitlistLoading(true);
    setWaitlistState({ type: "idle", message: "" });

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      city: String(formData.get("city") ?? ""),
      honeypot: String(formData.get("website") ?? ""),
    };

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setWaitlistState({ type: "error", message: data.error || "Something went wrong." });
        return;
      }

      form.reset();
      setWaitlistState({ type: "success", message: data.message || "You’re on the list." });
    } catch {
      setWaitlistState({ type: "error", message: "Something went wrong. Please try again." });
    } finally {
      setWaitlistLoading(false);
    }
  }

  return (
    <main className="bg-[var(--paper)] text-[var(--ink)]">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--paper)]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <BrandLogo compact className="shrink-0" />
          <nav className="hidden items-center gap-6 text-sm font-semibold text-[var(--muted)] md:flex">
            <a href="#how-it-works" className="transition hover:text-[var(--ink)]">How it works</a>
            <a href="#why-siesie" className="transition hover:text-[var(--ink)]">Why Siesie</a>
            <a href="#waitlist" className="transition hover:text-[var(--ink)]">Waitlist</a>
          </nav>
          <div className="flex items-center gap-2">
            <a href="/app" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--ink)] transition hover:bg-[var(--paper)]">Open app</a>
            <a href="#waitlist" className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-black text-[var(--accent-dark)] transition hover:brightness-95">Join now</a>
          </div>
        </div>
      </header>

   <section className="relative mx-auto grid max-w-6xl gap-8 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.6fr_1.6fr] lg:items-center lg:gap-0 lg:pb-24 lg:pt-16">

  {/* TEXT */}
  <div className="relative z-30">
    <span className="inline-flex rounded-full border border-[#dfecc7] bg-[#ebf9d7] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-dark)]">
      Ghana’s safer roadside fix
    </span>

    <h1 className="mt-5 max-w-xl text-5xl font-black leading-[0.94] tracking-[-0.06em] sm:text-6xl">
      A trusted mechanic, sent to you.
    </h1>

    <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--muted)]">
      Siesie helps drivers in Ghana request trusted roadside help without the
      stress, the guesswork, or the workshop runaround.
    </p>

    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <a
        href="#waitlist"
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-6 py-4 text-sm font-black text-[var(--accent-dark)] shadow-sm transition hover:brightness-95"
      >
        Join the waitlist
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>

    <div className="mt-8 flex flex-wrap gap-4 text-sm text-[var(--muted)]">
      <span className="inline-flex items-center gap-2">
        <BadgeCheck className="h-4 w-4 text-[var(--accent-dark)]" />
        Verified mechanics
      </span>

      <span className="inline-flex items-center gap-2">
        <MapPinned className="h-4 w-4 text-[var(--accent-dark)]" />
        Accra coverage
      </span>

      <span className="inline-flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[var(--accent-dark)]" />
        Safe and upfront
      </span>
    </div>
  </div>

  {/* HERO IMAGE */}
  <div className="relative z-10 flex items-center justify-center lg:-ml-19 lg:-mr-42 lg:min-h-[550px]">
    <div className="relative w-[125%] max-w-none">

      <Image
        src="/hero-img.png"
        alt="Siesie mechanic helping a driver with roadside assistance"
        width={1671}
        height={941}
        priority
        className="
          relative z-0
          h-auto w-full
          object-contain
          [mask-image:linear-gradient(to_right,transparent_0%,black_20%,black_88%,transparent_100%)]
          [-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_20%,black_88%,transparent_100%)]
        "
      />

      {/* Fade only — behind the text/image content */}
      <div
        className="
          pointer-events-none
          absolute inset-0 z-10
          bg-[radial-gradient(ellipse_at_center,transparent_55%,#fff_94%)]
        "
      />

    </div>
  </div>

</section>

      <section id="how-it-works" className="border-y border-[var(--line)] bg-[var(--panel)]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <div className="mb-8 text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">How it works</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Quick help when your day is already busy.</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {steps.map(({ title, text, icon: Icon }, index) => (
              <div key={title} className="rounded-[28px] border border-[var(--line)] bg-[var(--paper)] p-6">
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-[#ebf9d7] text-[var(--accent-dark)]">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">0{index + 1}</p>
                <h3 className="text-xl font-black">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

   <section id="why-siesie" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
  {/* Section heading */}
  <div className="mx-auto max-w-3xl text-center">
    <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--accent-dark)]">
      Why Siesie
    </p>

    <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-[var(--ink)] sm:text-5xl lg:text-6xl">
      Built for real drivers and real roadside stress.
    </h2>

    <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
      We make roadside help feel less like a gamble and more like a service
      you can trust — especially if you want a calm, transparent experience
      without awkward negotiation.
    </p>
  </div>

  {/* Feature cards */}
  <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
    {reasons.map((reason, index) => (
      <div
        key={reason}
        className={[
          "group relative min-h-[390px] overflow-hidden rounded-[28px] p-7 sm:min-h-[430px]",
          "transition-transform duration-300 hover:-translate-y-1",
          index === 0
            ? "bg-[#BFE8D2] text-[#123F31]"
            : index === 1
              ? "bg-[#D9F27A] text-[#274000]"
              : index === 2
                ? "bg-[#DCEBE5] text-[#173D35]"
                : "bg-[#E8DFC8] text-[#4A3F24]",
        ].join(" ")}
      >
        {/* Decorative radial ray pattern */}
        <div
          className="
            pointer-events-none absolute inset-0 opacity-[0.16]
            bg-[repeating-conic-gradient(from_-18deg_at_50%_0%,transparent_0deg_9deg,rgba(255,255,255,0.8)_9deg_18deg)]
          "
        />

        {/* Soft glow */}
        <div
          className="
            pointer-events-none absolute -left-16 -top-20 h-72 w-72
            rounded-full bg-white/20 blur-3xl
          "
        />

        {/* Content */}
        <div className="relative z-10 flex h-full min-h-[336px] flex-col">
          <p className="mt-auto max-w-[290px] text-2xl font-black leading-[1.08] tracking-[-0.035em] sm:text-[28px]">
            {reason}
          </p>
        </div>
      </div>
    ))}
  </div>
</section>

<div className=" bg-[#0C2F20]">

      <section id="waitlist" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/80">Get early access</p>
            <h2 className="mt-3 text-3xl text-white tracking-tight sm:text-4xl">Join the Siesie waitlist for Accra.</h2>
            <p className="mt-4 max-w-lg text-base leading-8 text-white/90">
              We’re building a safer, more reliable way to get help when your car breaks down. Leave your details and we’ll email you as soon as Siesie launches in your area.
            </p>
            <div className="mt-6 flex items-center gap-3 rounded-[20px] border border-[var(--line)] bg-[var(--panel)] p-4 shadow-sm">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#ebf9d7] text-[var(--accent-dark)]"><BadgeCheck className="h-5 w-5" /></div>
              <p className="text-sm font-semibold text-[var(--ink)]">Early access, launch updates and service alerts.</p>
            </div>
          </div>

          <form onSubmit={handleWaitlistSubmit} className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm sm:p-6">
            <div className="hidden"><input name="website" tabIndex={-1} autoComplete="off" /></div>
            <div className="grid gap-4">
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Full name (optional)</span>
                <input name="name" className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent-dark)]" placeholder="Ama Boateng" />
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Email address</span>
                <input name="email" type="email" required className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent-dark)]" placeholder="you@example.com" />
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">City / area (optional)</span>
                <input name="city" className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent-dark)]" placeholder="Osu, Accra" />
              </label>
            </div>

            {waitlistState.message ? (
              <p className={`mt-4 rounded-xl border px-3 py-2 text-sm ${waitlistState.type === "success" ? "border-[#dff7cf] bg-[#eefad8] text-[var(--accent-dark)]" : "border-[#f3d5d5] bg-[#fff1f1] text-[#8a2f2f]"}`}>
                {waitlistState.message}
              </p>
            ) : null}

            <button type="submit" disabled={waitlistLoading} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-black text-[var(--accent-dark)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70">
              {waitlistLoading ? "Joining..." : "Join the waitlist"}
            </button>
          </form>
        </div>
      </section>
</div>

      <footer className="border-t border-[var(--line)] bg-[var(--panel)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <BrandLogo compact />
            <p className="mt-4 max-w-md text-sm leading-7 text-[var(--muted)]">Car help, wherever you are.</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-[var(--muted)]">
            <a href="#how-it-works" className="transition hover:text-[var(--ink)]">How it works</a>
            <a href="#why-siesie" className="transition hover:text-[var(--ink)]">Why Siesie</a>
            <a href="/admin/leads" className="transition hover:text-[var(--ink)]">Lead admin</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
