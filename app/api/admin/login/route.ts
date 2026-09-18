import { cookies } from "next/headers";
import {
  authConfigured,
  passwordMatches,
  createSession,
  COOKIE,
  SESSION_SECONDS,
  sameOrigin,
} from "@/lib/auth";
import { limitedBody, json } from "@/lib/http";
let failures = 0,
  windowStart = Date.now();
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return json({ error: "Request origin not allowed." }, 403);
  if (!authConfigured())
    return json({ error: "Administration is not configured." }, 503);
  if (Date.now() - windowStart > 15 * 60 * 1000) {
    failures = 0;
    windowStart = Date.now();
  }
  if (failures >= 8)
    return json({ error: "Too many attempts. Try again in 15 minutes." }, 429);
  try {
    const body = JSON.parse(
      new TextDecoder().decode(await limitedBody(request, 2048)),
    );
    if (typeof body.password !== "string" || !passwordMatches(body.password)) {
      failures++;
      return json({ error: "Incorrect password." }, 401);
    }
    failures = 0;
    (await cookies()).set(COOKIE, createSession(), {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return json({ ok: true });
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
}
