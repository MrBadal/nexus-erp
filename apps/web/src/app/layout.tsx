import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "NexusERP",
    template: "%s | NexusERP",
  },
  description:
    "NexusERP - Enterprise Resource Planning platform for modern businesses. Manage finance, HR, CRM, and inventory in one unified system.",
  keywords: ["ERP", "enterprise", "finance", "accounting", "HR", "CRM", "inventory"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
