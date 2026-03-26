"use client";

import { useDelivery } from "@/context/DeliveryContext";

export default function OptimizeButton() {
  const { orders, optimize, clearAll, routes, optimizing } = useDelivery();

  return (
    <div className="flex gap-2">
      <button
        onClick={optimize}
        disabled={orders.length === 0 || optimizing}
        className="flex-1 bg-[var(--text)] text-white py-3.5 rounded-xl font-semibold text-base active:opacity-80 disabled:opacity-30 transition-all"
      >
        {optimizing ? "מחשב..." : routes.length > 0 ? "חשב מחדש" : "תכנן מסלולים"}
      </button>
      {orders.length > 0 && (
        <button
          onClick={clearAll}
          className="px-4 py-3.5 rounded-xl text-[var(--red)] bg-red-50 font-semibold active:bg-red-100 transition-colors"
        >
          נקה
        </button>
      )}
    </div>
  );
}
