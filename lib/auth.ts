import {
  createHmac,
  timingSafeEqual,
  createHash,
  randomBytes,
} from "node:crypto";
import { cookies } from "next/headers";
export const COOKIE = "card_admin";
export const SESSION_SECONDS = 8 * 60 * 60;
export function authConfigured() {
  return (
    (process.env.ADMIN_PASSWORD?.length ?? 0) >= 16 &&
    (process.env.ADMIN_SESSION_SECRET?.length ?? 0) >= 32
  );
}
function signature(value: string) {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET!)
    .update(value)
    .digest("hex");
}
function same(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function passwordMatches(value: string) {
  if (!authConfigured()) return false;
  return same(
    createHash("sha256").update(value).digest("hex"),
    createHash("sha256").update(process.env.ADMIN_PASSWORD!).digest("hex"),
  );
}
export function createSession() {
  const value = `${Math.floor(Date.now() / 1000) + SESSION_SECONDS}.${randomBytes(16).toString("hex")}`;
  return `${value}.${signature(value)}`;
}
export function validSession(value: string) {
  if (!authConfigured()) return false;
  const [expiry, nonce, sig, ...rest] = value.split(".");
  return (
    !rest.length &&
    /^\d+$/.test(expiry || "") &&
    /^[a-f0-9]{32}$/.test(nonce || "") &&
    Number(expiry) > Date.now() / 1000 &&
    same(sig || "", signature(`${expiry}.${nonce}`))
  );
}
export async function authenticated() {
  return validSession((await cookies()).get(COOKIE)?.value || "");
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return (
    !!origin &&
    origin === new URL(request.url).origin &&
    request.headers.get("sec-fetch-site") !== "cross-site"
  );
}
export async function authorizedMutation(request: Request) {
  return sameOrigin(request) && (await authenticated());
}
