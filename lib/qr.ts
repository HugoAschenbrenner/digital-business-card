import QRCode from "qrcode";
import sharp from "sharp";
import { displayProfile, themes, type Profile } from "./profile";
import { makeVcard } from "./vcard";
export const qrOptions = {
  errorCorrectionLevel: "M" as const,
  margin: 4,
  color: { dark: "#111418", light: "#ffffff" },
};
export async function qrSvg(payload: string) {
  return QRCode.toString(payload, { ...qrOptions, type: "svg" });
}
export async function qrPng(payload: string) {
  return QRCode.toBuffer(payload, { ...qrOptions, type: "png", width: 1600 });
}
export function qrPayload(p: Profile, url: string, offline: boolean) {
  return offline ? makeVcard(p, undefined, undefined, true) : url;
}
const xml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
export async function artwork(
  profile: Profile,
  url: string,
  offline: boolean,
  format: "svg" | "png",
) {
  const p = displayProfile(profile),
    accent = themes.find((t) => t.id === p.theme)!.accent;
  const qr = await qrSvg(qrPayload(p, url, offline));
  const encoded = Buffer.from(qr).toString("base64");
  const size = p.fullName.length > 28 ? 30 : 39;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="#161a1f"/><rect width="800" height="5" fill="${accent}"/><g font-family="Arial,DejaVu Sans,sans-serif"><text x="56" y="83" fill="${accent}" font-size="14" letter-spacing="3">${offline ? "OFFLINE CONTACT" : "DIGITAL BUSINESS CARD"}</text><text x="56" y="160" fill="#f2f1ee" font-size="${size}" font-weight="500">${xml(p.fullName)}</text><text x="56" y="212" fill="#f2f1ee" font-size="21">${offline ? "Contact" : xml(p.positioning)}</text><text x="56" y="250" fill="${accent}" font-size="20">${offline ? "" : xml(p.focus)}</text><text x="56" y="292" fill="#a3a8af" font-size="18">${offline ? "" : xml(p.school)}</text><image x="160" y="350" width="480" height="480" href="data:image/svg+xml;base64,${encoded}"/><text x="400" y="889" fill="#a3a8af" font-size="17" text-anchor="middle">${offline ? xml(p.email) : "Scan to save my details"}</text><text x="400" y="944" fill="${accent}" font-size="12" letter-spacing="2" text-anchor="middle">${offline ? "CONTACT DETAILS · NO NETWORK REQUIRED" : "CONNECT · SAVE · SHARE"}</text></g></svg>`;
  return format === "svg" ? svg : sharp(Buffer.from(svg)).png().toBuffer();
}
