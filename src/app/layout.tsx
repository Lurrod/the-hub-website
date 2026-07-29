import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/nav-bar";
import Footer from "@/components/footer";
import FooterSlot from "@/components/footer-slot";
import FlashToast from "@/components/flash-toast";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://the-hub-vrc.fr";
const DESCRIPTION =
  "Chaque match de chaque tournoi du Tier 3 Valorant francophone, analysé : " +
  "scoreboard complet, timeline des rounds, ACS, ADR, KAST.";

export const metadata: Metadata = {
  // Base des URLs absolues des métadonnées (image de partage notamment).
  metadataBase: new URL(SITE_URL),
  // `template` s'applique à toute page qui définit son propre titre ; `default`
  // sert de repli (accueil et pages sans metadata).
  title: {
    default: "The Hub",
    template: "%s · The Hub",
  },
  description: DESCRIPTION,
  // Aperçu affiché par Discord, X, iMessage… L'image vient de
  // `app/opengraph-image.png`, détectée automatiquement par Next.
  openGraph: {
    type: "website",
    siteName: "The Hub",
    title: "The Hub - T3 Valorant",
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Hub - T3 Valorant",
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${jakarta.variable} ${geistMono.variable} ${bricolage.variable}`}
    >
      <body>
        <div className="flex min-h-screen flex-col">
          <NavBar />
          <div className="flex-1">{children}</div>
          <FooterSlot>
            <Footer />
          </FooterSlot>
        </div>
        <Suspense fallback={null}>
          <FlashToast />
        </Suspense>
      </body>
    </html>
  );
}