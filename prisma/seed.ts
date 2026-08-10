import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const ids = (process.env.ADMIN_DISCORD_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const results = await Promise.all(
    ids.map((discordId) =>
      db.user.updateMany({ where: { discordId }, data: { globalRole: "ADMIN" } })
    )
  );
  const updated = results.reduce((sum, r) => sum + r.count, 0);
  process.stdout.write(`Seed: ${updated} admin(s) promu(s) sur ${ids.length} ciblé(s).\n`);
}

main().finally(() => db.$disconnect());
