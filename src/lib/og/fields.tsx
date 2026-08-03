import { DISPLAY, MONO, OG } from "@/lib/og/theme";
import { monogram } from "@/lib/og/labels";

/** Titre principal de la carte. La taille baisse quand le nom est long. */
export function Title({ children }: { children: string }) {
  const fontSize = children.length > 28 ? 56 : children.length > 18 ? 68 : 80;
  return (
    <div
      style={{
        fontFamily: DISPLAY,
        fontSize,
        color: OG.text,
        lineHeight: 1.05,
        maxWidth: 900,
      }}
    >
      {children}
    </div>
  );
}

/** Ligne de contexte sous le titre. Ne rend rien si elle est vide. */
export function Meta({ children }: { children: string }) {
  if (!children) return null;
  return <div style={{ fontFamily: MONO, fontSize: 26, color: OG.muted }}>{children}</div>;
}

/** Ligne de chiffres, en mono et en orange. Ne rend rien si elle est vide. */
export function Stats({ children }: { children: string }) {
  if (!children) return null;
  return <div style={{ fontFamily: MONO, fontSize: 30, color: OG.accent }}>{children}</div>;
}

/**
 * Logo d'une entité, ou son monogramme quand l'image est absente.
 * `src` vient de `uploadAsPngDataUri`, qui renvoie `null` en cas d'échec.
 */
export function Avatar({
  src,
  name,
  size = 120,
  rounded = 20,
}: {
  src: string | null;
  name: string;
  size?: number;
  rounded?: number;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: rounded, objectFit: "cover" }}
      />
    );
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: rounded,
        backgroundColor: OG.category,
        border: `2px solid ${OG.border}`,
        fontFamily: DISPLAY,
        fontSize: size * 0.45,
        color: OG.muted,
      }}
    >
      {monogram(name)}
    </div>
  );
}
