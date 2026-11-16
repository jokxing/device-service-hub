import type { ReactNode } from "react";
import styles from "./StatusBadge.module.css";
export default function StatusBadge({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return <span className={styles.status + " " + className}>{children}</span>;
}
