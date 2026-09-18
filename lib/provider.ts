import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { unstable_cache } from "next/cache";
import { defaultProfile, profileSchema, type Profile } from "./profile";

export const events = [
  "card_view",
  "save_contact",
  "linkedin_click",
  "resume_view",
  "terminal_click",
  "share_click",
] as const;
export type EventName = (typeof events)[number];
export function remoteConfigured() {
  try {
    return (
      new URL(process.env.SUPABASE_URL || "").protocol === "https:" &&
      !!process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  } catch {
    return false;
  }
}
export function writable() {
  return remoteConfigured() || !process.env.VERCEL;
}
export function providerName() {
  return remoteConfigured()
    ? "Supabase"
    : process.env.VERCEL
      ? "Read-only configuration"
      : "Local files";
}
const dataDir = process.env.CARD_DATA_DIR || path.join(process.cwd(), ".data");
async function supabase(resource: string, init: RequestInit = {}) {
  const response = await fetch(`${process.env.SUPABASE_URL}${resource}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(1800),
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      ...init.headers,
    },
  });
  if (!response.ok)
    throw new Error("The storage provider is unavailable. Please try again.");
  return response;
}
export interface ProfileProvider {
  read(): Promise<Profile>;
  write(p: Profile): Promise<void>;
  upload(bytes: Buffer, extension: "pdf" | "webp"): Promise<string>;
  asset(key: string): Promise<Buffer>;
}
const local: ProfileProvider = {
  async read() {
    try {
      return profileSchema.parse(
        JSON.parse(await readFile(path.join(dataDir, "profile.json"), "utf8")),
      );
    } catch {
      return defaultProfile;
    }
  },
  async write(p) {
    if (!writable())
      throw new Error(
        "Connect Supabase for persistent administration on Vercel.",
      );
    await mkdir(dataDir, { recursive: true });
    const tmp = path.join(dataDir, `${randomUUID()}.tmp`);
    await writeFile(tmp, JSON.stringify(p, null, 2));
    await rename(tmp, path.join(dataDir, "profile.json"));
  },
  async upload(bytes, extension) {
    if (!writable()) throw new Error("Storage is not configured.");
    await mkdir(path.join(dataDir, "assets"), { recursive: true });
    const key = `${randomUUID()}.${extension}`;
    await writeFile(path.join(dataDir, "assets", key), bytes);
    return key;
  },
  async asset(key) {
    return readFile(path.join(dataDir, "assets", key));
  },
};
const remote: ProfileProvider = {
  async read() {
    const data = await (
      await supabase("/rest/v1/profiles?id=eq.main&select=data")
    ).json();
    return data.length ? profileSchema.parse(data[0].data) : defaultProfile;
  },
  async write(p) {
    await supabase("/rest/v1/profiles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ id: "main", data: p }),
    });
  },
  async upload(bytes, extension) {
    const key = `${randomUUID()}.${extension}`;
    await supabase(`/storage/v1/object/card-assets/${key}`, {
      method: "POST",
      headers: {
        "Content-Type": extension === "pdf" ? "application/pdf" : "image/webp",
      },
      body: new Uint8Array(bytes),
    });
    return key;
  },
  async asset(key) {
    return Buffer.from(
      await (
        await supabase(`/storage/v1/object/card-assets/${key}`)
      ).arrayBuffer(),
    );
  },
};
export const getProvider = () => (remoteConfigured() ? remote : local);
// The public card always has a validated local fallback; remote outages never block it indefinitely.
export async function readPublicProfile() {
  try {
    return await getProvider().read();
  } catch {
    return defaultProfile;
  }
}
export const getProfile = unstable_cache(
  readPublicProfile,
  [
    "profile-v1",
    JSON.stringify(defaultProfile),
    process.env.SUPABASE_URL || "local",
    process.env.CARD_DATA_DIR || ".data",
  ],
  { tags: ["profile"], revalidate: 60 },
);
export async function getAsset(kind: "photo" | "resume", p: Profile) {
  const key = kind === "photo" ? p.photoKey : p.resumeKey;
  if (key) {
    try {
      return await getProvider().asset(key);
    } catch {
      /* Use original asset during an outage. */
    }
  }
  return readFile(
    path.join(
      process.cwd(),
      "public/assets",
      kind === "photo" ? "profile.webp" : "Hugo_Aschenbrenner_CV.pdf",
    ),
  );
}
export async function recordEvent(event: EventName) {
  if (!remoteConfigured() || process.env.ANALYTICS_ENABLED !== "true") return;
  try {
    await supabase("/rest/v1/rpc/increment_card_event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_name: event }),
    });
  } catch {
    /* Analytics never breaks a visitor action. */
  }
}
export async function metrics(): Promise<
  { event: string; day: string; total: number }[]
> {
  if (!remoteConfigured() || process.env.ANALYTICS_ENABLED !== "true")
    return [];
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  return (
    await supabase(
      `/rest/v1/card_events?day=gte.${since}&select=event,day,total&order=day.desc`,
    )
  ).json();
}
