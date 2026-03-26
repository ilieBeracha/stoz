"use client";

import { useState } from "react";
import { useDelivery } from "@/context/DeliveryContext";
import { FOOD_TYPE_LABELS, RESTAURANT_LOCATION, MERGE_DISTANCE_KM } from "@/constants";
import Countdown from "@/components/Countdown";

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
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[var(--text)] text-gray-300 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400">DEBUG</span>
        <button
          onClick={handleCopy}
          className="px-3 py-1 bg-white/10 text-white text-xs font-medium rounded-lg hover:bg-white/20 transition-colors"
        >
          {copied ? "✓" : "העתק"}
        </button>
      </div>
      <pre className="text-[10px] overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all font-mono opacity-80">
        {text}
      </pre>
    </div>
  );
}

export default function RouteSummary() {
  const { routes, markDelivered } = useDelivery();
  const [showDebug, setShowDebug] = useState(false);

  if (routes.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">מסלולים</span>
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="w-6 h-6 rounded-full bg-[var(--bg)] flex items-center justify-center text-[var(--text-secondary)] text-[10px] font-bold"
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
            className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden"
          >
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: route.driver.color }}
                />
                <span className="text-sm font-semibold">{route.driver.name}</span>
              </div>
              <span className="text-xs text-[var(--text-secondary)]">
                {distance} ק״מ · {duration} דק׳ · {route.stops.length} עצירות
              </span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {route.stops.map((stop, i) => (
                <div key={stop.order.id} className="px-4 py-2.5 flex items-center gap-3">
                  <span className="text-sm font-bold text-[var(--text-secondary)] w-5 text-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{stop.order.address}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        stop.order.foodType === "warm"
                          ? "bg-red-50 text-red-600"
                          : stop.order.foodType === "sushi"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-purple-50 text-purple-600"
                      }`}>
                        {FOOD_TYPE_LABELS[stop.order.foodType]}
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)]">{stop.estimatedArrival}</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">{stop.distanceFromPrev}km</span>
                      <Countdown createdAt={stop.order.createdAt} deadlineMinutes={stop.order.deadline} />
                    </div>
                  </div>
                  <button
                    onClick={() => markDelivered(stop.order.id)}
                    className="w-9 h-9 rounded-xl bg-green-50 hover:bg-green-100 active:bg-green-200 flex items-center justify-center text-[var(--green)] font-bold text-sm flex-shrink-0 transition-colors"
                  >
                    ✓
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
