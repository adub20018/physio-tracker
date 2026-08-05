// Small inline spinner for showing "working" inside a button mid-action.
// Sized in em and colored via currentColor so it matches the button's severity with no extra logic.
import styles from "./button-spinner.module.css";

export function ButtonSpinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}
