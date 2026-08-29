/**
 * Rapprochement des équipes créées par le miroir Premier avec celles saisies à
 * la main avant son arrivée.
 *
 * Le besoin vient de l'audit de production du 2026-08-29 : sur 110 équipes, 66
 * venaient du miroir, 38 avaient été saisies à la main sans jamais être
 * rattachées, et 21 de ces dernières décrivaient la même équipe qu'une fiche du
 * miroir. Les deux moitiés d'une même équipe vivaient séparément — les joueurs,
 * managers et inscriptions d'un côté, l'historique Premier de l'autre.
 *
 * La cause n'est pas un défaut du rattachement, qui se fait sur `premierTeamId`
 * et a raison de le faire : rapprocher par nom et tag scinderait l'historique
 * d'une équipe au premier renommage côté Riot. Ce qui manque, c'est l'amorçage
 * — à la première rencontre d'une équipe inconnue, rien ne va voir si une fiche
 * du site lui correspond déjà. Sans cette étape, chaque nouvel Act en refabrique.
 *
 * Ce module ne touche pas la base : il reçoit les deux populations et rend les
 * candidats, ce qui le rend testable sans elle.
 */

/** Fiche réduite à ce qui sert au rapprochement et à l'arbitrage. */
export type EquipeRapprochable = {
  id: string;
  name: string;
  tag: string;
  matchs: number;
  membres: number;
  managers: number;
  inscriptions: number;
};

/**
 * Force du rapprochement, qui commande l'ordre d'affichage.
 *
 * `sure` — nom **et** tag concordent. Aucun contre-exemple en production.
 * `probable` — le nom concorde, pas le tag. Vu une fois : « Brezelit » en
 *   `BZL` côté Riot et `BZLT` côté saisie.
 * `a-verifier` — seul le tag concorde. C'est là que vivent les faux positifs,
 *   « PCS NEPTUNE » contre « PCS Nova » étant deux squads d'une même structure
 *   et non deux fiches d'une même équipe.
 */
export type Confiance = "sure" | "probable" | "a-verifier";

export type PaireDoublon = {
  miroir: EquipeRapprochable;
  manuelle: EquipeRapprochable;
  confiance: Confiance;
  /**
   * Le tag est porté par plusieurs équipes d'un même côté. Signale un
   * rapprochement à ne pas croire sur parole : `ARKAD` et `ARKAD B2` partagent
   * `ARK`, `ORIGINS ALPHA` et `ORIGINS OMEGA` partagent `ORG`. Ce sont des
   * équipes distinctes d'une même structure, pas des doublons.
   */
  tagAmbigu: boolean;
  /** Ce que porte la fiche manuelle : sert au tri et à l'affichage. */
  enjeu: number;
};

/** Rang d'affichage : le plus sûr d'abord. */
const RANG: Record<Confiance, number> = { sure: 0, probable: 1, "a-verifier": 2 };

/**
 * Réduit un nom ou un tag à sa forme comparable : sans casse, sans accent, sans
 * ponctuation.
 *
 * La décomposition Unicode fait le travail que `translate()` faisait à la main
 * dans la requête d'audit — ici on n'a pas la contrainte d'un rôle en lecture
 * seule qui interdit `unaccent`.
 */
