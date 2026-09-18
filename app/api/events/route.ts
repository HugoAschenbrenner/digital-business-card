import { after } from "next/server";
import { events, recordEvent } from "@/lib/provider";
import { sameOrigin } from "@/lib/auth";
import { limitedBody } from "@/lib/http";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  try {
    const body = JSON.parse(
      new TextDecoder().decode(await limitedBody(request, 256)),
    );
    if (events.includes(body.event)) {
      after(() => recordEvent(body.event));
    }
  } catch {
    /* Invalid events are ignored. No visitor information is recorded. */
  }
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
