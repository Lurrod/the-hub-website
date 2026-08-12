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
 * `src` vient de `imageAsPngDataUri`, qui renvoie `null` en cas d'échec.
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
const SB_COL = { kda: 180, acs: 88, rating: 88 };

/** Côté d'une icône d'agent, et écart entre deux icônes d'une même ligne. */
const AGENT_PX = 34;
const AGENT_GAP = 6;

/**
 * Un Bo5 ne peut pas donner plus de cinq agents à un joueur. La borne est là
 * pour que la colonne ne déborde jamais, quoi qu'apporte la donnée.
 */
const AGENTS_MAX = 5;

/**
 * Largeur de la colonne d'agents pour `slots` icônes.
 *
 * Elle est calculée plutôt que fixée au pire cas : sur le scoreboard d'une
 * map, chaque joueur n'a qu'un agent, et une colonne taillée pour cinq y
 * laisserait un vide que la colonne des noms peut occuper.
 */
export function agentColumnWidth(slots: number): number {
  const shown = Math.min(Math.max(slots, 1), AGENTS_MAX);
  return shown * AGENT_PX + (shown - 1) * AGENT_GAP;
}

/** Écart entre deux colonnes, repris par l'en-tête et par les lignes. */
const SB_GAP = 16;

/**
 * Une ligne du scoreboard. `tone` distingue la ligne d'en-tête, en mono
 * espacé, des lignes de joueurs, dont le nom passe en police d'affichage.
 */
function SbLine({
  name,
  agent,
  agentWidth,
  kda,
  acs,
  rating,
  tone,
}: {
  name: string;
  /** Le titre de la colonne sur l'en-tête, les icônes d'agent sur une ligne. */
  agent: React.ReactNode;
  agentWidth: number;
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
        // Une colonne chiffrée ne se casse jamais en deux : elle chevaucherait
        // la ligne suivante plutôt que de simplement dépasser.
        whiteSpace: "nowrap",
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: agentWidth,
          gap: AGENT_GAP,
          fontFamily: MONO,
          fontSize: size,
          letterSpacing: head ? 2 : 0,
          color,
        }}
      >
        {agent}
      </div>
      {cell(SB_COL.kda, kda, true)}
      {cell(SB_COL.acs, acs, true)}
      {cell(SB_COL.rating, rating, true, head ? undefined : OG.accent)}
    </div>
  );
}

/** Ligne de titres des colonnes, posée une fois au-dessus des deux camps. */
export function ScoreboardColumns({ agentWidth }: { agentWidth: number }) {
  return (
    <SbLine
      tone="head"
      name="JOUEUR"
      agent="AGENT"
      agentWidth={agentWidth}
      kda="K/D/A"
      acs="ACS"
      rating="R"
    />
  );
}

/**
 * Un agent : son icône, ou ses trois premières lettres quand le CDN n'a pas
 * répondu. Le gabarit reste le même dans les deux cas, pour que les colonnes
 * ne bougent pas d'une ligne à l'autre.
 */
function AgentBadge({ name, icon }: { name: string; icon: string | null }) {
  if (icon) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icon}
        alt=""
        width={AGENT_PX}
        height={AGENT_PX}
        style={{ width: AGENT_PX, height: AGENT_PX, flexShrink: 0, borderRadius: 6 }}
      />
    );
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: AGENT_PX,
        height: AGENT_PX,
        flexShrink: 0,
        borderRadius: 6,
        backgroundColor: OG.category,
        fontFamily: MONO,
        fontSize: 15,
        color: OG.subtle,
      }}
    >
      {name.slice(0, 3).toUpperCase()}
    </div>
  );
}

/** Un joueur du scoreboard, chiffres déjà arrondis à l'affichage. */
export function ScoreboardRow({
  name,
  agents,
  agentWidth,
  kda,
  acs,
  rating,
}: {
  name: string;
  /** Agents joués, du plus joué au moins joué, avec leur icône si elle a pu être chargée. */
  agents: readonly { name: string; icon: string | null }[];
  agentWidth: number;
  kda: string;
  acs: string;
  rating: string;
}) {
  return (
    <SbLine
      tone="body"
      name={name}
      agentWidth={agentWidth}
      agent={agents.slice(0, AGENTS_MAX).map((a) => (
        <AgentBadge key={a.name} name={a.name} icon={a.icon} />
      ))}
      kda={kda}
      acs={acs}
      rating={rating}
    />
  );
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
