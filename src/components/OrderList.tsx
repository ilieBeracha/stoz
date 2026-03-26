"use client";

import { useDelivery } from "@/context/DeliveryContext";
import { FOOD_TYPE_LABELS } from "@/constants";
import Countdown from "@/components/Countdown";

export default function OrderList() {
  const { orders, removeOrder } = useDelivery();

  if (orders.length === 0) {
    return (
      <div className="text-center text-[var(--text-secondary)] text-sm py-8">
        אין הזמנות פעילות
      </div>
    );
  }

  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <span className="text-sm font-semibold">{orders.length} הזמנות</span>
      </div>
      <div className="divide-y divide-[var(--border)] max-h-80 overflow-y-auto">
        {orders.map((order) => (
          <div key={order.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{order.address}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  order.foodType === "warm"
                    ? "bg-red-50 text-red-600"
                    : order.foodType === "sushi"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-purple-50 text-purple-600"
                }`}>
                  {FOOD_TYPE_LABELS[order.foodType]}
                </span>
                <Countdown createdAt={order.createdAt} deadlineMinutes={order.deadline} />
              </div>
            </div>
            <button
              onClick={() => removeOrder(order.id)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--red)] hover:bg-red-50 active:bg-red-100 text-sm transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
