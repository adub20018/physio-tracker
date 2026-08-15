// Public landing page at /. The only route outside the auth gate besides /login
// and /sign-up (see the matcher in src/proxy.ts). Deliberately reads no session:
// that keeps it statically rendered and CDN-cacheable, and the signed-in/out
// buttons are swapped client-side instead — see landing-cta.tsx.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Activity, CalendarCheck, LineChart, Gauge } from "lucide-react";
import { Wordmark } from "@/components/ui/nav/wordmark";
import { HeaderActions, HeroActions } from "./landing-cta";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "PhysiMate — Track your physio rehab",
  description:
    "Log pain, activity and prescribed exercises in seconds. PhysiMate turns them into trends, flare context and workload limits built from your own history.",
};

const FEATURES = [
  {
    icon: <CalendarCheck size={18} />,
    title: "Logging that fits a phone",
    body: "Pain, activity, physio and notes are four short steps, not one long form. Skip anything you didn't track — a day with only a step count still counts.",
  },
  {
    icon: <LineChart size={18} />,
    title: "Trends, not daily noise",
    body: "Pain bounces enough that two consecutive days tell you nothing. Rolling averages and weekly summaries answer whether you're actually getting better.",
  },
  {
    icon: <Activity size={18} />,
    title: "Flares in context",
    body: "Every flare day is shown beside the activity, physio and notes from the days before it — so the question stops being guesswork.",
  },
  {
    icon: <Gauge size={18} />,
    title: "Load limits from your history",
    body: "Workload ratios compare this week against the baseline you've built up to, and translate it back into a sensible daily step or physio target.",
  },
];

const STEPS = [
  {
    title: "Log the day",
    body: "Three pain readings, steps, sleep, and whatever exercises your physio prescribed. Under a minute, from your phone.",
  },
  {
    title: "Build your dashboard",
    body: "Pick from 27 widgets and arrange them how you think. Keep several dashboards — one for daily checks, one for the appointment.",
  },
  {
    title: "Bring it to your physio",
    body: "Export any date range as CSV, or pull up the weekly report card and show them the months rather than describing them.",
  },
];

export default function LandingPage() {
  return (
    <div className={styles.landing}>
      <header className={styles.header}>
        <div className={`${styles.inner} ${styles.headerRow}`}>
          <Wordmark />
          <HeaderActions />
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroBackdrop} aria-hidden />
          <div className={styles.heroGlow} aria-hidden />

          <div className={styles.inner}>
            <div className={styles.heroCopy}>
              <span
                className={`${styles.eyebrow} ${styles.reveal} ${styles.d1}`}
              >
                <span className={styles.eyebrowDot} aria-hidden />
                Built for rehab, not for the gym
              </span>

              <h1 className={`${styles.title} ${styles.reveal} ${styles.d2}`}>
                Your recovery,{" "}
                <span className={styles.titleAccent}>measured properly</span>
              </h1>

              <p className={`${styles.subtitle} ${styles.reveal} ${styles.d3}`}>
                Log pain, activity and prescribed exercises in seconds.
                PhysiMate turns them into the trends, flare context and workload
                limits a spreadsheet can&rsquo;t.
              </p>

              <HeroActions />
            </div>
          </div>

          {/* One label for the pair: two images each with their own alt would
              have a screen reader announce the same dashboard twice. */}
          <div
            className={`${styles.showcase} ${styles.reveal} ${styles.d5}`}
            role="img"
            aria-label="The PhysiMate dashboard on a laptop, with the phone layout of the same app beside it"
          >
            <div className={styles.laptop}>
              <div className={styles.laptopScreen}>
                <Image
                  src="/dashboard-desktop.png"
                  alt=""
                  width={2720}
                  height={1700}
                  className={styles.deviceImage}
                  sizes="(max-width: 48rem) 100vw, 920px"
                  priority
                />
              </div>
            </div>

            <div className={styles.phone}>
              <div className={styles.phoneScreen}>
                <Image
                  src="/dashboard-mobile.png"
                  alt=""
                  width={1170}
                  height={2532}
                  className={styles.deviceImage}
                  sizes="(max-width: 48rem) 240px, 190px"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section} id="what-you-get">
          <div className={styles.inner}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionLabel}>What you get</span>
              <h2 className={styles.sectionTitle}>
                The questions a spreadsheet leaves you guessing at
              </h2>
              <p className={styles.sectionBody}>
                Recording the numbers is the easy half. PhysiMate does the other
                half — the rolling averages, the next-day comparisons and the
                load maths that turn a column of readings into something you can
                act on.
              </p>
            </div>

            <div className={styles.cards}>
              {FEATURES.map((feature) => (
                <article key={feature.title} className={styles.card}>
                  <span className={styles.cardIcon} aria-hidden>
                    {feature.icon}
                  </span>
                  <h3 className={styles.cardTitle}>{feature.title}</h3>
                  <p className={styles.cardBody}>{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.inner}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionLabel}>How it works</span>
              <h2 className={styles.sectionTitle}>Three habits, that&rsquo;s it</h2>
            </div>

            <div className={styles.steps}>
              {STEPS.map((step, i) => (
                <div key={step.title} className={styles.step}>
                  <span className={styles.stepNumber}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepBody}>{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.inner}>
            <div className={styles.cta}>
              <h2 className={styles.ctaTitle}>Start with today&rsquo;s log</h2>
              <p className={styles.ctaBody}>
                A fortnight of entries is enough for the trends to mean
                something. Already have a spreadsheet? Import it and start with
                your history intact.
              </p>
              <div className={styles.ctaActions}>
                <Link
                  href="/sign-up"
                  className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLarge}`}
                >
                  Create an account
                </Link>
                <Link
                  href="/login"
                  className={`${styles.btn} ${styles.btnGhost} ${styles.btnLarge}`}
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.inner}>
          <div className={styles.footerRow}>
            <Wordmark />
            <div className={styles.footerLinks}>
              <Link href="/login">Log in</Link>
              <Link href="/sign-up">Sign up</Link>
            </div>
          </div>
          <p className={styles.disclaimer}>
            PhysiMate is a personal tracking tool, not a medical device. The
            workload thresholds it draws come from team-sport research and have
            never been validated for an individual&rsquo;s rehab — treat
            anything it flags as a prompt to look more closely, and talk to your
            physio before letting it steer decisions.
          </p>
        </div>
      </footer>
    </div>
  );
}
