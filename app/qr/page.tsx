import type { Metadata } from "next";
import { Workspace } from "@/components/workspace";
import { cardUrl } from "@/lib/origin";
export const metadata: Metadata = {
  title: "QR codes",
  robots: { index: false, follow: false },
};
export default function QrPage() {
  const url = cardUrl();
  return (
    <Workspace
      title="Ready for the next introduction."
      label="YOUR QR CODES"
      description="Save both codes to your phone before an event. Use the digital card when connected, and the contact QR when reception is unavailable."
    >
      {url.startsWith("http://localhost") && (
        <p className="note">
          Local preview: the primary QR points to this computer. Use your
          deployed public address before sharing it. The offline contact QR is
          ready to use.
        </p>
      )}
      <div className="two-columns">
        {[false, true].map((offline) => (
          <section className="panel qr-panel" key={String(offline)}>
            <p className="eyebrow">
              {offline
                ? "02 / OFFLINE CONTACT QR"
                : "01 / PRIMARY DIGITAL CARD QR"}
            </p>
            <h2>
              {offline
                ? "Contact, without a connection."
                : "Your digital business card."}
            </h2>
            <p>
              {offline
                ? "Contains essential contact information directly."
                : "Requires network for the full experience."}
            </p>
            <img
              src={`/api/assets/${offline ? "offline" : "main"}-qr.svg`}
              alt={
                offline
                  ? "Offline QR containing contact details"
                  : "QR linking to the digital card"
              }
              width="320"
              height="320"
            />
            <p>
              {offline
                ? "Name, phone, email, LinkedIn and professional focus. Your camera or QR app may offer to add a contact."
                : url}
            </p>
            <div className="utility-links">
              <a
                href={`/api/assets/${offline ? "offline" : "main"}-qr.png?download`}
              >
                Download PNG
              </a>
              <a
                href={`/api/assets/${offline ? "offline" : "main"}-qr.svg?download`}
              >
                Download SVG
              </a>
            </div>
          </section>
        ))}
      </div>
      <p className="note">
        A first-time visitor needs a connection to open the website. The offline
        QR embeds contact details directly, so it can be scanned without loading
        a page. Keep it at full size with the white border intact.
      </p>
      <div className="utility-links">
        <a href="/contact.vcf">Download contact file</a>
        <a href="/wallet-assets">Get Wallet artwork</a>
      </div>
    </Workspace>
  );
}
