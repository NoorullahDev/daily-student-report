"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

/** Top navigation shown on every protected admin page. */
export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const link = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={`rounded-md px-3 py-2 text-sm font-medium ${
        pathname === href
          ? "bg-white text-navy"
          : "text-white/80 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/admin" className="text-sm font-bold tracking-wide sm:text-base">
          DAILY STUDENT HABIT &amp; TIME REPORT — ADMIN
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {link("/admin", "Daily report")}
          {link("/admin/weekly", "Weekly summary")}
          {link("/admin/settings", "Settings")}
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50"
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </nav>
      </div>
    </header>
  );
}
