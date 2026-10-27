import { NextResponse, type NextRequest } from "next/server";
import { destroySession } from "@/server/auth/session";

// POST para evitar logout por links/prefetch (CSRF de logout).
export async function POST(request: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/entrar", request.url), 303);
}
