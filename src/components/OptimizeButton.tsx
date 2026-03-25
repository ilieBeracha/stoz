"use client";

import { useDelivery } from "@/context/DeliveryContext";

export default function OptimizeButton() {
  const { orders, optimize, clearAll, routes, optimizing } = useDelivery();

  return (
    <div className="flex gap-2">
      <button
        onClick={optimize}
        disabled={orders.length === 0 || optimizing}
        className="flex-1 bg-green-600 text-white py-3.5 rounded-lg font-bold text-base hover:bg-green-700 active:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-md"
      >
        {optimizing
          ? "מחשב מסלולים..."
          : routes.length > 0
          ? "חשב מחדש"
          : "תכנן מסלולים"}
      </button>
      {orders.length > 0 && (
        <button
          onClick={clearAll}
          className="px-5 py-3.5 rounded-lg bg-red-100 text-red-600 font-bold hover:bg-red-200 active:bg-red-300 transition-colors shadow-md"
          title="נקה הכל"
        >
          נקה
        </button>
      )}
    </div>
  );
}
