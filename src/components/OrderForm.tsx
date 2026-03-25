"use client";

import { useState } from "react";
import { useDelivery } from "@/context/DeliveryContext";
import { FoodType } from "@/lib/types";
import { geocodeAddress } from "@/lib/geocoding";

export default function OrderForm() {
  const { addOrder } = useDelivery();
  const [address, setAddress] = useState("");
  const [foodType, setFoodType] = useState<FoodType>("warm");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || !deadline) return;

    setLoading(true);
    setError("");

    const geo = await geocodeAddress(address);
    if (!geo) {
      setError("לא נמצאה כתובת. נסה כתובת מדויקת יותר.");
      setLoading(false);
      return;
    }

    addOrder({
      address: address.trim(),
      lat: geo.lat,
      lng: geo.lng,
      foodType,
      deadline,
      notes: notes.trim() || undefined,
    });

    setAddress("");
    setDeadline("");
    setNotes("");
    setError("");
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white p-4 rounded-lg shadow">
      <h2 className="text-lg font-bold text-gray-800">הזמנה חדשה</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">כתובת</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="לדוגמה: רחוב הרצל 5, הרצליה"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">סוג אוכל</label>
          <select
            value={foodType}
            onChange={(e) => setFoodType(e.target.value as FoodType)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="warm">חם</option>
            <option value="sushi">סושי</option>
            <option value="both">חם + סושי</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">דדליין</label>
          <input
            type="time"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">הערות (אופציונלי)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="הערות מיוחדות..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "מחפש כתובת..." : "הוסף הזמנה"}
      </button>
    </form>
  );
}
