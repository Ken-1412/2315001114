export interface Depot {
  ID: number;
  MechanicHours: number;
}

export interface Vehicle {
  TaskID: string;
  Duration: number;
  Impact: number;
}

export interface DepotListResponse {
  depots: Depot[];
}

export interface VehicleListResponse {
  vehicles: Vehicle[];
}

export interface ScheduleRequest {
  depotId: number;
  budgetHours: number;
}

export interface ScheduleEntry {
  TaskID: string;
  Duration: number;
  Impact: number;
}

export interface ScheduleResponse {
  depotId: number;
  budgetHours: number;
  totalImpact: number;
  totalDuration: number;
  scheduled: ScheduleEntry[];
}
