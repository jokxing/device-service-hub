import PageHeader from "../../../../shared/components/PageHeader";
import { getMyTicket } from "../../../../features/tickets/server/queries";
import TicketDetails from "../../../../features/tickets/components/TicketDetails";
import TicketActions from "../../../../features/tickets/components/TicketActions";

export const metadata = { title: "报修详情" };
export default async function MyTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticket = await getMyTicket(id);
  return (
    <>
      <PageHeader
        title="报修详情"
        description="查看本次报修内容与最新处理进度。"
        back={{ href: "/tickets", label: "返回我的报修" }}
      />
      <TicketDetails ticket={ticket} />
      <TicketActions
        key={`${ticket.id}:${ticket.version}`}
        ticket={{
          id: ticket.id,
          code: ticket.code,
          title: ticket.title,
          version: ticket.version,
          status: ticket.status,
          result: ticket.result,
          confirmation: ticket.confirmation,
        }}
      />
    </>
  );
}
