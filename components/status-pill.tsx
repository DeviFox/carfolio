import styles from "./status-pill.module.css";

type Props = {
  label: "ok" | "attention" | "critical" | "unknown";
  text: string;
  size?: "sm" | "md";
};

export default function StatusPill({ label, text, size = "md" }: Props) {
  return (
    <span className={`${styles.pill} ${styles[label]} ${styles[size]}`}>
      <span className={styles.dot} aria-hidden="true" />
      {text}
    </span>
  );
}
