import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { endSession, getCurrentUser } from "@/lib/auth";

// A plain form POST + 303 is a full page load, which drops the client router cache so "Back" can't show protected pages.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  await endSession();
  if (user) {
    const idle = request.nextUrl.searchParams.get("reason") === "idle";
    await audit(idle ? "logout.idle" : "logout", { actorId: user.id });
  }
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
