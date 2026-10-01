import { NextResponse } from "next/server";
import { saveWaitlistEntry } from "@/lib/leadStorage";
import { sendOwnerNotification, sendWaitlistConfirmation } from "@/lib/email";

const waitlistRateLimit = new Map<string, number>();

function isRateLimited(ip: string) {
  const now = Date.now();
  const key = `${ip}:waitlist`;
  const previous = waitlistRateLimit.get(key) ?? 0;

  if (previous && now - previous < 10_000) {
    return true;
  }

  waitlistRateLimit.set(key, now);
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
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const city = String(body.city ?? "").trim();
  const honeypot = String(body.honeypot ?? "").trim();

  if (honeypot) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const result = await saveWaitlistEntry({
    id: crypto.randomUUID(),
    name: name || undefined,
    email,
    city: city || undefined,
    createdAt: new Date().toISOString(),
  });

  if (result.duplicate) {
    return NextResponse.json({ error: "This email is already on the waitlist." }, { status: 409 });
  }

  let confirmationSent = false;
  try {
    const confirmation = await sendWaitlistConfirmation({ email, name: name || undefined, city: city || undefined });
    confirmationSent = confirmation.sent;
  } catch (error) {
    console.error("[waitlist] Confirmation email failed", error);
  }

  try {
    await sendOwnerNotification({
      title: "New Siesie customer waitlist signup",
      body: `New waitlist signup:\nName: ${name || "Not provided"}\nEmail: ${email}\nCity: ${city || "Not provided"}`,
    });
  } catch (error) {
    console.error("[waitlist] Owner notification failed", error);
  }

  return NextResponse.json({
    success: true,
    message: confirmationSent
      ? "You’re on the list — we’ll email you when Siesie launches in Accra. Check your inbox for a confirmation."
      : "You’re on the list. Your signup is saved, but we couldn’t send a confirmation email right now.",
  });
}
