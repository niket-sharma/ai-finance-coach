import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Finance Coach",
  description: "Your personal AI-powered financial advisor. Track transactions, get insights, and grow your wealth.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="color-scheme" content="dark" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
