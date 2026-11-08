export const TICKETS_APP = {
  label: "工单后台",
  name: "device-service-tickets",
  entry:
    import.meta.env?.MODE === "unified"
      ? "/micro-assets/tickets/"
      : "http://127.0.0.1:5175/",
  basePath: "/tickets",
} as const;

export const DEVICES_APP = {
  label: "设备台账",
  name: "device-service-devices",
  entry:
    import.meta.env?.MODE === "unified"
      ? "/micro-assets/devices/"
      : "http://127.0.0.1:5177/",
  basePath: "/devices",
} as const;
