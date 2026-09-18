import type { Metadata } from "next";
import { Workspace } from "@/components/workspace";
import { AdminForm, Login } from "@/components/admin";
import { authConfigured, authenticated } from "@/lib/auth";
import {
  getProfile,
  metrics,
  providerName,
  remoteConfigured,
  writable,
  events,
} from "@/lib/provider";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};
export default async function Admin() {
  if (!authConfigured())
    return (
      <Workspace title="Your card, under your control." label="ADMIN">
        <section className="panel">
          <h2>Administration is locked.</h2>
          <p style={{ marginTop: 14 }}>
            Set ADMIN_PASSWORD (at least 16 characters) and ADMIN_SESSION_SECRET
            (at least 32 characters) in your environment to enable secure
            sign-in. Your public card already works.
          </p>
          <p style={{ marginTop: 14 }}>
            Without a backend, edit content/profile.json and deploy again. See
            the README for optional remote administration.
          </p>
        </section>
      </Workspace>
    );
  if (!(await authenticated()))
    return (
      <Workspace
        title="Welcome back."
        label="ADMIN"
        description="Sign in to manage your digital card."
      >
        <Login />
      </Workspace>
    );
  const p = await getProfile();
  let counts: Awaited<ReturnType<typeof metrics>> = [],
    unavailable = false;
  try {
    counts = await metrics();
  } catch {
    unavailable = true;
  }
  const analytics =
    remoteConfigured() && process.env.ANALYTICS_ENABLED === "true";
  return (
    <Workspace
      title="Your card, under your control."
      label="ADMIN"
      description={`Storage: ${providerName()}. Changes apply to your card, contact file and downloadable assets.`}
    >
      {!writable() && (
        <p className="note">
          Connect Supabase to enable persistent changes on Vercel. Your deployed
          configuration remains active.
        </p>
      )}
      <AdminForm profile={p} canSave={writable()} />
      <section className="panel asset-section">
        <h2>Activity · last 30 days</h2>
        {analytics && !unavailable ? (
          <>
            <p style={{ margin: "12px 0 22px" }}>
              Aggregate actions only. No visitor identities, cookies or
              fingerprinting. Counts reflect actions, not unique people.
            </p>
            <div className="metrics">
              {events.map((event) => (
                <div className="metric" key={event}>
                  <b>
                    {counts
                      .filter((c) => c.event === event)
                      .reduce((s, c) => s + c.total, 0)}
                  </b>
                  <span>{event.replaceAll("_", " ")}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p style={{ marginTop: 12 }}>
            {unavailable
              ? "Metrics are temporarily unavailable. Your card is working normally."
              : "Analytics is off. Connect the optional backend and enable analytics to see aggregate actions."}
          </p>
        )}
      </section>
    </Workspace>
  );
}
