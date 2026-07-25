import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

const adminIds = (process.env.ADMIN_DISCORD_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  providers: [Discord],
  callbacks: {
    async session({ session, user }) {
      // Lecture du rôle depuis la DB à chaque hydratation de session :
      // type sûr, et une révocation/attribution de rôle prend effet
      // immédiatement (sans attendre l'expiration de session).
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        select: { globalRole: true },
      });
      session.user.id = user.id;
      session.user.globalRole = dbUser?.globalRole ?? "USER";
      return session;
    },
  },
  events: {
    async linkAccount({ user, account }) {
      if (account.provider !== "discord") return;
      const isAdmin = adminIds.includes(account.providerAccountId);
      await db.user.update({
        where: { id: user.id },
        data: {
          discordId: account.providerAccountId,
          ...(isAdmin ? { globalRole: "ADMIN" as const } : {}),
        },
      });
    },
  },
});
