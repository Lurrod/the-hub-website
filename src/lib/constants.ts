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
  "PREMIER_CONTENDER",
  "PREMIER_INVITE",
  "SPIKE_TOUR_QUALIFIER",
  "SPIKE_TOUR_PLAYOFFS",
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
  PREMIER_CONTENDER: "Premier — Contender",
  PREMIER_INVITE: "Premier — Invite",
  SPIKE_TOUR_QUALIFIER: "Spike Tour — Open Qualifier",
  SPIKE_TOUR_PLAYOFFS: "Spike Tour — Playoffs Radiant",
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

/**
 * Forfait : équipe qui déclare forfait, et perd donc le match. Porté par le
 * match plutôt que déduit du score : un forfait se joue à 0-0 et le score ne
 * peut pas le raconter.
 */
export const MATCH_FORFEITS = ["NONE", "TEAM_A", "TEAM_B"] as const;
export type MatchForfeit = (typeof MATCH_FORFEITS)[number];
export const MATCH_FORFEIT_LABELS: Record<MatchForfeit, string> = {
  NONE: "Aucun",
  TEAM_A: "Forfait de l'équipe A",
  TEAM_B: "Forfait de l'équipe B",
};

/** Phases de match autorisées selon le format déclaré du tournoi. */
export const STAGES_BY_FORMAT: Record<TournamentFormat, readonly MatchStage[]> = {
  GROUPS: ["GROUP"],
  SINGLE_ELIM: ["BRACKET"],
  DOUBLE_ELIM: ["BRACKET"],
  GROUPS_THEN_ELIM: ["GROUP", "BRACKET"],
  SWISS: ["GROUP"],
  ROUND_ROBIN: ["GROUP"],
  LEAGUE: ["GROUP"],
  // Une saison Premier se joue en deux temps : la ligne régulière, dont le
  // classement décide des qualifiés, puis les playoffs. Les deux vivaient dans
  // deux tournois séparés, ce qui obligeait à quitter la page pour passer de
  // l'un à l'autre alors qu'ils ne font qu'une seule saison.
  PREMIER_CONTENDER: ["GROUP", "BRACKET"],
  PREMIER_INVITE: ["GROUP", "BRACKET"],
  // Un Open Qualifier tient en un week-end : la ronde suisse le samedi, l'arbre
  // Radiant le dimanche. En faire deux tournois couperait le classement de
  // l'arbre qu'il alimente, alors que c'est la même étape.
  SPIKE_TOUR_QUALIFIER: ["GROUP", "BRACKET"],
  SPIKE_TOUR_PLAYOFFS: ["BRACKET"],
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
  PREMIER_CONTENDER:
    "Saison Premier Contender : ligne régulière classée, puis plusieurs arbres de playoffs en parallèle.",
  PREMIER_INVITE:
    "Saison Premier Invite : ligne régulière classée, puis un arbre de playoffs à élimination directe.",
  SPIKE_TOUR_QUALIFIER:
    "Six rondes suisses en Bo1, puis l'arbre Radiant à élimination directe en Bo3.",
  SPIKE_TOUR_PLAYOFFS: "Huit équipes en double élimination, Bo3 sur tous les tours.",
};

/**
 * Le tournoi peut-il porter des `Group` ?
 *
 * Le prédicat se dérivait de `STAGES_BY_FORMAT` tant que « groupe » voulait dire
 * « poule ». Le Premier Contender casse l'équivalence : ses brackets parallèles
 * sont des `Group` alors qu'il ne joue que des matchs de stage BRACKET. La liste
 * est donc explicite — la dériver mentirait sur l'un des deux sens.
 */
const FORMATS_WITH_GROUPS: readonly TournamentFormat[] = [
  "GROUPS",
  "GROUPS_THEN_ELIM",
  "SWISS",
  "ROUND_ROBIN",
  "LEAGUE",
  "PREMIER_CONTENDER",
  // Depuis que l'Invite joue lui aussi une ligne régulière, il peut porter des
  // poules — au sens propre cette fois, contrairement au Contender dont les
  // groupes sont des brackets.
  "PREMIER_INVITE",
  // Une ronde suisse ne crée pas de poule, mais l'invariant du catalogue veut
  // que tout format jouant une phase GROUP puisse en porter — et rien n'empêche
  // un orga d'y ranger ses tie-breaks.
  "SPIKE_TOUR_QUALIFIER",
];

export function formatAllowsGroups(format: TournamentFormat): boolean {
  return FORMATS_WITH_GROUPS.includes(format);
}

/**
 * Les `Group` de ce format désignent-ils des brackets et non des poules ?
 *
 * Le Premier Contender est le seul cas : ses arbres parallèles sont stockés
 * comme des `Group`. Le prédicat vivait en dur dans la page de gestion ; depuis
 * que le format joue aussi une phase de poule, la page publique en a besoin
 * elle aussi — sans quoi elle afficherait « Bracket A » et « Bracket B » en
 * tableaux de classement vides devant l'arbre qu'ils désignent.
 */
export function formatGroupsAreBrackets(format: TournamentFormat): boolean {
  return format === "PREMIER_CONTENDER";
}

/** Le format s'appuie-t-il sur une taille de poule configurable ? */
export function formatUsesGroupSize(format: TournamentFormat): boolean {
  return format === "GROUPS" || format === "GROUPS_THEN_ELIM";
}

/**
 * Le format est-il un playoff Premier ?
 *
 * Les deux divisions hautes partagent leurs règles de série (Bo1 partout, Bo3
 * en finale) : la liste vivait en double, dans `bracket.ts` et dans le
 * formulaire de tournoi, avec le risque qu'un troisième format n'arrive que
 * dans l'une des deux.
 */
export function isPremierFormat(format: TournamentFormat): boolean {
  return format === "PREMIER_CONTENDER" || format === "PREMIER_INVITE";
}

/**
 * Le classement de ce format se départage-t-il selon l'article 7 du règlement
 * Spike Tour ?
 *
 * Le classement ordinaire trie sur les maps ; l'article 7 trie sur les rounds,
 * Buchholz en tête. Les deux ne remontent pas les mêmes colonnes, d'où un
 * module à part (`src/lib/swiss-standings.ts`) et ce prédicat pour choisir. Le
 * format SWISS générique n'y entre pas : le faire basculer changerait le
 * classement affiché de tournois déjà en base, ce qui n'a pas été demandé.
 */
export function formatUsesSwissTiebreaks(format: TournamentFormat): boolean {
  return format === "SPIKE_TOUR_QUALIFIER";
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
