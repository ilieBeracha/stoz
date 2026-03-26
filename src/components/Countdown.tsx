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
      className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
        expired
          ? "bg-gray-100 text-gray-400 line-through"
          : urgent
          ? "bg-red-50 text-[var(--red)] animate-pulse"
          : warning
          ? "bg-orange-50 text-[var(--orange)]"
          : "bg-green-50 text-[var(--green)]"
      }`}
    >
      {expired ? "00:00" : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
    </span>
  );
}

function calcRemaining(createdAt: string, deadlineMinutes: number): number {
  const deadlineTime = new Date(createdAt).getTime() + deadlineMinutes * 60000;
  return Math.floor((deadlineTime - Date.now()) / 1000);
}
