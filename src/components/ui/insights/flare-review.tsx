// Flare review (client): every detected flare day as an Accordion panel; expanding one shows
// the days before it. Receives display-ready episode data from the server page.
"use client";

import { Accordion } from "@primereact/ui/accordion";
import { ChevronDown } from "@primeicons/react/chevron-down";
import { Sunrise, Sun, Moon, type LucideIcon } from "lucide-react";
import { SERIES } from "@/components/charts/chart-theme";
import type { FlareEpisodeView, FlareReading } from "@/lib/widget-data";
import styles from "./flare-review.module.css";

// Icon + color per reading slot. Colors are the same ones the charts use for
// these series, so a violet 5 reads as "night" here exactly as it does there.
// The row's own red dot carries "this is a flare"; these carry which reading.
const SLOT_STYLES: Record<
  FlareReading["slot"],
  { Icon: LucideIcon; color: string }
> = {
  Morning: { Icon: Sunrise, color: SERIES.morning },
  Daytime: { Icon: Sun, color: SERIES.daytime },
  Night: { Icon: Moon, color: SERIES.night },
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
                  {ep.readings.map((r) => {
                    const { Icon, color } = SLOT_STYLES[r.slot];
                    return (
                      <span
                        key={r.slot}
                        className={styles.reading}
                        // Tinted from the slot's own color so each chip reads
                        // as one unit rather than an icon beside a number.
                        style={{
                          color,
                          background: `color-mix(in srgb, ${color} 16%, transparent)`,
                        }}
                        title={`${r.slot} pain ${r.value}`}
                      >
                        <Icon size={14} aria-hidden />
                        <span className={styles.srOnly}>{r.slot} pain</span>
                        {r.value}
                      </span>
                    );
                  })}
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
