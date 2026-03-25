"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Order, PlannedRoute } from "@/lib/types";
import { loadOrders, saveOrders, loadDriverCount, saveDriverCount } from "@/lib/storage";
import { optimizeRoutes } from "@/lib/optimizer";
import { fetchRouteGeometry } from "@/lib/routing";
import { RESTAURANT_LOCATION } from "@/constants";

interface DeliveryState {
  orders: Order[];
  driverCount: number;
  routes: PlannedRoute[];
  optimizing: boolean;
  addOrder: (order: Omit<Order, "id" | "createdAt">) => void;
  removeOrder: (id: string) => void;
  setDriverCount: (count: number) => void;
  optimize: () => void;
  clearAll: () => void;
}

const DeliveryContext = createContext<DeliveryState | null>(null);

export function DeliveryProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [driverCount, setDriverCountState] = useState(2);
  const [routes, setRoutes] = useState<PlannedRoute[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setOrders(loadOrders());
    setDriverCountState(loadDriverCount());
    setLoaded(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (loaded) saveOrders(orders);
  }, [orders, loaded]);

  useEffect(() => {
    if (loaded) saveDriverCount(driverCount);
  }, [driverCount, loaded]);

  const addOrder = useCallback(
    (data: Omit<Order, "id" | "createdAt">) => {
      const order: Order = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      setOrders((prev) => [...prev, order]);
      setRoutes([]);
    },
    []
  );

  const removeOrder = useCallback((id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    setRoutes([]);
  }, []);

  const setDriverCount = useCallback((count: number) => {
    setDriverCountState(count);
    setRoutes([]);
  }, []);

  const optimize = useCallback(async () => {
    setOptimizing(true);

    // Phase 1: Run sync optimizer (Haversine-based)
    const result = optimizeRoutes(orders, driverCount);
    // Show routes immediately with straight lines
    setRoutes(result);

    // Phase 2: Fetch real road geometries from OSRM in parallel
    try {
      const routesWithGeometry = await Promise.all(
        result.map(async (route) => {
          if (route.stops.length === 0) return route;

          const waypoints = [
            { lat: RESTAURANT_LOCATION.lat, lng: RESTAURANT_LOCATION.lng },
            ...route.stops.map((s) => ({ lat: s.order.lat, lng: s.order.lng })),
          ];

          const osrmResult = await fetchRouteGeometry(waypoints);
          if (!osrmResult) return route;

          return {
            ...route,
            routeGeometry: osrmResult.geometry,
            realDistance: osrmResult.distance,
            realDuration: osrmResult.duration,
          };
        })
      );
      setRoutes(routesWithGeometry);
    } catch {
      // OSRM failed — keep straight-line routes (already set above)
    }

    setOptimizing(false);
  }, [orders, driverCount]);

  const clearAll = useCallback(() => {
    setOrders([]);
    setRoutes([]);
  }, []);

  return (
    <DeliveryContext.Provider
      value={{
        orders,
        driverCount,
        routes,
        optimizing,
        addOrder,
        removeOrder,
        setDriverCount,
        optimize,
        clearAll,
      }}
    >
      {children}
    </DeliveryContext.Provider>
  );
}

export function useDelivery() {
  const ctx = useContext(DeliveryContext);
  if (!ctx) throw new Error("useDelivery must be used inside DeliveryProvider");
  return ctx;
}
