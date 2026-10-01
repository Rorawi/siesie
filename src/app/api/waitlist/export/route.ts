import { NextResponse } from "next/server";
import { getWaitlistEntries, toCsv } from "@/lib/leadStorage";

export async function GET() {
  const entries = await getWaitlistEntries();
  const csv = toCsv(entries, ["id", "name", "email", "city", "createdAt"]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="siesie_waitlist.csv"',
    },
  });
}
