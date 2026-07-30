// /log/notes — the Notes section on its own: general notes for one date,
// reached from the overview's Notes tile.
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository } from "@/repositories";
import { resolveDateParam } from "@/lib/dates";
import { LogSectionHeader } from "@/components/ui/log/log-section-header";
import { NotesSectionForm } from "@/components/ui/log/notes-section-form";

export const dynamic = "force-dynamic";

export default async function LogNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = await resolveDateParam(dateParam);

  const user = await getCurrentUser();
  const existing = await dailyLogRepository.findByDate(user.id, date);

  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <LogSectionHeader title="Notes" date={date} />
      <NotesSectionForm
        key={date}
        init={{
          date,
          generalNotes: existing?.generalNotes ?? "",
        }}
      />
    </main>
  );
}
