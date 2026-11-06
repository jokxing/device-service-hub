import { useLocalSearchParams, useRouter } from "expo-router";
import Screen from "../../shared/components/Screen";
import ActionButton from "../../shared/components/ActionButton";
import LoadFeedback from "../../shared/components/LoadFeedback";
import TicketRecordDetails from "../tickets/components/TicketRecordDetails";
import { useTask } from "./useTasks";
import AcceptTaskAction from "./AcceptTaskAction";
import TechnicianAccess from "./TechnicianAccess";
import SubmitTaskResultAction from "./SubmitTaskResultAction";
function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: task, error, loading, reload } = useTask(id);
  return (
    <Screen>
      <LoadFeedback loading={loading} error={error} />
      {task && (
        <>
          <TicketRecordDetails ticket={task} />
          <AcceptTaskAction
            key={`${task.id}:${task.version}`}
            task={task}
            reload={reload}
          />
          <SubmitTaskResultAction
            key={`result:${task.id}:${task.version}`}
            task={task}
            reload={reload}
          />
        </>
      )}
      <ActionButton
        title="刷新任务详情"
        secondary
        disabled={loading}
        onPress={reload}
      />
      <ActionButton
        title="返回我的任务"
        secondary
        onPress={() => router.dismissTo("/tasks")}
      />
    </Screen>
  );
}
export default function TaskDetailScreen() {
  return (
    <TechnicianAccess>
      <Detail />
    </TechnicianAccess>
  );
}
