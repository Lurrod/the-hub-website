import { serializeJsonLd, type JsonLd as JsonLdDocument } from "@/lib/structured-data";

/**
 * Injecte un document Schema.org dans la page.
 *
 * `dangerouslySetInnerHTML` est ici le motif recommandé par Next lui-même
 * (guides/json-ld) : c'est le seul moyen d'écrire un bloc de données brut sans
 * que React n'échappe les guillemets du JSON. La sécurité vient de
 * `serializeJsonLd`, qui neutralise tout `<` avant l'insertion — cas couvert
 * par tests/unit/structured-data.test.ts.
 *
 * Le type `application/ld+json` n'est pas exécutable : la CSP `script-src` ne
 * s'applique pas à ces blocs, aucun nonce n'est donc nécessaire.
 */
export default function JsonLdScript({ data }: { data: JsonLdDocument }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
