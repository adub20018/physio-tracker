// Flare review (client): every detected flare day as a PrimeReact Accordion
// panel; expanding one shows what happened in the days before — load,
// physio, activities, and notes. Receives display-ready episode data from
// the server page (no repository or domain imports needed here).
"use client";

import { Accordion } from "@primereact/ui/accordion";
import { ChevronDown } from "@primeicons/react/chevron-down";
import styles from "./flare-review.module.css";

// One preceding day, preformatted for display.
export type FlareContextDay = {
  date: string;
  weekday: string;
  steps: number | null;
  physioSummary: string; // "" when rest day
  activityTags: string[];
  notes: string;
};

export type FlareEpisodeView = {
  date: string;
  weekday: string;
  // The reading(s) that crossed the threshold, preformatted ("M 4 · N 3.5").
  readings: string;
  notes: string;
  precedingDays: FlareContextDay[];
};

export function FlareReview({ episodes }: { episodes: FlareEpisodeView[] }) {
  if (episodes.length === 0) {
    return <p className={styles.empty}>No flare days logged — long may it last.</p>;
  }

  return (
    <Accordion.Root>
      {episodes.map((ep) => (
        <Accordion.Panel key={ep.date} value={ep.date}>
          <Accordion.Header>
            <Accordion.Trigger>
              <span className={styles.flareDate}>
                {ep.date}
                <span className={styles.weekday}>{ep.weekday}</span>
              </span>
              <span className={styles.readings}>{ep.readings}</span>
              <Accordion.Indicator>
                <ChevronDown size={14} />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content>
            <div className={styles.content}>
              {ep.notes && <p className={styles.flareNotes}>{ep.notes}</p>}
              <span className={styles.beforeLabel}>The days before</span>
              {ep.precedingDays.length === 0 ? (
                <p className={styles.empty}>No logged days in the 3 days prior.</p>
              ) : (
                <ul className={styles.beforeList}>
                  {ep.precedingDays.map((d) => (
                    <li key={d.date} className={styles.beforeDay}>
                      <span className={styles.beforeDate}>
                        {d.date}
                        <span className={styles.weekday}>{d.weekday}</span>
                      </span>
                      <span className={styles.beforeFacts}>
                        {d.steps != null && <span>{d.steps.toLocaleString()} steps</span>}
                        {d.physioSummary && <span>{d.physioSummary}</span>}
                        {d.activityTags.length > 0 && <span>{d.activityTags.join(", ")}</span>}
                      </span>
                      {d.notes && <span className={styles.beforeNotes}>{d.notes}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Accordion.Content>
        </Accordion.Panel>
      ))}
    </Accordion.Root>
  );
}
