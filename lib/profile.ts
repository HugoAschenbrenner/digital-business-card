import { z } from "zod";
import initial from "@/content/profile.json";

const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((v) => !/[\r\n\x00-\x1f]/.test(v), "Use a single line of text.");
const https = z
  .url()
  .max(500)
  .refine((v) => {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password;
  }, "Use an HTTPS URL.");
const asset = z
  .string()
  .regex(/^[a-f0-9-]+\.(webp|pdf)$/)
  .nullable();
export const profileSchema = z.object({
  fullName: text(70),
  positioning: text(80),
  focus: text(80),
  school: text(80),
  credential: text(90),
  location: text(80),
  email: z.email().max(120),
  phone: text(30).refine(
    (v) => /^\+?[\d ()-]{6,30}$/.test(v),
    "Enter a valid phone number.",
  ),
  linkedin: https,
  terminal: https,
  showPhoto: z.boolean(),
  theme: z.enum(["steel", "amber", "graphite"]),
  mode: z.enum(["equity", "markets", "asset"]),
  photoKey: asset.refine((v) => v === null || v.endsWith(".webp")),
  resumeKey: asset.refine((v) => v === null || v.endsWith(".pdf")),
});
export type Profile = z.infer<typeof profileSchema>;
export type Theme = Profile["theme"];
export const defaultProfile: Profile = profileSchema.parse(initial);
export const themes = [
  { id: "steel", name: "Steel Blue", accent: "#a9c5dd" },
  { id: "amber", name: "Bloomberg Amber", accent: "#dfb17a" },
  { id: "graphite", name: "Pure Graphite", accent: "#d4d2cb" },
] as const;
export const modes = [
  { id: "equity", name: "Equity Derivatives" },
  { id: "markets", name: "Global Markets" },
  { id: "asset", name: "Asset Management" },
] as const;
export function displayProfile(p: Profile): Profile {
  if (p.mode === "markets")
    return {
      ...p,
      positioning: "MSc Financial Markets & Investments",
      focus: "Global Markets",
    };
  if (p.mode === "asset")
    return {
      ...p,
      positioning: "MSc Financial Markets & Investments",
      focus: "Asset Management",
    };
  return p;
}
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .filter((_, i, a) => i === 0 || i === a.length - 1)
    .join("");
}
