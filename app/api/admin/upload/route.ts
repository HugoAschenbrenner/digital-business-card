import sharp from "sharp";
import { authorizedMutation } from "@/lib/auth";
import { getProvider, writable } from "@/lib/provider";
import { limitedBody, json } from "@/lib/http";
export async function POST(request: Request) {
  if (!(await authorizedMutation(request)))
    return json({ error: "Please sign in again." }, 401);
  if (!writable()) return json({ error: "Storage is not configured." }, 503);
  try {
    const body = await limitedBody(request, 6 * 1024 * 1024);
    const form = await new Response(body, {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    }).formData();
    const file = form.get("file"),
      kind = form.get("kind");
    if (!(file instanceof File) || !["photo", "resume"].includes(String(kind)))
      return json({ error: "Choose a profile image or PDF." }, 400);
    let bytes = Buffer.from(await file.arrayBuffer());
    if (kind === "resume") {
      if (
        bytes.length > 5 * 1024 * 1024 ||
        bytes.subarray(0, 5).toString() !== "%PDF-" ||
        !bytes.subarray(-2048).toString().includes("%%EOF")
      )
        return json({ error: "Choose a valid PDF smaller than 5 MB." }, 400);
    } else {
      if (bytes.length > 3 * 1024 * 1024)
        return json({ error: "Choose an image smaller than 3 MB." }, 400);
      const image = sharp(bytes, { limitInputPixels: 25_000_000 });
      const info = await image.metadata();
      if (!["jpeg", "png", "webp"].includes(info.format || ""))
        return json({ error: "Choose a JPEG, PNG or WebP image." }, 400);
      bytes = await image
        .rotate()
        .resize(480, 480, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    }
    return json({
      key: await getProvider().upload(
        bytes,
        kind === "resume" ? "pdf" : "webp",
      ),
    });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "The upload failed." },
      400,
    );
  }
}
