import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "sonner";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Daowa POS",
  description: "Offline-capable Point of Sale system for retail and pharmacies with multi-payment methods, inventory, customer loyalty, and accounting.",
  keywords: ["POS", "Bangladesh", "bKash", "Nagad", "offline POS"],
  openGraph: {
    title: "Daowa POS",
    description: "Offline-capable Point of Sale system for retail and pharmacies with multi-payment methods, inventory, customer loyalty, and accounting.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable}`}>
      <body
        className={`antialiased bg-background text-foreground`}
      >
        {children}
        <SonnerToaster position="top-right" richColors closeButton duration={3500} />
      </body>
    </html>
  );
}
