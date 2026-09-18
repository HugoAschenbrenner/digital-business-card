import type { Metadata } from "next";
import { Workspace } from "@/components/workspace";
import { DesignLab } from "@/components/design-lab";
import { getProfile } from "@/lib/provider";
import { cardUrl } from "@/lib/origin";
export const metadata: Metadata = {
  title: "Design lab",
  robots: { index: false, follow: false },
};
export const revalidate = 60;
export default async function Lab() {
  return (
    <Workspace
      title="One card. Three expressions."
      label="DESIGN LAB"
      description="The same details, spacing and interactions. Compare the accents, then try the card with or without a portrait."
    >
      <DesignLab profile={await getProfile()} url={cardUrl()} />
    </Workspace>
  );
}
