import { type DefaultSession } from "next-auth";

/**
 * Augmentation des types NextAuth : le rôle applicatif
 * (STUDENT | CENTER_ADMIN | SUPER_ADMIN) circule dans la session.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: string;
      plan?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    plan?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    plan?: string;
  }
}
