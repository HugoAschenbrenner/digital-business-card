"use client";
import { useRef, useState } from "react";
import { Icon } from "./icon";
export function ShareControls({
  name,
  positioning,
  focus,
  url,
  preview = false,
}: {
  name: string;
  positioning: string;
  focus: string;
  url: string;
  preview?: boolean;
}) {
  const [status, setStatus] = useState("");
  const [manual, setManual] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  async function share() {
    setStatus("");
    if (navigator.share) {
      try {
        await navigator.share({
          title: name,
          text: `${name}\n${positioning}\n${focus}`,
          url,
        });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Card link copied");
    } catch {
      setManual(true);
      setStatus("Select and copy your card link below.");
    }
  }
  return (
    <>
      <div className="share-row">
        <button type="button" onClick={share} data-event="share_click">
          <Icon name="share" size={17} />
          Share My Details
        </button>
        <button
          ref={trigger}
          type="button"
          aria-label="Show digital card QR code"
          onClick={() => dialog.current?.showModal()}
        >
          <Icon name="qr" size={20} />
        </button>
      </div>
      <div className="share-status" role="status">
        {status}
      </div>
      {manual && (
        <input
          className="copy-input"
          aria-label="Card link to copy"
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
        />
      )}
      <noscript>
        <a className="nojs-share" href={`/qr`}>
          Show QR code &amp; card link
        </a>
      </noscript>
      <dialog
        ref={dialog}
        className="qr-dialog"
        aria-label="Digital card QR code"
        onClose={() => trigger.current?.focus()}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <button
          className="close-dialog"
          type="button"
          aria-label="Close QR code"
          onClick={() => dialog.current?.close()}
        >
          <Icon name="close" />
        </button>
        <p className="eyebrow">LET’S CONNECT</p>
        <h2>{name}</h2>
        <p>Scan to save my details.</p>
        <img
          src="/api/assets/main-qr.svg"
          alt="QR code opening the digital business card"
          width="264"
          height="264"
          loading="lazy"
        />
        <a className="card-link" href={url}>
          {url.replace(/^https?:\/\//, "")}
        </a>
        {!preview && (
          <a className="text-link" href="/qr">
            Offline contact QR <Icon name="arrow" size={14} />
          </a>
        )}
      </dialog>
    </>
  );
}
