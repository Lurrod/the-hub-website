/**
 * Mesure le centrage du rating, et recalcule au besoin les ratings stockés.
 *
 * Le rating est une échelle centrée sur 1,00 : la ligne de statistiques
 * moyenne du site doit y tomber. Ce centrage est porté par la constante
 * `RATING_BASELINE` de `src/lib/match-stats-core.ts`, ajustée sur les données
 * du site — un niveau moyen peut dériver à mesure que la base grossit.
 *
 * Sans option, le script ne fait que **mesurer** : il n'écrit rien.
 *
 * En `.mjs` pour la même raison que `sync-tournament-statuses.mjs` : il tourne
 * sur le serveur, où le paquet `standalone` n'embarque ni `tsx` ni les
 * dépendances de développement. La formule y est donc recopiée ; le test
 * `tests/unit/recalibrate-ratings.test.ts` vérifie qu'elle ne diverge pas de
 * celle de `match-stats-core.ts`.
 *
 * ## Lancer
 *
 *   node scripts/recalibrate-ratings.mjs            mesure seule
 *   node scripts/recalibrate-ratings.mjs --apply    recalcule les ratings stockés
 */
import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";

/** Doit rester égale à `RATING_BASELINE` de src/lib/match-stats-core.ts. */
export const RATING_BASELINE = 0.099;

/**
 * Copie de `computeRating`.
 * @param {{rounds:number,kills:number,deaths:number,assists:number,kastPct:number,adr:number}} s
 * @returns {number}
 */
export function computeRating(s) {
  if (s.rounds <= 0) return 0;
  const kpr = s.kills / s.rounds;
  const dpr = s.deaths / s.rounds;
  const apr = s.assists / s.rounds;
  const impact = 2.13 * kpr + 0.42 * apr - 0.41;
  const rating =
    0.0073 * s.kastPct +
    0.3591 * kpr -
    0.5329 * dpr +
    0.2372 * impact +
    0.00171 * s.adr +
    RATING_BASELINE;
  return Math.round(Math.max(0.01, rating) * 100) / 100;
}

/**
 * Toutes les lignes de scoreboard, avec la longueur de leur map.
 *
 * Le nombre de rounds n'est pas stocké sur la ligne : il se lit sur la map,
 * dont les deux scores l'additionnent.
 */
async function loadRows(db) {
  const maps = await db.matchMap.findMany({
    where: { stats: { some: {} } },
    select: {
      scoreA: true,
      scoreB: true,
      stats: {
        select: {
          id: true,
          kills: true,
          deaths: true,
          assists: true,
          kast: true,
          adr: true,
          rating: true,
        },
      },
    },
  });
  // `kast` est renommé en `kastPct` ici : c'est le nom qu'attend
  // `computeRating`, et lui passer la ligne telle quelle donnerait un NaN
  // silencieux.
  return maps.flatMap((m) =>
    m.stats.map((s) => ({
      id: s.id,
      rounds: m.scoreA + m.scoreB,
      kills: s.kills,
      deaths: s.deaths,
      assists: s.assists,
      kastPct: s.kast,
      adr: s.adr,
      rating: s.rating,
    }))
  );
}

/**
 * Constante qui placerait la ligne moyenne exactement sur 1,00.
 *
 * La moyenne est pondérée par les rounds : l'ACS, l'ADR et le KAST sont des
 * grandeurs par round, une map de 17 rounds ne pèse pas autant qu'une de 24.
 */
function fitBaseline(rows) {
  let rounds = 0,
    kills = 0,
    deaths = 0,
    assists = 0,
    kastW = 0,
    adrW = 0;
  for (const r of rows) {
    rounds += r.rounds;
    kills += r.kills;
    deaths += r.deaths;
    assists += r.assists;
    kastW += r.kastPct * r.rounds;
    adrW += r.adr * r.rounds;
  }
  if (rounds === 0) return null;

  const moyenne = {
    rounds,
    kills,
    deaths,
    assists,
    kastPct: kastW / rounds,
    adr: adrW / rounds,
  };
  // `computeRating` arrondit : on retire la constante du résultat non arrondi
  // en la recalculant à la main.
  const actuel = computeRating(moyenne);
  return { moyenne, actuel, baseline: Math.round((RATING_BASELINE + (1 - actuel)) * 1000) / 1000 };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const db = new PrismaClient();
  try {
    const rows = await loadRows(db);
    if (rows.length === 0) {
      console.log(JSON.stringify({ event: "rating.recalibrate", lignes: 0 }));
      return;
    }

    const fit = fitBaseline(rows);
    const perimes = rows.filter(
      (r) => computeRating(r) !== Math.round(r.rating * 100) / 100
    ).length;

    console.log(
      JSON.stringify(
        {
          event: "rating.recalibrate",
          lignes: rows.length,
          baselineEnCode: RATING_BASELINE,
          ratingDeLaLigneMoyenne: fit?.actuel ?? null,
          baselinePourCentrerSur1: fit?.baseline ?? null,
          lignesADivergence: perimes,
          applique: apply,
        },
        null,
        2
      )
    );

    if (!apply) {
      if (perimes > 0) {
        console.log(`\n${perimes} ligne(s) portent un rating périmé. Relancer avec --apply.`);
      }
      return;
    }

    let ecrites = 0;
    let ignorees = 0;
    for (const r of rows) {
      const rating = computeRating(r);
      // Garde-fou : une ligne incomplète donnerait un NaN, que Prisma refuse
      // au dernier moment après avoir déjà réécrit tout ce qui précède.
      if (!Number.isFinite(rating)) {
        ignorees += 1;
        continue;
      }
      if (rating === Math.round(r.rating * 100) / 100) continue;
      await db.playerGameStat.update({ where: { id: r.id }, data: { rating } });
      ecrites += 1;
    }
    console.log(JSON.stringify({ event: "rating.recalibrate.applied", ecrites, ignorees }));
  } finally {
    await db.$disconnect();
  }
}

// Le fichier est aussi importé par les tests : on ne lance la mesure que
// lorsqu'il est exécuté directement.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
