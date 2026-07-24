import { createAuthClient } from "better-auth/client";

const auth = createAuthClient({
  baseURL: process.env.NEON_AUTH_BASE_URL,
});

// Real authentication, scoped to the current deployment
await auth.signIn.email({ email, password });
