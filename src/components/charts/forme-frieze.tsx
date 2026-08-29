import Link from "next/link";
import { shortDate } from "@/lib/dates";
import type { Forme, MatchForme } from "@/lib/forme-recente-core";

/**
 * Frise de forme récente : une barre par rencontre, au-dessus de la ligne pour
 * une victoire, en dessous pour une défaite, la hauteur disant l'écart de rounds.
 *
 * **Le sens porte le résultat, la couleur ne fait que le renforcer.** C'est
 * délibéré : le vert et le rouge sont précisément la paire qu'un daltonien ne
 * distingue pas, et une frise qui ne s'appuierait que sur eux ne lui dirait rien.
 * Au-dessus ou en dessous de la ligne, en revanche, se lit sans couleur — comme
 * la lettre V ou D que porte chaque barre au survol.
 *
 * Les jetons sont ceux des états, pas l'accent : l'orange signale partout
 * ailleurs « actif » ou « mis en avant », jamais « gagné ».
 */

/** Demi-hauteur du tracé, en pixels. La barre la plus haute atteint ce plafond. */
const DEMI = 52;

/** Hauteur minimale d'une barre : un écart d'un round doit rester visible. */
const MINI = 6;

/**
 * Hauteur d'une barre, en pixels.
 *
 * Sans détail de rounds — un match importé sans scoreboard — on s'en tient au
 * minimum : la rencontre existe et son résultat est connu, son ampleur non.
 * Lui donner une hauteur inventée lui ferait dire une domination qu'on ignore.
 */
function hauteur(ecart: number | null, ecartMax: number): number {
  if (ecart === null || ecartMax === 0) return MINI;
  return MINI + (Math.abs(ecart) / ecartMax) * (DEMI - MINI);
}

/** Ce que le survol et le focus révèlent, et que la table cachée redit. */
function libelle(m: MatchForme): string {
  const issue =
    m.resultat === "WIN" ? "Victoire" : m.resultat === "LOSS" ? "Défaite" : "Sans vainqueur";
  const score = m.rounds
    ? `${m.rounds.pour}–${m.rounds.contre}`
    : `${m.maps.pour}–${m.maps.contre} en maps, détail des rounds non enregistré`;
  const quand = m.date ? ` le ${shortDate(m.date)}` : "";
  return `${issue} ${score} contre ${m.adversaire.tag}${quand}`;
}

