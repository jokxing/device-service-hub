export interface Device {
  id: string;
  name: string;
  category: string;
  location: string;
  model: string;
  enabled: boolean;
  users: string[];
}

export type DeviceTableRow = Pick<
  Device,
  "id" | "name" | "category" | "location" | "enabled"
> & { code?: string };
export type DeviceDetail = Pick<
  Device,
  "id" | "name" | "model" | "location"
> & { code?: string };
