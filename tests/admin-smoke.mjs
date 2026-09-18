import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

// An isolated storage directory prevents the smoke test from overwriting an owner's edits.
const dataPath = path.join(
  tmpdir(),
  `digital-card-test-${randomBytes(8).toString("hex")}`,
);
const base = "http://localhost:3001";
const password = randomBytes(24).toString("hex");
const sessionSecret = randomBytes(32).toString("hex");
let processHandle, browser;
async function start(extra = {}) {
  processHandle = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", "3001"],
    {
      env: {
        ...process.env,
        SITE_URL: base,
        ADMIN_PASSWORD: password,
        ADMIN_SESSION_SECRET: sessionSecret,
        CARD_DATA_DIR: dataPath,
        SUPABASE_URL: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
        ...extra,
      },
      stdio: "ignore",
    },
  );
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(`${base}/admin`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Smoke-test server did not start.");
}
async function stop() {
  if (!processHandle || processHandle.exitCode !== null) return;
  const ended = new Promise((r) => processHandle.once("exit", r));
  processHandle.kill("SIGTERM");
  await ended;
}
try {
  await mkdir(dataPath, { recursive: true });
  await start();
  browser = await chromium.launch(
    process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  );
  const page = await browser.newPage();
  await page.goto(`${base}/admin`);
  await page.getByLabel("Admin password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Save changes" }).waitFor();
  await page.getByLabel("Theme").selectOption("amber");
  await page.getByLabel("Active profile mode").selectOption("markets");
  await page.getByLabel("Show profile image on card").uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("status").filter({ hasText: "Saved." }).waitFor();
  const saved = JSON.parse(
    await readFile(path.join(dataPath, "profile.json"), "utf8"),
  );
  assert.equal(saved.theme, "amber");
  assert.equal(saved.mode, "markets");
  assert.equal(saved.showPhoto, false);
  await page.reload();
  assert.equal(
    await page.getByLabel("Active profile mode").inputValue(),
    "markets",
  );
  await page
    .getByLabel("Résumé PDF")
    .setInputFiles({
      name: "not-a-pdf.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("this is not a PDF"),
    });
  await page.getByRole("status").filter({ hasText: "valid PDF" }).waitFor();
  await page
    .getByLabel("Résumé PDF")
    .setInputFiles("public/assets/Hugo_Aschenbrenner_CV.pdf");
  await page.getByRole("status").filter({ hasText: "Upload ready" }).waitFor();
  await page
    .getByLabel("Profile photo", { exact: false })
    .setInputFiles("public/assets/profile.webp");
  await page.getByRole("status").filter({ hasText: "Upload ready" }).waitFor();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("status").filter({ hasText: "Saved." }).waitFor();
  const withAssets = JSON.parse(
    await readFile(path.join(dataPath, "profile.json"), "utf8"),
  );
  assert.ok(withAssets.resumeKey.endsWith(".pdf"));
  assert.ok(withAssets.photoKey.endsWith(".webp"));
  assert.deepEqual(
    await readFile(path.join(dataPath, "assets", withAssets.resumeKey)),
    await readFile("public/assets/Hugo_Aschenbrenner_CV.pdf"),
  );
  await page.goto(`${base}/card`);
  assert.equal(
    await page.locator(".business-card").getAttribute("data-theme"),
    "amber",
  );
  assert.equal(await page.locator(".avatar").count(), 0);
  assert.equal(await page.locator(".focus").innerText(), "Global Markets");
  // ISR HTML shares the build directory even when profile storage is isolated.
  // Restore the bundled profile before leaving the production preview behind.
  const baseline = JSON.parse(await readFile("content/profile.json", "utf8"));
  const restored = await page.request.put(`${base}/api/admin/profile`, {
    headers: { origin: base },
    data: baseline,
  });
  assert.equal(restored.status(), 200);
  await page.goto(`${base}/card`);
  assert.equal(await page.locator(".focus").innerText(), baseline.focus);
  await page.goto(`${base}/admin`);
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByLabel("Admin password").waitFor();
  const unauthorized = await page.request.put(`${base}/api/admin/profile`, {
    headers: { origin: base },
    data: saved,
  });
  assert.equal(unauthorized.status(), 401);
  console.log(
    "PASS: sign-in, persisted mode/theme/photo visibility, invalid upload rejection, PDF/photo upload, public updates and logout.",
  );
  await browser.close();
  browser = null;
  await stop();
  await start({
    SUPABASE_URL: "https://127.0.0.1:1",
    SUPABASE_SERVICE_ROLE_KEY: "unreachable-test-provider",
    ANALYTICS_ENABLED: "true",
  });
  const html = await (await fetch(`${base}/card`)).text();
  assert.ok(html.includes("Hugo"));
  assert.ok(html.includes("Save Contact"));
  const analytics = await fetch(`${base}/api/events`, {
    method: "POST",
    headers: { origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ event: "card_view" }),
  });
  assert.equal(analytics.status, 204);
  console.log(
    "PASS: unreachable backend and analytics fail without breaking the card.",
  );
} finally {
  await browser?.close();
  await stop();
  await rm(dataPath, { recursive: true, force: true });
}