function Barre({ m, ecartMax }: { m: MatchForme; ecartMax: number }) {
  const h = hauteur(m.ecart, ecartMax);
  const gagne = m.resultat === "WIN";
  const nul = m.resultat === "DRAW";
  // Les jetons d'aplat (`-deep`) et non ceux de texte : la charte les sépare, et
  // `--success` en pleine barre donne le bloc criard que les aplats évitent.
  // Le couple obtenu — un vert tirant sur le sarcelle contre un rouge sourd —
  // se distingue en prime mieux qu'un vert-rouge franc pour un daltonien.
  //
  // Remplissage sourd quand l'ampleur est inconnue : la barre au minimum ne doit
  // pas se lire comme une rencontre serrée, qui elle est mesurée.
  const fond = nul
    ? "var(--text-subtle)"
    : m.ecart === null
      ? gagne
        ? "var(--success-soft)"
        : "var(--destructive-soft)"
      : gagne
        ? "var(--success-deep)"
        : "var(--destructive-deep)";

  return (
    <Link
      href={`/matchs/${m.id}`}
      aria-label={libelle(m)}
      className="group relative flex min-w-0 flex-1 flex-col items-center outline-none"
    >
      {/* Zone de tracé : la ligne de base passe en son milieu. La barre n'occupe
          qu'une part de la colonne — un aplat pleine largeur, à cette hauteur,
          lit comme un bloc et écrase la lecture. La cible de survol, elle,
          couvre toute la colonne : viser un trait de six pixels serait
          intenable. */}
      <span className="relative block w-full" style={{ height: DEMI * 2 }}>
        <span
          aria-hidden
          className={`absolute left-1/2 w-[58%] -translate-x-1/2 transition-[filter] group-hover:brightness-125 group-focus-visible:brightness-125 ${
            nul ? "rounded-[2px]" : gagne ? "rounded-t-[4px]" : "rounded-b-[4px]"
          }`}
          style={
            nul
              ? { top: DEMI - 2, height: 4, background: fond }
              : gagne
                ? { bottom: DEMI, height: h, background: fond }
                : { top: DEMI, height: h, background: fond }
          }
        />
      </span>

      {/* Étiquette d'axe : l'adversaire, pas la valeur. Une valeur sur chaque
          barre serait illisible — elle vit dans l'infobulle et dans la table. */}
      <span className="mt-2 flex w-full flex-col items-center gap-1">
        {m.adversaire.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            loading="lazy"
            decoding="async"
            src={m.adversaire.logo}
            alt=""
            className="h-5 w-5 rounded object-cover"
          />
        ) : (
          <span className="grid h-5 w-5 place-items-center rounded bg-[var(--bg)] text-[8px] text-[var(--text-muted)]">
            {m.adversaire.tag.slice(0, 3).toUpperCase()}
          </span>
        )}
        <span className="w-full truncate text-center text-[10px] text-[var(--text-muted)]">
          {m.adversaire.tag}
        </span>
      </span>

      {/* Infobulle au survol **et au focus clavier** : une valeur qu'on ne peut
          atteindre qu'à la souris n'est pas atteignable. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-1 left-1/2 z-20 w-max max-w-[14rem] -translate-x-1/2 -translate-y-full rounded-lg border border-[var(--border-strong)] bg-[var(--shell)] px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {libelle(m)}
      </span>
    </Link>
  );
}

export default function FormeFrieze({ forme, teamName }: { forme: Forme; teamName: string }) {
  const { matchs, victoires, defaites, nuls, serie, ecartMax } = forme;
  if (matchs.length === 0) return null;

  const serieTexte =
    serie > 0
      ? `${serie} victoire${serie > 1 ? "s" : ""} d'affilée`
      : serie < 0
        ? `${-serie} défaite${serie < -1 ? "s" : ""} d'affilée`
        : "série interrompue";

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="text-[var(--text-muted)]">
          <span className="stat text-[var(--success)]">{victoires}V</span>{" "}
          <span className="stat text-[var(--destructive)]">{defaites}D</span>
          {nuls > 0 && <span className="stat"> {nuls}N</span>} sur les {matchs.length} dernières
          rencontres
        </p>
        <p className="text-[var(--text-muted)]">
          En cours : <span className="text-white">{serieTexte}</span>
        </p>
      </div>

      {/* `items-start` et non `items-end` : chaque colonne porte son propre tracé
          de hauteur fixe, c'est la ligne de base qui les aligne. */}
      <div className="relative flex items-start gap-0.5">
        {/* Ligne de base : un trait plein d'une nuance au-dessus du fond, jamais
            pointillé — un pointillé se lit comme un seuil, pas comme un axe. */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 h-px bg-[var(--border-strong)]"
          style={{ top: DEMI }}
        />
        {matchs.map((m) => (
          <Barre key={m.id} m={m} ecartMax={ecartMax} />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-3 rounded-t-[2px] bg-[var(--success-deep)]" />
          Victoire, au-dessus de la ligne
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-3 rounded-b-[2px] bg-[var(--destructive-deep)]" />
          Défaite, en dessous
        </span>
        <span>Hauteur : écart de rounds</span>
      </div>

      {/* Jumelle textuelle de la frise. Une infobulle enrichit, elle ne doit
          jamais être le seul chemin vers une valeur. */}
      <table className="sr-only">
        <caption>
          Forme récente de {teamName}, de la plus ancienne rencontre à la plus récente
        </caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Adversaire</th>
            <th scope="col">Résultat</th>
            <th scope="col">Score</th>
          </tr>
        </thead>
        <tbody>
          {matchs.map((m) => (
            <tr key={m.id}>
              <td>{m.date ? shortDate(m.date) : "date inconnue"}</td>
              <td>{m.adversaire.tag}</td>
              <td>
                {m.resultat === "WIN"
                  ? "Victoire"
                  : m.resultat === "LOSS"
                    ? "Défaite"
                    : "Sans vainqueur"}
              </td>
              <td>
                {m.rounds
                  ? `${m.rounds.pour}–${m.rounds.contre}`
                  : `${m.maps.pour}–${m.maps.contre} en maps`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
