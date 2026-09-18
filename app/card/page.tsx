import type { Metadata } from "next";
import { BusinessCard } from "@/components/card";
import { Runtime } from "@/components/runtime";
import { getProfile, remoteConfigured } from "@/lib/provider";
import { cardUrl } from "@/lib/origin";
export const revalidate = 60;
export async function generateMetadata(): Promise<Metadata> {
  const p = await getProfile();
  return {
    title: { absolute: `${p.fullName} | Digital Business Card` },
    alternates: { canonical: cardUrl() },
    openGraph: {
      title: p.fullName,
      description: `${p.positioning} · ${p.focus}`,
      url: cardUrl(),
      type: "profile",
    },
    twitter: { card: "summary", title: p.fullName, description: p.positioning },
  };
}
export default async function CardPage() {
  const p = await getProfile();
  return (
    <main className="card-stage">
      <BusinessCard profile={p} url={cardUrl()} />
      <Runtime
        analytics={
          remoteConfigured() && process.env.ANALYTICS_ENABLED === "true"
        }
      />
    </main>
  );
}
