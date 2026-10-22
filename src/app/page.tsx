"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Clock3,
  Home,
  MapPinned,
  Menu,
  ShieldCheck,
  Siren,
  Users,
  Wrench,
  X,
} from "lucide-react";

import BrandLogo from "@/components/BrandLogo";
import WhySiesieCarAnimation from "@/components/WhySiesieCarAnimation";

const reasons = [
  "Dispatcher-reviewed requests for a calmer experience",
  "Price confirmed before the work starts",
  "Clear dispatcher updates as your request progresses",
  "Roadside support and selected car care services",
];

const navLinks = [
  { label: "Services", href: "#services" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Why Siesie", href: "#why-siesie" },
  { label: "About", href: "#about" },
];

const services = [
  {
    name: "Mechanic & servicing",
    intro: "Routine car care and help making sense of a problem.",
    image: "/services-logo/oil-change-logo.png",
    width: 431,
    height: 455,
    imageStyle: "contain",
    artBackground: "bg-[#edf4ed]",
    details: ["Oil and filter changes", "Brake service and diagnostics", "Battery and tyre requests"],
    action: "Request car servicing",
  },
  {
    name: "Car wash & detailing",
    intro: "Choose a wash package and request service at a supported location.",
    image: "/services-logo/car-wash.png",
    width: 1536,
    height: 1024,
    imageStyle: "cover",
    artBackground: "bg-[#09141b]",
    details: ["Exterior wash or interior clean", "Full wash", "Detailing package"],
    action: "Book a car wash",
  },
  {
    name: "Roadside assistance",
    intro: "Tell us what happened and where your car is safely parked.",
    image: "/services-logo/breakdown-logo.png",
    width: 514,
    height: 449,
    imageStyle: "contain",
    artBackground: "bg-[#eef3ee]",
    details: ["Breakdown requests", "Battery and flat-tyre help", "Towing is unavailable at launch"],
    action: "Request roadside help",
  },
];

const bookingSteps = [
  { title: "Choose a service", text: "Pick car care, a wash package, or the roadside help you need.", icon: CarFront },
  { title: "Share where and when", text: "Add your location and car details. Choose a preferred time for services that support appointments.", icon: MapPinned },
  { title: "Get a clear confirmation", text: "A dispatcher checks coverage, timing and price, then confirms the person assigned to your request.", icon: Users },
  { title: "Follow the updates", text: "See dispatcher-entered status updates in your booking as the service progresses.", icon: Clock3 },
];

const trustPoints = [
  { title: "A person reviews your request", text: "A Siesie dispatcher checks the details and confirms the next step with you.", icon: Users },
  { title: "Price before work begins", text: "The dispatcher confirms availability and price before the service starts.", icon: BadgeCheck },
  { title: "Know who is assigned", text: "When someone is assigned, the booking shows the mechanic or car wash professional handling it.", icon: ShieldCheck },
];

export default function HomePage() {
  const [waitlistState, setWaitlistState] = useState<{ type: "idle" | "success" | "error"; message: string }>({ type: "idle", message: "" });
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-12">
          <Link href="/" aria-label="Siesie home" className="shrink-0"><BrandLogo compact /></Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm font-semibold text-[var(--muted)] md:flex">
            {navLinks.map((link) => <a key={link.href} href={link.href} className="py-2 transition-colors hover:text-[var(--ink)]">{link.label}</a>)}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/app" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#087a45] px-4 text-sm font-bold text-white transition-colors hover:bg-[#066c3d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087a45] sm:px-5">
              <span className="hidden sm:inline">Book a service</span><span className="sm:hidden">Book now</span><ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--line)] text-[var(--ink)] md:hidden"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen ? (
          <nav id="mobile-navigation" aria-label="Mobile navigation" className="border-t border-[var(--line)] bg-white px-5 py-3 md:hidden">
            <div className="mx-auto grid max-w-[1320px] gap-1">
              {navLinks.map((link) => <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-[var(--ink)] hover:bg-[#f1f5ef]">{link.label}</a>)}
            </div>
          </nav>
        ) : null}
      </header>

      <section id="home" className="scroll-mt-24">
        <div className="mx-auto grid max-w-[1320px] items-center gap-8 px-5 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-8 lg:px-12 lg:py-16">
          <div className="relative z-10">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#087a45]">Car help, wherever you are</p>
            <h1 className="mt-5 max-w-[680px] text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--ink)] sm:text-6xl lg:text-[76px]">
              Car care that <span className="text-[#087a45]">comes to you.</span>
            </h1>
            <p className="mt-6 max-w-[560px] text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
              From routine servicing and car washes to unexpected breakdowns, request help at home, at work or by the roadside. A Siesie dispatcher confirms coverage, price and next steps.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/app" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#087a45] px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#066c3d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087a45]">
                Book a service<ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <a href="#services" className="inline-flex min-h-14 items-center justify-center rounded-xl border border-[var(--line)] bg-white px-6 text-sm font-bold text-[var(--ink)] transition-colors hover:border-[#9cb9a1] hover:bg-[#f8faf7]">Explore services</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-[var(--line)] pt-5 text-sm font-medium text-[var(--muted)]">
              <span className="inline-flex items-center gap-2"><MapPinned aria-hidden="true" className="h-4 w-4 text-[#087a45]" />Accra launch area</span>
              <span className="inline-flex items-center gap-2"><BadgeCheck aria-hidden="true" className="h-4 w-4 text-[#087a45]" />Dispatcher-confirmed requests</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[700px] lg:max-w-none">
            <div className="relative aspect-[1.04] overflow-hidden rounded-[28px] bg-[#edf3ec] sm:aspect-[1.28] lg:aspect-[1.16]">
              <Image src="/hero-img.png" alt="A Siesie mechanic speaking with a driver beside an open car bonnet." fill preload sizes="(max-width: 639px) 92vw, (max-width: 1023px) 82vw, 54vw" className="object-cover object-left" />
              <div className="absolute bottom-3 left-3 rounded-lg border border-white/70 bg-white/90 px-3 py-2 text-[11px] font-medium text-[#425449] shadow-sm sm:bottom-4 sm:left-4">Illustrative artwork, not live tracking. A dispatcher coordinates service updates.</div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Service highlights" className="border-y border-[var(--line)] bg-white">
        <div className="mx-auto grid max-w-[1320px] gap-5 px-5 py-5 sm:grid-cols-3 sm:gap-8 sm:px-8 sm:py-6 lg:px-12">
          <p className="flex items-center gap-3 text-sm font-semibold text-[var(--ink)]"><Home aria-hidden="true" className="h-5 w-5 shrink-0 text-[#087a45]" />At home or another supported location</p>
          <p className="flex items-center gap-3 text-sm font-semibold text-[var(--ink)]"><BriefcaseBusiness aria-hidden="true" className="h-5 w-5 shrink-0 text-[#087a45]" />Book around your workday</p>
          <p className="flex items-center gap-3 text-sm font-semibold text-[var(--ink)]"><Wrench aria-hidden="true" className="h-5 w-5 shrink-0 text-[#087a45]" />Routine care and roadside requests</p>
        </div>
      </section>

      <section id="services" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#087a45]">Services</p><h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.04em] text-[var(--ink)] sm:text-4xl lg:text-5xl">The help your car needs, in one place.</h2></div>
            <p className="max-w-lg text-sm leading-7 text-[var(--muted)] sm:text-base">Choose a service to start a request. The dispatcher confirms what is available for your area and preferred time.</p>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => (
              <article key={service.name} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
                <div className={"relative aspect-[16/10] overflow-hidden " + service.artBackground}>
                  <Image src={service.image} alt="" width={service.width} height={service.height} sizes="(max-width: 767px) 92vw, (max-width: 1279px) 46vw, 30vw" className={service.imageStyle === "cover" ? "h-full w-full object-cover transition-transform duration-500 hover:scale-[1.025]" : "h-full w-full object-contain p-8 transition-transform duration-500 hover:scale-[1.025]"} />
                </div>
                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <h3 className="text-xl font-extrabold tracking-tight text-[var(--ink)]">{service.name}</h3>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-[var(--muted)]">{service.intro}</p>
                  <ul className="mt-5 space-y-2 border-t border-[var(--line)] pt-4 text-sm text-[#46564b]">
                    {service.details.map((detail) => <li key={detail} className="flex items-start gap-2.5"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#087a45]" /><span>{detail}</span></li>)}
                  </ul>
                  <Link href="/app" className="mt-6 inline-flex min-h-11 items-center gap-2 self-start text-sm font-bold text-[#087a45] transition-colors hover:text-[#075f37]">{service.action}<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-[var(--muted)]">Service coverage varies by location. Towing is not available through the app in this launch phase.</p>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 border-y border-[var(--line)] bg-[#f2f6f1]">
        <div className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#087a45]">How it works</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--ink)] sm:text-4xl lg:text-5xl">A clear next step, from request to service.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">You do not need to diagnose the car first. Tell us what you know and the dispatcher will help arrange the right next step.</p>
          </div>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {bookingSteps.map(({ title, text, icon: Icon }, index) => (
              <li key={title} className="rounded-2xl border border-[var(--line)] bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf3eb] text-[#087a45]"><Icon aria-hidden="true" className="h-5 w-5" /></span><span className="text-sm font-bold tabular-nums text-[#8a968d]">0{index + 1}</span></div>
                <h3 className="mt-5 text-lg font-extrabold text-[var(--ink)]">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="convenience" className="scroll-mt-24">
        <div className="mx-auto grid max-w-[1320px] items-center gap-9 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:px-12 lg:py-24">
          <div className="relative overflow-hidden rounded-[24px] bg-[#14261d]">
            <div className="relative aspect-[1.08]">
              <Image src="/know-who-is-coming.png" alt="Illustrative scene of a mechanic beside a customer's car." fill sizes="(max-width: 1023px) 92vw, 48vw" className="object-cover object-left" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0e2118]/90 to-transparent px-5 pb-5 pt-16 sm:px-7 sm:pb-7">
                <p className="text-sm font-semibold text-white">Illustrative mockup, not a live booking screen</p><p className="mt-1 text-xs leading-5 text-white/80">Requests and service updates are coordinated by a dispatcher.</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#087a45]">Car care around your day</p>
            <h2 className="mt-3 max-w-xl text-3xl font-black leading-tight tracking-[-0.04em] text-[var(--ink)] sm:text-4xl lg:text-5xl">Your schedule is busy enough. Car care should fit around it.</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base">Request eligible services at home, at work or another supported location. For a car wash and selected scheduled services, add a preferred time; the dispatcher confirms the appointment with you.</p>
            <div className="mt-7 divide-y divide-[var(--line)] border-y border-[var(--line)]">
              <div className="flex gap-4 py-4"><Home aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#087a45]" /><div><h3 className="text-sm font-bold text-[var(--ink)]">Choose a convenient location</h3><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Home, work or roadside, depending on the service and coverage.</p></div></div>
              <div className="flex gap-4 py-4"><CalendarDays aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#087a45]" /><div><h3 className="text-sm font-bold text-[var(--ink)]">Request a time that suits you</h3><p className="mt-1 text-sm leading-6 text-[var(--muted)]">A preferred date is a request; the dispatcher confirms availability.</p></div></div>
              <div className="flex gap-4 py-4"><Clock3 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#087a45]" /><div><h3 className="text-sm font-bold text-[var(--ink)]">Keep the updates together</h3><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Return to the customer app to review your saved requests and status updates.</p></div></div>
            </div>
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
        <div className="relative mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <WhySiesieCarAnimation />
          {reasons.map((reason, index) => (
            <div
              key={reason}
              className={[
                "group relative min-h-[390px] overflow-hidden rounded-[28px] p-7 sm:min-h-[430px]",
                "transition-transform duration-300 hover:-translate-y-1",
                index === 0
                  ? "bg-[#EAF4EF] text-[#102A20]"
                  : index === 1
                    ? "bg-[#E4F0EA] text-[#102A20]"
                    : index === 2
                      ? "bg-[#F2F8F5] text-[#102A20]"
                      : "bg-[#E6F0EB] text-[#102A20]",
              ].join(" ")}
            >
              {/* Decorative dramatic road pattern */}
              <div className="pointer-events-none absolute inset-0">
                <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <defs>
                    <path
                      id={`road-path-${index}`}
                      d={
                        index === 0
                          ? "M 0 60 C 100 60, 100 15, 50 15 C 0 15, 0 40, 100 40"
                          : index === 1
                            ? "M 0 40 C 50 40, 30 55, 60 55 C 90 55, 50 30, 100 30"
                            : index === 2
                              ? "M 0 30 C 80 30, 20 55, 60 55 C 100 55, 40 40, 100 40"
                              : "M 0 40 C 30 40, 30 15, 60 25 C 90 35, 70 50, 100 50"
                      }
                    />
                  </defs>

                  {/* Thick solid road base */}
                  <use href={`#road-path-${index}`} fill="none" stroke="#008F4C" strokeWidth="4" opacity="0.1" />

                  {/* Animating dashed line */}
                  <use
                    href={`#road-path-${index}`}
                    fill="none"
                    stroke="#008F4C"
                    strokeWidth="1.5"
                    strokeDasharray="3 5"
                    opacity="0.8"
                    style={{ animation: "dash-move 12s linear infinite" }}
                  />
                </svg>
              </div>

              {/* Timeline Node */}
              <div
                className="absolute z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-white bg-[#008F4C] shadow-sm"
                style={{
                  left: index === 0 ? "50%" : "60%",
                  top: index === 0 ? "15%" : index === 1 ? "55%" : index === 2 ? "55%" : "25%",
                }}
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

      <section id="about" className="scroll-mt-24 border-y border-[var(--line)] bg-white">
        <div className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-20">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#087a45]">A more considered experience</p>
              <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.04em] text-[var(--ink)] sm:text-4xl">Know what has been confirmed.</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">We keep the process clear and human. Here is what the current Siesie service does today.</p>
            </div>
            <div className="grid gap-7 sm:grid-cols-3">
              {trustPoints.map(({ title, text, icon: Icon }) => (
                <article key={title} className="border-t-2 border-[#c8d9cc] pt-4">
                  <Icon aria-hidden="true" className="h-5 w-5 text-[#087a45]" /><h3 className="mt-4 text-base font-extrabold leading-6 text-[var(--ink)]">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{text}</p>
                </article>
              ))}
            </div>
          </div>
          <p className="mt-8 rounded-xl bg-[#f2f6f1] px-4 py-3 text-xs leading-5 text-[#536259] sm:mt-10 sm:px-5">Status updates are entered by the dispatcher. The customer app does not currently provide live provider tracking or public ratings.</p>
        </div>
      </section>

      <section id="roadside-help" className="scroll-mt-24 bg-[#123d2c] text-white">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:flex-row lg:items-center lg:justify-between lg:px-12 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#c7e08d]">Roadside assistance</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">Car trouble? Let’s get you help.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">Send a breakdown, battery or flat-tyre request to a Siesie dispatcher. They will review the details and confirm the next step. Towing is unavailable through the app in this launch phase.</p>
          </div>
          <Link href="/app" className="inline-flex min-h-14 shrink-0 items-center justify-center gap-3 self-start rounded-xl bg-[#c7e08d] px-6 text-sm font-extrabold text-[#123d2c] transition-colors hover:bg-[#d5e8a8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:self-center">
            <Siren aria-hidden="true" className="h-4 w-4" />Get roadside assistance<ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section id="waitlist" className="scroll-mt-24 bg-[#f2f6f1]">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16 lg:px-12">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#087a45]">Service updates</p>
            <h2 className="mt-3 max-w-xl text-3xl font-black tracking-[-0.04em] text-[var(--ink)] sm:text-4xl">Want to hear when Siesie reaches your area?</h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-[var(--muted)] sm:text-base">Join the list for launch and service-area updates. If you are in Accra, you can also open the customer app to request a service; a dispatcher will confirm coverage.</p>
          </div>
          <form onSubmit={handleWaitlistSubmit} className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm sm:p-7">
            <div className="hidden"><input name="website" tabIndex={-1} autoComplete="off" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="mb-2 block text-xs font-bold text-[var(--ink)]">Full name <span className="font-medium text-[var(--muted)]">(optional)</span></span><input name="name" autoComplete="name" maxLength={120} className="min-h-12 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)] outline-none placeholder:text-[#8b968e] focus:border-[#43805b] focus:ring-4 focus:ring-[#43805b]/10" placeholder="Ama Boateng" /></label>
              <label><span className="mb-2 block text-xs font-bold text-[var(--ink)]">Email address</span><input name="email" type="email" autoComplete="email" required maxLength={254} className="min-h-12 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)] outline-none placeholder:text-[#8b968e] focus:border-[#43805b] focus:ring-4 focus:ring-[#43805b]/10" placeholder="you@example.com" /></label>
              <label><span className="mb-2 block text-xs font-bold text-[var(--ink)]">City or area <span className="font-medium text-[var(--muted)]">(optional)</span></span><input name="city" autoComplete="address-level2" maxLength={120} className="min-h-12 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)] outline-none placeholder:text-[#8b968e] focus:border-[#43805b] focus:ring-4 focus:ring-[#43805b]/10" placeholder="Osu, Accra" /></label>
            </div>
            {waitlistState.message ? (
              <p role={waitlistState.type === "error" ? "alert" : "status"} aria-live="polite" className={waitlistState.type === "success" ? "mt-4 flex items-start gap-2 rounded-lg border border-[#d7ebcb] bg-[#f0f8e9] px-3 py-3 text-sm leading-5 text-[#315d40]" : "mt-4 flex items-start gap-2 rounded-lg border border-[#f1d4cb] bg-[#fff4f0] px-3 py-3 text-sm leading-5 text-[#8a2f2f]"}>
                {waitlistState.type === "success" ? <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /> : <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />}{waitlistState.message}
              </p>
            ) : null}
            <button type="submit" disabled={waitlistLoading} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#087a45] px-5 text-sm font-bold text-white transition-colors hover:bg-[#066c3d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087a45] disabled:cursor-not-allowed disabled:opacity-70">
              {waitlistLoading ? "Joining…" : "Join for service updates"}{!waitlistLoading ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : null}
            </button>
          </form>
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-[1320px] flex-col items-start justify-between gap-6 px-5 py-12 sm:px-8 md:flex-row md:items-center lg:px-12 lg:py-14">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#087a45]">Start with Siesie</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-[var(--ink)] sm:text-3xl">A better way to take care of your car starts here.</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Spend less time arranging car care and more time doing what matters.</p>
          </div>
          <Link href="/app" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#087a45] px-6 text-sm font-bold text-white transition-colors hover:bg-[#066c3d]">Get started<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="border-t border-[var(--line)] bg-[var(--paper)]">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1.1fr_1fr_1fr] lg:px-12">
          <div><Link href="/" aria-label="Siesie home"><BrandLogo compact /></Link><p className="mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">Car help, wherever you are. Dispatcher-arranged car care and roadside requests in Accra.</p></div>
          <div><h2 className="text-sm font-extrabold text-[var(--ink)]">Explore</h2><div className="mt-3 grid gap-2 text-sm text-[var(--muted)]"><a href="#services" className="w-fit hover:text-[var(--ink)]">Services</a><a href="#how-it-works" className="w-fit hover:text-[var(--ink)]">How it works</a><a href="#why-siesie" className="w-fit hover:text-[var(--ink)]">Why Siesie</a><a href="#about" className="w-fit hover:text-[var(--ink)]">About</a></div></div>
          <div><h2 className="text-sm font-extrabold text-[var(--ink)]">Get help</h2><div className="mt-3 grid gap-2 text-sm text-[var(--muted)]"><Link href="/app" className="w-fit hover:text-[var(--ink)]">Open the customer app</Link><a href="#roadside-help" className="w-fit hover:text-[var(--ink)]">Roadside assistance</a><a href="#waitlist" className="w-fit hover:text-[var(--ink)]">Service-area updates</a></div></div>
        </div>
      </footer>
    </main>
  );
}
