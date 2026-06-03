"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button 
      onClick={() => signOut()}
      className="p-2 text-muted-foreground hover:text-red-400 transition-colors rounded-full hover:bg-white/5 hidden md:flex items-center gap-2"
      title="로그아웃"
    >
      <LogOut className="w-5 h-5" />
      <span className="text-sm font-medium">로그아웃</span>
    </button>
  );
}
