import { getAsset, getProfile } from "@/lib/provider";
import { makeVcard } from "@/lib/vcard";
import { cardUrl } from "@/lib/origin";
import sharp from "sharp";
export async function GET() {
  const p = await getProfile();
  let photo: Buffer | undefined;
  try {
    photo = await sharp(await getAsset("photo", p))
      .resize(160, 160, { fit: "inside" })
      .jpeg({ quality: 76 })
      .toBuffer();
  } catch {
    /* Contact information remains available without the image. */
  }
  return new Response(makeVcard(p, cardUrl(), photo), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="Hugo_Aschenbrenner.vcf"',
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
