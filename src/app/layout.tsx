import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { RoleProvider } from "@/components/role";
import { ToastProvider } from "@/components/toast";
import { StoreProvider } from "@/lib/data/store";
import { currentRole } from "@/lib/session";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: "Spice Route · Smart Dining",
  description: "Order at your table, track your food, call a waiter and pay — Spice Route.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const role = await currentRole();
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <RoleProvider role={role}>
          <StoreProvider>
            <ToastProvider>{children}</ToastProvider>
          </StoreProvider>
        </RoleProvider>
      </body>
    </html>
  );
}
