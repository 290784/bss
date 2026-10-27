import { NextResponse, type NextRequest } from "next/server";

/**
 * Checagem otimista: sem cookie de sessão, nem renderiza áreas privadas.
 * A validação real (sessão no banco + associação à organização) acontece no servidor.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("bos_session")) {
    const url = new URL("/entrar", request.url);
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/onboarding/:path*"] };
