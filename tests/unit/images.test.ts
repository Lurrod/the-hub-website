import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import { promises as fs } from "node:fs";
import sharp from "sharp";
import {
  validateImageUpload,
  assertRealImage,
  readUploadedImage,
  imageKeyFor,
  resolveUploadPath,
  imageEtag,
  deleteStoredImage,
} from "@/lib/images";

describe("validateImageUpload", () => {
  it("accepte un png sous la limite", () => {
    expect(validateImageUpload({ type: "image/png", size: 1000 }).ok).toBe(true);
  });
  it("refuse un type non autorisé", () => {
    const r = validateImageUpload({ type: "image/gif", size: 1000 });
    expect(r.ok).toBe(false);
  });
  it("refuse au-dessus de la limite", () => {
    const r = validateImageUpload({ type: "image/png", size: 10 * 1024 * 1024 });
    expect(r.ok).toBe(false);
  });
});

describe("imageKeyFor", () => {
  it("produit une clé /api/images/<cat>/<id>.webp", () => {
    expect(imageKeyFor("teams", "abc123")).toBe("/api/images/teams/abc123.webp");
  });
});

describe("resolveUploadPath", () => {
  it("résout un chemin sûr dans uploads/", () => {
    const p = resolveUploadPath(["teams", "abc123.webp"]);
    expect(p).toContain("uploads");
    expect(p.endsWith("abc123.webp")).toBe(true);
  });
  it("rejette la traversée de répertoire", () => {
    expect(() => resolveUploadPath(["..", "..", "etc", "passwd"])).toThrow();
  });
  it("rejette une catégorie inconnue", () => {
    expect(() => resolveUploadPath(["secrets", "x.webp"])).toThrow();
  });
});

describe("imageKeyFor (tournaments + bannière)", () => {
  it("produit une clé logo pour tournaments", () => {
    expect(imageKeyFor("tournaments", "t1")).toBe("/api/images/tournaments/t1.webp");
  });
  it("produit une clé bannière avec le suffixe -banner", () => {
    expect(imageKeyFor("tournaments", "t1", "banner")).toBe(
      "/api/images/tournaments/t1-banner.webp"
    );
  });
});

describe("resolveUploadPath (tournaments)", () => {
  it("résout un chemin sûr pour la catégorie tournaments", () => {
    const p = resolveUploadPath(["tournaments", "t1-banner.webp"]);
    expect(p).toContain("uploads");
    expect(p.endsWith("t1-banner.webp")).toBe(true);
  });
});

describe("imageEtag", () => {
  it("produit un ETag fort et cité", () => {
    expect(imageEtag({ size: 1234, mtimeMs: 1_700_000_000_000 })).toMatch(
      /^"[0-9a-z]+-[0-9a-z]+"$/
    );
  });
  it("change quand le fichier est réécrit", () => {
    // Les clés d'image sont stables (identifiant en base) : sans ce lien avec
    // mtime, un logo remplacé resterait servi depuis le cache navigateur.
    const a = imageEtag({ size: 100, mtimeMs: 1 });
    const b = imageEtag({ size: 100, mtimeMs: 2 });
    expect(a).not.toBe(b);
  });
  it("change quand la taille change à mtime égal", () => {
    expect(imageEtag({ size: 100, mtimeMs: 1 })).not.toBe(imageEtag({ size: 101, mtimeMs: 1 }));
  });
  it("est stable pour un même fichier", () => {
    const s = { size: 42, mtimeMs: 99 };
    expect(imageEtag(s)).toBe(imageEtag(s));
  });
});

describe("assertRealImage", () => {
  // Le type MIME vient du client et ne prouve rien : seul le contenu fait foi.
  it("accepte un vrai PNG", async () => {
    const png = await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();
    expect(await assertRealImage(png)).toEqual({ ok: true });
  });

  it("accepte un vrai webp", async () => {
    const webp = await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .webp()
      .toBuffer();
    expect(await assertRealImage(webp)).toEqual({ ok: true });
  });

  it("refuse un SVG, même renommé en .png", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><rect width="4" height="4"/></svg>'
    );
    const r = await assertRealImage(svg);
    expect(r.ok).toBe(false);
  });

  it("refuse un fichier qui n'est pas une image", async () => {
    const r = await assertRealImage(Buffer.from("ceci n'est pas une image"));
    expect(r.ok).toBe(false);
  });
});

