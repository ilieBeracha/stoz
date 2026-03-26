"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Order, PlannedRoute, DeliveredOrder } from "@/lib/types";
import {
  loadOrders, saveOrders,
  loadDriverCount, saveDriverCount,
  loadHistory, saveHistory,
} from "@/lib/storage";
import { optimizeRoutes } from "@/lib/optimizer";
import { fetchRouteGeometry } from "@/lib/routing";
import { RESTAURANT_LOCATION } from "@/constants";

interface DeliveryState {
  orders: Order[];
  driverCount: number;
  routes: PlannedRoute[];
  optimizing: boolean;
  history: DeliveredOrder[];
  addOrder: (order: Omit<Order, "id" | "createdAt">) => void;
  removeOrder: (id: string) => void;
  setDriverCount: (count: number) => void;
  optimize: () => void;
  clearAll: () => void;
  markDelivered: (orderId: string) => void;
  clearHistory: () => void;
}

const DeliveryContext = createContext<DeliveryState | null>(null);

export function DeliveryProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [driverCount, setDriverCountState] = useState(2);
  const [routes, setRoutes] = useState<PlannedRoute[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [history, setHistory] = useState<DeliveredOrder[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setOrders(loadOrders());
    setDriverCountState(loadDriverCount());
    setHistory(loadHistory());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveOrders(orders);
  }, [orders, loaded]);

  useEffect(() => {
    if (loaded) saveDriverCount(driverCount);
  }, [driverCount, loaded]);

  useEffect(() => {
    if (loaded) saveHistory(history);
  }, [history, loaded]);

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
    const result = optimizeRoutes(orders, driverCount);

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
      setRoutes(result);
    }

    setOptimizing(false);
  }, [orders, driverCount]);

  const clearAll = useCallback(() => {
    setOrders([]);
    setRoutes([]);
  }, []);

  const markDelivered = useCallback((orderId: string) => {
    // Find which route/driver this order belongs to
    let driverName = "";
    let driverColor = "";
    for (const route of routes) {
      const found = route.stops.find((s) => s.order.id === orderId);
      if (found) {
        driverName = route.driver.name;
        driverColor = route.driver.color;
        break;
      }
    }

    // Find the order
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    // Add to history
    const delivered: DeliveredOrder = {
      order,
      driverName,
      driverColor,
      deliveredAt: new Date().toISOString(),
    };
    setHistory((prev) => [delivered, ...prev]);

    // Remove from active orders
    setOrders((prev) => prev.filter((o) => o.id !== orderId));

    // Remove from routes
    setRoutes((prev) =>
      prev
        .map((route) => ({
          ...route,
          stops: route.stops.filter((s) => s.order.id !== orderId),
        }))
        .filter((route) => route.stops.length > 0)
    );
  }, [orders, routes]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return (
    <DeliveryContext.Provider
      value={{
        orders,
        driverCount,
        routes,
        optimizing,
        history,
        addOrder,
        removeOrder,
        setDriverCount,
        optimize,
        clearAll,
        markDelivered,
        clearHistory,
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
