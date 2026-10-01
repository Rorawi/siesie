export const APP_NAME = "Siesie";
export const APP_TAGLINE = "Car help, wherever you are.";
export const CURRENCY = "GHS";
export const CURRENCY_SYMBOL = "₵";
export const DEFAULT_COMMISSION_RATE = 0.15;

export const SERVICE_CATEGORIES = [
  { id: "breakdown", label: "Emergency breakdown", shortLabel: "Breakdown", logo: "/services-logo/breakdown-logo.png", priceFrom: 80 },
  { id: "battery", label: "Battery replacement", shortLabel: "Battery", logo: "/services-logo/battery-logo.png", priceFrom: 100 },
  { id: "tyre", label: "Tyre change or repair", shortLabel: "Tyres", logo: "/services-logo/tyre-logo.png", priceFrom: 60 },
  { id: "oil", label: "Oil change", shortLabel: "Oil change", logo: "/services-logo/oil-change-logo.png", priceFrom: 120 },
  { id: "brakes", label: "Brake service", shortLabel: "Brakes", logo: "/services-logo/brakes.png", priceFrom: 180 },
  { id: "diagnostics", label: "Diagnostics", shortLabel: "Diagnostics", logo: "/services-logo/diagnostics-logo.png", priceFrom: 90 },
  { id: "car-wash", label: "Car wash", shortLabel: "Car wash", logo: "/services-logo/car-wash.png", priceFrom: 50 },
] as const;

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
