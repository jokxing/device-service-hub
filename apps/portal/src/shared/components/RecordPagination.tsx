import Link from "next/link";
import styles from "./RecordPagination.module.css";

export default function RecordPagination({
  page,
  pages,
  label,
  hrefForPage,
}: {
  page: number;
  pages: number;
  label: string;
  hrefForPage: (page: number) => string;
}) {
  return (
    <nav aria-label={label} className={styles.pager}>
      {page > 1 && (
        <Link href={hrefForPage(page - 1)} prefetch={false}>
          上一页
        </Link>
      )}
      <span>
        第 {page} / {pages} 页
      </span>
      {page < pages && (
        <Link href={hrefForPage(page + 1)} prefetch={false}>
          下一页
        </Link>
      )}
    </nav>
  );
}
