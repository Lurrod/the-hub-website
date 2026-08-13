/**
 * Ce que la personne vient faire sur le site, déclaré à l'inscription.
 *
 * À ne pas confondre avec `MembershipRole` (`src/lib/membership-roles.ts`),
 * qui dit le rôle tenu dans une équipe donnée : on peut se déclarer coach et
 * rejoindre une équipe comme joueur.
 *
 * La liste double l'enum `AccountType` de Prisma, dont le client n'est pas
 * importable depuis un composant client.
 */
export const ACCOUNT_TYPES = ["JOUEUR", "COACH", "MANAGER"] as const;
export type AccountTypeKey = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountTypeKey, string> = {
  JOUEUR: "Joueur",
  COACH: "Coach",
  MANAGER: "Manager",
};

/**
 * Seul un joueur doit lier un Riot ID pour terminer son inscription : lui seul
 * a des matchs et des statistiques à rattacher. L'exiger d'un coach le
 * bloquerait à l'entrée du site pour une donnée qui ne le concerne pas.
 */
export function requiresRiotId(type: AccountTypeKey): boolean {
  return type === "JOUEUR";
}

/** Le rôle Valorant ne se demande qu'à ceux qui jouent. */
export function hasValorantRole(type: AccountTypeKey): boolean {
  return type === "JOUEUR";
}

/**
 * Type lu depuis un formulaire. Toute valeur inattendue retombe sur `JOUEUR` :
 * c'est le cas nominal, et le plus exigeant — un champ trafiqué ne doit pas
 * permettre de sauter la liaison du Riot ID.
 */
export function parseAccountType(value: unknown): AccountTypeKey {
  return value === "COACH" || value === "MANAGER" ? value : "JOUEUR";
}
