// /log/pain — the Pain section on its own: readings + character for one
// date, reached from the overview's Pain tile.
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository } from "@/repositories";
import { resolveDateParam } from "@/lib/dates";
import { LogSectionHeader } from "@/components/ui/log/log-section-header";
import { PainSectionForm } from "@/components/ui/log/pain-section-form";

export const dynamic = "force-dynamic";

export default async function LogPainPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = resolveDateParam(dateParam);

  const user = await getCurrentUser();
  const existing = await dailyLogRepository.findByDate(user.id, date);

  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <LogSectionHeader title="Pain" date={date} />
      {/* key: switching dates must remount the form with the new day's state */}
      <PainSectionForm
        key={date}
        init={{
          date,
          painMorning: existing?.painMorning ?? null,
          painDaytime: existing?.painDaytime ?? null,
          painNight: existing?.painNight ?? null,
          painTypes: existing?.painTypes ?? [],
        }}
      />
    </main>
  );
}
