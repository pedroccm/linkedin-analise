"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/usage", label: "Apify cost" },
  { href: "/admin/logs", label: "Logs" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {ITEMS.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              "no-underline text-sm px-3 py-1.5 rounded transition-colors " +
              (isActive
                ? "bg-[var(--color-surface)] text-white"
                : "text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-2)]")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
