import Link from "next/link";
import styles from "@/app/page.module.css";
import { GarageIcon, HelpIcon, SettingsIcon } from "./icons";

type Props = {
  // Below the garage the garage icon is the way home; on the garage it marks where you are.
  home?: boolean;
  // Opens the "how carvisio works" story.
  onHelp?: () => void;
};

// Desktop: a slim row in the page's top margin, not a separate header.
// Phones keep their own top bar with the page's primary action.
export default function AppBar({ home, onHelp }: Props) {
  return (
    <div className={styles.appBar}>
      <nav className={styles.brand} aria-label="Разделы">
        <span className={styles.brandMark} aria-hidden="true">c</span>
        <span className={styles.brandName}>carvisio</span>
        {/* Next to the brand, where the eye starts: the way back to the garage. */}
        {home ? (
          <Link href="/" className={styles.toolBtn} aria-label="В гараж" title="В гараж">
            <GarageIcon />
          </Link>
        ) : (
          <span className={`${styles.toolBtn} ${styles.toolCurrent}`} aria-current="page" aria-label="Гараж" title="Гараж">
            <GarageIcon />
          </span>
        )}
      </nav>
      <div className={styles.appTools}>
        {onHelp ? (
          <button type="button" className={styles.toolBtn} onClick={onHelp} aria-label="Как это работает" title="Как это работает">
            <HelpIcon />
          </button>
        ) : null}
        <span className={styles.settingsSoon} role="img" aria-label="Настройки — скоро" title="Настройки — в разработке">
          <SettingsIcon />
          <span className={styles.soonBadge} aria-hidden="true">скоро</span>
        </span>
      </div>
    </div>
  );
}

export function VersionTag() {
  return <div className={styles.version}>v0.0.7 beta</div>;
}
