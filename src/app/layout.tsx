import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BikeDekho AI Writer",
  description: "AI-powered motorcycle comparison article generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}
