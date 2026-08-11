import { readFile } from "node:fs/promises";
import path from "node:path";
import { Children, Fragment, isValidElement } from "react";
import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og/fonts";
import { shareSize, size } from "@/lib/og/size";
import { DISPLAY, MONO, OG } from "@/lib/og/theme";

const SITE_HOST = "the-hub-vrc.fr";

/** Dimensions de l'image et marge intérieure du cadre. */
export type OgFormat = { size: { width: number; height: number }; padding: number };

/** Aperçu de lien 1200×630, format par défaut de `renderOg`. */
export const LANDSCAPE: OgFormat = { size, padding: 56 };

/**
 * Carte carrée téléchargeable. La marge est plus large : sur un carré, le
 * contenu monte moins haut et un cadre trop serré donne une image compacte,
 * là où le format vit de son air.
 */
export const SQUARE: OgFormat = { size: shareSize, padding: 72 };

let wordmarkCache: Promise<string> | null = null;

/** `public/logo.png` en data URI. Déjà en PNG : aucune conversion nécessaire. */
function wordmark(): Promise<string> {
  wordmarkCache ??= readFile(path.join(process.cwd(), "public", "logo.png")).then(
    (buf) => `data:image/png;base64,${buf.toString("base64")}`
  );
  return wordmarkCache;
}

/**
 * Aplatit les fragments en une liste d'éléments.
 *
 * Satori ne connaît pas `React.Fragment` : un `<>…</>` reçu comme enfant unique
 * n'est pas mis en page par le conteneur flex, et les blocs se superposent.
 * Les routes peuvent donc écrire du JSX naturel, le cadre normalise.
 */
function flattenFragments(node: React.ReactNode): React.ReactNode[] {
  if (Array.isArray(node)) return node.flatMap(flattenFragments);
  if (isValidElement(node) && node.type === Fragment) {
    return flattenFragments((node.props as { children?: React.ReactNode }).children);
  }
  return node === null || node === undefined || typeof node === "boolean" ? [] : [node];
}

/**
 * Cadre commun à toutes les cartes : halo, bandeau de marque, badge de type,
 * pied de page. Le contenu propre à chaque page passe par `children`.
 */
async function Frame({
  badge,
  padding,
  children,
}: {
  badge: string;
  padding: number;
  children: React.ReactNode;
}) {
  const logo = await wordmark();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: OG.bg,
        backgroundImage: `radial-gradient(circle at 16% 12%, ${OG.glow} 0%, rgba(237,94,41,0) 42%)`,
        padding,
        position: "relative",
        fontFamily: DISPLAY,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" width={48} height={48} style={{ borderRadius: 10 }} />
        <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: 3, color: OG.accent }}>
          {badge}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          gap: 18,
        }}
      >
        {Children.toArray(flattenFragments(children))}
      </div>

      <div style={{ fontFamily: MONO, fontSize: 24, color: OG.accent }}>{SITE_HOST}</div>
    </div>
  );
}

/**
 * Rend une carte de partage.
 *
 * Toute exception retombe sur le cadre nu portant le seul badge : une erreur
 * non rattrapée renverrait une 500 à Discord, donc *aucun* aperçu, là où
 * l'image de marque aurait fait l'affaire.
 *
 * L'en-tête de cache est court parce que les cartes portent des chiffres :
 * inutile d'ajouter notre propre cache à celui des plateformes, qui gardent
 * déjà l'image par URL.
 */
export async function renderOg(
  badge: string,
  build: () => Promise<React.ReactNode> | React.ReactNode,
  format: OgFormat = LANDSCAPE
): Promise<ImageResponse> {
  let body: React.ReactNode;
  try {
    body = await build();
  } catch {
    body = null;
  }

  return new ImageResponse(await Frame({ badge, padding: format.padding, children: body }), {
    ...format.size,
    fonts: await ogFonts(),
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
