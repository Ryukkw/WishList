import "next-auth";

declare module "next-auth" {
  interface Session {
    backend_token?: string;
    user: {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    backend_token?: string;
  }
}
