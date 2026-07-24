"use client";

import { useState } from "react";
import { auth } from "@/auth/client";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();

  async function login() {
    const result = await auth.signIn.email({ email, password });

    if (result.error) {
      console.error(result.error.message);
      return;
    }

    console.log("Login successful");

    router.push("/");
  }
  return (
    <div>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email@email.com"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        placeholder="password"
      />

      <button onClick={login}>Login</button>
    </div>
  );
}
