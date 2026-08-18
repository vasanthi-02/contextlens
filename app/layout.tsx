import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ContextLens",
  description: "A minimal context-compressing coding agent, inspired by Superbrain's architecture.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-gray-200 min-h-screen">{children}</body>
    </html>
  );
}
