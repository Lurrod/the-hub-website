import { describe, it, expect } from "vitest";
import { discordProfileUrl, playerDiscordSocial } from "@/lib/discord";

const linked = {
  showDiscord: true,
  user: { discordId: "123456789", discordUsername: "titouan_47" },
};

describe("discordProfileUrl", () => {
  it("pointe sur la fiche Discord de l'identifiant", () => {
    expect(discordProfileUrl("123456789")).toBe("https://discord.com/users/123456789");
  });

  it("échappe l'identifiant plutôt que de le coller tel quel", () => {
    expect(discordProfileUrl("12/../evil")).toBe("https://discord.com/users/12%2F..%2Fevil");
  });
});

describe("playerDiscordSocial", () => {
  it("rend le lien du compte lié et le pseudo en libellé", () => {
    expect(playerDiscordSocial(linked)).toEqual({
      url: "https://discord.com/users/123456789",
      label: "Discord · titouan_47",
    });
  });

  it("retombe sur un libellé neutre quand le pseudo n'est pas encore connu", () => {
    // Cas des comptes créés avant la capture du pseudo : le lien reste bon,
    // seule l'infobulle perd le détail jusqu'à la prochaine connexion.
    const r = playerDiscordSocial({ ...linked, user: { ...linked.user, discordUsername: null } });
    expect(r).toEqual({ url: "https://discord.com/users/123456789", label: "Discord" });
  });

  it("rend null quand le joueur a masqué son Discord", () => {
    expect(playerDiscordSocial({ ...linked, showDiscord: false })).toBeNull();
  });

  it("rend null pour une fiche sans compte lié", () => {
    expect(playerDiscordSocial({ showDiscord: true, user: null })).toBeNull();
  });

  it("rend null quand le compte existe sans identifiant Discord", () => {
    expect(
      playerDiscordSocial({ showDiscord: true, user: { discordId: null, discordUsername: null } })
    ).toBeNull();
  });
});
