import { NextResponse } from "next/server";
import { createDispatchRequest, getDispatchRequest, listMechanics, lookupCustomerByPhone, saveRequestPhoto } from "@/lib/dispatch";
import type { LocationSource } from "@/lib/dispatch";
import { sendOwnerNotification } from "@/lib/email";

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
const allowedWashPackages = new Set(["Exterior wash", "Interior clean", "Full wash", "Detailing"]);
const schedulableServices = new Set(["Oil change", "Brake service", "Diagnostics", "Car wash"]);
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
  const rawLocationSource = String(form.get("location_source") ?? "").trim();
  const latitude = rawLatitude ? Number(rawLatitude) : null;
  const longitude = rawLongitude ? Number(rawLongitude) : null;
  const locationSource: LocationSource = rawLocationSource === "manual_pin" ? "manual_pin" : "gps";
  const services = [...new Set(form.getAll("services").map(String).filter((service) => allowedServices.has(service)))];
  const photos = form.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
  const rawScheduledAt = String(form.get("scheduled_at") ?? "").trim();
  const washPackage = String(form.get("wash_package") ?? "").trim();
  let scheduledAt: string | null = null;
  if (rawScheduledAt) {
    const appointment = new Date(rawScheduledAt);
    if (!Number.isFinite(appointment.getTime()) || appointment.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Choose a valid future date and time." }, { status: 400 });
    }
    scheduledAt = appointment.toISOString();
  }
  const isScheduled = Boolean(scheduledAt);

  if (!customerName || customerName.length > 120) {
    return NextResponse.json({ error: "Please enter your full name (max 120 characters)." }, { status: 400 });
  }
  if (!/^\+?[\d\s().[\]-]{6,24}$/.test(customerPhone)) {
    return NextResponse.json({ error: "Please enter a valid phone number, e.g. 024 000 0000 or +233 24 000 0000." }, { status: 400 });
  }
  if (!issueDescription && services.length === 0) {
    return NextResponse.json({ error: "Please select at least one service category or describe the issue." }, { status: 400 });
  }
  if (services.includes("Car wash") && !allowedWashPackages.has(washPackage)) {
    return NextResponse.json({ error: "Choose the type of car wash you would like." }, { status: 400 });
  }
  if (services.includes("Car wash") && !scheduledAt) {
    return NextResponse.json({ error: "Choose a date and time for your car wash." }, { status: 400 });
  }
  if (scheduledAt && !services.some((service) => schedulableServices.has(service))) {
    return NextResponse.json({ error: "This service does not support an appointment time." }, { status: 400 });
  }
  if (issueDescription.length > 3000 || notes.length > 2000) {
    return NextResponse.json({ error: "The issue description or notes are too long. Please shorten them." }, { status: 400 });
  }
  // Location is mandatory — must have real coordinates
  if (latitude === null || longitude === null) {
    return NextResponse.json({ error: "A confirmed location is required so we can send your service team to the right place." }, { status: 400 });
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "The location coordinates look invalid. Please pin your location again." }, { status: 400 });
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
      issue_description: services.includes("Car wash") ? `Car wash package: ${washPackage}` : issueDescription || services.join(", "),
      notes: notes || null,
      photo_paths: photoPaths,
      location_label: locationLabel || "Location pin dropped",
      location_source: locationSource,
      latitude,
      longitude,
      is_scheduled: isScheduled,
      scheduled_at: scheduledAt,
    });
    // Fire-and-forget owner notification — must not block or fail the response
    sendOwnerNotification({
      title: `New Siesie request: ${services.join(", ") || "Other"}`,
      body: [
        `Name: ${customerName}`,
        `Phone: ${customerPhone}`,
        `Service: ${services.join(", ") || "Other / not listed"}`,
        issueDescription ? `Issue: ${issueDescription}` : null,
        `Location: ${locationLabel || "Pin dropped"} (${locationSource})`,
        notes ? `Notes: ${notes}` : null,
        isScheduled && scheduledAt ? `Scheduled: ${scheduledAt}` : null,
        photos.length ? `Photos: ${photos.length}` : null,
      ].filter(Boolean).join("\n"),
    }).catch((error) => console.error("[requests] Owner notification failed", error));

    return NextResponse.json(
      { id: created.id, status: created.status, message: "Request received — we're arranging your service." },
      { status: 201 },
    );
  } catch (error) {
    console.error("[requests] Could not save customer request", error);
    return NextResponse.json({ error: "We couldn't save your request just now. Please try again." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const phone = url.searchParams.get("phone");

  // Customer name lookup by phone (for returning customer auto-fill)
  if (phone) {
    if (phone.length > 30) return NextResponse.json({ error: "Invalid phone." }, { status: 400 });
    try {
      const result = await lookupCustomerByPhone(phone);
      if (!result) return NextResponse.json({ error: "Not found." }, { status: 404 });
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch {
      return NextResponse.json({ error: "Lookup unavailable." }, { status: 503 });
    }
  }

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
        if (mech) mechanic = { name: mech.name, phone: mech.phone };
      }
    } catch (error) {
      console.error("[requests] Could not load mechanic", error);
    }

    const shouldOfferSupport = isStale && !terminalStatus;
    if (shouldOfferSupport) {
      const receptionistPhone = process.env.NEXT_PUBLIC_SIESIE_RECEPTION_PHONE;
      if (receptionistPhone) supportContacts.push({ name: "Siesie dispatcher", phone: receptionistPhone });
    }

    return NextResponse.json({
      id: entry.id,
      service_type: entry.service_type,
      status: entry.status,
      is_scheduled: entry.is_scheduled,
      scheduled_at: entry.scheduled_at,
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
