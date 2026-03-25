export type FoodType = "warm" | "sushi" | "both";

export interface Order {
  id: string;
  address: string;
  lat: number;
  lng: number;
  foodType: FoodType;
  deadline: string; // HH:mm
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
  totalDistance: number; // km
  totalTime: number; // minutes
}
