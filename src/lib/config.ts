export const APP_NAME = "Siesie";
export const APP_TAGLINE = "Car help, wherever you are.";
export const CURRENCY = "GHS";
export const CURRENCY_SYMBOL = "₵";
export const DEFAULT_COMMISSION_RATE = 0.15;

export const SERVICE_CATEGORIES = [
  { id: "breakdown", label: "Emergency breakdown", shortLabel: "Breakdown", icon: "!", priceFrom: 80 },
  { id: "battery", label: "Battery replacement", shortLabel: "Battery", icon: "↯", priceFrom: 100 },
  { id: "tyre", label: "Tyre change or repair", shortLabel: "Tyres", icon: "◉", priceFrom: 60 },
  { id: "oil", label: "Oil change", shortLabel: "Oil change", icon: "◌", priceFrom: 120 },
  { id: "brakes", label: "Brake service", shortLabel: "Brakes", icon: "▣", priceFrom: 180 },
  { id: "diagnostics", label: "Diagnostics", shortLabel: "Diagnostics", icon: "⌁", priceFrom: 90 },
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
