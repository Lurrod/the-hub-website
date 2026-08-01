import { describe, it, expect } from "vitest";
import nextConfig from "../../next.config";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";

/** Un même formulaire peut porter deux images (logo + bannière de tournoi). */
const MAX_IMAGES_PAR_FORMULAIRE = 2;

/** Convertit "12mb" / "512kb" en octets (même notation que Next). */
function toBytes(limit: string | number): number {
  if (typeof limit === "number") return limit;
  const m = /^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/i.exec(limit.trim());
  if (!m) throw new Error(`Limite illisible : ${limit}`);
  const units = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };
  return Number(m[1]) * units[m[2].toLowerCase() as keyof typeof units];
}

describe("limite de corps des server actions", () => {
  it("couvre les formulaires les plus lourds que l'application accepte", () => {
    // Next rejette la requête (413) avant même d'entrer dans l'action : si cette
    // limite passe sous celle de nos uploads, envoyer un logo casse la page.
    const limit = nextConfig.experimental?.serverActions?.bodySizeLimit;
    expect(limit).toBeDefined();
    expect(toBytes(limit!)).toBeGreaterThanOrEqual(MAX_IMAGES_PAR_FORMULAIRE * MAX_UPLOAD_BYTES);
  });
});

/** Récupère les en-têtes appliqués à toutes les routes. */
async function headersFor(source: string): Promise<Record<string, string>> {
  const groups = await nextConfig.headers!();
  const group = groups.find((g) => g.source === source);
  if (!group) throw new Error(`Aucun groupe d'en-têtes pour ${source}`);
  return Object.fromEntries(group.headers.map((h) => [h.key, h.value]));
}

describe("en-têtes de sécurité", () => {
  it("émet les protections de base sur toutes les routes", async () => {
    const h = await headersFor("/(.*)");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("impose HTTPS pendant au moins un an, sous-domaines compris", async () => {
    // Sans HSTS, la toute première visite tapée sans schéma part en clair et
    // le cookie de session Auth.js est interceptable (SSL stripping).
    const hsts = (await headersFor("/(.*)"))["Strict-Transport-Security"];
    expect(hsts).toBeDefined();
    const maxAge = Number(/max-age=(\d+)/.exec(hsts)?.[1]);
    expect(maxAge).toBeGreaterThanOrEqual(31536000);
    expect(hsts).toContain("includeSubDomains");
  });

  it("refuse les API navigateur que le site n'utilise pas", async () => {
    const pp = (await headersFor("/(.*)"))["Permissions-Policy"];
    expect(pp).toBeDefined();
    for (const feature of ["camera", "microphone", "geolocation"]) {
      expect(pp).toContain(`${feature}=()`);
    }
  });

  it("n'annonce pas la technologie du serveur", () => {
    // `poweredByHeader` vaut true par défaut : sans ce réglage, chaque réponse
    // porte `X-Powered-By: Next.js`.
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
