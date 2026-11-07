import TicketRecordDetails from "./components/TicketRecordDetails";
import { useLocalSearchParams, useRouter } from "expo-router";
import Screen from "../../shared/components/Screen";
import ActionButton from "../../shared/components/ActionButton";
import { useMyTicket } from "./useTickets";
import ReporterAccess from "./components/ReporterAccess";
import LoadFeedback from "../../shared/components/LoadFeedback";
import ConfirmTicketAction from "./components/ConfirmTicketAction";
import PhotoGallery from "./photos/PhotoGallery";
function Details() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: ticket, error, loading, reload } = useMyTicket(id);
  return (
    <Screen>
      <LoadFeedback loading={loading} error={error} />
      {ticket && (
        <>
          <TicketRecordDetails ticket={ticket} />
          <PhotoGallery
            key={`${ticket.id}:${ticket.status}`}
            ticketId={ticket.id}
            canUpload={ticket.status === "pending"}
          />
          <ConfirmTicketAction
            key={`${ticket.id}:${ticket.version}`}
            ticket={ticket}
            reload={reload}
          />
        </>
      )}
      <ActionButton
        title="刷新报修详情"
        secondary
        disabled={loading}
        onPress={reload}
      />
      <ActionButton
        title="返回我的报修"
        secondary
        onPress={() => router.replace("/tickets")}
      />
    </Screen>
  );
}
export default function TicketDetailScreen() {
  return (
    <ReporterAccess>
      <Details />
    </ReporterAccess>
  );
}
