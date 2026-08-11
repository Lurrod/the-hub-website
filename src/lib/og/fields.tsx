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

/**
 * Largeur des colonnes chiffrées du scoreboard. Le nom occupe le reste de la
 * ligne : c'est la seule colonne dont la longueur varie.
 */
const SB_COL = { agent: 150, kda: 190, acs: 92, rating: 92 };

/** Écart entre deux colonnes, repris par l'en-tête et par les lignes. */
const SB_GAP = 16;

/**
 * Une ligne du scoreboard. `tone` distingue la ligne d'en-tête, en mono
 * espacé, des lignes de joueurs, dont le nom passe en police d'affichage.
 */
function SbLine({
  name,
  agent,
  kda,
  acs,
  rating,
  tone,
}: {
  name: string;
  agent: string;
  kda: string;
  acs: string;
  rating: string;
  tone: "head" | "body";
}) {
  const head = tone === "head";
  const size = head ? 20 : 26;
  const color = head ? OG.subtle : OG.muted;
  const cell = (width: number, value: string, end: boolean, tint?: string) => (
    <div
      style={{
        display: "flex",
        width,
        justifyContent: end ? "flex-end" : "flex-start",
        fontFamily: MONO,
        fontSize: size,
        letterSpacing: head ? 2 : 0,
        color: tint ?? color,
      }}
    >
      {value}
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SB_GAP, height: head ? 30 : 46 }}>
      <div
        style={{
          display: "flex",
          flex: 1,
          fontFamily: head ? MONO : DISPLAY,
          fontSize: head ? 20 : 28,
          letterSpacing: head ? 2 : 0,
          color: head ? OG.subtle : OG.text,
        }}
      >
        {name}
      </div>
      {cell(SB_COL.agent, agent, false)}
      {cell(SB_COL.kda, kda, true)}
      {cell(SB_COL.acs, acs, true)}
      {cell(SB_COL.rating, rating, true, head ? undefined : OG.accent)}
    </div>
  );
}

/** Ligne de titres des colonnes, posée une fois au-dessus des deux camps. */
export function ScoreboardColumns() {
  return <SbLine tone="head" name="JOUEUR" agent="AGENT" kda="K / D / A" acs="ACS" rating="R" />;
}

/** Un joueur du scoreboard, chiffres déjà arrondis à l'affichage. */
export function ScoreboardRow({
  name,
  agent,
  kda,
  acs,
  rating,
}: {
  name: string;
  agent: string;
  kda: string;
  acs: string;
  rating: string;
}) {
  return <SbLine tone="body" name={name} agent={agent} kda={kda} acs={acs} rating={rating} />;
}

/**
 * En-tête d'un camp : logo, nom, et son score — celui de la map sur une carte
 * de map, celui de la série sur la carte du Bo.
 */
export function ScoreboardTeam({
  src,
  name,
  score,
}: {
  src: string | null;
  name: string;
  score: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SB_GAP, height: 56 }}>
      <Avatar src={src} name={name} size={48} rounded={10} />
      <div style={{ display: "flex", flex: 1, fontFamily: DISPLAY, fontSize: 34, color: OG.text }}>
        {name}
      </div>
      <div style={{ fontFamily: DISPLAY, fontSize: 40, color: OG.accent }}>{score}</div>
    </div>
  );
}
