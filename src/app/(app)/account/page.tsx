// /account — settings home: tappable tiles linking to each settings area,
// rather than one long form.
import Link from "next/link";
import { UserEdit } from "@primeicons/react/user-edit";
import { SlidersH } from "@primeicons/react/sliders-h";
import { Database } from "@primeicons/react/database";
import { Shield } from "@primeicons/react/shield";
import styles from "./account.module.css";

const TILES = [
  {
    href: "/account/profile",
    title: "Profile",
    description: "Change your name and view your email.",
    icon: <UserEdit />,
  },
  {
    href: "/account/preferences",
    title: "Preferences",
    description: "Adjust configurable settings like the flare pain threshold.",
    icon: <SlidersH />,
  },
  {
    href: "/account/data",
    title: "Data",
    description: "Export your data as CSV, or delete it.",
    icon: <Database />,
  },
  {
    href: "/account/security",
    title: "Account",
    description: "Password and account deletion.",
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
      </div>
    </main>
  );
}
