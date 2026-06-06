import { Metadata } from 'next';
import { Receipt, Upload, PieChart, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '가계부 - MoneyView',
};

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  // Simple sidebar for Accounting section
  return (
    <div className="flex flex-col md:flex-row w-full -mx-4 -my-8 h-full min-h-[calc(100vh-4rem)]">
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-black/20 flex flex-col shrink-0">
        <div className="p-4 md:p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 hidden md:block">메뉴</h2>
          <nav className="flex md:flex-col gap-2 md:gap-0 md:space-y-2 overflow-x-auto scrollbar-none">
            <Link href="/accounting" className="flex items-center gap-3 px-3 py-2 text-foreground rounded-md hover:bg-white/5 transition-colors whitespace-nowrap">
              <PieChart className="w-5 h-5 shrink-0" />
              <span className="font-medium">월별가계부</span>
            </Link>
            <Link href="/accounting/import" className="flex items-center gap-3 px-3 py-2 text-foreground rounded-md hover:bg-white/5 transition-colors whitespace-nowrap">
              <Upload className="w-5 h-5 shrink-0" />
              <span className="font-medium">데이터 업로드</span>
            </Link>
            <Link href="/accounting/ledger" className="flex items-center gap-3 px-3 py-2 text-foreground rounded-md hover:bg-white/5 transition-colors whitespace-nowrap">
              <FileSpreadsheet className="w-5 h-5 shrink-0" />
              <span className="font-medium">연도별 결산</span>
            </Link>
            <Link href="/accounting/categories" className="flex items-center gap-3 px-3 py-2 text-foreground rounded-md hover:bg-white/5 transition-colors whitespace-nowrap">
              <Receipt className="w-5 h-5 shrink-0" />
              <span className="font-medium">지출 분류 관리</span>
            </Link>
          </nav>
        </div>
      </aside>
      
      <main className="flex-1 bg-transparent relative overflow-x-hidden px-1 sm:px-4 py-4 md:py-8">
        {children}
      </main>
    </div>
  );
}
