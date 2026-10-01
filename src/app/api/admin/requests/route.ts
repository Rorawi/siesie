import { NextResponse } from "next/server";
import { getRequestPhotoUrl, listDispatchRequests } from "@/lib/dispatch";

export async function GET() {
  try {
    const requests = await listDispatchRequests();
    const withPhotos = await Promise.all(requests.map(async (item) => ({
      ...item,
      photo_urls: (await Promise.all(item.photo_paths.map(getRequestPhotoUrl))).filter((url): url is string => Boolean(url)),
    })));
    return NextResponse.json(withPhotos, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin/requests] Could not load request queue", error);
    return NextResponse.json({ error: "The request queue is temporarily unavailable." }, { status: 503 });
  }
}
