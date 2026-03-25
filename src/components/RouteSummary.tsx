"use client";

import { useDelivery } from "@/context/DeliveryContext";
import { FOOD_TYPE_LABELS } from "@/constants";

export default function RouteSummary() {
  const { routes } = useDelivery();

  if (routes.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-gray-800">מסלולים מתוכננים</h2>
      {routes.map((route) => (
        <div
          key={route.driver.id}
          className="bg-white rounded-lg shadow overflow-hidden"
        >
          <div
            className="px-4 py-2 text-white font-bold flex items-center justify-between"
            style={{ backgroundColor: route.driver.color }}
          >
            <span>{route.driver.name}</span>
            <span className="text-sm font-normal">
              {route.totalDistance} ק״מ · {route.totalTime} דק׳ · {route.stops.length} עצירות
            </span>
          </div>
          {route.stops.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">אין הזמנות</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {route.stops.map((stop, i) => (
                <div key={stop.order.id} className="px-4 py-2 flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-300 w-6 text-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {stop.order.address}
                    </p>
                    <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                      <span>{FOOD_TYPE_LABELS[stop.order.foodType]}</span>
                      <span>·</span>
                      <span>הגעה: {stop.estimatedArrival}</span>
                      <span>·</span>
                      <span>{stop.distanceFromPrev} ק״מ</span>
                      <span>·</span>
                      <span>דדליין: {stop.order.deadline}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
