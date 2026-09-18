import { cookies } from "next/headers";
import { sameOrigin, COOKIE } from "@/lib/auth";
import { json } from "@/lib/http";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return json({ error: "Request origin not allowed." }, 403);
  (await cookies()).delete(COOKIE);
  return json({ ok: true });
}
