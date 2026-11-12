import CancelOrderAction from "../orders/CancelOrderAction";
import { useRouter } from "expo-router";
import RejectQuoteAction from "./RejectQuoteAction";
import { Text } from "react-native";
import type { ReporterTicketRecord } from "@device-service-hub/contracts";
import { canAcceptQuote } from "@device-service-hub/contracts/quote-rules";
import ContentCard from "../../shared/components/ContentCard";
import LoadFeedback from "../../shared/components/LoadFeedback";
import ActionButton from "../../shared/components/ActionButton";
import { typography } from "../../shared/styles/typography";
import { useMyQuote } from "./useMyQuote";
import QuoteSummary from "./QuoteSummary";
import AcceptQuoteAction from "./AcceptQuoteAction";
import OrderSnapshot from "../orders/OrderSnapshot";
export default function MyQuoteSection({
  ticket,
  reload,
}: {
  ticket: ReporterTicketRecord;
  reload: () => void;
}) {
  const router = useRouter();
  const { data, error, loading } = useMyQuote(ticket.id);
  return (
    <>
      <ContentCard title="维修报价">
        <LoadFeedback loading={loading} error={error} />
        {data &&
          (data.quote ? (
            <>
              <QuoteSummary quote={data.quote} />
              {canAcceptQuote(ticket, data.quote, !!data.order) && (
                <>
                  <AcceptQuoteAction
                    ticket={ticket}
                    quote={data.quote}
                    reload={reload}
                  />
                  <RejectQuoteAction
                    ticket={ticket}
                    quote={data.quote}
                    reload={reload}
                  />
                </>
              )}
            </>
          ) : (
            <Text style={typography.muted}>尚未提交报价</Text>
          ))}
        <ActionButton
          title="刷新报价与报修"
          secondary
          disabled={loading}
          onPress={reload}
        />
      </ContentCard>
      {data?.order && (
        <>
          <OrderSnapshot order={data.order} />
          <CancelOrderAction
            key={`${data.order.id}:${ticket.version}`}
            ticket={ticket}
            payments={data.payments}
            order={data.order}
            reload={reload}
          />
          <ActionButton
            title="查看订单详情"
            secondary
            onPress={() => router.push(`/orders/${data.order!.id}`)}
          />
        </>
      )}
    </>
  );
}
