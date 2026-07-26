// /account — settings home: a simple list of tappable tiles linking to each
// settings area, plus a direct export action. Keeps every setting on its own
// page (PLAN.md-style separation) rather than one long form, and gives
// future settings (password/email change, once email verification exists) a
// natural place to slot in.
import Link from "next/link";
import { UserEdit } from "@primeicons/react/user-edit";
import { SlidersH } from "@primeicons/react/sliders-h";
import { Download } from "@primeicons/react/download";
import { Shield } from "@primeicons/react/shield";
import styles from "./account.module.css";

const TILES = [
  {
    href: "/account/profile",
    title: "Edit profile",
    description: "Change the name shown around the app.",
    icon: <UserEdit />,
  },
  {
    href: "/account/config",
    title: "App config",
    description: "Adjust configurable settings like the flare pain threshold.",
    icon: <SlidersH />,
  },
  {
    href: "/account/privacy",
    title: "Privacy",
    description: "What's stored, and how to request deletion.",
    icon: <Shield />,
  },
];

export default function AccountPage() {
  return (
    <main className="page" style={{ maxWidth: "36rem" }}>
      <header className="page-header">
        <h1>Account</h1>
        <p className="subtitle">Manage your profile and app settings.</p>
      </header>

      <div className={styles.tiles}>
        {TILES.map((t) => (
          <Link key={t.href} href={t.href} className={styles.tile}>
            <span className={styles.tileIcon}>{t.icon}</span>
            <span className={styles.tileBody}>
              <span className={styles.tileTitle}>{t.title}</span>
              <span className={styles.tileDescription}>{t.description}</span>
            </span>
          </Link>
        ))}
        {/* Plain anchor: a download must be a real navigation, not a client route. */}
        <a href="/history/export" download className={styles.tile}>
          <span className={styles.tileIcon}>
            <Download />
          </span>
          <span className={styles.tileBody}>
            <span className={styles.tileTitle}>Export data</span>
            <span className={styles.tileDescription}>
              Download every logged day as a CSV file.
            </span>
          </span>
        </a>
      </div>
    </main>
  );
}
