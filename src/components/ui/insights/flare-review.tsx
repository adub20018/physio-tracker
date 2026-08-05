// Flare review (client): every detected flare day as an Accordion panel; expanding one shows
// the days before it. Receives display-ready episode data from the server page.
"use client";

import { Accordion } from "@primereact/ui/accordion";
import { Tag } from "@primereact/ui/tag";
import { ChevronDown } from "@primeicons/react/chevron-down";
import styles from "./flare-review.module.css";

// One pain reading that crossed the flare threshold.
export type FlareReading = {
  slot: "Morning" | "Daytime" | "Night";
  value: number;
};

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
  readings: FlareReading[];
  notes: string;
  precedingDays: FlareContextDay[];
};

export function FlareReview({ episodes }: { episodes: FlareEpisodeView[] }) {
  if (episodes.length === 0) {
    return <p className={styles.empty}>No flare days logged — long may it last.</p>;
  }

  return (
    <div className={styles.review}>
      <Accordion.Root>
        {episodes.map((ep) => (
          <Accordion.Panel key={ep.date} value={ep.date}>
            <Accordion.Header>
              <Accordion.Trigger className={styles.trigger}>
                <span className={styles.flareDate}>
                  <span className={styles.flareDot} aria-hidden />
                  {ep.date}
                  <span className={styles.weekday}>{ep.weekday}</span>
                </span>
                <span className={styles.readings}>
                  {ep.readings.map((r) => (
                    <Tag key={r.slot} severity="danger">
                      {r.slot} {r.value}
                    </Tag>
                  ))}
                </span>
                <Accordion.Indicator className={styles.indicator}>
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
    </div>
  );
}
