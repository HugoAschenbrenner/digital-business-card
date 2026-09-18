import type { Profile } from "@/lib/profile";
import { displayProfile, initials } from "@/lib/profile";
import { Icon } from "./icon";
import { ShareControls } from "./share-controls";
export function BusinessCard({
  profile,
  url,
  preview = false,
}: {
  profile: Profile;
  url: string;
  preview?: boolean;
}) {
  const p = displayProfile(profile);
  const words = p.fullName.split(" ");
  return (
    <article
      className="business-card"
      data-theme={p.theme}
      aria-label={`${p.fullName} digital business card`}
    >
      <div className="card-top">
        <span className="monogram" aria-hidden="true">
          {initials(p.fullName)}
        </span>
        <span className="location">{p.location}</span>
      </div>
      <div
        className={`identity ${p.showPhoto ? "with-photo" : "without-photo"}`}
      >
        {p.showPhoto && (
          <div className="avatar-wrap">
            <span aria-hidden="true">{initials(p.fullName)}</span>
            <img
              className="avatar"
              src={
                p.photoKey
                  ? `/media/profile?v=${p.photoKey}`
                  : "/assets/profile.webp"
              }
              width="80"
              height="80"
              alt={`Portrait of ${p.fullName}`}
              fetchPriority="high"
            />
          </div>
        )}
        <h1>
          {words[0]}
          <br />
          {words.slice(1).join(" ")}
        </h1>
        <div className="position">
          <p>{p.positioning}</p>
          <p className="focus">{p.focus}</p>
        </div>
      </div>
      <div className="credentials">
        <p className="school">{p.school}</p>
        <p className="credential">
          <span className="credential-mark" aria-hidden="true">
            ◇
          </span>
          {p.credential}
        </p>
      </div>
      <div className="card-actions">
        <a
          className="button primary"
          href="/contact.vcf"
          data-event="save_contact"
        >
          <Icon name="contact" />
          Save Contact
          <Icon name="download" size={17} />
        </a>
        <div className="secondary-actions">
          <a
            href={p.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            data-event="linkedin_click"
          >
            <Icon name="linkedin" />
            <span>LinkedIn</span>
            <Icon name="arrow" size={11} />
          </a>
          <a href="/resume" data-event="resume_view">
            <Icon name="resume" />
            <span>Résumé</span>
            <Icon name="arrow" size={11} />
          </a>
          <a
            href={p.terminal}
            target="_blank"
            rel="noopener noreferrer"
            data-event="terminal_click"
            aria-label="Explore Market Analytics Terminal"
          >
            <Icon name="terminal" />
            <span>Terminal</span>
            <Icon name="arrow" size={11} />
          </a>
        </div>
        <ShareControls
          name={p.fullName}
          positioning={p.positioning}
          focus={p.focus}
          url={url}
          preview={preview}
        />
      </div>
    </article>
  );
}
