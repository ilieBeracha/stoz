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

  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

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
        setError("לא נמצאה כתובת. בחר מהרשימה או נסה שוב.");
        setLoading(false);
        return;
      }
      lat = geo.lat;
      lng = geo.lng;
    }
    addOrder({ address: address.trim(), lat, lng, foodType, deadline, notes: notes.trim() || undefined });
    setAddress("");
    setSelectedCoords(null);
    setDeadline(45);
    setNotes("");
    setError("");
    setLoading(false);
    onSuccess?.();
  };

  const foodOptions: { value: FoodType; label: string }[] = [
    { value: "warm", label: "חם" },
    { value: "sushi", label: "סושי" },
    { value: "both", label: "משולב" },
  ];

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-[var(--border)] rounded-2xl p-5 space-y-4">
      <h2 className="text-base font-semibold">הזמנה חדשה</h2>

      <div ref={wrapperRef} className="relative">
        <input
          type="text"
          value={address}
          onChange={(e) => handleAddressChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="כתובת למשלוח"
          className="w-full bg-[var(--bg)] border-none rounded-xl px-4 py-3 text-base placeholder:text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--accent)] outline-none"
          required
          autoComplete="off"
        />
        {searchingAddress && (
          <div className="absolute left-4 top-3.5 text-xs text-[var(--text-secondary)]">...</div>
        )}
        {showSuggestions && (
          <ul className="absolute z-50 w-full bg-white border border-[var(--border)] rounded-xl mt-1 max-h-48 overflow-y-auto shadow-lg">
            {suggestions.map((s, i) => (
              <li
                key={i}
                onClick={() => selectSuggestion(s)}
                className="px-4 py-3 text-sm hover:bg-[var(--bg)] active:bg-gray-200 cursor-pointer border-b border-[var(--border)] last:border-0"
              >
                {s.address}
              </li>
            ))}
          </ul>
        )}
        {selectedCoords && (
          <div className="text-xs text-[var(--green)] mt-1.5 font-medium">✓ כתובת אומתה</div>
        )}
      </div>

      {/* Food type - segmented control */}
      <div className="flex bg-[var(--bg)] rounded-xl p-1 gap-1">
        {foodOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFoodType(opt.value)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              foodType === opt.value
                ? "bg-white text-[var(--text)] shadow-sm"
                : "text-[var(--text-secondary)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Deadline presets */}
      <div>
        <div className="flex gap-2 mb-2">
          {[20, 30, 45, 60].map((min) => (
            <button
              key={min}
              type="button"
              onClick={() => setDeadline(min)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                deadline === min
                  ? "bg-[var(--text)] text-white"
                  : "bg-[var(--bg)] text-[var(--text-secondary)]"
              }`}
            >
              {min} דק׳
            </button>
          ))}
        </div>
        <input
          type="number"
          min={0}
          max={75}
          value={deadline}
          onChange={(e) => setDeadline(Math.max(0, Math.min(75, Number(e.target.value))))}
          className="w-full bg-[var(--bg)] border-none rounded-xl px-4 py-3 text-base placeholder:text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--accent)] outline-none"
          required
        />
      </div>

      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="הערות (אופציונלי)"
        className="w-full bg-[var(--bg)] border-none rounded-xl px-4 py-3 text-base placeholder:text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--accent)] outline-none"
      />

      {error && <p className="text-[var(--red)] text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[var(--accent)] text-white py-3.5 rounded-xl font-semibold text-base hover:bg-[var(--accent-hover)] active:opacity-80 disabled:opacity-40 transition-all"
      >
        {loading ? "מחפש..." : "הוסף הזמנה"}
      </button>
    </form>
  );
}
