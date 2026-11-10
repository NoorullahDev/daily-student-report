import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Student Habit & Time Report",
  description:
    "Students submit a daily habit and time report; the teacher reviews a colour-coded daily table.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
