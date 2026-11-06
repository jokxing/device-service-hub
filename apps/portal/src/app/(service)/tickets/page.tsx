import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyTickets } from "../../../features/tickets/server/queries";
import TicketCard from "../../../features/tickets/components/TicketCard";
import { readPage } from "../../../shared/utils/pagination";
import styles from "../../../shared/components/PortalPage.module.css";
import ticketStyles from "../../../features/tickets/tickets.module.css";

export const metadata = { title: "我的报修" };
export default async function MyTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const query = await searchParams;
  const page = readPage(query.page);
  const data = await getMyTickets(page);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  if (page > pages) redirect(pages > 1 ? `/tickets?page=${pages}` : "/tickets");
  return (
    <>
      <h1 className={styles.heading}>我的报修</h1>
      <p className={styles.description}>
        共 {data.total} 条本人报修，查看处理进度与维修记录。
      </p>
      {data.items.length ? (
        <ul className={styles.grid} aria-label="本人报修列表">
          {data.items.map((ticket) => (
            <li key={ticket.id}>
              <TicketCard ticket={ticket} />
            </li>
          ))}
        </ul>
      ) : (
        <section className={styles.card}>
          暂无报修记录，可前往
          <Link href="/devices" prefetch={false}>
            我的设备
          </Link>
          发起报修。
        </section>
      )}
      <nav aria-label="报修分页" className={ticketStyles.pager}>
        {page > 1 && (
          <Link
            href={page === 2 ? "/tickets" : `/tickets?page=${page - 1}`}
            prefetch={false}
          >
            上一页
          </Link>
        )}
        <span>
          第 {page} / {pages} 页
        </span>
        {page < pages && (
          <Link href={`/tickets?page=${page + 1}`} prefetch={false}>
            下一页
          </Link>
        )}
      </nav>
    </>
  );
}
