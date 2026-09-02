/**
 * URLs de fiche lisibles : `/tournois/<slug>-<id>`.
 *
 * Les 440 URLs du sitemap ne portaient aucun mot — `/tournois/cmsc4bkx80005…`.
 * Or tout le contenu différenciant du site est dans ces fiches profondes, et
 * face à un concurrent qui expose le nom du tournoi dans son URL, on partait
 * avec un handicap net sur les requêtes de nom.
 *
 * Le slug est **décoratif** : c'est l'identifiant final qui résout, seul. Cette
 * forme évite les trois plaies du slug unique :
 *
 * - pas de collision, deux tournois peuvent porter le même nom d'une saison à
 *   l'autre sans qu'aucune colonne n'ait à l'arbitrer ;
 * - un renommage ne casse rien, l'ancienne URL continue de résoudre et une
 *   redirection la ramène vers la forme à jour ;
 * - aucune migration, pas de colonne à ajouter ni de reprise sur l'existant.
 */

/**
 * Nom d'une fiche de match.
 *
 * Un match n'a pas de nom propre : il est nommé par ses deux équipes. Ce
 * formateur est partagé par le proxy, qui décide de la redirection, et par la
 * page, qui émet le canonique. S'ils divergeaient d'un caractère, chaque fiche
 * de match redirigerait indéfiniment vers une URL que la page rejetterait
 * aussitôt — `matchSeo` rend d'ailleurs « TAG vs TAG », qui est le bon titre de
 * page mais pas le bon nom d'URL.
 */
export function matchFicheName(equipeA: string, equipeB: string): string {
  return `${equipeA} vs ${equipeB}`;
}

/** Sections dont les fiches sont publiques et indexables. */
export type FicheSection = "tournois" | "equipes" | "joueurs" | "matchs";

/**
 * Séparateur entre le slug et l'identifiant.
 *
 * Un double tiret, et non un simple : `slugify` réduit toute suite de
 * caractères non alphanumériques à UN tiret, donc un slug n'en contient jamais
 * deux de suite. La coupure est ainsi sans ambiguïté, quelle que soit la forme
 * de l'identifiant.
 *
 * La première version coupait au dernier tiret en vérifiant que le suffixe
 * avait la forme d'un `cuid()`. Elle marchait en production, où tous les
 * identifiants en sont — et cassait sur les jeux de données, dont les
 * identifiants portent des tirets (`fmt-single-elim`, `fx-team-a`) : le segment
 * entier était alors rendu comme identifiant, et la fiche devenait
 * introuvable. Les 19 parcours e2e seraient tombés d'un bloc.
 */
const SEPARATEUR = "--";

/** Longueur maximale du slug, tirets compris. Au-delà, l'URL cesse d'aider. */
const SLUG_MAX = 60;

/**
 * Transforme un nom en fragment d'URL : minuscules, accents dépliés, tout ce
 * qui n'est ni lettre ni chiffre devient un tiret simple.
 *
 * `normalize("NFD")` sépare la lettre de son accent, la plage Unicode retirée
 * ensuite est celle des diacritiques combinatoires — « Élimination » donne
 * « elimination » et non « limination ».
 */
export function slugify(texte: string): string {
  const base = texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base.length <= SLUG_MAX) return base;
  // Coupe au dernier tiret sous la limite : un mot tronqué en plein milieu se
  // lit plus mal qu'un slug un peu plus court.
  const coupe = base.slice(0, SLUG_MAX);
  const dernier = coupe.lastIndexOf("-");
  return dernier > 0 ? coupe.slice(0, dernier) : coupe;
}

/**
 * Segment d'URL canonique d'une fiche.
 *
 * Sans nom exploitable — un pseudo entièrement non latin, par exemple — on
 * retombe sur l'identifiant nu, qui reste une URL valide.
 */
export function ficheSegment(id: string, nom: string | null | undefined): string {
  const slug = nom ? slugify(nom) : "";
  return slug ? `${slug}${SEPARATEUR}${id}` : id;
}

/** Chemin canonique complet d'une fiche. */
export function fichePath(
  section: FicheSection,
  id: string,
  nom: string | null | undefined
): string {
  return `/${section}/${ficheSegment(id, nom)}`;
}

/**
 * Identifiant porté par un segment d'URL, quelle que soit sa forme.
 *
 * Sans séparateur, le segment EST l'identifiant : c'est l'ancienne forme, qui
 * doit continuer de résoudre — tous les liens déjà partagés en dépendent.
 */
export function idFromSegment(segment: string): string {
  const coupure = segment.indexOf(SEPARATEUR);
  return coupure === -1 ? segment : segment.slice(coupure + SEPARATEUR.length);
}

/**
 * Le segment demandé est-il déjà la forme canonique ?
 *
 * Sert à décider d'une redirection permanente : deux URLs indexables pour une
 * même fiche dilueraient le référencement, exactement ce que la redirection
 * `www` vers l'apex évite déjà.
 */
export function isCanonicalSegment(
  segment: string,
  id: string,
  nom: string | null | undefined
): boolean {
  return segment === ficheSegment(id, nom);
}
