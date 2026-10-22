export const APP_NAME = "Siesie";
export const APP_TAGLINE = "Car help, wherever you are.";
export const CURRENCY = "GHS";
export const CURRENCY_SYMBOL = "₵";
export const DEFAULT_COMMISSION_RATE = 0.15;

/** Services that support a requested appointment time. */
export const SCHEDULED_SERVICE_IDS = new Set(["oil", "brakes", "diagnostics", "car-wash"]);

/**
 * Callback alert thresholds (ms) per urgency tier.
 * After a request comes in, if the admin hasn't marked callback_confirmed
 * within this window, trigger the urgent alert.
 */
export const CALLBACK_ALERT_MS: Record<"urgent" | "standard" | "scheduled", number> = {
  urgent: 60_000,       // 1 min: Breakdown, Battery, Tyres
  standard: 120_000,    // 2 min: Oil change, Brakes
  scheduled: 300_000,   // 5 min: Car wash, Diagnostics (less critical)
};

export const SERVICE_CATEGORIES = [
  {
    id: "breakdown",
    label: "Emergency breakdown",
    shortLabel: "Breakdown",
    logo: "/services-logo/breakdown-logo.png",
    priceFrom: 80,
    urgency: "urgent" as const,
    scheduled: false,
  },
  {
    id: "battery",
    label: "Battery replacement",
    shortLabel: "Battery",
    logo: "/services-logo/battery-logo.png",
    priceFrom: 100,
    urgency: "urgent" as const,
    scheduled: false,
  },
  {
    id: "tyre",
    label: "Tyre change or repair",
    shortLabel: "Tyres",
    logo: "/services-logo/tyre-logo.png",
    priceFrom: 60,
    urgency: "urgent" as const,
    scheduled: false,
  },
  {
    id: "oil",
    label: "Oil change",
    shortLabel: "Oil change",
    logo: "/services-logo/oil-change-logo.png",
    priceFrom: 120,
    urgency: "standard" as const,
    scheduled: true,
  },
  {
    id: "brakes",
    label: "Brake service",
    shortLabel: "Brakes",
    logo: "/services-logo/brakes.png",
    priceFrom: 180,
    urgency: "standard" as const,
    scheduled: true,
  },
  {
    id: "diagnostics",
    label: "Diagnostics",
    shortLabel: "Diagnostics",
    logo: "/services-logo/diagnostics-logo.png",
    priceFrom: 90,
    urgency: "scheduled" as const,
    scheduled: true,
  },
  {
    id: "car-wash",
    label: "Car wash",
    shortLabel: "Car wash",
    logo: "/services-logo/car-wash.png",
    priceFrom: 50,
    urgency: "scheduled" as const,
    scheduled: true,
  },
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const DEMO_MECHANIC = {
  name: "Kojo Mensah",
  rating: 4.9,
  jobs: 238,
  eta: 8,
  distance: "2.4 km away",
  specialty: "Toyota & Japanese vehicles",
  initials: "KM",
  verified: true,
};

export function formatGhs(amount: number) {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString("en-GH")}`;
}

/** Derive the callback urgency tier from selected service labels. */
export function callbackUrgencyFor(serviceLabels: string[]): keyof typeof CALLBACK_ALERT_MS {
  const cats = SERVICE_CATEGORIES.filter((c) => serviceLabels.includes(c.label));
  if (cats.some((c) => c.urgency === "urgent")) return "urgent";
  if (cats.some((c) => c.urgency === "standard")) return "standard";
  return "scheduled";
}

/** Customer-facing title for the assigned person on a service request. */
export function serviceWorkerTitle(serviceType: string) {
  return serviceType.toLowerCase().includes("car wash") ? "Car wash professional" : "Mechanic";
}
