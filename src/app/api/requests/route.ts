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

  if (
    !customerName || customerName.length > 120 ||
    !/^\+?[\d\s().-]{7,24}$/.test(customerPhone) ||
    (!issueDescription && services.length === 0) ||
    issueDescription.length > 3000 || notes.length > 2000 ||
    (!locationLabel && (latitude === null || longitude === null)) ||
    (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
    (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) ||
    photos.length > 3 || photos.some((photo) => !["image/jpeg", "image/png", "image/webp"].includes(photo.type) || photo.size > 5 * 1024 * 1024)
  ) {
    return NextResponse.json({ error: "Check your contact details, issue, location, and photo files, then try again." }, { status: 400 });
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
    let supportContacts: { name: string; phone: string }[] = [];
    const shouldOfferSupport = isStale && !terminalStatus;
    if (shouldOfferSupport) {
      try {
        supportContacts = (await listMechanics())
          .filter((mechanic) => mechanic.active && entry.assigned_mechanic_id === mechanic.id)
          .map((mechanic) => ({ name: mechanic.name, phone: mechanic.phone }));
      } catch (error) {
        console.error("[requests] Could not load support contact", error);
      }
    }
    const receptionistPhone = shouldOfferSupport ? process.env.NEXT_PUBLIC_SIESIE_RECEPTION_PHONE : undefined;
    if (receptionistPhone) supportContacts.unshift({ name: "Siesie dispatcher", phone: receptionistPhone });
    return NextResponse.json({
      id: entry.id,
      service_type: entry.service_type,
      status: entry.status,
      arrival_code: entry.status === "arrived" || entry.status === "in_progress" ? entry.arrival_code : null,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
      status_history: entry.status_history.map(({ status, at }) => ({ status, at })),
      support_contacts: supportContacts,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[requests] Could not load request status", error);
    return NextResponse.json({ error: "Request status is temporarily unavailable." }, { status: 503 });
  }
}
