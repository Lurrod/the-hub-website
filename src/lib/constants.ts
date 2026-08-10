export const REGIONS = ["France", "Autre"] as const;
export type Region = (typeof REGIONS)[number];

// Liste des pays (français), pour le choix de nationalité des joueurs.
export const COUNTRIES = [
  "Afghanistan",
  "Afrique du Sud",
  "Albanie",
  "Algérie",
  "Allemagne",
  "Andorre",
  "Angola",
  "Antigua-et-Barbuda",
  "Arabie saoudite",
  "Argentine",
  "Arménie",
  "Australie",
  "Autriche",
  "Azerbaïdjan",
  "Bahamas",
  "Bahreïn",
  "Bangladesh",
  "Barbade",
  "Belgique",
  "Belize",
  "Bénin",
  "Bhoutan",
  "Biélorussie",
  "Birmanie",
  "Bolivie",
  "Bosnie-Herzégovine",
  "Botswana",
  "Brésil",
  "Brunei",
  "Bulgarie",
  "Burkina Faso",
  "Burundi",
  "Cambodge",
  "Cameroun",
  "Canada",
  "Cap-Vert",
  "Chili",
  "Chine",
  "Chypre",
  "Colombie",
  "Comores",
  "Congo",
  "Congo (RDC)",
  "Corée du Nord",
  "Corée du Sud",
  "Costa Rica",
  "Côte d'Ivoire",
  "Croatie",
  "Cuba",
  "Danemark",
  "Djibouti",
  "Dominique",
  "Égypte",
  "Émirats arabes unis",
  "Équateur",
  "Érythrée",
  "Espagne",
  "Estonie",
  "Eswatini",
  "États-Unis",
  "Éthiopie",
  "Fidji",
  "Finlande",
  "France",
  "Gabon",
  "Gambie",
  "Géorgie",
  "Ghana",
  "Grèce",
  "Grenade",
  "Guatemala",
  "Guinée",
  "Guinée équatoriale",
  "Guinée-Bissau",
  "Guyana",
  "Haïti",
  "Honduras",
  "Hongrie",
  "Inde",
  "Indonésie",
  "Irak",
  "Iran",
  "Irlande",
  "Islande",
  "Israël",
  "Italie",
  "Jamaïque",
  "Japon",
  "Jordanie",
  "Kazakhstan",
  "Kenya",
  "Kirghizistan",
  "Kiribati",
  "Koweït",
  "Laos",
  "Lesotho",
  "Lettonie",
  "Liban",
  "Liberia",
  "Libye",
  "Liechtenstein",
  "Lituanie",
  "Luxembourg",
  "Macédoine du Nord",
  "Madagascar",
  "Malaisie",
  "Malawi",
  "Maldives",
  "Mali",
  "Malte",
  "Maroc",
  "Marshall (Îles)",
  "Maurice",
  "Mauritanie",
  "Mexique",
  "Micronésie",
  "Moldavie",
  "Monaco",
  "Mongolie",
  "Monténégro",
  "Mozambique",
  "Namibie",
  "Nauru",
  "Népal",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "Norvège",
  "Nouvelle-Zélande",
  "Oman",
  "Ouganda",
  "Ouzbékistan",
  "Pakistan",
  "Palaos",
  "Palestine",
  "Panama",
  "Papouasie-Nouvelle-Guinée",
  "Paraguay",
  "Pays-Bas",
  "Pérou",
  "Philippines",
  "Pologne",
  "Portugal",
  "Qatar",
  "République centrafricaine",
  "République dominicaine",
  "République tchèque",
  "Roumanie",
  "Royaume-Uni",
  "Russie",
  "Rwanda",
  "Saint-Christophe-et-Niévès",
  "Saint-Marin",
  "Saint-Vincent-et-les-Grenadines",
  "Sainte-Lucie",
  "Salomon (Îles)",
  "Salvador",
  "Samoa",
  "Sao Tomé-et-Principe",
  "Sénégal",
  "Serbie",
  "Seychelles",
  "Sierra Leone",
  "Singapour",
  "Slovaquie",
  "Slovénie",
  "Somalie",
  "Soudan",
  "Soudan du Sud",
  "Sri Lanka",
  "Suède",
  "Suisse",
  "Suriname",
  "Syrie",
  "Tadjikistan",
  "Tanzanie",
  "Tchad",
  "Thaïlande",
  "Timor oriental",
  "Togo",
  "Tonga",
  "Trinité-et-Tobago",
  "Tunisie",
  "Turkménistan",
  "Turquie",
  "Tuvalu",
  "Ukraine",
  "Uruguay",
  "Vanuatu",
  "Vatican",
  "Venezuela",
  "Viêt Nam",
  "Yémen",
  "Zambie",
  "Zimbabwe",
] as const;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 Mo
export const ALLOWED_IMAGE_TYPES: Record<string, "png" | "jpg" | "webp"> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const TOURNAMENT_FORMATS = [
  "GROUPS",
  "SINGLE_ELIM",
  "DOUBLE_ELIM",
  "GROUPS_THEN_ELIM",
  "SWISS",
  "ROUND_ROBIN",
  "LEAGUE",
] as const;
export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];
export const TOURNAMENT_FORMAT_LABELS: Record<TournamentFormat, string> = {
  GROUPS: "Poules",
  SINGLE_ELIM: "Élimination directe",
  DOUBLE_ELIM: "Double élimination",
  GROUPS_THEN_ELIM: "Poules puis élimination",
  SWISS: "Système suisse",
  ROUND_ROBIN: "Round Robin",
  LEAGUE: "Ligue (championnat)",
};

