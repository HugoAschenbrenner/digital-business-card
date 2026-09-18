import type { Metadata } from "next";
import { getProfile } from "@/lib/provider";
import { Icon } from "@/components/icon";
export const metadata: Metadata = { title: "Resume" };
export const revalidate = 60;
export default async function Resume() {
  const p = await getProfile();
  return (
    <main className="workspace resume-surface">
      <nav className="resume-navigation" aria-label="Resume navigation">
        <a className="button resume-back" href="/card">
          <span aria-hidden="true">←</span>
          Back to Card
        </a>
      </nav>
      <section className="panel">
        <div className="resume-icon">
          <Icon name="resume" size={28} />
        </div>
        <p className="eyebrow">RESUME · PDF</p>
        <h1>{p.fullName}</h1>
        <p className="intro">{p.positioning}</p>
        <div className="resume-actions">
          <a
            className="button primary"
            href="/api/resume"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Resume
            <Icon name="arrow" size={18} />
          </a>
          <a className="button" href="/api/resume?download=1" download>
            Download PDF
            <Icon name="download" size={18} />
          </a>
        </div>
      </section>
    </main>
  );
}
