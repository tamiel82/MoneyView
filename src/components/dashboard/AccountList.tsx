"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Landmark, ChevronRight, X, Save } from "lucide-react";
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
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editPrincipal, setEditPrincipal] = useState("");
  const [editCurrent, setEditCurrent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openModal = (account: Account) => {
    const parseNumStr = (val: string) => val ? val.replace(/[^0-9.-]+/g, "") : "";
    setEditPrincipal(parseNumStr(account.principal));
    setEditCurrent(parseNumStr(account.current));
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/portfolio/dongmin-etc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ principal: editPrincipal, current: editCurrent })
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        router.refresh();
      } else {
        alert(data.error || "저장에 실패했습니다.");
      }
    } catch (e) {
      alert("오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

          if (account.name === "동민기타") {
            return (
              <div 
                key={index} 
                onClick={() => openModal(account)}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 hover:border-primary/30 transition-all border border-white/5 cursor-pointer active:scale-[0.98]"
              >
                {CardContent}
              </div>
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

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 relative border border-white/10 shadow-2xl">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-6 text-gradient">동민기타 자산 수정</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">원금</label>
                <input 
                  type="number"
                  value={editPrincipal}
                  onChange={(e) => setEditPrincipal(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="예: 2500000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">현재가</label>
                <input 
                  type="number"
                  value={editCurrent}
                  onChange={(e) => setEditCurrent(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="예: 2700000"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-foreground font-medium transition-all"
              >
                취소
              </button>
              <button 
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    저장
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
