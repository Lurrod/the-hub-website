import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { uploadAsPngDataUri } from "@/lib/og/image";

describe("uploadAsPngDataUri", () => {
  it("renvoie null quand aucune clé n'est fournie", async () => {
    await expect(uploadAsPngDataUri(null)).resolves.toBeNull();
  });

  it("renvoie null sur un fichier absent", async () => {
    await expect(uploadAsPngDataUri("/api/images/teams/inexistant.webp")).resolves.toBeNull();
  });

  it("renvoie null sur une catégorie inconnue", async () => {
    await expect(uploadAsPngDataUri("/api/images/secrets/x.webp")).resolves.toBeNull();
  });

  it("renvoie null sur une tentative de traversée", async () => {
    await expect(uploadAsPngDataUri("/api/images/teams/../../.env")).resolves.toBeNull();
  });

  it("renvoie null sur une clé qui ne suit pas le préfixe attendu", async () => {
    await expect(uploadAsPngDataUri("https://exemple.test/logo.png")).resolves.toBeNull();
  });

  it("convertit un webp en png inlinable sans déformer le logo", async () => {
    // `UPLOADS_ROOT` est figé sur `process.cwd()/uploads` : la fixture doit
    // vivre dans le vrai dossier, d'où l'identifiant explicitement jetable et
    // le nettoyage en `finally`.
    const id = `og-test-fixture-${randomUUID()}`;
    const dir = path.join(process.cwd(), "uploads", "teams");
    const file = path.join(dir, `${id}.webp`);
    await fs.mkdir(dir, { recursive: true });

    // Source non carrée : elle seule prouve que `fit: "inside"` conserve le
    // rapport d'aspect au lieu d'écraser l'image dans un carré.
    const webp = await sharp({
      create: { width: 400, height: 100, channels: 3, background: "#ff4655" },
    })
      .webp()
      .toBuffer();
    await fs.writeFile(file, webp);

    try {
      const uri = await uploadAsPngDataUri(`/api/images/teams/${id}.webp`);
      const prefix = "data:image/png;base64,";
      expect(uri?.startsWith(prefix)).toBe(true);

      const decoded = Buffer.from(uri!.slice(prefix.length), "base64");
      const meta = await sharp(decoded).metadata();
      expect(meta.format).toBe("png");
      expect(meta.width).toBe(160);
      expect(meta.height).toBe(40);
    } finally {
      await fs.rm(file, { force: true });
    }
  });
});
