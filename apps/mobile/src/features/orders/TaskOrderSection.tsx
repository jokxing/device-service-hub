import { Text } from "react-native";
import type { TaskTicketRecord } from "@device-service-hub/contracts";
import LoadFeedback from "../../shared/components/LoadFeedback";
import ActionButton from "../../shared/components/ActionButton";
import { typography } from "../../shared/styles/typography";
import { useTaskOrder } from "./useTaskOrder";
import OrderSnapshot from "./OrderSnapshot";
import StartOrderAction from "./StartOrderAction";
import SubmitTaskResultAction from "../tasks/SubmitTaskResultAction";
export default function TaskOrderSection({
  task,
  reload,
}: {
  task: TaskTicketRecord;
  reload: () => void;
}) {
  const { data, loading, error } = useTaskOrder(task.id);
  return (
    <>
      <LoadFeedback loading={loading} error={error} />
      {data?.order ? (
        <>
          <OrderSnapshot order={data.order} />
          <StartOrderAction task={task} order={data.order} reload={reload} />
          <SubmitTaskResultAction
            task={task}
            order={data.order}
            reload={reload}
          />
        </>
      ) : (
        data && (
          <Text style={typography.muted}>报价尚未确认，暂未生成服务订单。</Text>
        )
      )}
      <ActionButton
        title="刷新订单与任务"
        secondary
        disabled={loading}
        onPress={reload}
      />
    </>
  );
}
