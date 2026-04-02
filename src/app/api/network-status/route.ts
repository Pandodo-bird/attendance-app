import { NextResponse } from "next/server";

export function GET(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
