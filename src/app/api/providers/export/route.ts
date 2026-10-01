import { NextResponse } from "next/server";
import { getProviderEntries, toCsv } from "@/lib/leadStorage";

export async function GET() {
  const entries = await getProviderEntries();
  const csv = toCsv(entries, ["id", "fullName", "phone", "type", "yearsOfExperience", "servicesOffered", "area", "note", "createdAt"] as const);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="siesie_provider_interest.csv"',
    },
  });
}
