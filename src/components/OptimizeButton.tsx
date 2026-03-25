"use client";

import { useDelivery } from "@/context/DeliveryContext";

export default function OptimizeButton() {
  const { orders, optimize, clearAll, routes } = useDelivery();

  return (
    <div className="flex gap-2">
      <button
        onClick={optimize}
        disabled={orders.length === 0}
        className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow"
      >
        {routes.length > 0 ? "חשב מחדש" : "תכנן מסלולים"}
      </button>
      {orders.length > 0 && (
        <button
          onClick={clearAll}
          className="px-4 py-3 rounded-lg bg-red-100 text-red-600 font-medium hover:bg-red-200 transition-colors shadow"
          title="נקה הכל"
        >
          נקה
        </button>
      )}
    </div>
  );
}
