import { ArrowLeftOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import styles from "./ServicePageHeader.module.css";

interface Props {
  title: string;
  description: string;
  back?: { to: string; label: string };
}

export default function ServicePageHeader({ title, description, back }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.heading}>
        <h1>{title}</h1>
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