export const TOURNAMENT_STATUSES = ["UPCOMING", "ONGOING", "FINISHED"] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];
export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  UPCOMING: "À venir",
  ONGOING: "En cours",
  FINISHED: "Terminé",
};

export const MATCH_STAGES = ["GROUP", "BRACKET"] as const;
export type MatchStage = (typeof MATCH_STAGES)[number];
export const MATCH_STAGE_LABELS: Record<MatchStage, string> = {
  GROUP: "Poule",
  BRACKET: "Playoffs",
};

export const MATCH_STATUSES = ["SCHEDULED", "LIVE", "FINISHED"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];
export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  SCHEDULED: "À jouer",
  LIVE: "En direct",
  FINISHED: "Terminé",
};

export const BEST_OF_OPTIONS = [1, 3, 5] as const;

export const VALORANT_MAPS = [
  "Ascent",
  "Bind",
  "Haven",
  "Split",
  "Icebox",
  "Breeze",
  "Fracture",
  "Pearl",
  "Lotus",
  "Sunset",
  "Abyss",
  "Corrode",
] as const;

/** Phases de match autorisées selon le format déclaré du tournoi. */
export const STAGES_BY_FORMAT: Record<TournamentFormat, readonly MatchStage[]> = {
  GROUPS: ["GROUP"],
  SINGLE_ELIM: ["BRACKET"],
  DOUBLE_ELIM: ["BRACKET"],
  GROUPS_THEN_ELIM: ["GROUP", "BRACKET"],
  SWISS: ["GROUP"],
  ROUND_ROBIN: ["GROUP"],
  LEAGUE: ["GROUP"],
};

/** Description courte de chaque format, affichée dans le sélecteur de création. */
export const TOURNAMENT_FORMAT_DESCRIPTIONS: Record<TournamentFormat, string> = {
  GROUPS: "Des poules où chaque équipe s'affronte, classement par points.",
  SINGLE_ELIM: "Arbre à élimination directe : une défaite et c'est terminé.",
  DOUBLE_ELIM: "Winner + loser bracket, il faut deux défaites pour sortir.",
  GROUPS_THEN_ELIM: "Phase de poules qualificative puis playoffs à élimination.",
  SWISS: "Appariements par score à chaque ronde, sans élimination directe.",
  ROUND_ROBIN: "Toutes les équipes s'affrontent une fois, classement global.",
  LEAGUE: "Championnat sur la durée (aller ou aller-retour), classement cumulé.",
};

/** Le format permet-il des poules (et donc des matchs de phase de poule) ? */
export function formatAllowsGroups(format: TournamentFormat): boolean {
  return STAGES_BY_FORMAT[format].includes("GROUP");
}

/** Le format s'appuie-t-il sur une taille de poule configurable ? */
export function formatUsesGroupSize(format: TournamentFormat): boolean {
  return format === "GROUPS" || format === "GROUPS_THEN_ELIM";
}

/** Méthodes de seeding (placement des équipes) proposées à la création. */
export const SEEDING_TYPES = ["MANUAL", "RANDOM", "RANKING"] as const;
export type SeedingType = (typeof SEEDING_TYPES)[number];
export const SEEDING_TYPE_LABELS: Record<SeedingType, string> = {
  MANUAL: "Manuel",
  RANDOM: "Aléatoire",
  RANKING: "Par classement",
};

/**
 * Effectif minimum pour inscrire une équipe à un tournoi : une équipe Valorant
 * aligne 5 joueurs. Compte les adhésions actives hors staff (COACH / MANAGER).
 */
export const MIN_ROSTER_FOR_TOURNAMENT = 5;
