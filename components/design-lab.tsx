"use client";
import { useState } from "react";
import { BusinessCard } from "./card";
import { themes, type Profile, type Theme } from "@/lib/profile";
export function DesignLab({ profile, url }: { profile: Profile; url: string }) {
  const [photo, setPhoto] = useState(profile.showPhoto),
    [active, setActive] = useState<Theme>(profile.theme);
  return (
    <>
      <div className="lab-controls">
        <div className="theme-tabs" aria-label="Preview theme">
          {themes.map((t) => (
            <button
              key={t.id}
              aria-pressed={active === t.id}
              onClick={() => setActive(t.id)}
            >
              {t.name}
            </button>
          ))}
        </div>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={photo}
            onChange={(e) => setPhoto(e.target.checked)}
          />
          Show profile image on card
        </label>
        <p className="intro">Preview only · publish your choice in Admin.</p>
      </div>
      <div className="theme-grid">
        {themes.map((t, i) => (
          <section
            className={`theme-option ${active === t.id ? "active" : ""}`}
            key={t.id}
          >
            <div className="theme-heading">
              <span className="swatch" style={{ background: t.accent }} />
              {String.fromCharCode(65 + i)} / {t.name}
            </div>
            <BusinessCard
              profile={{ ...profile, theme: t.id, showPhoto: photo }}
              url={url}
              preview
            />
            <div className="theme-qr">
              <img
                src="/api/assets/main-qr.svg"
                alt="Digital card QR preview"
                width="56"
                height="56"
              />
              High-contrast QR · all themes
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
