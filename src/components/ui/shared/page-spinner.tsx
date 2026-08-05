// Loading indicator for route `loading.tsx` files. Hand-rolled instead of PrimeReact's
// ProgressSpinner since this only needs a plain ring, not its Root/Track/Range machinery.
import styles from "./page-spinner.module.css";

export function PageSpinner() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.spinner} role="status" aria-label="Loading" />
    </div>
  );
}
