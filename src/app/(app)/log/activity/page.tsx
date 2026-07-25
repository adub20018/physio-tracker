// /log/activity — the Activity section on its own: steps, sleep, and
// activity tags for one date, reached from the overview's Activity tile.
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository } from "@/repositories";
import { resolveDateParam } from "@/lib/dates";
import { LogSectionHeader } from "@/components/ui/log-section-header";
import { ActivitySectionForm } from "@/components/ui/activity-section-form";

export const dynamic = "force-dynamic";

export default async function LogActivityPage({
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
      <LogSectionHeader title="Activity" date={date} />
      <ActivitySectionForm
        key={date}
        init={{
          date,
          steps: existing?.steps ?? null,
          sleepHours: existing?.sleepHours ?? null,
          activityTags: existing?.activityTags ?? [],
        }}
      />
    </main>
  );
}
