"use client";

import { useDelivery } from "@/context/DeliveryContext";
import { FOOD_TYPE_LABELS } from "@/constants";

export default function OrderList() {
  const { orders, removeOrder } = useDelivery();

  if (orders.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow text-center text-gray-500 text-sm">
        אין הזמנות עדיין. הוסף הזמנה חדשה למעלה.
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
      <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
        {orders.map((order) => (
          <div
            key={order.id}
            className="px-4 py-3 flex items-center justify-between gap-2 hover:bg-gray-50"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {order.address}
              </p>
              <div className="flex gap-2 text-xs text-gray-500 mt-1">
                <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                  order.foodType === "warm"
                    ? "bg-red-100 text-red-700"
                    : order.foodType === "sushi"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-purple-100 text-purple-700"
                }`}>
                  {FOOD_TYPE_LABELS[order.foodType]}
                </span>
                <span>⏰ {order.deadline}</span>
              </div>
            </div>
            <button
              onClick={() => removeOrder(order.id)}
              className="text-red-400 hover:text-red-600 text-lg flex-shrink-0"
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
