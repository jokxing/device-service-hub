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

export default function App() {
  return (
    <BrowserRouter>
      <DemoProvider>
        <Routes>
          <Route element={<SessionBoundary />}>
            <Route path={ROUTES.login} element={<LoginPage />} />
            <Route
              path={ROUTES.serviceDevices}
              element={<ConnectedDevicesPage />}
            />
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
