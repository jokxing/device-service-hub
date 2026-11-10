import PageHeader from "../../../../shared/components/PageHeader";
import { getMyTicket } from "../../../../features/tickets/server/queries";
import TicketDetails from "../../../../features/tickets/components/TicketDetails";
import TicketActions from "../../../../features/tickets/components/TicketActions";
import { getMyQuotes } from "../../../../features/quotes/server/queries";
import QuoteHistory from "../../../../features/quotes/components/QuoteHistory";
import { getMyOrder } from "../../../../features/orders/server/queries";
import QuoteDetails from "../../../../features/quotes/components/QuoteDetails";
import QuoteActions from "../../../../features/quotes/components/QuoteActions";
import OrderSnapshot from "../../../../features/orders/components/OrderSnapshot";

export const metadata = { title: "报修详情" };
export default async function MyTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticket = await getMyTicket(id);
  const [quotes, order] =
    ticket.serviceMode === "quoted"
      ? await Promise.all([getMyQuotes(id), getMyOrder(id)])
      : [[], null];
  const quote = quotes[0];
  return (
    <>
      <PageHeader
        title="报修详情"
        description="查看本次报修内容与最新处理进度。"
        back={{ href: "/tickets", label: "返回我的报修" }}
      />
      <TicketDetails ticket={ticket} />
      {quote && (
        <>
          <QuoteDetails quote={quote} />
          <QuoteActions
            key={`${ticket.id}:${ticket.version}:${quote.id}`}
            ticket={ticket}
            quote={quote}
            hasOrder={!!order}
          />
        </>
      )}
      {order && <OrderSnapshot order={order} />}
      <QuoteHistory quotes={quotes.slice(1)} />
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
