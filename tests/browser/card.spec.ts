import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

for (const [name, width, height] of [
  ["SE", 375, 667],
  ["standard iPhone", 390, 844],
  ["Pro Max", 430, 932],
  ["Android", 360, 800],
  ["tablet", 768, 1024],
  ["desktop", 1440, 1000],
] as const) {
  test(`card fits ${name} and has accessible actions`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/card");
    await expect(
      page.getByRole("heading", { name: "Hugo Aschenbrenner" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Save Contact" }),
    ).toHaveAttribute("href", "/contact.vcf");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const bounds = await page.locator(".business-card").boundingBox();
    expect(bounds!.height).toBeLessThanOrEqual(height);
    expect(await page.locator("main").innerText()).not.toContain("+33");
    await expect(page.locator(".position > p")).toHaveText([
      "SKEMA Business School",
      "MSc Financial Markets & Investments",
      "Equity Derivatives · Sales",
    ]);
    await expect(page.locator("main")).not.toContainText("CFA");
    await expect(
      page.getByRole("link", { name: "Resume", exact: true }),
    ).toHaveAttribute("href", "/resume");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  });
}
test("homepage redirects and external links are direct", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/card$/);
  await expect(page.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
    "href",
    "https://www.linkedin.com/in/hugo-aschenbrenner-pro/",
  );
  await expect(
    page.getByRole("link", { name: "Explore Market Analytics Terminal" }),
  ).toHaveAttribute("href", "https://market-analytics-terminal.streamlit.app/");
});
test("PDF viewing and downloading preserve the supplied file", async ({
  page,
  request,
}) => {
  await page.goto("/resume");
  await expect(page.getByRole("link", { name: "View Resume" })).toHaveAttribute(
    "href",
    "/api/resume",
  );
  for (const suffix of ["", "?download=1"]) {
    const response = await request.get(`/api/resume${suffix}`);
    expect(response.headers()["content-type"]).toBe("application/pdf");
    expect(response.headers()["content-disposition"]).toContain(
      suffix ? "attachment" : "inline",
    );
    expect(await response.body()).toEqual(
      await readFile("public/assets/Hugo_Aschenbrenner_CV.pdf"),
    );
  }
});
test("resume has an obvious mobile return control that stays in reach", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/card");
  await page.getByRole("link", { name: "Resume", exact: true }).click();
  await expect(page).toHaveURL(/\/resume$/);
  await expect(page).toHaveTitle(/Resume/);
  await expect(page.locator("main")).not.toContainText(/résumé/i);
  const back = page.getByRole("link", { name: "Back to Card", exact: true });
  await expect(back).toBeInViewport();
  const initialBounds = (await back.boundingBox())!;
  expect(initialBounds.y).toBeLessThan(32);
  expect(initialBounds.height).toBeGreaterThanOrEqual(44);
  expect(initialBounds.width).toBeGreaterThan(300);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);

  // Enlarged text and a short viewport force scrolling, as with mobile zoom.
  await page.setViewportSize({ width: 390, height: 420 });
  await page.addStyleTag({ content: ":root { font-size: 200%; }" });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(back).toBeInViewport();
  expect((await back.boundingBox())!.y).toBeLessThan(32);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await back.click();
  await expect(page).toHaveURL(/\/card$/);
});
test("contact file downloads with photo and the specified email", async ({
  request,
}) => {
  const response = await request.get("/contact.vcf");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-disposition"]).toContain("attachment");
  const text = await response.text();
  expect(text).toContain("hugo.aschenbrenner@skema.edu");
  expect(text).toContain("PHOTO;ENCODING=b;TYPE=JPEG:");
  expect(Buffer.byteLength(text)).toBeLessThan(14000);
});
test("native share receives the correct payload", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        document.documentElement.dataset.shared = JSON.stringify(data);
      },
    });
  });
  await page.goto("/card");
  await page.getByRole("button", { name: "Share My Details" }).click();
  const data = JSON.parse(
    (await page.locator("html").getAttribute("data-shared"))!,
  );
  expect(data.title).toBe("Hugo Aschenbrenner");
  expect(data.text).toContain("Equity Derivatives · Sales");
  expect(data.url).toMatch(/\/card$/);
});
test("copy fallback and denied clipboard manual fallback work", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          document.documentElement.dataset.copied = text;
        },
      },
    });
  });
  await page.goto("/card");
  await page.getByRole("button", { name: "Share My Details" }).click();
  await expect(page.getByRole("status")).toHaveText("Card link copied");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    });
  });
  await page.getByRole("button", { name: "Share My Details" }).click();
  await expect(
    page.getByRole("textbox", { name: "Card link to copy" }),
  ).toBeVisible();
});
test("QR dialog is keyboard accessible and closes with Escape", async ({
  page,
}) => {
  await page.goto("/card");
  await page.getByRole("button", { name: "Show digital card QR code" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Show digital card QR code" }),
  ).toBeFocused();
});
test("three themes and photo variants are usable on desktop and mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/design-lab");
  await expect(page.locator(".business-card")).toHaveCount(3);
  await expect(page.locator(".avatar")).toHaveCount(3);
  await page.getByLabel("Show profile image on card").uncheck();
  await expect(page.locator(".avatar")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ["Steel Blue", "Bloomberg Amber", "Pure Graphite"]) {
    await page.getByRole("button", { name: theme, exact: true }).click();
    await expect(page.locator(".theme-option.active")).toContainText(theme);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
});
test("no backend leaves admin locked and rejects unauthorized writes", async ({
  page,
  request,
}) => {
  await page.goto("/admin");
  await expect(page.getByText("Administration is locked.")).toBeVisible();
  const response = await request.put("/api/admin/profile", {
    data: { theme: "amber" },
  });
  expect(response.status()).toBe(401);
  const login = await request.post("/api/admin/login", {
    headers: { origin: "https://attacker.invalid" },
    data: { password: "anything" },
  });
  expect(login.status()).toBe(403);
});
test("analytics absence is harmless and unlisted tools are noindex", async ({
  request,
}) => {
  const r = await request.post("/api/events", {
    headers: { origin: process.env.TEST_BASE_URL || "http://localhost:3000" },
    data: { event: "card_view" },
  });
  expect(r.status()).toBe(204);
  for (const p of ["/design-lab", "/wallet-assets", "/qr", "/admin"])
    expect(await (await request.get(p)).text()).toContain("noindex");
});
test("server-rendered information and core links work with JavaScript disabled", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(
    (process.env.TEST_BASE_URL || "http://localhost:3000") + "/card",
  );
  await expect(page.getByRole("link", { name: "Save Contact" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Show QR code & card link" }),
  ).toBeVisible();
  await context.close();
});
test("image failure preserves the name, layout and contact action", async ({
  page,
}) => {
  await page.route("**/assets/profile.webp", (r) => r.abort());
  await page.goto("/card");
  await expect(
    page.getByRole("heading", { name: "Hugo Aschenbrenner" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Save Contact" })).toBeVisible();
});
test("warm card and vCard remain available offline", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "Playwright WebKit does not expose reliable service-worker offline control.",
  );
  await page.goto("/card");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const c = await caches.open("hugo-card-v2");
        return (await c.keys())
          .map((r) => new URL(r.url).pathname)
          .filter((p) => p.startsWith("/_next/static/")).length;
      }),
    )
    .toBeGreaterThan(0);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("link", { name: "Save Contact" })).toBeVisible();
  await page.getByRole("button", { name: "Show digital card QR code" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(async () => {
      const response = await fetch("/contact.vcf");
      return (await response.text()).includes("BEGIN:VCARD");
    }),
  ).toBe(true);
  await context.setOffline(false);
});
test("wallet and QR assets download in both formats", async ({
  page,
  request,
}) => {
  await page.goto("/wallet-assets");
  await expect(
    page.getByRole("heading", { name: "On your iPhone" }),
  ).toBeVisible();
  for (const asset of ["main-qr", "offline-qr", "main-card", "offline-card"]) {
    for (const format of ["svg", "png"]) {
      const r = await request.get(`/api/assets/${asset}.${format}?download`);
      expect(r.ok()).toBe(true);
      expect(r.headers()["content-disposition"]).toContain("attachment");
    }
  }
});
test("200% text remains operable without clipped horizontal content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/card");
  await page.addStyleTag({ content: "html{font-size:200%}" });
  await expect(page.getByRole("link", { name: "Save Contact" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
