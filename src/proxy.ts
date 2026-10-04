import { NextResponse, type NextRequest } from "next/server";

async function digest(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
}

export async function proxy(request: NextRequest) {

  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedPassword) {
    return new NextResponse("Lead admin is not configured.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const encodedCredentials = request.headers
    .get("authorization")
    ?.match(/^Basic\s+(.+)$/i)?.[1];
  let password = "";

  if (encodedCredentials) {
    try {
      password = atob(encodedCredentials).split(":").slice(1).join(":");
    } catch {
      password = "";
    }
  }

  const [providedDigest, expectedDigest] = await Promise.all([
    digest(password),
    digest(expectedPassword),
  ]);
  const matches = providedDigest.reduce(
    (difference, byte, index) => difference | (byte ^ expectedDigest[index]),
    0,
  ) === 0;

  if (!matches) {
    return new NextResponse("Authentication required.", {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
        "WWW-Authenticate": 'Basic realm="Siesie lead admin", charset="UTF-8"',
      },
    });
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/requests/photos/:path*",
    "/api/waitlist/export",
    "/api/providers/export",
  ],
};