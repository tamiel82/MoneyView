"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "대시보드" },
    { href: "/accounts", label: "계좌현황" },
    { href: "/monthly", label: "월별평가액" },
    { href: "/accounting", label: "가계부" },
    { href: "/history", label: "기록" }
  ];

  return (
    <nav className="hidden md:flex items-center gap-6">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm font-medium transition-colors ${
              isActive 
                ? "text-primary font-semibold" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
