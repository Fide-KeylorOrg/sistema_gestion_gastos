import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only (cookie present). Real validation happens in requireUser/requirePermission.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|logout|_next/static|_next/image|favicon.ico).*)"],
};
