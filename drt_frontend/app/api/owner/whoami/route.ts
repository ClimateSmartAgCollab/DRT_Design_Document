// drt_frontend/app/api/owner/whoami/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Grab incoming cookies (including Django's sessionid)
  const incomingCookies = request.headers.get("cookie") || "";

  // Proxy to Django’s whoami endpoint
  const DJANGO_WHOAMI_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000")
    + "/api/owner/whoami/";

  const djangoRes = await fetch(DJANGO_WHOAMI_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      cookie: incomingCookies, // forward sessionid
    },
  });

  if (djangoRes.status !== 200) {
    // Forward 401 (or other status) and return { email: null }
    return NextResponse.json({ email: null }, { status: djangoRes.status });
  }

  const body = await djangoRes.json();
  return NextResponse.json(body, { status: 200 });
}
