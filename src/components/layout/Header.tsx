import Link from "next/link";
import { Settings } from "lucide-react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import LogoutButton from "@/components/auth/LogoutButton";
import MobileMenu from "./MobileMenu";
import Navbar from "./Navbar";

export default async function Header() {
  const session = await getServerSession(authOptions);

  return (
    <header className="sticky top-0 z-50 w-full glass border-b border-white/10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-9 h-9 overflow-hidden rounded-xl border border-white/10 shadow-md transition-transform duration-300 group-hover:scale-105">
            <img src="/logo.png" alt="MoneyView Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gradient">
            MoneyView
          </span>
        </Link>

        <Navbar />

        <div className="flex items-center gap-4">
          {session?.user && (
            <div className="hidden md:flex items-center gap-2 mr-2">
              {session.user.image && (
                <img src={session.user.image} alt="Profile" className="w-8 h-8 rounded-full border border-white/10" />
              )}
              <span className="text-sm font-medium text-muted-foreground">{session.user.name}</span>
            </div>
          )}
          
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-white/5 hidden md:block">
            <Settings className="w-5 h-5" />
          </button>
          
          {session && <LogoutButton />}
          
          <MobileMenu session={session} />
        </div>
      </div>
    </header>
  );
}
