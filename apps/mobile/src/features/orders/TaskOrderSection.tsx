import { Text } from "react-native";
import type { TaskTicketRecord } from "@device-service-hub/contracts";
import ContentCard from "../../shared/components/ContentCard";
import LoadFeedback from "../../shared/components/LoadFeedback";
import ActionButton from "../../shared/components/ActionButton";
import { typography } from "../../shared/styles/typography";
import { useTaskOrder } from "./useTaskOrder";
import OrderSnapshot from "./OrderSnapshot";
import StartOrderAction from "./StartOrderAction";
import SubmitTaskResultAction from "../tasks/SubmitTaskResultAction";

export default function TaskOrderSection({
  task,
  reload: reloadTask,
}: {
  task: TaskTicketRecord;
  reload: () => void;
}) {
  const { data, loading, error, reload } = useTaskOrder(task.id);
  const refresh = (
    <ActionButton
      title="刷新订单"
      secondary
      compact
      disabled={loading}
      onPress={reload}
    />
  );
  return (
    <>
      <LoadFeedback
        loading={loading && !data}
        error={error}
        onRetry={reload}
        retryLabel="刷新订单"
      />
      {data?.order ? (
        <>
          <OrderSnapshot order={data.order}>{refresh}</OrderSnapshot>
          <StartOrderAction task={task} order={data.order} reload={reloadTask} />
          <SubmitTaskResultAction
            task={task}
            order={data.order}
            reload={reloadTask}
          />
        </>
      ) : null}
      {data && !data.order ? (
        <ContentCard title="服务订单">
          <Text style={typography.muted}>报价尚未确认，暂未生成服务订单。</Text>
          {refresh}
        </ContentCard>
      ) : null}
    </>
  );
}
