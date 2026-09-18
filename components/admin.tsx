"use client";
import { useState } from "react";
import { modes, themes, type Profile } from "@/lib/profile";
export function Login() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const password = new FormData(e.currentTarget).get("password");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed.");
      setBusy(false);
    }
  }
  return (
    <form className="login-form" onSubmit={submit}>
      <label className="field">
        Admin password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </label>
      <button className="button primary" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="form-status error" role="alert" style={{ marginTop: 18 }}>
        {error}
      </p>
    </form>
  );
}
export function AdminForm({
  profile,
  canSave,
}: {
  profile: Profile;
  canSave: boolean;
}) {
  const [p, setP] = useState(profile),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const set = (key: keyof Profile, value: Profile[keyof Profile]) =>
    setP((prev) => ({ ...prev, [key]: value }));
  async function upload(file: File | undefined, kind: "photo" | "resume") {
    if (!file) return;
    setBusy(true);
    setError(false);
    setStatus("Uploading…");
    try {
      const data = new FormData();
      data.set("file", file);
      data.set("kind", kind);
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: data,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      set(kind === "photo" ? "photoKey" : "resumeKey", result.key);
      setStatus("Upload ready. Save changes to publish it.");
    } catch (e) {
      setError(true);
      setStatus(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    setStatus("Saving…");
    try {
      const response = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      navigator.serviceWorker?.controller?.postMessage("CLEAR_CARD_CACHE");
      setStatus("Saved. Your public card has been updated.");
    } catch (e) {
      setError(true);
      setStatus(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  const fields: {
    key: keyof Profile;
    label: string;
    type?: string;
    max: number;
  }[] = [
    { key: "fullName", label: "Full name", max: 70 },
    { key: "location", label: "Location", max: 80 },
    { key: "positioning", label: "Main positioning", max: 80 },
    { key: "focus", label: "Equity Derivatives focus", max: 80 },
    { key: "school", label: "School", max: 80 },
    { key: "credential", label: "Credential", max: 90 },
    { key: "email", label: "Email", type: "email", max: 120 },
    { key: "phone", label: "Phone · contact file only", type: "tel", max: 30 },
    { key: "linkedin", label: "LinkedIn URL", type: "url", max: 500 },
    { key: "terminal", label: "Terminal URL", type: "url", max: 500 },
  ];
  return (
    <div className="admin-form">
      <div className="admin-top">
        <h2>Profile &amp; appearance</h2>
        <button
          type="button"
          className="sign-out"
          onClick={async () => {
            await fetch("/api/admin/logout", { method: "POST" });
            window.location.reload();
          }}
        >
          Sign out
        </button>
      </div>
      <form onSubmit={submit}>
        <section className="admin-section">
          <div className="form-grid">
            {fields.map((f) => (
              <label className="field" key={f.key}>
                {f.label}
                <input
                  required
                  type={f.type || "text"}
                  maxLength={f.max}
                  value={String(p[f.key])}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              </label>
            ))}
          </div>
        </section>
        <section className="admin-section">
          <h2>Card settings</h2>
          <div className="form-grid">
            <label className="field">
              Theme
              <select
                value={p.theme}
                onChange={(e) =>
                  set("theme", e.target.value as Profile["theme"])
                }
              >
                {themes.map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Active profile mode
              <select
                value={p.mode}
                onChange={(e) => set("mode", e.target.value as Profile["mode"])}
              >
                {modes.map((m) => (
                  <option value={m.id} key={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <small>
                Global Markets and Asset Management use preset positioning
                language. Your custom Equity Derivatives copy is preserved.
              </small>
            </label>
            <label className="checkbox-field wide">
              <input
                type="checkbox"
                checked={p.showPhoto}
                onChange={(e) => set("showPhoto", e.target.checked)}
              />
              Show profile image on card
            </label>
          </div>
        </section>
        <section className="admin-section">
          <h2>Profile photo &amp; résumé</h2>
          <div className="form-grid">
            <label className="field">
              Profile photo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={busy || !canSave}
                onChange={(e) => upload(e.target.files?.[0], "photo")}
              />
              <small>
                PNG, JPEG or WebP · up to 3 MB. Included in the contact file
                even when hidden on the card.
              </small>
            </label>
            <label className="field">
              Résumé PDF
              <input
                type="file"
                accept="application/pdf"
                disabled={busy || !canSave}
                onChange={(e) => upload(e.target.files?.[0], "resume")}
              />
              <small>
                PDF · up to 5 MB. The public /resume address stays the same.
              </small>
            </label>
          </div>
        </section>
        <div className="form-actions">
          <button
            type="submit"
            className="button primary"
            disabled={busy || !canSave}
          >
            {busy ? "Please wait…" : "Save changes"}
          </button>
          <a
            className="button"
            href="/card"
            target="_blank"
            rel="noopener noreferrer"
          >
            View card
          </a>
          <p className={`form-status ${error ? "error" : ""}`} role="status">
            {status}
          </p>
        </div>
      </form>
    </div>
  );
}
