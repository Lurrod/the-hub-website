import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { imageAsPngDataUri } from "@/lib/og/image";

describe("imageAsPngDataUri", () => {
  it("renvoie null quand aucune clé n'est fournie", async () => {
    await expect(imageAsPngDataUri(null)).resolves.toBeNull();
  });

  it("renvoie null sur un fichier absent", async () => {
    await expect(imageAsPngDataUri("/api/images/teams/inexistant.webp")).resolves.toBeNull();
  });

  it("renvoie null sur une catégorie inconnue", async () => {
    await expect(imageAsPngDataUri("/api/images/secrets/x.webp")).resolves.toBeNull();
  });

  it("renvoie null sur une tentative de traversée", async () => {
    await expect(imageAsPngDataUri("/api/images/teams/../../.env")).resolves.toBeNull();
  });

  it("refuse une origine distante absente de la liste blanche", async () => {
    // Même liste que la CSP : ce qu'un navigateur refuserait d'afficher, le
    // serveur refuse d'aller chercher. C'est la garde contre le SSRF.
    await expect(imageAsPngDataUri("https://exemple.test/logo.png")).resolves.toBeNull();
  });

  it("refuse une adresse interne", async () => {
    await expect(imageAsPngDataUri("http://169.254.169.254/latest/meta-data")).resolves.toBeNull();
    await expect(imageAsPngDataUri("http://localhost:5432/")).resolves.toBeNull();
  });

  it("renvoie null sur une clé qui n'est ni un upload ni une URL", async () => {
    await expect(imageAsPngDataUri("pas-une-clé")).resolves.toBeNull();
  });

  it("va chercher l'avatar Discord d'un joueur qui n'a rien téléversé", async () => {
    // La quasi-totalité des comptes sont dans ce cas : `ensurePlayerForUser`
    // reprend l'URL d'avatar Discord telle quelle. Ne pas la traiter revenait
    // à rendre une carte de partage au monogramme.
    const png = await sharp({
      create: { width: 128, height: 128, channels: 3, background: "#5865f2" },
    })
      .png()
      .toBuffer();

    const original = globalThis.fetch;
    const appels: string[] = [];
    globalThis.fetch = (async (input: string | URL) => {
      appels.push(String(input));
      return new Response(new Uint8Array(png), { status: 200 });
    }) as typeof fetch;

    try {
      const uri = await imageAsPngDataUri("https://cdn.discordapp.com/avatars/1/abc.png", 64);
      expect(uri?.startsWith("data:image/png;base64,")).toBe(true);
      expect(appels).toHaveLength(1);

      const decoded = Buffer.from(uri!.slice("data:image/png;base64,".length), "base64");
      expect((await sharp(decoded).metadata()).width).toBe(64);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("renvoie null quand l'hôte distant répond une erreur", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () => new Response("nope", { status: 404 })) as typeof fetch;
    try {
      await expect(
        imageAsPngDataUri("https://cdn.discordapp.com/avatars/1/abc.png")
      ).resolves.toBeNull();
    } finally {
      globalThis.fetch = original;
    }
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
      const uri = await imageAsPngDataUri(`/api/images/teams/${id}.webp`);
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
