"use client";

import { useDelivery } from "@/context/DeliveryContext";
import { FOOD_TYPE_LABELS } from "@/constants";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function DeliveryHistory() {
  const { history, clearHistory } = useDelivery();

  if (history.length === 0) {
    return (
      <div className="text-center text-[var(--text-secondary)] text-sm py-8">
        אין היסטוריה
      </div>
    );
  }

  const grouped = new Map<string, typeof history>();
  for (const item of history) {
    const date = new Date(item.deliveredAt).toLocaleDateString("he-IL");
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(item);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{history.length} נמסרו</span>
        <button
          onClick={clearHistory}
          className="text-xs text-[var(--red)] font-medium px-2 py-1 rounded-lg hover:bg-red-50 active:bg-red-100 transition-colors"
        >
          נקה
        </button>
      </div>

      {Array.from(grouped.entries()).map(([date, items]) => (
        <div key={date} className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-4 py-2 border-b border-[var(--border)]">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">{date}</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {items.map((item, i) => (
              <div key={`${item.order.id}-${i}`} className="px-4 py-2.5 flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.driverColor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.order.address}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-secondary)]">
                    <span className={`font-semibold px-1.5 py-0.5 rounded ${
                      item.order.foodType === "warm"
                        ? "bg-red-50 text-red-600"
                        : item.order.foodType === "sushi"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-purple-50 text-purple-600"
                    }`}>
                      {FOOD_TYPE_LABELS[item.order.foodType]}
                    </span>
                    <span>{item.driverName}</span>
                    <span>{formatDate(item.deliveredAt)} {formatTime(item.deliveredAt)}</span>
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
