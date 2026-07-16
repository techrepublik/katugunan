import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ 
  subsets: ["latin"], 
  variable: "--font-outfit" 
});

export const metadata: Metadata = {
  title: "Katugunan Client Satisfaction Survey System",
  description: "USM Katugunan monitoring, evaluation, and reporting portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} font-outfit text-slate-800 antialiased`}>
        {children}
      </body>
    </html>
  );
}
