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

export const metadata: Metadata = {
  // `template` s'applique à toute page qui définit son propre titre ; `default`
  // sert de repli (accueil et pages sans metadata).
  title: {
    default: "The Hub",
    template: "%s · The Hub",
  },
  description: "Référencement des équipes et tournois du Tier 3 Valorant.",
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