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

interface DeliveryState {
  orders: Order[];
  driverCount: number;
  routes: PlannedRoute[];
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
      setRoutes([]); // Clear routes when orders change
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

  const optimize = useCallback(() => {
    const result = optimizeRoutes(orders, driverCount);
    setRoutes(result);
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
