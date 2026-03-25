export type FoodType = "warm" | "sushi" | "both";

export interface Order {
  id: string;
  address: string;
  lat: number;
  lng: number;
  foodType: FoodType;
  deadline: number; // minutes until delivery deadline
  notes?: string;
  createdAt: string;
}

export interface Driver {
  id: number;
  name: string;
  color: string;
}

export interface RouteStop {
  order: Order;
  estimatedArrival: string; // HH:mm
  distanceFromPrev: number; // km
}

export interface PlannedRoute {
  driver: Driver;
  stops: RouteStop[];
  totalDistance: number; // km (haversine estimate)
  totalTime: number; // minutes (haversine estimate)
  routeGeometry?: [number, number][]; // [lat, lng][] real road path from OSRM
  realDistance?: number; // km (real road distance from OSRM)
  realDuration?: number; // minutes (real driving time from OSRM)
}
