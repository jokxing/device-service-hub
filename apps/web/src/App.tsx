import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ROUTES } from "./app/routes";
import DemoProvider from "./demo/DemoProvider";
import AppLayout from "./layouts/AppLayout";
import TicketsPage from "./pages/TicketsPage";
import DevicesPage from "./pages/DevicesPage";
import RepairRecordsPage from "./pages/RepairRecordsPage";
import SessionBoundary from "./features/auth/SessionBoundary";
import LoginPage from "./pages/LoginPage";
import ConnectedDevicesPage from "./pages/ConnectedDevicesPage";
import ServiceLayout from "./layouts/ServiceLayout";
import MyTicketsPage from "./pages/MyTicketsPage";
import MyTicketDetailPage from "./pages/MyTicketDetailPage";
import AdminTicketsPage from "./pages/AdminTicketsPage";
import MyTasksPage from "./pages/MyTasksPage";
import MyTaskDetailPage from "./pages/MyTaskDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <DemoProvider>
        <Routes>
          <Route element={<SessionBoundary />}>
            <Route path={ROUTES.login} element={<LoginPage />} />
            <Route element={<ServiceLayout />}>
              <Route path={ROUTES.serviceTasks} element={<MyTasksPage />} />
              <Route
                path={ROUTES.serviceTasks + "/:id"}
                element={<MyTaskDetailPage />}
              />
              <Route
                path={ROUTES.serviceAdminTickets}
                element={<AdminTicketsPage />}
              />
              <Route
                path={ROUTES.serviceDevices}
                element={<ConnectedDevicesPage />}
              />
              <Route path={ROUTES.serviceTickets} element={<MyTicketsPage />} />
              <Route
                path={ROUTES.serviceTickets + "/:id"}
                element={<MyTicketDetailPage />}
              />
            </Route>
          </Route>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to={ROUTES.tickets} replace />} />
            <Route path={ROUTES.tickets} element={<TicketsPage />} />
            <Route path={ROUTES.devices} element={<DevicesPage />} />
            <Route path={ROUTES.records} element={<RepairRecordsPage />} />
            <Route
              path="*"
              element={<Navigate to={ROUTES.tickets} replace />}
            />
          </Route>
        </Routes>
      </DemoProvider>
    </BrowserRouter>
  );
}
