// Small inline spinner for showing inside a button mid-action (save,
// sign-up, delete confirm, import, …) — an animated indicator reads as
// "working" more clearly than static "Saving…" text alone, since the eye
// catches motion immediately. Sized in em and colored via currentColor so
// it automatically matches whatever text color the button's severity gives
// it, with no per-severity color logic needed here.
import styles from "./button-spinner.module.css";

export function ButtonSpinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}
