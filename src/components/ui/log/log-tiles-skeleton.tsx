// Shimmering placeholder shaped like the overview's 4-tile grid. Reused by
// /log's loading.tsx and by LogDateBar during pending date changes.
import { Skeleton } from "@primereact/ui/skeleton";
import styles from "./log-tiles-skeleton.module.css";

function TileSkeleton() {
  return (
    <div className={styles.tile}>
      <Skeleton height="4px" borderRadius="0" />
      <div className={styles.tileBody}>
        <div className={styles.tileHeader}>
          <Skeleton width="45%" height="1rem" borderRadius="4px" />
          <Skeleton width="2rem" height="2rem" borderRadius="50%" />
        </div>
        <Skeleton width="75%" height="0.85rem" borderRadius="4px" />
      </div>
    </div>
  );
}

export function LogTilesSkeleton() {
  return (
    <div className={styles.tiles}>
      <TileSkeleton />
      <TileSkeleton />
      <TileSkeleton />
      <TileSkeleton />
    </div>
  );
}
