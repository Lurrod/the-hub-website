import { ROLE_LABELS, roleLabel } from "@/lib/roles";
import { ACCOUNT_TYPE_LABELS, type AccountTypeKey } from "@/lib/account-types";
import { lfpRolesLabel } from "@/lib/lfp";
import { fichePath } from "@/lib/slug";

/**
 * Panneau « Recrutement » de la landing : de vraies annonces, lues en base.
 *
 * C'est la seule maquette de la vitrine branchée en direct (décision du
 * 2026-09-22) : les autres rejouent un exemple choisi, mais un marché des
 * transferts figé ne montre rien — ce qu'on vient y voir, c'est qui cherche
 * en ce moment. Logique pure ici, requêtes dans `data/landing-recruit.ts`.
 */

export type RecruitPlayerRow = {
  id: string;
  pseudo: string;
  photo: string | null;
  valorantRole: string | null;
  accountType: string;
  lftSince: Date | null;
};

export type RecruitTeamRow = {
  id: string;
  name: string;
  tag: string;
  logo: string | null;
  lfpRoles: readonly string[];
  lfpSince: Date | null;
  rosterCount: number;
};

export type RecruitAd = {
  key: string;
  kind: "LFT" | "LFP";
  name: string;
  tag: string;
  logo: string | null;
  href: string;
  facts: string[];
};

const DAY = 86_400_000;

/**
 * Ancienneté d'une annonce, en clair. Une date absolue (« 18/09 ») obligerait
 * à calculer ; sur un marché des transferts, la question est « est-ce que
 * c'est encore d'actualité », et « il y a 2 sem. » y répond seul.
 */
export function sinceLabel(since: Date | null, now: Date): string | null {
  if (!since) return null;
  // Une date légèrement dans le futur (horloges décalées) reste « aujourd'hui ».
  const days = Math.max(0, Math.floor((now.getTime() - since.getTime()) / DAY));
  if (days < 1) return "aujourd'hui";
  if (days < 2) return "hier";
  if (days < 7) return `il y a ${days} j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`;
  return `il y a ${Math.floor(days / 30)} mois`;
}

type Dated = { ad: RecruitAd; at: number };

function playerAd(p: RecruitPlayerRow, now: Date): Dated {
  const type = p.accountType as AccountTypeKey;
  // Même règle que `LftCard` : un coach ou un manager n'a pas de rôle
  // Valorant, c'est son type de compte qui dit ce qu'il cherche.
  const what = type === "JOUEUR" ? roleLabel(p.valorantRole) : ACCOUNT_TYPE_LABELS[type];
  const since = sinceLabel(p.lftSince, now);
  return {
    at: p.lftSince?.getTime() ?? -Infinity,
    ad: {
      key: `lft-${p.id}`,
      kind: "LFT",
      name: p.pseudo,
      tag: p.pseudo.slice(0, 2).toUpperCase(),
      logo: p.photo,
      href: fichePath("joueurs", p.id, p.pseudo),
      facts: [what, since].filter((f): f is string => !!f),
    },
  };
}

function teamAd(t: RecruitTeamRow, now: Date): Dated {
  const roles = lfpRolesLabel(t.lfpRoles, ROLE_LABELS);
  const since = sinceLabel(t.lfpSince, now);
  return {
    at: t.lfpSince?.getTime() ?? -Infinity,
    ad: {
      key: `lfp-${t.id}`,
      kind: "LFP",
      name: t.name,
      tag: t.tag.slice(0, 3).toUpperCase(),
      logo: t.logo,
      href: fichePath("equipes", t.id, t.name),
      facts: [
        t.lfpRoles.length > 0 ? `Cherche ${roles}` : roles,
        `${t.rosterCount} joueur${t.rosterCount > 1 ? "s" : ""}`,
        ...(since ? [since] : []),
      ],
    },
  };
}

/**
 * Plus récent d'abord ; les annonces sans date ferment la marche. L'égalité
 * est traitée à part : deux `-Infinity` soustraits donnent `NaN`, que le tri
 * ne sait pas lire.
 */
const byFreshness = (a: Dated, b: Dated) => (a.at === b.at ? 0 : b.at - a.at);

/**
 * Les `limit` annonces les plus fraîches, joueurs et équipes mêlés.
 *
 * Si les deux sortes existent, le panneau en montre au moins une de chaque :
 * son propos est « LFT et LFP côte à côte », et trois joueurs libres d'affilée
 * le démentiraient. La dernière place revient alors à la plus fraîche de la
 * sorte manquante.
 */
export function buildRecruitAds(
  players: readonly RecruitPlayerRow[],
  teams: readonly RecruitTeamRow[],
  limit: number,
  now: Date
): RecruitAd[] {
  const lft = players.map((p) => playerAd(p, now)).sort(byFreshness);
  const lfp = teams.map((t) => teamAd(t, now)).sort(byFreshness);
  const merged = [...lft, ...lfp].sort(byFreshness);
  const top = merged.slice(0, limit);

  const missing = [lft, lfp].find(
    (side) => side.length > 0 && !top.some((d) => d.ad.kind === side[0].ad.kind)
  );
  const picked = missing && limit > 1 ? [...top.slice(0, limit - 1), missing[0]] : top;

  return [...picked].sort(byFreshness).map((d) => d.ad);
}
