import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Buildanta Material Helper",
  description:
    "Find out what to check before buying any construction material, for first-time homeowners in Kanpur.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
