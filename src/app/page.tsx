// Home page — will become the dashboard in Phase 3. For Phase 0 it is a
// deliberate end-to-end smoke test: it resolves the current user through
// auth → repository → database, and renders a PrimeReact component, proving
// every layer of the stack is wired up.
// PrimeReact 11 gotchas: styled components come from @primereact/ui/* (the
// plain `primereact` package is headless), and we import the CardXxx named
// exports because namespace objects don't survive the server→client boundary.
import { CardRoot, CardBody, CardCaption, CardContent, CardTitle } from "@primereact/ui/card";
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository } from "@/repositories";

export default async function HomePage() {
  const user = await getCurrentUser();
  const logs = await dailyLogRepository.listAll(user.id);

  return (
    <main style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto" }}>
      <CardRoot>
        <CardBody>
          <CardCaption>
            <CardTitle>Physio Tracker</CardTitle>
          </CardCaption>
          <CardContent>
            <p>
              Welcome back, <strong>{user.name}</strong>.
            </p>
            <p>
              {logs.length === 0
                ? "No daily logs yet — the spreadsheet import arrives in Phase 1."
                : `${logs.length} daily logs recorded.`}
            </p>
          </CardContent>
        </CardBody>
      </CardRoot>
    </main>
  );
}
