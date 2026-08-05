// Loading skeleton for /log, shaped like the real page (date bar + tile
// grid + footer links). See dashboard's loading.tsx for why this exists.
import { Skeleton } from "@primereact/ui/skeleton";
import { LogTilesSkeleton } from "@/components/ui/log/log-tiles-skeleton";
import sharedStyles from "@/components/ui/log/log-shared.module.css";
import styles from "./log-overview.module.css";

export default function LogOverviewLoading() {
  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <header className="page-header">
        <Skeleton width="9rem" height="1.6rem" borderRadius="4px" />
        <div style={{ marginTop: "0.5rem" }}>
          <Skeleton width="14rem" height="0.9rem" borderRadius="4px" />
        </div>
      </header>

      <div className={sharedStyles.dateBar}>
        <Skeleton width="12rem" height="2.5rem" borderRadius="8px" />
      </div>

      <LogTilesSkeleton />

      <div className={styles.footerLinks}>
        <Skeleton width="8rem" height="0.9rem" borderRadius="4px" />
        <Skeleton width="9rem" height="0.85rem" borderRadius="4px" />
      </div>
    </main>
  );
}
