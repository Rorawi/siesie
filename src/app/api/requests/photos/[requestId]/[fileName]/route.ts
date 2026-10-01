import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const photoRoot = path.resolve(process.cwd(), "data", "request-photos");

export async function GET(_request: Request, context: RouteContext<"/api/requests/photos/[requestId]/[fileName]">) {
  const { requestId, fileName } = await context.params;
  if (!/^[a-f0-9-]{36}$/i.test(requestId) || !/^[a-zA-Z0-9._-]{1,160}$/.test(fileName)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const filePath = path.resolve(photoRoot, requestId, path.basename(fileName));
  if (!filePath.startsWith(`${photoRoot}${path.sep}`)) return new NextResponse("Not found", { status: 404 });
  try {
    const image = await fs.readFile(filePath);
    const extension = path.extname(fileName).toLowerCase();
    const contentType = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
    return new NextResponse(image, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