export function normaliserLibelle(brut: string): string {
  return brut
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Suffixes de structure retirés avant comparaison des noms.
 *
 * Riot donne le nom court de l'équipe, la saisie manuelle y ajoute souvent la
 * forme longue : « HL Tauri » contre « HL Tauri eSports ». Les retirer rapproche
 * ces deux-là sans rapprocher ce qu'il ne faut pas — « ARKAD » et « ARKAD B2 »
 * restent distincts, « b2 » désignant un second effectif et non une structure.
 *
 * Les plus longs d'abord : sinon « esport » mordrait sur « esports » et
 * laisserait un « s » orphelin.
 */
const SUFFIXES_STRUCTURE = ["esports", "esport", "gaming", "team", "club", "es"] as const;

/** Nom réduit à son radical : normalisé, puis privé de son suffixe de structure. */
function radical(nom: string): string {
  const base = normaliserLibelle(nom);
  for (const s of SUFFIXES_STRUCTURE) {
    if (base.length > s.length && base.endsWith(s)) return base.slice(0, -s.length);
  }
  return base;
}

/**
 * La distance d'édition entre `a` et `b` vaut-elle au plus `max` ?
 *
 * Plafonnée et à sortie anticipée : on ne veut pas la valeur, seulement savoir
 * si elle tient sous le seuil, et dérouler la matrice entière pour deux noms
 * sans rapport ne sert à rien.
 *
 * Absorbe la faute de frappe à la saisie — « SilentAscencion » pour
 * « SilentAscension », « Ouf of Fame » pour « Out of Fame ». Un seul caractère
 * d'écart : à deux, « ARKAD » rejoindrait « ARKAD B2 ».
 */
function distanceAuPlus(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let precedente = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const courante = [i];
    for (let j = 1; j <= b.length; j++) {
      courante[j] = Math.min(
        precedente[j] + 1,
        courante[j - 1] + 1,
        precedente[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    if (Math.min(...courante) > max) return false;
    precedente = courante;
  }
  return precedente[b.length] <= max;
}

/**
 * Les deux noms désignent-ils la même équipe ?
 *
 * Trois lectures de plus en plus tolérantes, toutes éprouvées contre les faux
 * positifs connus : égalité stricte, égalité des radicaux, puis un caractère
 * d'écart. Le seuil de longueur écarte les noms trop courts, où un caractère
 * d'écart ne veut plus rien dire.
 */
function nomsProches(a: string, b: string): boolean {
  const na = normaliserLibelle(a);
  const nb = normaliserLibelle(b);
  if (na === "" || nb === "") return false;
  if (na === nb) return true;
  const ra = radical(a);
  const rb = radical(b);
  if (ra !== "" && ra === rb) return true;
  return Math.min(na.length, nb.length) >= 6 && distanceAuPlus(na, nb, 1);
}

/**
 * Clé stable d'une paire, pour la mise à l'écart des faux positifs.
 *
 * Les deux identifiants dans l'ordre miroir puis manuelle : une paire n'a
 * qu'un seul sens, le rapprochement n'étant pas symétrique.
 */
export function clePaire(miroirId: string, manuelleId: string): string {
  return `${miroirId}:${manuelleId}`;
}

/**
 * Relit une clé de paire.
 *
 * Rend `null` plutôt que de lever : les clés arrivent d'une case à cocher, donc
 * du client. Une clé malformée est ignorée, pas fatale — refuser tout le lot
 * parce qu'une valeur a été bricolée priverait l'utilisateur des fusions
 * légitimes qu'il venait de préparer.
 */
export function relirePaire(cle: string): { miroirId: string; manuelleId: string } | null {
  const parts = cle.split(":");
  if (parts.length !== 2) return null;
  const [miroirId, manuelleId] = parts;
  if (!miroirId || !manuelleId || miroirId === manuelleId) return null;
  return { miroirId, manuelleId };
}

/** Tags portés par plus d'une équipe dans une population. */
function tagsAmbigus(equipes: readonly EquipeRapprochable[]): Set<string> {
  const vus = new Map<string, number>();
  for (const e of equipes) {
    const t = normaliserLibelle(e.tag);
    if (t) vus.set(t, (vus.get(t) ?? 0) + 1);
  }
  return new Set([...vus].filter(([, n]) => n > 1).map(([t]) => t));
}

/**
 * Candidats au rapprochement entre les deux populations.
 *
 * Le produit croisé est assumé : 66 × 38 en production, soit 2 508 comparaisons
 * de chaînes déjà normalisées. Un index par nom et par tag économiserait des
 * microsecondes au prix d'un code que personne ne relirait.
 *
 * @param miroir équipes créées par la synchronisation Premier
 * @param manuelles équipes saisies à la main et jamais rattachées
 * @param ignorees clés rendues par `clePaire`, écartées du résultat
 */
export function chercherDoublons(
  miroir: readonly EquipeRapprochable[],
  manuelles: readonly EquipeRapprochable[],
  ignorees: readonly string[] = []
): PaireDoublon[] {
  const ecartees = new Set(ignorees);
  const ambigusMiroir = tagsAmbigus(miroir);
  const ambigusManuelles = tagsAmbigus(manuelles);
  const paires: PaireDoublon[] = [];

  for (const m of miroir) {
    const nomM = normaliserLibelle(m.name);
    const tagM = normaliserLibelle(m.tag);

    for (const n of manuelles) {
      if (ecartees.has(clePaire(m.id, n.id))) continue;

      // Un libellé vide après normalisation ne rapproche rien : deux fiches
      // nommées « --- » ne sont pas la même équipe.
      const memeNom = nomM !== "" && nomsProches(m.name, n.name);
      const memeTag = tagM !== "" && tagM === normaliserLibelle(n.tag);
      if (!memeNom && !memeTag) continue;

      const confiance: Confiance =
        memeNom && memeTag ? "sure" : memeNom ? "probable" : "a-verifier";

      paires.push({
        miroir: m,
        manuelle: n,
        confiance,
        tagAmbigu: ambigusMiroir.has(tagM) || ambigusManuelles.has(tagM),
        enjeu: n.membres + n.managers + n.inscriptions + n.matchs,
      });
    }
  }

  // À confiance égale, la fiche qui porte le plus passe devant : c'est celle
  // dont une erreur coûterait le plus cher, donc celle qu'on veut regarder tant
  // que l'attention est fraîche.
  return paires.sort(
    (a, b) =>
      RANG[a.confiance] - RANG[b.confiance] ||
      b.enjeu - a.enjeu ||
      a.miroir.name.localeCompare(b.miroir.name)
  );
}
