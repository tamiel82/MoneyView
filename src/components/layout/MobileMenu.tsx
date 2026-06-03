"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, Settings } from "lucide-react";
import { signOut } from "next-auth/react";

interface MobileMenuProps {
  session: any;
}

export default function MobileMenu({ session }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);

  const menuItems = [
    { href: "/", label: "대시보드" },
    { href: "/accounts", label: "계좌현황" },
    { href: "/monthly", label: "월별평가액" },
    { href: "/accounting", label: "가계부" },
    { href: "/history", label: "기록" }
  ];

  return (
    <>
      {/* Burger Button */}
      <button 
        onClick={toggleMenu}
        className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-white/5 md:hidden"
        aria-label="메뉴 열기"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Standalone Backdrop Overlay Layer */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] md:hidden transition-all duration-300 ${
          isOpen ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none"
        }`}
        onClick={toggleMenu}
      />

      {/* Standalone Drawer Panel */}
      <div 
        className={`fixed top-0 right-0 h-[100dvh] w-[280px] bg-background border-l border-white/10 p-6 flex flex-col justify-between shadow-2xl transition-transform duration-300 z-[9999] md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
            <span className="text-lg font-bold text-gradient">MoneyView</span>
            <button 
              onClick={toggleMenu}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-white/5"
              aria-label="메뉴 닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={toggleMenu}
                  className={`text-base font-medium transition-colors py-2.5 px-3 rounded-lg flex items-center ${
                    isActive 
                      ? "text-primary bg-primary/10 font-semibold" 
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer with User Session / Settings */}
        {session && (
          <div className="border-t border-white/10 pt-6 mt-auto flex flex-col gap-4">
            <div className="flex items-center gap-3 px-3">
              {session.user?.image && (
                <img src={session.user.image} alt="Profile" className="w-10 h-10 rounded-full border border-white/10" />
              )}
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">{session.user?.name}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[180px]">{session.user?.email}</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button className="flex-1 py-2 px-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 border border-white/5">
                <Settings className="w-4 h-4" />
                설정
              </button>
              <button 
                onClick={() => {
                  toggleMenu();
                  signOut();
                }}
                className="flex-1 py-2 px-3 text-sm font-medium text-muted-foreground hover:text-red-400 transition-colors rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 border border-white/5"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
