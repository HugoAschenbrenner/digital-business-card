import { getProfile } from "@/lib/provider";
import { cardUrl } from "@/lib/origin";
import { artwork, qrPayload, qrPng, qrSvg } from "@/lib/qr";
const names = [
  "main-qr.svg",
  "main-qr.png",
  "offline-qr.svg",
  "offline-qr.png",
  "main-card.svg",
  "main-card.png",
  "offline-card.svg",
  "offline-card.png",
];
export async function GET(
  request: Request,
  { params }: { params: Promise<{ asset: string }> },
) {
  const { asset } = await params;
  if (!names.includes(asset)) return new Response("Not found", { status: 404 });
  const p = await getProfile(),
    url = cardUrl(),
    offline = asset.startsWith("offline"),
    format = asset.endsWith(".svg") ? "svg" : "png";
  const payload = qrPayload(p, url, offline);
  const bytes = asset.includes("-card")
    ? await artwork(p, url, offline, format)
    : format === "svg"
      ? await qrSvg(payload)
      : await qrPng(payload);
  return new Response(
    typeof bytes === "string" ? bytes : new Uint8Array(bytes),
    {
      headers: {
        "Content-Type": format === "svg" ? "image/svg+xml" : "image/png",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        ...(new URL(request.url).searchParams.has("download")
          ? { "Content-Disposition": `attachment; filename="hugo-${asset}"` }
          : {}),
      },
    },
  );
}
