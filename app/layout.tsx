import type { Metadata, Viewport } from "next";
import "./globals.css";
import { defaultProfile } from "@/lib/profile";
export const metadata: Metadata = {
  title: {
    default: `${defaultProfile.fullName} | Digital Business Card`,
    template: `%s | ${defaultProfile.fullName}`,
  },
  description: `${defaultProfile.positioning}. ${defaultProfile.focus}. Save contact details, connect on LinkedIn or view the résumé.`,
  icons: { icon: "/favicon.svg", apple: "/assets/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hugo",
  },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111418",
  viewportFit: "cover",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
