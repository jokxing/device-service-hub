import type { PropsWithChildren, ReactNode } from "react";
import styles from "./ContentCard.module.css";

interface Props extends PropsWithChildren {
  title: string;
  count?: number;
  extra?: ReactNode;
}

export default function ContentCard({ title, count, extra, children }: Props) {
  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h2>
          {title}
          {count !== undefined && <span>{count}</span>}
        </h2>
        {extra}
      </div>
      {children}
    </section>
  );
}
