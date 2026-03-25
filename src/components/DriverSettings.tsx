"use client";

import { useDelivery } from "@/context/DeliveryContext";
import { MAX_DRIVERS } from "@/constants";

export default function DriverSettings() {
  const { driverCount, setDriverCount } = useDelivery();

  return (
    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-md">
      <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
        נהגים:
      </label>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setDriverCount(Math.max(1, driverCount - 1))}
          className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center font-bold text-gray-700 transition-colors"
        >
          −
        </button>
        <span className="text-xl font-bold text-blue-600 w-7 text-center">
          {driverCount}
        </span>
        <button
          onClick={() => setDriverCount(Math.min(MAX_DRIVERS, driverCount + 1))}
          className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center font-bold text-gray-700 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
