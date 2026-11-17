import MyQuoteSection from "../quotes/MyQuoteSection";
import TicketRecordDetails from "./components/TicketRecordDetails";
import { useLayoutEffect } from "react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import Screen from "../../shared/components/Screen";
import HeaderRefreshButton from "../../shared/components/HeaderRefreshButton";
import { useMyTicket } from "./useTickets";
import ReporterAccess from "./components/ReporterAccess";
import LoadFeedback from "../../shared/components/LoadFeedback";
import ConfirmTicketAction from "./components/ConfirmTicketAction";
import PhotoGallery from "./photos/PhotoGallery";

function Details() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { data: ticket, error, loading, reload } = useMyTicket(id);
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderRefreshButton
          accessibilityLabel="刷新报修详情"
          disabled={loading}
          onPress={reload}
        />
      ),
    });
  }, [navigation, loading, reload]);
  return (
    <Screen dense>
      <LoadFeedback
        loading={loading && !ticket}
        error={error}
        loadingLabel="正在读取报修详情…"
        onRetry={reload}
        retryLabel="刷新报修详情"
      />
      {ticket ? (
        <>
          <TicketRecordDetails ticket={ticket} />
          <PhotoGallery
            key={`${ticket.id}:${ticket.status}`}
            ticketId={ticket.id}
            canUpload={ticket.status === "pending"}
          />
          {ticket.serviceMode === "quoted" && (
            <MyQuoteSection
              key={`quote:${ticket.id}:${ticket.version}`}
              ticket={ticket}
              reload={reload}
            />
          )}
          <ConfirmTicketAction
            key={`${ticket.id}:${ticket.version}`}
            ticket={ticket}
            reload={reload}
          />
        </>
      ) : null}
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
