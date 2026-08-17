import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PQC Engagement Tracker",
  description: "CRM-style engagement tracker for the PQC Consulting venture",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
