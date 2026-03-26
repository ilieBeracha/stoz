"use client";

import { useDelivery } from "@/context/DeliveryContext";
import { FOOD_TYPE_LABELS } from "@/constants";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month} ${hours}:${minutes}`;
}

export default function DeliveryHistory() {
  const { history, clearHistory } = useDelivery();

  if (history.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500 text-sm">
        אין היסטוריית משלוחים עדיין.
      </div>
    );
  }

  // Group by date
  const grouped = new Map<string, typeof history>();
  for (const item of history) {
    const date = new Date(item.deliveredAt).toLocaleDateString("he-IL");
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(item);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">
          היסטוריה ({history.length})
        </h2>
        <button
          onClick={clearHistory}
          className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors"
        >
          נקה היסטוריה
        </button>
      </div>

      {Array.from(grouped.entries()).map(([date, items]) => (
        <div key={date} className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-bold text-gray-600">{date}</span>
            <span className="text-xs text-gray-400 mr-2">({items.length} משלוחים)</span>
          </div>
          <div className="divide-y divide-gray-100">
            {items.map((item, i) => (
              <div key={`${item.order.id}-${i}`} className="px-4 py-3 flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.driverColor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {item.order.address}
                  </p>
                  <div className="flex gap-2 text-xs text-gray-500 mt-1">
                    <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                      item.order.foodType === "warm"
                        ? "bg-red-100 text-red-700"
                        : item.order.foodType === "sushi"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {FOOD_TYPE_LABELS[item.order.foodType]}
                    </span>
                    <span>{item.driverName}</span>
                    <span>·</span>
                    <span>נמסר: {formatDate(item.deliveredAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
