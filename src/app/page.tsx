// Home page — will become the dashboard in Phase 3. Until then it greets the
// user and points at the two working pages, exercising the full stack
// (auth → repository → db) on every request.
import Link from "next/link";
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository } from "@/repositories";

// Always render at request time — the log count must be live.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  const logs = await dailyLogRepository.listAll(user.id);
  const lastDate = logs[logs.length - 1]?.date;

  return (
    <main className="page" style={{ maxWidth: "40rem" }}>
      <header className="page-header">
        <h1>Welcome back, {user.name}.</h1>
        <p className="subtitle">
          {logs.length} days logged{lastDate ? ` · latest ${lastDate}` : ""} — charts arrive in
          Phase 3.
        </p>
      </header>
      <p style={{ color: "var(--muted)" }}>
        <Link href="/log" style={{ color: "var(--accent)" }}>
          Log today
        </Link>{" "}
        or browse your{" "}
        <Link href="/history" style={{ color: "var(--accent)" }}>
          history
        </Link>
        .
      </p>
    </main>
  );
}
