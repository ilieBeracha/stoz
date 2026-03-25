"use client";

import { useDelivery } from "@/context/DeliveryContext";
import { MAX_DRIVERS } from "@/constants";

export default function DriverSettings() {
  const { driverCount, setDriverCount } = useDelivery();

  return (
    <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg shadow">
      <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
        מספר נהגים:
      </label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDriverCount(Math.max(1, driverCount - 1))}
          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold text-gray-700 transition-colors"
        >
          −
        </button>
        <span className="text-xl font-bold text-blue-600 w-8 text-center">
          {driverCount}
        </span>
        <button
          onClick={() => setDriverCount(Math.min(MAX_DRIVERS, driverCount + 1))}
          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold text-gray-700 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
