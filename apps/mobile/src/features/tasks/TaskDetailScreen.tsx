import TaskOrderSection from "../orders/TaskOrderSection";
import TaskQuoteSection from "../quotes/TaskQuoteSection";
import { useLayoutEffect } from "react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import Screen from "../../shared/components/Screen";
import HeaderRefreshButton from "../../shared/components/HeaderRefreshButton";
import LoadFeedback from "../../shared/components/LoadFeedback";
import TicketRecordDetails from "../tickets/components/TicketRecordDetails";
import { useTask } from "./useTasks";
import AcceptTaskAction from "./AcceptTaskAction";
import TechnicianAccess from "./TechnicianAccess";
import SubmitTaskResultAction from "./SubmitTaskResultAction";
import PhotoGallery from "../tickets/photos/PhotoGallery";

function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { data: task, error, loading, reload } = useTask(id);
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderRefreshButton
          accessibilityLabel="刷新任务详情"
          disabled={loading}
          onPress={reload}
        />
      ),
    });
  }, [navigation, loading, reload]);
  return (
    <Screen dense>
      <LoadFeedback
        loading={loading && !task}
        error={error}
        loadingLabel="正在读取任务…"
        onRetry={reload}
        retryLabel="刷新任务详情"
      />
      {task ? (
        <>
          <TicketRecordDetails ticket={task} />
          <PhotoGallery ticketId={task.id} />
          {task.serviceMode === "quoted" ? (
            <TaskQuoteSection
              key={`quote:${task.id}:${task.version}`}
              task={task}
              reload={reload}
            />
          ) : null}
          {task.serviceMode === "quoted" ? (
            <TaskOrderSection
              key={`order:${task.id}:${task.version}`}
              task={task}
              reload={reload}
            />
          ) : null}
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
      ) : null}
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
