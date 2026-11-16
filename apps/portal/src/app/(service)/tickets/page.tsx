import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyTickets } from "../../../features/tickets/server/queries";
import TicketCard from "../../../features/tickets/components/TicketCard";
import { readPage } from "../../../shared/utils/pagination";
import ContentCard from "../../../shared/components/ContentCard";
import PageHeader from "../../../shared/components/PageHeader";
import RefreshButton from "../../../shared/components/RefreshButton";
import RecordPagination from "../../../shared/components/RecordPagination";
import styles from "../../../features/tickets/tickets.module.css";

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
      <PageHeader
        title="我的报修"
        description={`共 ${data.total} 条本人报修，查看处理进度与维修记录。`}
      />
      <ContentCard
        title="报修记录"
        count={data.total}
        extra={<RefreshButton />}
      >
        {data.items.length ? (
          <ul className={styles.list} aria-label="本人报修列表">
            {data.items.map((ticket) => (
              <li key={ticket.id}>
                <TicketCard ticket={ticket} />
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.empty}>
            暂无报修记录，可前往
            <Link href="/devices" prefetch={false}>
              我的设备
            </Link>
            发起报修。
          </div>
        )}
        <RecordPagination
          page={page}
          pages={pages}
          label="报修分页"
          hrefForPage={(next) =>
            next > 1 ? `/tickets?page=${next}` : "/tickets"
          }
        />
      </ContentCard>
    </>
  );
}
