// Generic loading indicator for route `loading.tsx` files on lighter pages
// (single-form pages, the /log section flow) — Next.js swaps this in
// immediately on navigation while the target page's data loads, so a click
// always gets instant visual feedback instead of the old page sitting
// inert. Hand-rolled CSS spinner rather than PrimeReact's ProgressSpinner:
// this only needs to be a plain spinning ring, and that component's
// Root/Track/Range composition is more machinery than a loading placeholder
// warrants.
import styles from "./page-spinner.module.css";

export function PageSpinner() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.spinner} role="status" aria-label="Loading" />
    </div>
  );
}
