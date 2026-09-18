import type { Profile } from "./profile";
import { displayProfile } from "./profile";
export function escapeVcard(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\n|\r/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
export function foldLine(s: string): string {
  let out = "",
    line = "",
    length = 0;
  for (const ch of s) {
    const size = Buffer.byteLength(ch, "utf8");
    if (length + size > 75) {
      out += line + "\r\n";
      line = " ";
      length = 1;
    }
    line += ch;
    length += size;
  }
  return out + line;
}
export function makeVcard(
  profile: Profile,
  url?: string,
  photo?: Buffer,
  offline = false,
) {
  const p = displayProfile(profile),
    e = escapeVcard;
  const [given, ...family] = p.fullName.split(" ");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${e(family.join(" "))};${e(given)};;;`,
    `FN:${e(p.fullName)}`,
    `TEL;TYPE=CELL:${p.phone.replace(/[ ()-]/g, "")}`,
    `EMAIL;TYPE=INTERNET:${e(p.email)}`,
    `URL:${p.linkedin}`,
    `NOTE:${e(`${p.positioning} — ${p.focus}`)}`,
  ];
  if (!offline) {
    const [city, ...country] = p.location.split(",").map((s) => s.trim());
    lines.push(
      `ORG:${e(p.school)}`,
      `ADR;TYPE=WORK:;;;${e(city)};;;${e(country.join(", "))}`,
    );
    if (url) lines.push(`item1.URL:${url}`, "item1.X-ABLabel:Digital card");
    if (photo)
      lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${photo.toString("base64")}`);
  }
  lines.push("END:VCARD");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
