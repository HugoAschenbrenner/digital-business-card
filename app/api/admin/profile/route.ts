import { authorizedMutation } from "@/lib/auth";
import { getProvider, writable } from "@/lib/provider";
import { profileSchema } from "@/lib/profile";
import { revalidateTag, revalidatePath } from "next/cache";
import { limitedBody, json } from "@/lib/http";
export async function PUT(request: Request) {
  if (!(await authorizedMutation(request)))
    return json({ error: "Please sign in again." }, 401);
  if (!writable())
    return json({ error: "Connect Supabase to save changes on Vercel." }, 503);
  try {
    const raw = JSON.parse(
      new TextDecoder().decode(await limitedBody(request, 8192)),
    );
    const parsed = profileSchema.safeParse(raw);
    if (!parsed.success)
      return json(
        {
          error: parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join(" "),
        },
        400,
      );
    await getProvider().write(parsed.data);
    revalidateTag("profile", { expire: 0 });
    for (const route of ["/card", "/resume", "/design-lab", "/wallet-assets"])
      revalidatePath(route);
    return json({ ok: true });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Could not save changes.",
      },
      400,
    );
  }
}
