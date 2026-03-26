import { Order, DeliveredOrder } from "./types";

const ORDERS_KEY = "stoz_orders";
const DRIVERS_KEY = "stoz_drivers";
const HISTORY_KEY = "stoz_history";

export function loadOrders(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOrders(orders: Order[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function loadDriverCount(): number {
  if (typeof window === "undefined") return 2;
  try {
    const raw = localStorage.getItem(DRIVERS_KEY);
    return raw ? parseInt(raw, 10) : 2;
  } catch {
    return 2;
  }
}

export function saveDriverCount(count: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DRIVERS_KEY, String(count));
}

export function loadHistory(): DeliveredOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistory(history: DeliveredOrder[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
