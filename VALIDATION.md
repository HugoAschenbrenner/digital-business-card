# Implementation validation

Verified locally on 18 September 2026 with Node.js 24.19.0 and Next.js 16.3.5. This records performed checks, not a claim of physical-device certification or a live deployment.

## Completed checks

- `npm install`: passed. Exact dependency versions and `package-lock.json` committed. Final npm audit reported **zero known vulnerabilities**. ESLint 9 is retained because the current Next.js React lint plugin is incompatible with ESLint 10.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: **12 passed**. Tests cover origin selection, vCard syntax/UTF-8, photo size, independent QR decoding, all six Wallet theme/artwork variants, profile validation/modes, authentication, unavailable-provider fallback and offline updates across deployments.
- `npm run build`: passed. The card, résumé page, theme lab and Wallet page are server-rendered with revalidation. Dynamic downloads and protected admin APIs are included.
- Chrome and WebKit browser suite: **39 passed, 1 intentionally skipped**. The skipped test is WebKit's unreliable Playwright service-worker offline control; the same offline test passed in Chrome. No failed tests remain.
- Isolated production admin smoke test: passed for login, persisted mode/theme/photo toggle, rejection of a false PDF, valid PDF/photo upload, visible public updates and logout. The test also exercised an unreachable backend and analytics failure, and restores the baseline public card after its edits.
- Original PDF integrity: source and served copy both have SHA-256 `87103122c17cd3ac2078d5f106bb77d3bb3ee3c97680e5599de2eb71b6f0a43f`.
- Deployment tracing: the original PDF and profile derivative are included in the server route file traces, in addition to public asset delivery.

## Responsive and accessibility checks

Automated checks used 375×667, 390×844, 430×932, 360×800, 768×1024 and 1440×1000 viewports in both browser engines. The card fit vertically and had no horizontal overflow in all six. Axe WCAG A/AA checks found no violations on the card and theme variants. Tests also checked 200% text enlargement, no-JavaScript links, failed images, clipboard denial, native-share payload, Escape dismissal and restored QR-button focus.

Real rendered screenshots were inspected for standard mobile, small iPhone/WebKit and desktop theme comparison. Wallet PNG artwork was inspected and its embedded contact QR independently decoded. No facial retouching was performed. The original photo and source PDF remain unchanged.

## Lighthouse mobile laboratory run

Lighthouse 13.4.1 against the local production server, mobile emulation, simulated 150ms RTT / 1.6 Mbps throughput and 4× CPU slowdown:

- Performance: **99 / 100**
- Accessibility: **100 / 100**
- Best Practices: **100 / 100**
- SEO: **100 / 100**
- First contentful paint: **0.8 s**
- Largest contentful paint: **1.9 s**
- Cumulative layout shift: **0**
- Total measured transferred payload: approximately **158 KiB**.

This measurement was repeated on the final production build after the offline-cache correction. Scores are not guaranteed on a live host or every device. Re-run after deployment and any substantial changes.

## Continuation after the interrupted session

The initial implementation was already published on `main` as `14229edbf16a25a40b4ae1666bffb7824c10b7cd`. Its tree matched the local tested implementation exactly, and [GitHub Actions completed successfully](https://github.com/HugoAschenbrenner/digital-business-card/actions/runs/35318517579). No uncommitted application work was lost.

The continuation synchronized local history and corrected one cache-update edge case: every new cached HTML snapshot now includes its current scripts, styles, portrait and contact assets. A failed new script/style download preserves the previous complete offline card, while online rendering never waits for cache preparation. Three regression tests cover those behaviours. The full local suite, production build, admin smoke test and Lighthouse run above were repeated successfully after the correction.

## Checks still requiring the owner's services or physical devices

- Import into iOS Contacts and Android Contacts on real phones, including photo appearance. The generated vCard uses version 3.0 and was structurally validated, but desktop browser tests cannot confirm each native contact app.
- Scan each final code from another phone, especially a dense offline code placed inside a third-party pass app.
- Test native share destinations such as AirDrop on an actual iPhone. Browser tests supply a controlled Web Share implementation and verify the exact payload without sending anything.
- Create/configure a Vercel project, choose a stable public `SITE_URL`, and download the final permanent main QR. The local primary QR deliberately points to localhost and is marked as a preview in owner tools.
- Configure and test a real Supabase project if remote administration and aggregate analytics are wanted. No live Supabase credentials were supplied. Missing and failed-provider behaviour were tested locally.
- Add production edge rate limiting before enabling public admin login, as described in the README.

Apple Wallet deliverables are artwork, text and QR assets. They are not signed `.pkpass` files. Saving images in Photos/Files is free; importing a pass through a third-party app depends on that app's capabilities and pricing.
