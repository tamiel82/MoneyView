import Link from "next/link";
import { Landmark, ChevronRight } from "lucide-react";
import { Account } from "@/types/portfolio";

const sortOrder = [
  "현주주식",
  "동민주식",
  "현주절세",
  "동민절세",
  "동민코인",
  "동민기타",
  "채원주식",
  "현금"
];

const accountMapping: Record<string, string> = {
  "현주주식": "현주 위탁계좌",
  "동민주식": "동민 위탁계좌",
  "현주절세": "현주 절세계좌",
  "동민절세": "동민 절세계좌",
  "동민코인": "암호화폐"
};

export default function AccountList({ accounts }: { accounts: Account[] }) {
  return (
    <div className="glass-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
          <Landmark className="w-5 h-5 text-primary" />
          계좌별 자산
        </h2>
        <Link 
          href="/accounts" 
          className="px-3 py-1.5 text-xs font-semibold text-primary hover:text-white bg-primary/10 hover:bg-primary/30 border border-primary/20 hover:border-primary/40 rounded-lg transition-all flex items-center gap-1 active:scale-95 whitespace-nowrap"
        >
          상세보기
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2 custom-scrollbar content-start">
        {[...accounts].sort((a, b) => {
          const idxA = sortOrder.indexOf(a.name);
          const idxB = sortOrder.indexOf(b.name);
          
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.name.localeCompare(b.name);
        }).map((account, index) => {
          const isPositive = Boolean(account.profit && !account.profit.includes("-") && account.profit !== "0 ");
          const isNegative = Boolean(account.profit && account.profit.includes("-"));
          const targetFocus = accountMapping[account.name];
          
          const CardContent = (
            <>
              <div className="flex flex-col gap-1">
                <span className="font-semibold">{account.name}</span>
                <span className="text-xs font-medium text-muted-foreground">비중 {account.allocationRatio}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-bold text-gradient">{account.current}</span>
                {account.returnRate !== "0.00%" && account.returnRate !== "0.0%" && account.returnRate !== "" && (
                  <span className={`text-xs font-medium ${isPositive ? "text-red-500" : isNegative ? "text-blue-500" : "text-muted-foreground"}`}>
                    {isPositive ? "+" : ""}{account.returnRate}
                  </span>
                )}
              </div>
            </>
          );

          if (targetFocus) {
            return (
              <Link 
                key={index} 
                href={`/accounts?focus=${encodeURIComponent(targetFocus)}`}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 hover:border-primary/30 transition-all border border-white/5 cursor-pointer active:scale-[0.98]"
              >
                {CardContent}
              </Link>
            );
          }

          return (
            <div 
              key={index} 
              className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 select-none"
            >
              {CardContent}
            </div>
          );
        })}
      </div>
    </div>
  );
}
