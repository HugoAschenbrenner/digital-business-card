# Hugo Aschenbrenner — Digital Business Card

A compact, mobile-first business card for professional networking. English copy, a discreet portrait, and a single primary action: **Save Contact**. There is no résumé timeline, marketing landing page or market-themed decoration.

## Run locally

Use Node.js 22 or newer (Node 24 LTS recommended).

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000/card`. No API keys or backend are needed. For a production preview:

```sh
npm run build
npm start
```

Do not run development and production servers on the same port. Keep `SITE_URL` consistent with the port you use when checking QR codes.

## Architecture

- Next.js App Router, React, strict TypeScript and custom CSS tokens. Native system fonts, semantic links and server rendering keep the public card useful before JavaScript loads. CSS is deliberately small; Tailwind is unnecessary for this focused interface.
- `content/profile.json` is the default content source. `lib/profile.ts` validates it and resolves the three positioning modes. Components, contact files, QR payloads and Wallet artwork all use this model.
- `lib/provider.ts` separates content and asset persistence from the UI. Local development uses ignored `.data/` files. Vercel uses the optional Supabase provider; without it, deployed configuration is read-only.
- Public profile reads are cached for 60 seconds and invalidated on an admin save. Supabase failures have a bounded timeout and fall back to the bundled profile and original assets. The fallback may show the last **bundled** details, so keep them accurate when editing remotely.
- Only sharing, design controls, admin forms and optional event reporting hydrate on the client. Supabase credentials and admin secrets remain server-side.
- QR creation uses the standards-based `qrcode` library. Sharp handles image resizing and downloadable PNG artwork. No external QR service is involved.

## Routes

- `/` redirects to `/card`.
- `/card`: compact public business card, contact download, direct LinkedIn and Terminal links, résumé and native share / copy-link fallback. The QR button opens a keyboard-accessible dialog.
- `/contact.vcf`: vCard 3.0, UTF-8, CRLF, byte-safe line folding and a small embedded JPEG.
- `/resume`: stable résumé page, with inline PDF viewing and download links.
- `/api/resume`: original PDF bytes; `?download=1` selects an attachment response.
- `/design-lab`: all three themes side by side on desktop, theme buttons on mobile, with photo on/off. Preview choices do not publish changes.
- `/qr`: primary and offline QR codes, each available as SVG and 1,600px PNG.
- `/wallet-assets`: two matching card artworks, QR PNGs, compact text and iPhone instructions.
- `/admin`: locked by default; secure sign-in, content, mode, theme, photo and PDF editing, optional aggregate activity.
- `/api/assets/main-qr.{svg,png}`, `/api/assets/offline-qr.{svg,png}`, `/api/assets/main-card.{svg,png}`, `/api/assets/offline-card.{svg,png}`: generated assets; add `?download` for a file attachment.
- `/api/wallet-text`: copy-ready information including the complete offline payload.

Tool pages are unlisted from the public card navigation and marked `noindex`. This is not access control: the QR and Wallet pages contain intentionally shareable contact information and are public. Only administration is authenticated.

## Deploy to Vercel

1. Import this GitHub repository into Vercel. Select the detected **Next.js** preset and Node.js 24. Keep the root directory as the repository root.
2. Use `npm install` (or `npm ci`) for installation and `npm run build` for the build command. No custom output directory is required.
3. Deploy. No environment variables are required for the core card if Vercel exposes its system variables.
4. Open `/card`, `/resume`, `/contact.vcf` and `/qr` on the deployment URL. Confirm the generated QR contains the intended address.
5. Before printing a permanent QR, set `SITE_URL` to your stable public origin and redeploy. Disable Vercel Deployment Protection for an address intended for public networking, or use the public production deployment. A protected preview cannot serve an unauthenticated visitor.

Origin precedence is explicit `SITE_URL`, then `VERCEL_URL` for previews, then `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL` for production, then `http://localhost:3000` outside Vercel. We never derive a QR destination from untrusted request host headers. Invalid configured origins fail clearly rather than generating a misleading QR.

A custom domain needs only a Vercel domain assignment and an updated `SITE_URL` environment variable with a redeployment; no product code changes. Preserve any old URL with a redirect if codes have already been distributed. A QR's **encoded URL is immutable**: changing an environment variable cannot rewrite a printed QR. The same stable URL can always show new profile details.

