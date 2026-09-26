import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";

const require = createRequire(import.meta.url);
const { apps } = require("../../ecosystem.config.cjs");
const app = apps[0];

const toMb = (value: string) => {
  const match = /^(\d+)M$/.exec(value);
  if (!match) throw new Error(`format inattendu : ${value}`);
  return Number(match[1]);
};

describe("ecosystem.config.cjs — budget mémoire", () => {
  it("borne le heap V8 : sans cela, Node vise ~4 Go sur le serveur et ne ramasse pas avant le seuil pm2", () => {
    expect(app.node_args).toContain("--max-old-space-size=256");
  });

  it("limite les arenas glibc (threads tokio de Prisma, libvips)", () => {
    expect(app.env.MALLOC_ARENA_MAX).toBe("2");
  });

  it("garde le seuil pm2 au-dessus du heap V8 + la mémoire hors heap", () => {
    expect(toMb(app.max_memory_restart)).toBeGreaterThanOrEqual(256 + 300);
  });
});
