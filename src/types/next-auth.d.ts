import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; globalRole: "ADMIN" | "USER" } & DefaultSession["user"];
  }
  interface User {
    globalRole?: "ADMIN" | "USER";
    discordId?: string | null;
  }
}
