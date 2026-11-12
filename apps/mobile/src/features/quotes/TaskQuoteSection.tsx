import QuoteSummary from "./QuoteSummary";
import { Text } from "react-native";
import type { TaskTicketRecord } from "@device-service-hub/contracts";
import ContentCard from "../../shared/components/ContentCard";
import LoadFeedback from "../../shared/components/LoadFeedback";
import ActionButton from "../../shared/components/ActionButton";
import { typography } from "../../shared/styles/typography";
import { useTaskQuote } from "./useTaskQuote";
import SubmitQuoteAction from "./SubmitQuoteAction";
export default function TaskQuoteSection({
  task,
  reload,
}: {
  task: TaskTicketRecord;
  reload: () => void;
}) {
  const { data, loading, error } = useTaskQuote(task.id);
  const quote = data?.quote;
  return (
    <ContentCard title="维修报价">
      <LoadFeedback loading={loading} error={error} />
      {data &&
        (quote ? (
          <>
            <QuoteSummary quote={quote} />
            {quote.status === "rejected" &&
              quote.rejection &&
              task.status === "processing" &&
              !task.result && (
                <SubmitQuoteAction
                  task={task}
                  baseQuote={quote}
                  reload={reload}
                />
              )}
            {quote.status === "rejected" && (
              <Text style={typography.muted}>
                当前版本已拒绝，可根据原因修订并生成新版。
              </Text>
            )}
          </>
        ) : (
          <>
            <Text style={typography.muted}>尚未提交报价</Text>
            {task.status === "processing" && !task.result && (
              <SubmitQuoteAction task={task} reload={reload} />
            )}
          </>
        ))}
      <Text style={typography.muted}>
        报价须经用户确认；生成服务订单后，在本任务开工并提交处理结果。
      </Text>
      <ActionButton
        title="刷新报价与任务"
        secondary
        disabled={loading}
        onPress={reload}
      />
    </ContentCard>
  );
}
