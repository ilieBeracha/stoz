"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useDelivery } from "@/context/DeliveryContext";
import { FoodType } from "@/lib/types";
import { geocodeAddress, searchAddresses, AddressSuggestion } from "@/lib/geocoding";

interface OrderFormProps {
  onSuccess?: () => void;
}

export default function OrderForm({ onSuccess }: OrderFormProps) {
  const { addOrder } = useDelivery();
  const [address, setAddress] = useState("");
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [foodType, setFoodType] = useState<FoodType>("warm");
  const [deadline, setDeadline] = useState(45);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleAddressChange = useCallback((value: string) => {
    setAddress(value);
    setSelectedCoords(null);
    setError("");

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearchingAddress(true);
      const results = await searchAddresses(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSearchingAddress(false);
    }, 300);
  }, []);

  const selectSuggestion = (suggestion: AddressSuggestion) => {
    setAddress(suggestion.address);
    setSelectedCoords({ lat: suggestion.lat, lng: suggestion.lng });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    setLoading(true);
    setError("");

    let lat: number;
    let lng: number;

    if (selectedCoords) {
      lat = selectedCoords.lat;
      lng = selectedCoords.lng;
    } else {
      const geo = await geocodeAddress(address);
      if (!geo) {
        setError("לא נמצאה כתובת. בחר מהרשימה או נסה כתובת מדויקת יותר.");
        setLoading(false);
        return;
      }
      lat = geo.lat;
      lng = geo.lng;
    }

    addOrder({
      address: address.trim(),
      lat,
      lng,
      foodType,
      deadline,
      notes: notes.trim() || undefined,
    });

    setAddress("");
    setSelectedCoords(null);
    setDeadline(45);
    setNotes("");
    setError("");
    setLoading(false);
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-lg shadow">
      <h2 className="text-lg font-bold text-gray-800">הזמנה חדשה</h2>

      {/* Address with autocomplete */}
      <div ref={wrapperRef} className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">כתובת</label>
        <input
          type="text"
          value={address}
          onChange={(e) => handleAddressChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="התחל להקליד כתובת..."
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
          autoComplete="off"
        />
        {searchingAddress && (
          <div className="absolute left-4 top-10 text-xs text-gray-400">מחפש...</div>
        )}
        {showSuggestions && (
          <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
            {suggestions.map((s, i) => (
              <li
                key={i}
                onClick={() => selectSuggestion(s)}
                className="px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 active:bg-blue-100 cursor-pointer border-b border-gray-100 last:border-0"
              >
                {s.address}
              </li>
            ))}
          </ul>
        )}
        {selectedCoords && (
          <div className="text-xs text-green-600 mt-1">✓ כתובת נבחרה</div>
        )}
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">סוג אוכל</label>
          <select
            value={foodType}
            onChange={(e) => setFoodType(e.target.value as FoodType)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-blue-500"
          >
            <option value="warm">חם</option>
            <option value="sushi">סושי</option>
            <option value="both">חם + סושי</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">זמן למשלוח (דקות)</label>
          <div className="flex gap-1.5 mb-2">
            {[20, 30, 45, 60].map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => setDeadline(min)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                  deadline === min
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                }`}
              >
                {min}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={0}
            max={75}
            value={deadline}
            onChange={(e) => setDeadline(Math.max(0, Math.min(75, Number(e.target.value))))}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-blue-500"
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
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-bold text-base hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "מוסיף הזמנה..." : "הוסף הזמנה"}
      </button>
    </form>
  );
}
