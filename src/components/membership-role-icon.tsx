import { MEMBERSHIP_ROLE_LABELS, type MembershipRoleKey } from "@/lib/membership-roles";

/**
 * Pictogrammes de l'effectif, hors joueur titulaire.
 *
 * Ils sont dessinés ici plutôt que repris de valorant-api : le jeu ne fournit
 * d'icônes que pour les quatre rôles d'agents, et rien pour l'encadrement.
 * Même trait que les icônes maison de `icons.tsx` — contour de 2, extrémités
 * arrondies — pour qu'ils tiennent à 20 px à côté des icônes de rôle Valorant,
 * qui sont pleines.
 */
const stroke = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Deux flèches qui s'échangent : le geste du remplacement, lisible partout. */
function SubIcon({ className }: { className: string }) {
  return (
    <svg {...stroke} className={className} aria-hidden="true">
      <path d="M4 8h11" />
      <path d="m12 5 3 3-3 3" />
      <path d="M20 16H9" />
      <path d="m12 13-3 3 3 3" />
    </svg>
  );
}

/** Un porte-bloc : le tableau de jeu du coach, reconnaissable en petit. */
function CoachIcon({ className }: { className: string }) {
  return (
    <svg {...stroke} className={className} aria-hidden="true">
      <path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1Z" />
      <path d="M16 5h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}

/** Une mallette : la convention pour l'encadrement, hors du terrain. */
function ManagerIcon({ className }: { className: string }) {
  return (
    <svg {...stroke} className={className} aria-hidden="true">
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M3 12h18" />
    </svg>
  );
}

const ICONS: Partial<Record<MembershipRoleKey, (p: { className: string }) => React.ReactElement>> =
  {
    SUB: SubIcon,
    COACH: CoachIcon,
    MANAGER: ManagerIcon,
  };

/**
 * Icône du rôle tenu dans l'effectif.
 *
 * Ne rend rien pour un titulaire : sa place est dite par son rôle Valorant,
 * que l'appelant affiche à la place.
 */
export default function MembershipRoleIcon({
  role,
  className = "h-5 w-5",
}: {
  role: string;
  className?: string;
}) {
  const Icon = ICONS[role as MembershipRoleKey];
  if (!Icon) return null;
  const label = MEMBERSHIP_ROLE_LABELS[role as MembershipRoleKey] ?? role;
  return (
    <span title={label} aria-label={label} role="img" className="inline-flex">
      <Icon className={className} />
    </span>
  );
}
