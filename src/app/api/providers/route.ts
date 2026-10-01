import { NextResponse } from "next/server";
import { saveProviderEntry } from "@/lib/leadStorage";
import { sendOwnerNotification } from "@/lib/email";

const providerRateLimit = new Map<string, number>();

function isRateLimited(ip: string) {
  const now = Date.now();
  const key = `${ip}:provider`;
  const previous = providerRateLimit.get(key) ?? 0;

  if (previous && now - previous < 15_000) {
    return true;
  }

  providerRateLimit.set(key, now);
  return false;
}

export async function POST(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "local";
  const clientIp = forwardedFor.split(",")[0].trim();

  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: "Please wait a moment before submitting again." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const honeypot = String(body.honeypot ?? "").trim();
  const fullName = String(body.fullName ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const type = String(body.type ?? "").trim();
  const yearsOfExperience = String(body.yearsOfExperience ?? "").trim();
  const area = String(body.area ?? "").trim();
  const note = String(body.note ?? "").trim();
  const providerType: "Mechanic" | "Tow operator" | null =
    type === "Tow operator" || type === "Mechanic" ? type : null;
  const allowedServices = new Set<string>([
    "Battery", "Oil change", "Brakes", "Tyres", "AC", "Diagnostics", "Full service", "Car wash", "Other",
  ]);
  const submittedServices: string[] = Array.isArray(body.servicesOffered)
    ? body.servicesOffered.map((value: unknown) => String(value).trim()).filter((value: string) => value.length > 0)
    : typeof body.servicesOffered === "string"
      ? body.servicesOffered.split(",").map((value: string) => value.trim()).filter(Boolean)
      : [];
  const servicesOffered: string[] = [...new Set<string>(submittedServices)].filter((service) => allowedServices.has(service));

  if (honeypot) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (
    !fullName || fullName.length > 120 ||
    !/^\+?[\d\s().-]{7,20}$/.test(phone) ||
    !providerType ||
    !/^\d{1,2}$/.test(yearsOfExperience) || Number(yearsOfExperience) > 80 ||
    !area || area.length > 120 ||
    note.length > 2000 ||
    servicesOffered.length === 0
  ) {
    return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });
  }

  const entry = {
    id: crypto.randomUUID(),
    fullName,
    phone,
    type: providerType,
    yearsOfExperience,
    servicesOffered,
    area,
    note: note || undefined,
    createdAt: new Date().toISOString(),
  };

  await saveProviderEntry(entry);
  try {
    await sendOwnerNotification({
      title: "New Siesie provider interest",
      body: `New provider interest:\nName: ${fullName}\nPhone: ${phone}\nType: ${entry.type}\nExperience: ${yearsOfExperience}\nArea: ${area}\nServices: ${servicesOffered.join(", ")}\nNote: ${note || "None"}`,
    });
  } catch (error) {
    console.error("[providers] Owner notification failed", error);
  }

  return NextResponse.json({
    success: true,
    message: "Thanks — we’ll review your details and contact you soon.",
  });
}
