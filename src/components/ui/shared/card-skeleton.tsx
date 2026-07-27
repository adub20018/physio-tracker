// Shimmering placeholder shaped like one dashboard/insights "card" (title
// bar + subtitle bar + a content block sized to roughly match a chart).
// Composed 1-4 times per loading.tsx on chart-heavy pages so the skeleton
// occupies about the same space the real cards will, minimizing layout
// shift once they stream in.
import { Skeleton } from "@primereact/ui/skeleton";
import styles from "./card-skeleton.module.css";

export function CardSkeleton({ contentHeight = 220 }: { contentHeight?: number }) {
  return (
    <div className={styles.card}>
      <Skeleton width="40%" height="1.1rem" borderRadius="4px" />
      <Skeleton width="70%" height="0.8rem" borderRadius="4px" />
      <Skeleton height={`${contentHeight}px`} borderRadius="8px" />
    </div>
  );
}

// Shaped like one stat tile (label + big number) — the dashboard's row of
// four sits above its chart cards, so it gets its own smaller skeleton.
export function StatTileSkeleton() {
  return (
    <div className={styles.tile}>
      <Skeleton width="60%" height="0.7rem" borderRadius="4px" />
      <Skeleton width="45%" height="1.4rem" borderRadius="4px" />
    </div>
  );
}
