import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "סטוז - תכנון משלוחים",
  description: "תכנון מסלולי משלוחים חכם למסעדות",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "סטוז",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="bg-gray-100 min-h-screen">{children}</body>
    </html>
  );
}
