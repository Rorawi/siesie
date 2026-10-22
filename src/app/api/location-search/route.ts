import { NextResponse } from "next/server";

type Place = { id: string; label: string; lat: number; lng: number };
type CachedPlaces = { places: Place[]; expiresAt: number };

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_REQUEST_INTERVAL_MS = 1_000;
const MAX_CACHE_ENTRIES = 300;
const placeCache = new Map<string, CachedPlaces>();
const pendingSearches = new Map<string, Promise<Place[]>>();
let lastNominatimRequestAt = 0;
let nominatimQueue = Promise.resolve();

function requestNominatim<T>(action: () => Promise<T>): Promise<T> {
  const next = nominatimQueue.then(async () => {
    const waitMs = Math.max(0, MIN_REQUEST_INTERVAL_MS - (Date.now() - lastNominatimRequestAt));
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastNominatimRequestAt = Date.now();
    return action();
  });

  nominatimQueue = next.then(() => undefined, () => undefined);
  return next;
}

function parsePlaces(value: unknown): Place[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const result = item as { place_id?: number | string; display_name?: string; lat?: string; lon?: string };
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    const label = result.display_name?.trim();
    if (!label || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return [];
    return [{ id: String(result.place_id ?? `${lat},${lng},${index}`), label, lat, lng }];
  });
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 3 || query.length > 120) {
    return NextResponse.json({ error: "Enter at least 3 characters (up to 120) to search." }, { status: 400 });
  }

  const cacheKey = query.toLowerCase();
  const cached = placeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ places: cached.places });
  }
  if (cached) placeCache.delete(cacheKey);
  const pending = pendingSearches.get(cacheKey);
  if (pending) {
    try {
      return NextResponse.json({ places: await pending });
    } catch {
      return NextResponse.json({ error: "Place search is unavailable. Try again or move the pin on the map." }, { status: 503 });
    }
  }

  const baseUrl = (process.env.NOMINATIM_BASE_URL?.trim() || "https://nominatim.openstreetmap.org").replace(/\/+$/, "");
  let searchUrl: URL;
  try {
    searchUrl = new URL(`${baseUrl}/search`);
    if (searchUrl.protocol !== "https:") throw new Error("The geocoding service must use HTTPS.");
  } catch {
    return NextResponse.json({ error: "Place search is not configured right now." }, { status: 503 });
  }

  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("format", "jsonv2");
  searchUrl.searchParams.set("addressdetails", "1");
  searchUrl.searchParams.set("limit", "5");
  searchUrl.searchParams.set("countrycodes", "gh");

  const pendingSearch = requestNominatim(async () => {
    const appOrigin = new URL(request.url).origin;
    const response = await fetch(searchUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": `Siesie/0.1 (${appOrigin})`,
      },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Place search returned ${response.status}.`);
    return parsePlaces(await response.json());
  });
  pendingSearches.set(cacheKey, pendingSearch);

  try {
    const places = await pendingSearch;

    if (placeCache.size >= MAX_CACHE_ENTRIES) {
      const firstKey = placeCache.keys().next().value;
      if (firstKey) placeCache.delete(firstKey);
    }
    placeCache.set(cacheKey, { places, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ error: "Place search is unavailable. Try again or move the pin on the map." }, { status: 503 });
  } finally {
    if (pendingSearches.get(cacheKey) === pendingSearch) pendingSearches.delete(cacheKey);
  }
}
