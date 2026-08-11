import { DISPLAY, MONO, OG } from "@/lib/og/theme";
import { monogram, type StatCellValue } from "@/lib/og/labels";

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
        // `flexShrink: 0` : dans une ligne flex, un voisin large (un titre en
        // 80px) pourrait sinon comprimer l'image et déformer la pastille.
        style={{
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: rounded,
          objectFit: "cover",
        }}
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
        flexShrink: 0,
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

/** Nombre de cases par ligne de la grille de chiffres. */
const GRID_COLUMNS = 3;

/** Un chiffre de carrière et ce qu'il mesure, empilés et centrés. */
function StatCell({ value, label }: StatCellValue) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 296,
        gap: 6,
      }}
    >
      <div style={{ fontFamily: DISPLAY, fontSize: 66, color: OG.text }}>{value}</div>
      <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: 2, color: OG.subtle }}>
        {label}
      </div>
    </div>
  );
}

/**
 * Grille de chiffres des cartes carrées, remplie par lignes de trois.
 * Ne rend rien sur une liste vide : c'est ainsi qu'un joueur sans map perd sa
 * grille au lieu d'afficher six zéros.
 */
export function StatGrid({ cells }: { cells: readonly StatCellValue[] }) {
  if (cells.length === 0) return null;
  const rows: StatCellValue[][] = [];
  for (let i = 0; i < cells.length; i += GRID_COLUMNS) {
    rows.push(cells.slice(i, i + GRID_COLUMNS));
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
      {rows.map((row) => (
        <div
          key={row.map((c) => c.label).join()}
          style={{ display: "flex", justifyContent: "space-between" }}
        >
          {row.map((cell) => (
            <StatCell key={cell.label} {...cell} />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Une équipe du duel : logo, nom, score. Les deux lignes empilées se lisent
 * comme un tableau de résultat, là où deux colonnes écraseraient le score au
 * centre d'un carré.
 *
 * @param score `null` sur un match à venir — un « 0 » s'y lirait comme un
 *   résultat, alors que la rencontre n'a pas eu lieu.
 */
export function ScoreRow({
  src,
  name,
  score,
  win,
}: {
  src: string | null;
  name: string;
  score: string | null;
  win: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
      <Avatar src={src} name={name} size={104} />
      <div
        style={{
          display: "flex",
          flex: 1,
          fontFamily: DISPLAY,
          fontSize: name.length > 18 ? 44 : 56,
          color: win ? OG.text : OG.muted,
        }}
      >
        {name}
      </div>
      {score !== null && (
        <div style={{ fontFamily: DISPLAY, fontSize: 76, color: win ? OG.accent : OG.subtle }}>
          {score}
        </div>
      )}
    </div>
  );
}
