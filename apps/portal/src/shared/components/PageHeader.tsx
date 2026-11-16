import Link from "next/link";
import styles from "./PageHeader.module.css";

interface Props {
  title: string;
  description: string;
  eyebrow?: string;
  back?: { href: string; label: string };
}

export default function PageHeader({
  title,
  description,
  eyebrow = "USER PORTAL",
  back,
}: Props) {
  return (
    <div className={styles.header}>
      <div className={styles.heading}>
        <div className={styles.eyebrow}>{eyebrow}</div>
        <h1>
          {title}
          <span className={styles.dot} aria-hidden="true">
            .
          </span>
        </h1>
        <p className={styles.intro}>{description}</p>
      </div>
      {back && (
        <Link href={back.href} prefetch={false} className={styles.backAction}>
          ← {back.label}
        </Link>
      )}
    </div>
  );
}
