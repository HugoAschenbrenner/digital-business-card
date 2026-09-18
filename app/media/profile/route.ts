import { getAsset, getProfile } from "@/lib/provider";
export async function GET() {
  return new Response(
    new Uint8Array(await getAsset("photo", await getProfile())),
    {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}
