import type { ReactNode } from "react";
import styles from "./CompactRecordCard.module.css";

interface Props {
  title: string;
  eyebrow: string;
  badge: ReactNode;
  fields: { label: string; value: ReactNode }[];
  actions: ReactNode;
}

export default function CompactRecordCard({
  title,
  eyebrow,
  badge,
  fields,
  actions,
}: Props) {
  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        {badge}
      </div>
      <h3>{title}</h3>
      <dl className={styles.fields}>
        {fields.map(({ label, value }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.actions}>{actions}</div>
    </article>
  );
}
