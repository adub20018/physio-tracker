"use client";

import { auth } from "@/auth/client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return <button onClick={logout}>Logout</button>;
}
