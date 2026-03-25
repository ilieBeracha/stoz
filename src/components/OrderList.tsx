"use client";

import { useDelivery } from "@/context/DeliveryContext";
import { FOOD_TYPE_LABELS } from "@/constants";

export default function OrderList() {
  const { orders, removeOrder } = useDelivery();

  if (orders.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500 text-sm">
        אין הזמנות עדיין. הוסף הזמנה חדשה.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-800">
          הזמנות ({orders.length})
        </h2>
      </div>
      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {orders.map((order) => (
          <div
            key={order.id}
            className="px-4 py-3.5 flex items-center justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {order.address}
              </p>
              <div className="flex gap-2 text-xs text-gray-500 mt-1.5">
                <span className={`px-2 py-0.5 rounded-full font-medium ${
                  order.foodType === "warm"
                    ? "bg-red-100 text-red-700"
                    : order.foodType === "sushi"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-purple-100 text-purple-700"
                }`}>
                  {FOOD_TYPE_LABELS[order.foodType]}
                </span>
                <span className="flex items-center">⏰ {order.deadline} דק׳</span>
              </div>
            </div>
            <button
              onClick={() => removeOrder(order.id)}
              className="w-10 h-10 flex items-center justify-center rounded-full text-red-400 hover:bg-red-50 active:bg-red-100 text-lg flex-shrink-0 transition-colors"
              title="מחק"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