Official references: [Vercel system variables](https://vercel.com/docs/environment-variables/system-environment-variables), [environment configuration](https://vercel.com/docs/environment-variables), [Next.js deployment](https://nextjs.org/docs/app/getting-started/deploying).

## Configuration and environment variables

See `.env.example`. None are exposed using `NEXT_PUBLIC_`.

- `SITE_URL`: optional absolute origin, such as `https://your-domain.example`, with no path. Use HTTPS except for localhost.
- `ADMIN_PASSWORD`: optional administrator password, at least 16 characters. Use a long unique password stored in your hosting environment.
- `ADMIN_SESSION_SECRET`: independent random value, at least 32 characters. Generate it with `openssl rand -hex 32`.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: optional, server-only Supabase connection. Never commit or expose the service role key.
- `ANALYTICS_ENABLED`: defaults to `false`. Set to `true` only with the optional backend configured.
- `NEXT_TELEMETRY_DISABLED=1`: disables Next.js development/build telemetry; it is unrelated to card analytics.

The admin interface remains locked unless both admin values are valid. The core card never depends on admin availability. Invalid or partial Supabase configuration uses the bundled profile safely. A configured but unavailable backend also falls back for public reads; failed writes display an error and are never presented as successful.

## Edit information, themes and modes

Without remote storage, edit `content/profile.json`, commit and redeploy. Restart a local server after editing the bundled file. If local admin overrides exist in `.data/profile.json`, they take precedence; remove that specific override to return to the bundled profile.

The three themes use the same layout and content:

- `steel` — Steel Blue, the default.
- `amber` — Bloomberg Amber, a restrained colour reference only; no Bloomberg marks or terminal UI.
- `graphite` — Pure Graphite.

Compare them at `/design-lab`. Publish a theme with the `theme` setting or in `/admin`. `showPhoto: false` removes the portrait from the card, while the downloaded contact still includes it.

Modes are `equity` (default), `markets` and `asset`. Equity uses the editable positioning/focus fields; the other two resolve to **Financial Markets & Investments / Global Markets** or **Financial Markets & Investments / Asset Management**. Switching back restores the edited Equity Derivatives copy. No mode introduces a current job title or employment claim. The saved mode applies to the card, contact note and assets.

The specified SKEMA email overrides the different address printed in the supplied PDF. The PDF itself is unchanged. The phone is inside the downloadable contact and offline assets, but is not visibly displayed on `/card`.

## Replace the résumé and photo

The canonical PDF is `public/assets/Hugo_Aschenbrenner_CV.pdf`. Replace it with the new PDF at the same path and redeploy, or upload in authenticated `/admin` and **Save changes**. Public `/resume` and `/api/resume` addresses stay stable. Responses differ only in inline vs attachment disposition; PDF bytes are preserved. The original supplied file was copied byte for byte.

The portrait derivative is `public/assets/profile.webp` (320 × 320, about 8 KB); a small JPEG is retained for contact compatibility checks. The source photograph is not retouched. Admin accepts JPEG/PNG/WebP up to 3 MB, validates and re-encodes them, and strips metadata. PDF uploads are limited to 5 MB and checked for PDF signatures. Do not upload untrusted documents: this is a private, single-owner publishing surface, not a public file upload service.

Uploaded files are staged until **Save changes**. Historical and abandoned uploads are retained; periodically remove unreferenced files from your private storage bucket. Keep a backup before removing anything.

## Optional Supabase administration

1. Create a Supabase project.
2. Run `supabase/schema.sql` in its SQL editor. It creates one profile row location, daily event counters and the private `card-assets` storage bucket.
3. Configure the server-only Supabase URL and service role key in Vercel, plus the two admin secrets. Redeploy.
4. Sign in at `/admin`, edit the profile, upload files if needed, and save. The first save creates the `main` profile row; before it exists, the bundled profile is used.

All tables have row-level security enabled. Anonymous and authenticated Supabase client roles have no access. Only the application server uses the service role. Keep the bucket private and do not add public policies. There is no browser Supabase SDK or visitor authentication requirement. Local `.data/` writes are intentionally disabled on Vercel because its filesystem is not durable.

The SQL and provider are supplied and validated structurally; a live Supabase project is needed to verify its provisioning, permissions and network connection end to end.

## Analytics and security

Optional counters are `card_view`, `save_contact`, `linkedin_click`, `resume_view`, `terminal_click`, `share_click`. The client sends only a fixed event name to the same-origin server, which increments a daily aggregate. No IP, user agent, referrer, advertising ID or visitor identifier is saved by this application. There are no analytics cookies or fingerprinting. Supabase receives only aggregate counter operations. Hosting services may retain their own operational logs under their own settings.

Metrics count actions, not unique visitors; reloads, shared previews, browser behaviour and bots can affect them. Ad blockers, offline mode or any API failure may drop events without blocking the card. A share click is an attempt, not proof that someone received a message.

Admin sessions use an HMAC-signed random cookie with an eight-hour expiry, HttpOnly, SameSite=Strict, and Secure on HTTPS. Mutation routes validate same origin and authentication. Login uses constant-time comparison and a per-process attempt limit. On serverless infrastructure, add a Vercel Firewall rate-limit rule for `/api/admin/login` before enabling public administration: the in-memory limiter cannot coordinate across instances. Rotate the session secret to invalidate all sessions. Logout clears the current cookie; previously stolen tokens remain valid until expiry or secret rotation.

Uploads have streamed size limits, magic-byte validation and restricted storage keys. URLs and content are validated before persistence. Security response headers include a restrictive same-origin CSP; inline scripts/styles remain allowed for Next.js hydration, so this is not a nonce-based strict CSP. No secrets belong in this repository or the profile JSON.

## Poor reception and offline use

1. **Normal connection:** full server-rendered card, direct links, PDF and contact download.
2. **Poor connection:** native fonts, optimized local photo, small stylesheet, no remote decorative assets, cached public data. The service worker saves the card, its script/style assets, contact file, photo and both QR SVGs after an initial successful visit.
3. **Zero connection:** returning visitors can use the cached card and contact file. A brand-new visitor cannot fetch an uncached website. Keep the offline contact QR and artworks in Photos/Files beforehand.

The service worker uses cache-first responses with background refresh for a narrow allowlist. Admin pages, login responses and mutations are never cached. Updated content normally appears on the next visit after refresh; after an admin save the current browser's public cache is cleared. Other devices need an online visit to receive changes. Browser storage can be evicted, and private browsing may restrict offline support. LinkedIn, the Terminal and uncached PDFs still need a network connection.

The offline QR embeds a compact vCard with name, phone, email, LinkedIn and focus; it intentionally omits the photo to keep the QR readable. Some camera apps show the raw text instead of an import prompt. Keep the quiet zone and high contrast, show it at full brightness and test with the phones your contacts use. Do not make the dense offline code tiny on a pass.

## Wallet and shareable assets

At `/wallet-assets`, download the two 1,200 × 1,500 card artworks, the 1,600px QR PNGs and copy-ready text. SVGs are also available. Artwork follows the selected profile theme and is generated from the same content and QR payloads as the website.

**Free path:** save both card images to iPhone Photos or Files and mark them as favourites. They can be displayed without reception and shared as images.

**Optional Wallet path:** use a custom pass app with QR support. Enter the card URL for the main pass. For the offline pass, the app must preserve the imported QR image or support the complete vCard barcode payload. Scan the resulting pass with another device to verify it. This project supplies assets only; PNG/SVG cannot be directly imported into Wallet. Third-party pass apps may charge or limit features, so a free Wallet import is not guaranteed. There is no PassKit signing, certificate handling, paid Apple Developer requirement or `.pkpass` generation in this repository.

## Tests and verification

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
# In another terminal:
npx playwright install chromium webkit
npm run test:e2e
```

Browser tests expect the default bundled profile and locked admin, with no `.data/` override. Set `TEST_BASE_URL` to test another running deployment. `CHROME_PATH` can select an installed Chrome executable instead of downloaded Chromium. Tests verify six viewport sizes, direct links, unchanged PDF bytes, vCard data, share API payloads, clipboard fallback, themes/photo, accessibility, unauthorized admin writes, no-JS behaviour, offline caching and assets. WebKit service-worker offline control is explicitly skipped because Playwright cannot test it reliably.

Unit tests decode both QR types and all six theme/artwork combinations using an independent decoder, validate UTF-8 line folding, contact payloads, origin resolution, modes, input validation and session signatures. `tests/admin-smoke.mjs` additionally launches an isolated production instance to test authenticated saves, persisted modes, uploads, logout and an unreachable backend fallback. It requires a production build and exits with failure on any assertion.

See `VALIDATION.md` for the actual run results and remaining device checks. Lighthouse numbers are laboratory results, not a guarantee for every network, device or future deployment.

## Deliberate limitations and next refinements

- No custom domain is assumed. Download final primary QR assets after deciding the stable public origin.
- iOS/Android contact-import UI and native share destinations ultimately depend on the device. Browser automation validates the payloads and download headers, not a physical phone's Contacts app.
- No live Supabase account or Vercel project is created by this code. Configure those services separately when wanted.
- No image-based Open Graph preview was requested; metadata supplies the name and positioning without introducing extra public assets.
- The current public design is intentionally restrained. The useful next visual decision is choosing one of the three accents and whether the small portrait should be visible, after viewing `/design-lab` on your own iPhone.
