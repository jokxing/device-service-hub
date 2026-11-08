import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { ServiceNavigationRequest } from "@device-service-hub/contracts";
import MicroAppView from "../micro/MicroAppView";
import { DEVICES_APP } from "../micro/apps";
import { serviceNavigationTarget } from "../micro/navigation";

export default function DevicesPage() {
  const navigate = useNavigate();
  const onNavigate = useCallback(
    (message: ServiceNavigationRequest) => {
      const target = serviceNavigationTarget(message);
      if (target) navigate(target);
    },
    [navigate],
  );
  return <MicroAppView definition={DEVICES_APP} onNavigate={onNavigate} />;
}
