import { getProfile } from "@/lib/provider";
import { displayProfile } from "@/lib/profile";
import { cardUrl } from "@/lib/origin";
import { makeVcard } from "@/lib/vcard";
export async function GET() {
  const p = displayProfile(await getProfile());
  return new Response(
    `${p.fullName}\n${p.positioning}\n${p.focus}\n${p.school}\n${p.email}\n${p.phone}\n${p.linkedin}\n\nMAIN QR PAYLOAD\n${cardUrl()}\n\nOFFLINE QR PAYLOAD\n${makeVcard(p, undefined, undefined, true)}`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="hugo-wallet-details.txt"',
        "Cache-Control": "no-store",
      },
    },
  );
}
