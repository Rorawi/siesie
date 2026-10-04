import { NextResponse } from "next/server";
import { createDispatchRequest, getDispatchRequest, listMechanics, saveRequestPhoto } from "@/lib/dispatch";

const allowedServices = new Set([
  "Emergency breakdown",
  "Battery replacement",
  "Tyre change or repair",
  "Oil change",
  "Brake service",
  "Diagnostics",
  "Car wash",
  "Tow truck",
]);
const requestRateLimit = new Map<string, number>();

function limited(ip: string) {
  const now = Date.now();
  const previous = requestRateLimit.get(ip) ?? 0;
  if (now - previous < 15_000) return true;
  requestRateLimit.set(ip, now);
  return false;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "local";
  if (limited(ip)) {
    return NextResponse.json({ error: "Please wait a moment before sending another request." }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid request form." }, { status: 400 });
  if (String(form.get("website") ?? "").trim()) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const customerName = String(form.get("customer_name") ?? "").trim();
  const customerPhone = String(form.get("customer_phone") ?? "").trim();
  const issueDescription = String(form.get("issue_description") ?? "").trim();
  const notes = String(form.get("notes") ?? "").trim();
  const locationLabel = String(form.get("location_label") ?? "").trim();
  const rawLatitude = String(form.get("latitude") ?? "").trim();
  const rawLongitude = String(form.get("longitude") ?? "").trim();
  const latitude = rawLatitude ? Number(rawLatitude) : null;
  const longitude = rawLongitude ? Number(rawLongitude) : null;
  const services = [...new Set(form.getAll("services").map(String).filter((service) => allowedServices.has(service)))];
  const photos = form.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);

  if (!customerName || customerName.length > 120) {
    return NextResponse.json({ error: "Please enter your full name (max 120 characters)." }, { status: 400 });
  }
  if (!/^\+?[\d\s().[\]-]{6,24}$/.test(customerPhone)) {
    return NextResponse.json({ error: "Please enter a valid phone number, e.g. 024 000 0000 or +233 24 000 0000." }, { status: 400 });
  }
  if (!issueDescription && services.length === 0) {
    return NextResponse.json({ error: "Please select at least one service category or describe the issue." }, { status: 400 });
  }
  if (issueDescription.length > 3000 || notes.length > 2000) {
    return NextResponse.json({ error: "The issue description or notes are too long. Please shorten them." }, { status: 400 });
  }
  if (!locationLabel && (latitude === null || longitude === null)) {
    return NextResponse.json({ error: "Share your GPS location or enter a landmark / address so we can find you." }, { status: 400 });
  }
  if (
    (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
    (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))
  ) {
    return NextResponse.json({ error: "The GPS coordinates look invalid. Try sharing your location again." }, { status: 400 });
  }
  if (photos.length > 3 || photos.some((photo) => !["image/jpeg", "image/png", "image/webp"].includes(photo.type) || photo.size > 5 * 1024 * 1024)) {
    return NextResponse.json({ error: "Photos must be JPEG, PNG, or WebP and no larger than 5 MB each (max 3 photos)." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  try {
    const photoPaths = await Promise.all(photos.map((photo) => saveRequestPhoto(id, photo)));
    const created = await createDispatchRequest({
      id,
      customer_name: customerName,
      customer_phone: customerPhone,
      service_type: services.join(", ") || "Other / not listed",
      issue_description: issueDescription || services.join(", "),
      notes: notes || null,
      photo_paths: photoPaths,
      location_label: locationLabel || "GPS location shared",
      latitude,
      longitude,
    });
    return NextResponse.json({ id: created.id, status: created.status, message: "Request received — we’re arranging your mechanic." }, { status: 201 });
  } catch (error) {
    console.error("[requests] Could not save customer request", error);
    return NextResponse.json({ error: "We couldn’t save your request just now. Please try again." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || id.length > 64) return NextResponse.json({ error: "Request ID is required." }, { status: 400 });
  try {
    const entry = await getDispatchRequest(id);
    if (!entry) return NextResponse.json({ error: "Request not found." }, { status: 404 });
    const isStale = Date.now() - new Date(entry.created_at).getTime() >= 10 * 60 * 1000;
    const terminalStatus = entry.status === "completed" || entry.status === "cancelled" || entry.status === "no_show";
    const supportContacts: { name: string; phone: string }[] = [];
    let mechanic: { name: string; phone: string } | null = null;

    try {
      if (entry.assigned_mechanic_id) {
        const mechanics = await listMechanics();
        const mech = mechanics.find((m) => m.id === entry.assigned_mechanic_id);
        if (mech) {
          mechanic = { name: mech.name, phone: mech.phone };
        }
      }
    } catch (error) {
      console.error("[requests] Could not load mechanic", error);
    }

    const shouldOfferSupport = isStale && !terminalStatus;
    if (shouldOfferSupport) {
      const receptionistPhone = process.env.NEXT_PUBLIC_SIESIE_RECEPTION_PHONE;
      if (receptionistPhone) {
        supportContacts.push({ name: "Siesie dispatcher", phone: receptionistPhone });
      }
    }

    return NextResponse.json({
      id: entry.id,
      service_type: entry.service_type,
      status: entry.status,
      arrival_code: entry.status === "arrived" || entry.status === "in_progress" ? entry.arrival_code : null,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
      status_history: entry.status_history.map(({ status, at }) => ({ status, at })),
      support_contacts: supportContacts,
      mechanic,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[requests] Could not load request status", error);
    return NextResponse.json({ error: "Request status is temporarily unavailable." }, { status: 503 });
  }
}
