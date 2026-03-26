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
    <div className="w-full h-full min-h-[400px] bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
      טוען מפה...
    </div>
  ),
});

type MobileTab = "map" | "add" | "orders" | "history";

function MobileLayout() {
  const [activeTab, setActiveTab] = useState<MobileTab>("map");
  const { orders, routes, history } = useDelivery();

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      {/* Content area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Map tab — always rendered, hidden when not active */}
        <div className={`absolute inset-0 ${activeTab === "map" ? "z-10" : "z-0 pointer-events-none"}`}>
          <RouteMap />
          {activeTab === "map" && (
            <>
              <div className="absolute top-3 right-3 z-[1000]">
                <DriverSettings />
              </div>
              <div className="absolute bottom-20 left-3 right-3 z-[1000]">
                <OptimizeButton />
              </div>
            </>
          )}
        </div>

        {/* Add order tab */}
        {activeTab === "add" && (
          <div className="absolute inset-0 z-20 bg-gray-100 overflow-y-auto p-4 pb-24">
            <OrderForm onSuccess={() => setActiveTab("map")} />
          </div>
        )}

        {/* Orders/routes tab */}
        {activeTab === "orders" && (
          <div className="absolute inset-0 z-20 bg-gray-100 overflow-y-auto p-4 pb-24 space-y-4">
            <OrderList />
            <RouteSummary />
          </div>
        )}

        {/* History tab */}
        {activeTab === "history" && (
          <div className="absolute inset-0 z-20 bg-gray-100 overflow-y-auto p-4 pb-24">
            <DeliveryHistory />
          </div>
        )}
      </div>

      {/* Bottom tab bar */}
      <nav className="flex-shrink-0 bg-white border-t border-gray-200 flex safe-area-bottom">
        <button
          onClick={() => setActiveTab("map")}
          className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
            activeTab === "map" ? "text-blue-600" : "text-gray-500"
          }`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="text-xs font-medium">מפה</span>
        </button>
        <button
          onClick={() => setActiveTab("add")}
          className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
            activeTab === "add" ? "text-blue-600" : "text-gray-500"
          }`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-xs font-medium">הוסף</span>
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors relative ${
            activeTab === "orders" ? "text-blue-600" : "text-gray-500"
          }`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-xs font-medium">הזמנות</span>
          {orders.length > 0 && (
            <span className="absolute top-2 right-1/2 translate-x-5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {orders.length}
            </span>
          )}
          {routes.length > 0 && !orders.length && (
            <span className="absolute top-2 right-1/2 translate-x-5 bg-green-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {routes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors relative ${
            activeTab === "history" ? "text-blue-600" : "text-gray-500"
          }`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-medium">היסטוריה</span>
          {history.length > 0 && (
            <span className="absolute top-2 right-1/2 translate-x-5 bg-gray-500 text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
              {history.length}
            </span>
          )}
        </button>
      </nav>
    </div>
  );
}

function DesktopLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">
            סטוז
            <span className="text-sm font-normal text-gray-500 mr-2">
              תכנון משלוחים
            </span>
          </h1>
          <DriverSettings />
        </div>
      </header>

      <main className="flex-1 max-w-screen-2xl mx-auto w-full p-4">
        <div className="flex flex-col lg:flex-row gap-4 h-full">
          <div className="lg:w-96 flex-shrink-0 space-y-4">
            <OrderForm />
            <OptimizeButton />
            <OrderList />
            <RouteSummary />
            <DeliveryHistory />
          </div>

          <div className="flex-1 min-h-[500px] lg:min-h-0">
            <div className="h-full min-h-[500px] lg:h-[calc(100vh-100px)] sticky top-4">
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
