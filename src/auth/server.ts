import { createNeonAuth } from "@neondatabase/auth/next/server";

console.log("NEON AUTH URL:", process.env.NEON_AUTH_BASE_URL);
console.log("COOKIE SECRET EXISTS:", !!process.env.NEON_AUTH_COOKIE_SECRET);

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});
