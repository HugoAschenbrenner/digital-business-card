import type { Metadata } from "next";
import { Workspace } from "@/components/workspace";
import { getProfile } from "@/lib/provider";
import { cardUrl } from "@/lib/origin";
import { displayProfile } from "@/lib/profile";
export const metadata: Metadata = {
  title: "Wallet assets",
  robots: { index: false, follow: false },
};
export const revalidate = 60;
export default async function Wallet() {
  const p = displayProfile(await getProfile());
  const url = cardUrl();
  return (
    <Workspace
      title="Keep your card close."
      label="WALLET ASSETS"
      description="Matching artwork and QR codes to save on your iPhone, or use in a custom pass app."
    >
      {url.startsWith("http://localhost") && (
        <p className="note">
          The main artwork currently links to a local preview. Download it again
          from your public deployment before sharing. The offline artwork can
          already be saved and used.
        </p>
      )}
      <div className="two-columns">
        {[false, true].map((offline) => (
          <section className="panel" key={String(offline)}>
            <h2>{offline ? "Offline Contact" : "Main Digital Card"}</h2>
            <p>
              {offline
                ? "Your contact details, encoded directly."
                : "A link to your current digital business card."}
            </p>
            <img
              className="asset-artwork"
              src={`/api/assets/${offline ? "offline" : "main"}-card.svg`}
              width="1200"
              height="1500"
              alt={
                offline
                  ? "Offline contact card artwork"
                  : "Digital business card artwork"
              }
            />
            <div className="utility-links">
              <a
                href={`/api/assets/${offline ? "offline" : "main"}-card.png?download`}
              >
                Save artwork
              </a>
              <a
                href={`/api/assets/${offline ? "offline" : "main"}-qr.png?download`}
              >
                Save QR PNG
              </a>
              <a
                href={`/api/assets/${offline ? "offline" : "main"}-card.svg?download`}
              >
                SVG artwork
              </a>
            </div>
          </section>
        ))}
      </div>
      <section className="panel asset-section">
        <h2>On your iPhone</h2>
        <ol className="steps">
          <li>
            Download both artworks and QR PNGs while you have a connection.
          </li>
          <li>
            Save the two artworks to Photos or Files. Mark them as favourites so
            you can find them quickly at an event. This workflow is free and
            works offline.
          </li>
          <li>
            To put a card in Apple Wallet, use a custom pass app that supports
            QR codes. Choose a generic card, add your name and the text below,
            then add the main QR or paste the digital card URL as the barcode
            value.
          </li>
          <li>
            For a second pass, use the offline QR only if the app preserves an
            imported QR image or accepts the complete vCard payload. Do not
            replace its payload with a website URL.
          </li>
          <li>
            Check both codes with a second phone before relying on them. In
            airplane mode, confirm that the offline artwork still opens from
            Photos and the contact QR is readable.
          </li>
        </ol>
        <p className="note">
          These are images and QR assets, not signed Apple Wallet passes. Apple
          Wallet cannot import a PNG or SVG directly. A pass app may have its
          own fees or limitations; a free Wallet import is not guaranteed. No
          Apple Developer account, certificate or signing key is needed for the
          Photos / Files workflow.
        </p>
      </section>
      <section className="panel asset-section">
        <h2>Copy-ready details</h2>
        <pre className="compact-text">{`${p.fullName}\n${p.positioning}\n${p.focus}\n${p.school}\n\n${p.email}\n${p.phone}\n${p.linkedin}\n${url}`}</pre>
        <div className="utility-links">
          <a href="/api/wallet-text" download="hugo-wallet-details.txt">
            Download text &amp; QR payloads
          </a>
          <a href="/contact.vcf">Save vCard</a>
        </div>
      </section>
    </Workspace>
  );
}
