import { DEFAULT_COMMISSION_RATE, formatGhs } from "./config";

export type PriceBreakdown = {
  mechanicPrice: number;
  commission: number;
  emergencySurcharge: number;
  total: number;
};

export function estimatePrice(mechanicPrice: number, emergency = true): PriceBreakdown {
  const commission = Math.round(mechanicPrice * DEFAULT_COMMISSION_RATE);
  const emergencySurcharge = emergency ? 25 : 0;
  return {
    mechanicPrice,
    commission,
    emergencySurcharge,
    total: mechanicPrice + commission + emergencySurcharge,
  };
}

export function describePrice(price: PriceBreakdown) {
  return {
    mechanic: formatGhs(price.mechanicPrice),
    commission: formatGhs(price.commission),
    surcharge: formatGhs(price.emergencySurcharge),
    total: formatGhs(price.total),
  };
}
