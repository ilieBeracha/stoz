"use client";

import dynamic from "next/dynamic";
import { DeliveryProvider } from "@/context/DeliveryContext";
import OrderForm from "@/components/OrderForm";
import OrderList from "@/components/OrderList";
import DriverSettings from "@/components/DriverSettings";
import OptimizeButton from "@/components/OptimizeButton";
import RouteSummary from "@/components/RouteSummary";

const RouteMap = dynamic(() => import("@/components/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
      טוען מפה...
    </div>
  ),
});

export default function Home() {
  return (
    <DeliveryProvider>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
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

        {/* Main content */}
        <main className="flex-1 max-w-screen-2xl mx-auto w-full p-4">
          <div className="flex flex-col lg:flex-row gap-4 h-full">
            {/* Controls panel */}
            <div className="lg:w-96 flex-shrink-0 space-y-4">
              <OrderForm />
              <OptimizeButton />
              <OrderList />
              <RouteSummary />
            </div>

            {/* Map panel */}
            <div className="flex-1 min-h-[500px] lg:min-h-0">
              <div className="h-full min-h-[500px] lg:h-[calc(100vh-100px)] sticky top-4">
                <RouteMap />
              </div>
            </div>
          </div>
        </main>
      </div>
    </DeliveryProvider>
  );
}