describe("readUploadedImage", () => {
  async function pngFile(name = "logo.png", type = "image/png") {
    const buf = await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 9, g: 9, b: 9 } },
    })
      .png()
      .toBuffer();
    return new File([new Uint8Array(buf)], name, { type });
  }

  it("rend null quand le champ est vide (upload facultatif)", async () => {
    expect(await readUploadedImage(null)).toBeNull();
    expect(await readUploadedImage(new File([], "vide.png", { type: "image/png" }))).toBeNull();
    expect(await readUploadedImage("pas-un-fichier")).toBeNull();
  });

  it("rend le contenu d'une image valide", async () => {
    const buffer = await readUploadedImage(await pngFile());
    expect(buffer).toBeInstanceOf(Buffer);
    expect((await sharp(buffer!).metadata()).format).toBe("png");
  });

  it("refuse un type déclaré hors liste", async () => {
    const f = new File([new Uint8Array([1, 2, 3])], "x.gif", { type: "image/gif" });
    await expect(readUploadedImage(f)).rejects.toThrow(/non autorisé/i);
  });

  it("refuse un fichier dont le contenu n'est pas une image, malgré son type déclaré", async () => {
    const f = new File([new Uint8Array(Buffer.from("<svg/>"))], "piege.png", {
      type: "image/png",
    });
    await expect(readUploadedImage(f)).rejects.toThrow();
  });
});

describe("deleteStoredImage", () => {
  // Les fichiers sont créés pour de vrai sous uploads/ (dossier ignoré par git,
  // volume dédié en production) : la fonction n'a d'intérêt que si l'on vérifie
  // qu'elle touche bien le disque.
  const id = "test-delete-stored-image";
  const dir = path.join(process.cwd(), "uploads", "teams");
  const logo = path.join(dir, `${id}.webp`);
  const banner = path.join(dir, `${id}-banner.webp`);

  async function seed(files: string[]) {
    await fs.mkdir(dir, { recursive: true });
    for (const f of files) await fs.writeFile(f, "contenu");
  }
  async function exists(f: string) {
    return fs
      .access(f)
      .then(() => true)
      .catch(() => false);
  }

  afterEach(async () => {
    for (const f of [logo, banner]) await fs.rm(f, { force: true });
  });

  it("efface les deux variantes d'une entité", async () => {
    await seed([logo, banner]);
    await deleteStoredImage("teams", id);
    expect(await exists(logo)).toBe(false);
    expect(await exists(banner)).toBe(false);
  });

  it("ne se plaint pas d'une variante absente", async () => {
    // Une équipe n'a pas de bannière : le fichier n'existe pas, ce n'est pas
    // une erreur.
    await seed([logo]);
    await expect(deleteStoredImage("teams", id)).resolves.toBeUndefined();
    expect(await exists(logo)).toBe(false);
  });

  it("ne fait rien quand aucun fichier n'a jamais été déposé", async () => {
    await expect(deleteStoredImage("teams", id)).resolves.toBeUndefined();
  });

  it("refuse une catégorie inconnue", async () => {
    await expect(deleteStoredImage("secrets" as unknown as "teams", id)).rejects.toThrow(
      /Catégorie invalide/
    );
  });

  it("refuse un identifiant qui tente une traversée de répertoire", async () => {
    // L'identifiant vient d'une URL : il repasse par le même résolveur que la
    // lecture, qui refuse les séparateurs et les « .. ».
    await expect(deleteStoredImage("teams", "../../etc/passwd")).rejects.toThrow();
  });

  it("laisse intact le fichier d'une autre entité", async () => {
    const other = path.join(dir, "test-delete-stored-image-voisin.webp");
    await seed([logo]);
    await fs.writeFile(other, "voisin");
    try {
      await deleteStoredImage("teams", id);
      expect(await exists(other)).toBe(true);
    } finally {
      await fs.rm(other, { force: true });
    }
  });
});
