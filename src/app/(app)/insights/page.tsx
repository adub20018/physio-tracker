// /insights — correlation explorer (PLAN.md §3): lag scatter, flare review, weekly report.
// Scatter data comes from buildChartDataBundle; flare/weekly are computed locally (range-independent).
import { getCurrentUser } from "@/auth/get-current-user";
import { dailyLogRepository, userSettingsRepository } from "@/repositories";
import { toDomainDays } from "@/lib/to-domain";
import { todayIso } from "@/lib/dates";
import { buildWidgetDataBundle } from "@/lib/widget-data";
import { FlareReview } from "@/components/ui/insights/flare-review";
import { WeeklyReportTable } from "@/components/ui/insights/weekly-report-table";
import { InsightsCharts } from "@/components/ui/insights/insights-charts";
import { InfoTooltip } from "@/components/ui/shared/info-tooltip";
import { Info } from "lucide-react";
import styles from "@/components/ui/dashboard/dashboard.module.css";

// Always render at request time — insights must reflect the latest logs.
export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const user = await getCurrentUser();
  const [logs, { flareThreshold, chartAutoScaleYAxis }] = await Promise.all([
    dailyLogRepository.listAll(user.id),
    userSettingsRepository.get(user.id),
  ]);
  const days = toDomainDays(logs);
  const today = await todayIso();

  // Same builder the dashboard widgets use, so both render identical data.
  const {
    fullStepsPoints,
    fullVolumePoints,
    fullStepsVsPeakPoints,
    fullStepsVsAveragePoints,
    fullVolumeVsPeakPoints,
    fullVolumeVsAveragePoints,
    fullPainCandles,
    fullSleepVsMorning,
    fullSleepVsDaytime,
    fullSleepVsNight,
    flareEpisodeViews: episodes,
    weeklyRows,
  } = buildWidgetDataBundle(logs, days, today, flareThreshold);

  return (
    <main className="page" style={{ maxWidth: "64rem" }}>
      <header className="page-header">
        <h1>Insights</h1>
        <p className="subtitle">More detailed visualisations of progress.</p>
      </header>

      <InsightsCharts
        fullStepsPoints={fullStepsPoints}
        fullVolumePoints={fullVolumePoints}
        fullStepsVsPeakPoints={fullStepsVsPeakPoints}
        fullStepsVsAveragePoints={fullStepsVsAveragePoints}
        fullVolumeVsPeakPoints={fullVolumeVsPeakPoints}
        fullVolumeVsAveragePoints={fullVolumeVsAveragePoints}
        fullPainCandles={fullPainCandles}
        fullSleepVsMorning={fullSleepVsMorning}
        fullSleepVsDaytime={fullSleepVsDaytime}
        fullSleepVsNight={fullSleepVsNight}
        today={today}
        autoScaleYAxis={chartAutoScaleYAxis}
      />

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Flare review</h2>
          <InfoTooltip
            text={`Shows every flare day alongside the activity, physio, and notes from the days leading up to it.\n\nUse it to answer: "What happened before my flare-up?"`}
            label="What does this show?"
          >
            <Info size={14} />
          </InfoTooltip>
        </div>
        <FlareReview episodes={episodes} />
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Weekly report card</h2>
          <InfoTooltip
            text={`Shows a weekly summary of your pain, activity, physio load, and flare count.\n\nUse it to answer: "How does each week compare with the last?"`}
            label="What does this show?"
          >
            <Info size={14} />
          </InfoTooltip>
        </div>
        <WeeklyReportTable rows={weeklyRows} flareThreshold={flareThreshold} />
      </section>
    </main>
  );
}
