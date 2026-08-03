import { describe, it, expect } from "vitest";
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
});
