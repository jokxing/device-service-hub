import type { ReactNode } from "react";
import styles from "./DetailField.module.css";
export default function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <small>{label}</small>
      <strong>{children}</strong>
    </div>
  );
}
