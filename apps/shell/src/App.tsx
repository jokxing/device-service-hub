import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ShellLayout from "./layouts/ShellLayout";
import OverviewPage from "./pages/OverviewPage";
import TicketsPage from "./pages/TicketsPage";
import DevicesPage from "./pages/DevicesPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ShellLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="tickets/*" element={<TicketsPage />} />
          <Route path="devices/*" element={<DevicesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
