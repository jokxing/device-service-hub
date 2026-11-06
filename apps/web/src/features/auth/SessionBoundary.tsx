import { Outlet } from "react-router-dom";
import SessionProvider from "./SessionProvider";

export default function SessionBoundary() {
  return (
    <SessionProvider>
      <Outlet />
    </SessionProvider>
  );
}
