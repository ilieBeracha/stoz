import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "סטוז - תכנון משלוחים",
  description: "תכנון מסלולי משלוחים חכם למסעדות",
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
