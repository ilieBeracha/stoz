"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { DeliveryProvider, useDelivery } from "@/context/DeliveryContext";
import OrderForm from "@/components/OrderForm";
import OrderList from "@/components/OrderList";
import DriverSettings from "@/components/DriverSettings";
import OptimizeButton from "@/components/OptimizeButton";
import RouteSummary from "@/components/RouteSummary";
import DeliveryHistory from "@/components/DeliveryHistory";

const RouteMap = dynamic(() => import("@/components/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[var(--bg)] flex items-center justify-center text-[var(--text-secondary)] text-sm">
      טוען מפה...
    </div>
  ),
});

type MobileTab = "map" | "add" | "orders" | "history";

function MobileLayout() {
  const [activeTab, setActiveTab] = useState<MobileTab>("map");
  const { orders, routes, history } = useDelivery();

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-[var(--bg)]">
      <div className="flex-1 overflow-hidden relative">
        <div className={`absolute inset-0 ${activeTab === "map" ? "z-10" : "z-0 pointer-events-none"}`}>
          <RouteMap />
          {activeTab === "map" && (
            <>
              <div className="absolute top-3 right-3 z-[1000]">
                <DriverSettings />
              </div>
              <div className="absolute bottom-4 left-3 right-3 z-[1000]">
                <OptimizeButton />
              </div>
            </>
          )}
        </div>

        {activeTab === "add" && (
          <div className="absolute inset-0 z-20 bg-[var(--bg)] overflow-y-auto p-4 pb-24">
            <OrderForm onSuccess={() => setActiveTab("map")} />
          </div>
        )}

        {activeTab === "orders" && (
          <div className="absolute inset-0 z-20 bg-[var(--bg)] overflow-y-auto p-4 pb-24 space-y-3">
            <OrderList />
            <RouteSummary />
          </div>
        )}

        {activeTab === "history" && (
          <div className="absolute inset-0 z-20 bg-[var(--bg)] overflow-y-auto p-4 pb-24">
            <DeliveryHistory />
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="flex-shrink-0 bg-white/80 backdrop-blur-lg border-t border-[var(--border)] flex safe-area-bottom">
        {([
          { id: "map" as const, label: "מפה", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
          { id: "add" as const, label: "הוסף", icon: "M12 4v16m8-8H4" },
          { id: "orders" as const, label: "הזמנות", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", badge: orders.length || undefined },
          { id: "history" as const, label: "היסטוריה", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", badge: history.length || undefined },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors relative ${
              activeTab === tab.id ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === tab.id ? 2.5 : 1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
            </svg>
            <span className="text-[10px] font-medium">{tab.label}</span>
            {tab.badge && tab.badge > 0 && (
              <span className="absolute top-1.5 right-1/2 translate-x-4 bg-[var(--red)] text-white text-[9px] font-bold min-w-[14px] h-[14px] px-1 rounded-full flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

function DesktopLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <header className="bg-white/80 backdrop-blur-lg border-b border-[var(--border)]">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">
            סטוז
            <span className="text-sm font-normal text-[var(--text-secondary)] mr-2">משלוחים</span>
          </h1>
          <DriverSettings />
        </div>
      </header>

      <main className="flex-1 max-w-screen-2xl mx-auto w-full p-4">
        <div className="flex flex-col lg:flex-row gap-4 h-full">
          <div className="lg:w-[380px] flex-shrink-0 space-y-3">
            <OrderForm />
            <OptimizeButton />
            <OrderList />
            <RouteSummary />
            <DeliveryHistory />
          </div>

          <div className="flex-1 min-h-[500px] lg:min-h-0">
            <div className="h-full min-h-[500px] lg:h-[calc(100vh-80px)] sticky top-4 rounded-2xl overflow-hidden border border-[var(--border)]">
              <RouteMap />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <DeliveryProvider>
      <div className="lg:hidden">
        <MobileLayout />
      </div>
      <div className="hidden lg:block">
        <DesktopLayout />
      </div>
    </DeliveryProvider>
  );
}
