import Link from "next/link";
import styles from "./PortalPage.module.css";

interface Props {
  title: string;
  description: string;
  back: { href: string; label: string };
}
export default function PageHeader({ title, description, back }: Props) {
  return (
    <div className={styles.pageHeader}>
      <div>
        <h1 className={styles.heading}>{title}</h1>
        <p className={styles.intro}>{description}</p>
      </div>
      <Link href={back.href} prefetch={false} className={styles.backAction}>
        ← {back.label}
      </Link>
    </div>
  );
}
