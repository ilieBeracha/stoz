"use client";

import { useDelivery } from "@/context/DeliveryContext";
import { MAX_DRIVERS } from "@/constants";

export default function DriverSettings() {
  const { driverCount, setDriverCount } = useDelivery();

  return (
    <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-[var(--border)] px-2.5 py-1.5 rounded-full">
      <button
        onClick={() => setDriverCount(Math.max(1, driverCount - 1))}
        className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg)] active:bg-gray-200 transition-colors"
      >
        -
      </button>
      <span className="text-base font-bold w-5 text-center">{driverCount}</span>
      <button
        onClick={() => setDriverCount(Math.min(MAX_DRIVERS, driverCount + 1))}
        className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg)] active:bg-gray-200 transition-colors"
      >
        +
      </button>
    </div>
  );
}
