import { getAsset, getProfile } from "@/lib/provider";
export async function GET(request: Request) {
  const bytes = await getAsset("resume", await getProfile());
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="Hugo_Aschenbrenner_CV.pdf"`,
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
