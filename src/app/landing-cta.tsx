// The landing page's only client-side piece. It exists so the page itself can stay
// static: reading the session during render would force per-request rendering, so
// instead the static HTML ships the signed-out state and this swaps it after
// hydration, once the browser has asked the auth API about its (httpOnly) cookie.
//
// Colocated with the page rather than living in components/ so the landing page
// stays a self-contained folder, and so nothing imports upward into app/.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/auth/client";
import styles from "./landing.module.css";

// null = not known yet. The first client render must match the static HTML, so
// "unknown" renders exactly what a signed-out visitor sees.
type SessionState = boolean | null;

// The header and the hero both want the same answer; without this they'd each
// fire their own /api/auth/get-session. Module scope is per page load, so there's
// nothing stale to invalidate.
let sessionRequest: Promise<boolean> | null = null;

function requestSessionOnce(): Promise<boolean> {
  sessionRequest ??= auth
    .getSession()
    .then(({ data }) => !!data?.user)
    // A failed check is not an error worth showing: the signed-out state is
    // already on screen and every action on it still works.
    .catch(() => false);
  return sessionRequest;
}

function useIsSignedIn(): SessionState {
  const [isSignedIn, setIsSignedIn] = useState<SessionState>(null);

  useEffect(() => {
    let cancelled = false;
    requestSessionOnce().then((signedIn) => {
      if (!cancelled) setIsSignedIn(signedIn);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return isSignedIn;
}

export function HeaderActions() {
  const isSignedIn = useIsSignedIn();

  return (
    <nav className={styles.headerActions}>
      {isSignedIn ? (
        <Link
          href="/dashboard"
          className={`${styles.btn} ${styles.btnPrimary}`}
        >
          Go to dashboard
        </Link>
      ) : (
        <>
          <Link href="/login" className={`${styles.btn} ${styles.btnQuiet}`}>
            Log in
          </Link>
          <Link href="/sign-up" className={`${styles.btn} ${styles.btnPrimary}`}>
            Get started
          </Link>
        </>
      )}
    </nav>
  );
}

export function HeroActions() {
  const isSignedIn = useIsSignedIn();

  return (
    <>
      <div className={`${styles.heroActions} ${styles.reveal} ${styles.d4}`}>
        {/* Only the primary button changes — keeping the secondary one in both
            states means the row doesn't reflow when the swap lands. */}
        {isSignedIn ? (
          <Link
            href="/dashboard"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLarge}`}
          >
            Open dashboard
          </Link>
        ) : (
          <Link
            href="/sign-up"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLarge}`}
          >
            Start tracking
          </Link>
        )}
        <a
          href="#what-you-get"
          className={`${styles.btn} ${styles.btnGhost} ${styles.btnLarge}`}
        >
          See what it measures
        </a>
      </div>

      <p className={`${styles.heroNote} ${styles.reveal} ${styles.d4}`}>
        {isSignedIn
          ? "Welcome back — your logs are where you left them."
          : "Free, and your logs stay private to your account."}
      </p>
    </>
  );
}
