import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/nav-bar";
import Footer from "@/components/footer";
import FlashToast from "@/components/flash-toast";
import AudienceBeacon from "@/components/audience-beacon";
import SkipLink from "@/components/skip-link";
import { SITE_URL } from "@/lib/site";
import { SITE_DESCRIPTION } from "@/lib/metadata";

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

export const metadata: Metadata = {
  // Base des URLs absolues des métadonnées (image de partage notamment).
  metadataBase: new URL(SITE_URL),
  // `template` s'applique à toute page qui définit son propre titre ; `default`
  // sert de repli (accueil et pages sans metadata).
  title: {
    default: "The Hub",
    template: "%s · The Hub",
  },
  description: SITE_DESCRIPTION,
  // Aperçu affiché par Discord, X, iMessage… L'image vient de
  // `app/opengraph-image.png`, détectée automatiquement par Next.
  //
  // Pas d'`url` ici : elle serait héritée telle quelle et chaque page
  // annoncerait l'accueil. Chaque page publique la pose via `pageMetadata`.
  openGraph: {
    type: "website",
    siteName: "The Hub",
    title: "The Hub - T3 Valorant",
    description: SITE_DESCRIPTION,
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Hub - T3 Valorant",
    description: SITE_DESCRIPTION,
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
        <SkipLink />
        <div className="flex min-h-screen flex-col">
          <NavBar />
          <div id="contenu" className="flex-1">
            {children}
          </div>
          <Footer />
        </div>
        <Suspense fallback={null}>
          <FlashToast />
        </Suspense>
        <AudienceBeacon />
      </body>
    </html>
  );
}
