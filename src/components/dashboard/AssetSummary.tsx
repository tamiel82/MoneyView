"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, DollarSign, UploadCloud, CheckCircle2 } from "lucide-react";
import { PortfolioSummary } from "@/types/portfolio";

export default function AssetSummary({ summary }: { summary: PortfolioSummary }) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const isPositive = Boolean(summary.profit && !summary.profit.includes("-") && summary.profit !== "0 " && summary.profit !== "0");

  const parseCurrency = (val: string) => {
    if (!val) return 0;
    return Number(val.replace(/[^0-9.-]+/g, ""));
  };

  const currentVal = parseCurrency(summary.current);
  const athVal = parseCurrency(summary.highWaterMark);
  
  // 버튼 활성화 조건: 현재 자산이 전고점보다 클 경우
  const canUpdateATH = currentVal > athVal;

  const handleUpdateATH = async () => {
    if (!canUpdateATH || isUpdating) return;
    
    setIsUpdating(true);
    try {
      const res = await fetch("/api/portfolio/highwatermark", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentAsset: summary.current }),
      });
      
      const data = await res.json();
      if (data.success) {
        setUpdateSuccess(true);
        router.refresh();
        setTimeout(() => setUpdateSuccess(false), 3000);
      } else {
        alert(data.error || "업데이트에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("오류가 발생했습니다.");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatPositive = (val: string, isPos: boolean) => {
    if (!val || val === "-" || val.includes("0.0%") || val === "0%" || val.trim() === "0") return val;
    return isPos && !val.includes("+") ? `+${val.trim()}` : val.trim();
  };

  const isDdNegative = summary.drawdown && summary.drawdown.includes("-");
  const isDdZero = !summary.drawdown || summary.drawdown === "0.0%" || summary.drawdown === "0%";
  const isDdPositive = !isDdNegative && !isDdZero;
  
  const formattedDrawdown = formatPositive(summary.drawdown, isDdPositive);
  const diffVal = currentVal - athVal;
  const formattedDiff = diffVal === 0 
    ? "0" 
    : diffVal > 0 
      ? `+${diffVal.toLocaleString()}` 
      : diffVal.toLocaleString();

  return (
    <div className="glass-card p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
            총 자산 현황
            <span className="text-xs font-normal text-muted-foreground bg-white/5 px-2 py-1 rounded-md">
              원금: {summary.principal}
            </span>
          </h2>
          <div className="bg-primary/20 p-2 rounded-xl">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
        </div>
        
        <div className="mb-4 flex flex-col md:flex-row md:items-end gap-2 md:gap-4">
          <span className="text-4xl font-bold tracking-tight text-gradient">
            {summary.current}
          </span>
          {summary.currentUsd && summary.currentUsd !== "0" && summary.currentUsd !== "$0.00" && (
            <span className="text-lg text-muted-foreground font-medium pb-1">
              ({summary.currentUsd})
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg ${
            isPositive ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
          }`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>
              {formatPositive(summary.profit, isPositive)} ({formatPositive(summary.returnRate, isPositive)})
            </span>
          </div>
          <span className="text-sm text-muted-foreground">투자 원금 대비 손익</span>
        </div>
      </div>

      {/* 전고점 및 낙폭 관련 세부 지표 */}
      <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
        <div className="bg-white/2 p-3 rounded-xl border border-white/5 flex flex-col justify-between backdrop-blur-sm transition-all duration-300 hover:border-white/10 relative group">
          <span className="text-xs text-muted-foreground font-medium">전고점 (ATH)</span>
          <span className="text-base font-semibold text-foreground/90 mt-1 tracking-tight">{summary.highWaterMark}</span>
          
          {/* 전고점 갱신 버튼 */}
          {canUpdateATH && (
            <button 
              onClick={handleUpdateATH}
              disabled={isUpdating}
              className="absolute top-2 right-2 p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-md transition-colors"
              title="전고점 갱신하기"
            >
              {updateSuccess ? <CheckCircle2 className="w-4 h-4" /> : <UploadCloud className={`w-4 h-4 ${isUpdating ? 'animate-pulse' : ''}`} />}
            </button>
          )}
        </div>
        <div className="bg-white/2 p-3 rounded-xl border border-white/5 flex flex-col justify-between backdrop-blur-sm transition-all duration-300 hover:border-white/10">
          <span className="text-xs text-muted-foreground font-medium">전고점일</span>
          <span className="text-base font-semibold text-foreground/90 mt-1">{summary.highWaterMarkDate || '-'}</span>
        </div>
        <div className="bg-white/2 p-3 rounded-xl border border-white/5 flex flex-col justify-between backdrop-blur-sm transition-all duration-300 hover:border-white/10">
          <span className="text-xs text-muted-foreground font-medium">전고점 대비</span>
          <span className={`text-sm sm:text-base font-semibold mt-1 tracking-tight ${
            diffVal < 0 
              ? "text-blue-500" 
              : diffVal === 0
                ? "text-muted-foreground"
                : "text-red-500"
          }`}>
            {formattedDiff} ({formattedDrawdown})
          </span>
        </div>
        <div className="bg-white/2 p-3 rounded-xl border border-white/5 flex flex-col justify-between backdrop-blur-sm transition-all duration-300 hover:border-white/10">
          <span className="text-xs text-muted-foreground font-medium">언더워터 기간</span>
          <span className={`text-base font-semibold mt-1 tracking-tight ${
            summary.underwater && summary.underwater !== "0" && summary.underwater !== ""
              ? "text-amber-400"
              : "text-muted-foreground"
          }`}>
            {summary.underwater ? `${summary.underwater}일` : '-'}
          </span>
        </div>
      </div>
    </div>
  );
}
