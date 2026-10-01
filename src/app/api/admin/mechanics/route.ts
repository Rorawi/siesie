import { NextResponse } from "next/server";
import { listMechanics, saveMechanic } from "@/lib/dispatch";

export async function GET() {
  try {
    return NextResponse.json(await listMechanics(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin/mechanics] Could not load mechanics", error);
    return NextResponse.json({ error: "Mechanic records are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  if (!name || name.length > 120 || !/^\+?[\d\s().-]{7,24}$/.test(phone)) {
    return NextResponse.json({ error: "Enter a mechanic name and valid phone number." }, { status: 400 });
  }

  try {
    const id = String(body.id || `mechanic-${crypto.randomUUID()}`);
    const mechanic = await saveMechanic({ id, name, phone, active: body.active !== false });
    return NextResponse.json(mechanic, { status: 201 });
  } catch (error) {
    console.error("[admin/mechanics] Could not save mechanic", error);
    return NextResponse.json({ error: "Mechanic record could not be saved." }, { status: 503 });
  }
}
