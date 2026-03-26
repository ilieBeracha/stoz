"use client";

import { useState, useEffect } from "react";

interface CountdownProps {
  createdAt: string;
  deadlineMinutes: number;
}

export default function Countdown({ createdAt, deadlineMinutes }: CountdownProps) {
  const [remaining, setRemaining] = useState(() => calcRemaining(createdAt, deadlineMinutes));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(calcRemaining(createdAt, deadlineMinutes));
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt, deadlineMinutes]);

  const totalSeconds = Math.max(0, remaining);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const expired = remaining <= 0;
  const urgent = !expired && mins < 10;
  const warning = !expired && !urgent && mins < 20;

  return (
    <span
      className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
        expired
          ? "bg-gray-200 text-gray-500 line-through"
          : urgent
          ? "bg-red-100 text-red-700 animate-pulse"
          : warning
          ? "bg-orange-100 text-orange-700"
          : "bg-green-100 text-green-700"
      }`}
    >
      {expired ? "עבר" : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
    </span>
  );
}

function calcRemaining(createdAt: string, deadlineMinutes: number): number {
  const deadlineTime = new Date(createdAt).getTime() + deadlineMinutes * 60000;
  return Math.floor((deadlineTime - Date.now()) / 1000);
}
