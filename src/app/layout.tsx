import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/toast";
import { StoreProvider } from "@/lib/data/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spice Route · Smart Dining",
  description: "QR ordering, kitchen display, floor map and pay-at-table for restaurants.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ea580c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans antialiased">
        <StoreProvider>
          <ToastProvider>{children}</ToastProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
