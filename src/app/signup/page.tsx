"use client";

import { useState } from "react";
import { auth } from "@/auth/client";
import { useRouter } from "next/navigation";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();

  async function signup() {
    const result = await auth.signUp.email({ email, password, name });

    if (result.error) {
      console.error(result.error.message);
      return;
    }
    console.log("Signup successful");
    router.push("/");
  }
  return (
    <div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        type="text"
        placeholder="John Doe"
      />
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

      <button onClick={signup}>Sign Up</button>
    </div>
  );
}
