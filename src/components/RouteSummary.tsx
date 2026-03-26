"use client";

import { useState } from "react";
import { useDelivery } from "@/context/DeliveryContext";
import { FOOD_TYPE_LABELS, RESTAURANT_LOCATION, MERGE_DISTANCE_KM } from "@/constants";

function DebugPanel() {
  const { orders, routes, driverCount } = useDelivery();
  const [copied, setCopied] = useState(false);

  const debugData = {
    restaurant: { lat: RESTAURANT_LOCATION.lat, lng: RESTAURANT_LOCATION.lng },
    mergeDistanceKm: MERGE_DISTANCE_KM,
    driverCount,
    orders: orders.map((o) => ({
      id: o.id.slice(0, 8),
      address: o.address,
      lat: o.lat,
      lng: o.lng,
      foodType: o.foodType,
      deadline: o.deadline,
      createdAt: o.createdAt,
    })),
    routes: routes.map((r) => ({
      driver: r.driver.name,
      color: r.driver.color,
      totalDistance: r.realDistance ?? r.totalDistance,
      totalTime: r.realDuration ?? r.totalTime,
      stops: r.stops.map((s) => ({
        address: s.order.address,
        lat: s.order.lat,
        lng: s.order.lng,
        foodType: s.order.foodType,
        distFromPrev: s.distanceFromPrev,
        eta: s.estimatedArrival,
      })),
    })),
  };

  const text = JSON.stringify(debugData, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-gray-900 text-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">Debug Data</span>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 active:bg-blue-800 transition-colors"
        >
          {copied ? "✓ הועתק!" : "העתק"}
        </button>
      </div>
      <pre className="text-xs overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
        {text}
      </pre>
    </div>
  );
}

export default function RouteSummary() {
  const { routes } = useDelivery();
  const [showDebug, setShowDebug] = useState(false);

  if (routes.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">מסלולים מתוכננים</h2>
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 active:bg-gray-400 flex items-center justify-center text-gray-600 text-sm font-bold transition-colors"
          title="Debug info"
        >
          i
        </button>
      </div>

      {showDebug && <DebugPanel />}

      {routes.map((route) => {
        const distance = route.realDistance ?? route.totalDistance;
        const duration = route.realDuration ?? route.totalTime;

        return (
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
                {distance} ק״מ · {duration} דק׳ · {route.stops.length} עצירות
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
                        <span>דדליין: {stop.order.deadline} דק׳</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
