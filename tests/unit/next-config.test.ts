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
