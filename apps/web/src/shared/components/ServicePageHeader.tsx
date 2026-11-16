import { ArrowLeftOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import styles from "./ServicePageHeader.module.css";

interface Props {
  title: string;
  description: string;
  eyebrow?: string;
  back?: { to: string; label: string };
}

export default function ServicePageHeader({
  title,
  description,
  eyebrow = "SERVICE OPERATIONS",
  back,
}: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.heading}>
        <div className={styles.eyebrow}>{eyebrow}</div>
        <h1>
          {title}
          <span className={styles.dot} aria-hidden="true">
            .
          </span>
        </h1>
        <p>{description}</p>
      </div>
      {back && (
        <Link className={styles.back} to={back.to}>
          <ArrowLeftOutlined aria-hidden />
          {back.label}
        </Link>
      )}
    </header>
  );
}
