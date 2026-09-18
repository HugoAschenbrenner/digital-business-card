import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultProfile, displayProfile, profileSchema } from "../lib/profile";
import { makeVcard, foldLine, escapeVcard } from "../lib/vcard";
import { canonicalOrigin } from "../lib/origin";
import { artwork, qrPayload, qrPng, qrSvg } from "../lib/qr";
import {
  authConfigured,
  createSession,
  validSession,
  passwordMatches,
  sameOrigin,
} from "../lib/auth";
import sharp from "sharp";
import jsQR from "jsqr";
import { readFile } from "node:fs/promises";
import {
  readPublicProfile,
  remoteConfigured,
  recordEvent,
} from "../lib/provider";

test("canonical origin uses stable production configuration, preview environment and safe local fallback", () => {
  assert.equal(
    canonicalOrigin({ SITE_URL: "https://hugo.example/" }),
    "https://hugo.example",
  );
  assert.equal(
    canonicalOrigin({
      VERCEL_ENV: "preview",
      VERCEL_URL: "preview.vercel.app",
      VERCEL_PROJECT_PRODUCTION_URL: "prod.vercel.app",
    }),
    "https://preview.vercel.app",
  );
  assert.equal(
    canonicalOrigin({
      VERCEL_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "prod.vercel.app",
    }),
    "https://prod.vercel.app",
  );
  assert.equal(canonicalOrigin({}), "http://localhost:3000");
  for (const v of [
    "https://evil.test/path",
    "javascript:alert(1)",
    "https://a:b@example.com",
    "http://unsafe.example",
  ])
    assert.throws(() => canonicalOrigin({ SITE_URL: v }));
  assert.throws(() => canonicalOrigin({ VERCEL: "1" }));
});
test("vCard uses CRLF, escaped values, structured name/address and no employment claim", () => {
  const v = makeVcard(defaultProfile, "https://hugo.example/card");
  assert.ok(v.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n"));
  assert.ok(v.endsWith("END:VCARD\r\n"));
  assert.match(v, /N:Aschenbrenner;Hugo;;;/);
  assert.match(v, /TEL;TYPE=CELL:\+33782428479/);
  assert.match(v, /EMAIL;TYPE=INTERNET:hugo.aschenbrenner@skema.edu/);
  assert.match(v, /ADR;TYPE=WORK:;;;Paris;;;France/);
  assert.match(v, /item1.URL:https:\/\/hugo.example\/card/);
  assert.doesNotMatch(v, /\r\nTITLE:/);
  assert.equal(escapeVcard("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
});
test("folding preserves UTF-8 and limits every content line to 75 octets", () => {
  const original = "NOTE:" + "é界 — a".repeat(50);
  const folded = foldLine(original);
  for (const line of folded.split("\r\n"))
    assert.ok(Buffer.byteLength(line) <= 75);
  assert.equal(folded.replace(/\r\n /g, ""), original);
});
test("vCard includes a small valid JPEG even when card photo is hidden", async () => {
  const photo = await readFile("public/assets/profile-vcard.jpg");
  const card = makeVcard(
    { ...defaultProfile, showPhoto: false },
    "https://hugo.example/card",
    photo,
  ).replace(/\r\n /g, "");
  const encoded = card
    .split("\r\n")
    .find((s) => s.startsWith("PHOTO;"))!
    .split(":")[1];
  assert.equal(
    (await sharp(Buffer.from(encoded, "base64")).metadata()).format,
    "jpeg",
  );
  assert.ok(Buffer.byteLength(card) < 12000);
});
test("both QR PNGs decode to exact URL or full offline vCard", async () => {
  for (const offline of [false, true]) {
    const payload = qrPayload(
      defaultProfile,
      "https://hugo.example/card",
      offline,
    );
    const png = await qrPng(payload);
    const { data, info } = await sharp(png)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
    assert.ok(decoded);
    assert.equal(decoded.data, payload);
    assert.match(await qrSvg(payload), /<svg/);
    if (offline) {
      assert.match(decoded.data, /BEGIN:VCARD/);
      assert.match(decoded.data, /linkedin.com/);
      assert.match(decoded.data, /Equity Derivatives/);
      assert.doesNotMatch(decoded.data, /PHOTO|https:\/\/hugo.example/);
    }
  }
});
test("all wallet themes produce PNG artwork with a decodable QR", async () => {
  for (const theme of ["steel", "amber", "graphite"] as const) {
    for (const offline of [false, true]) {
      const bytes = await artwork(
        { ...defaultProfile, theme },
        "https://hugo.example/card",
        offline,
        "png",
      );
      assert.ok(Buffer.isBuffer(bytes));
      const { data, info } = await sharp(bytes as Buffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      assert.equal(info.width, 1200);
      assert.equal(info.height, 1500);
      assert.equal(
        jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data,
        qrPayload(defaultProfile, "https://hugo.example/card", offline),
      );
    }
  }
});
test("modes only change positioning language, and inputs reject unsafe values", () => {
  assert.equal(
    displayProfile({ ...defaultProfile, mode: "markets" }).focus,
    "Global Markets",
  );
  assert.equal(
    displayProfile({ ...defaultProfile, mode: "asset" }).focus,
    "Asset Management",
  );
  assert.equal(
    displayProfile(defaultProfile).focus,
    "Equity Derivatives · Sales",
  );
  assert.equal(
    profileSchema.safeParse({
      ...defaultProfile,
      linkedin: "javascript:alert(1)",
    }).success,
    false,
  );
  assert.equal(
    profileSchema.safeParse({ ...defaultProfile, fullName: "Hugo\nTITLE:CEO" })
      .success,
    false,
  );
  assert.equal(
    profileSchema.safeParse({ ...defaultProfile, photoKey: "../file.webp" })
      .success,
    false,
  );
  assert.equal(
    profileSchema.safeParse({ ...defaultProfile, photoKey: "a.pdf" }).success,
    false,
  );
});
test("admin fails closed, rejects forged cookies, and validates same-origin mutations", () => {
  const oldPassword = process.env.ADMIN_PASSWORD,
    oldSecret = process.env.ADMIN_SESSION_SECRET;
  try {
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_SESSION_SECRET;
    assert.equal(authConfigured(), false);
    assert.equal(validSession("anything"), false);
    process.env.ADMIN_PASSWORD = "test-only-strong-password";
    process.env.ADMIN_SESSION_SECRET =
      "test-only-session-key-with-over-32-characters";
    assert.equal(passwordMatches("wrong"), false);
    assert.equal(passwordMatches(process.env.ADMIN_PASSWORD), true);
    const token = createSession();
    assert.equal(validSession(token), true);
    assert.equal(validSession(token + "x"), false);
    assert.equal(
      validSession("1." + token.split(".").slice(1).join(".")),
      false,
    );
    assert.equal(
      sameOrigin(
        new Request("https://hugo.example/api/admin/profile", {
          headers: { origin: "https://evil.example" },
        }),
      ),
      false,
    );
    assert.equal(
      sameOrigin(
        new Request("https://hugo.example/api/admin/profile", {
          headers: { origin: "https://hugo.example" },
        }),
      ),
      true,
    );
  } finally {
    if (oldPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = oldPassword;
    if (oldSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = oldSecret;
  }
});
test("invalid configuration and a failed remote provider preserve the bundled card", async () => {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY,
    analytics = process.env.ANALYTICS_ENABLED,
    originalFetch = globalThis.fetch;
  try {
    process.env.SUPABASE_URL = "not-a-url";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test";
    assert.equal(remoteConfigured(), false);
    process.env.SUPABASE_URL = "https://provider.invalid";
    process.env.ANALYTICS_ENABLED = "true";
    globalThis.fetch = async () => {
      throw new Error("Provider offline");
    };
    assert.deepEqual(await readPublicProfile(), defaultProfile);
    await assert.doesNotReject(() => recordEvent("card_view"));
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries({
      SUPABASE_URL: url,
      SUPABASE_SERVICE_ROLE_KEY: key,
      ANALYTICS_ENABLED: analytics,
    })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
