import { PositionDetail } from "@/types/portfolio";
import { TrendingUp, TrendingDown, Layers, Globe } from "lucide-react";

export default function AssetStatusViewer({ details }: { details: PositionDetail[] }) {
  if (!details || details.length === 0) return null;

  return (
    <div className="glass-card p-6 h-full flex flex-col">
      <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground mb-6">
        <Layers className="w-5 h-5 text-primary" />
        자산별 상세 현황
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 flex-1 content-start">
        {details.map((item, index) => {
          const isPositive = Boolean(item.returnRate && !item.returnRate.includes("-") && item.returnRate !== "0.00%" && item.returnRate !== "0%");
          const isNegative = Boolean(item.returnRate && item.returnRate.includes("-"));
          const isUsd = Boolean(item.currentUsd && item.currentUsd !== "0" && item.currentUsd !== "");
          const isUSMarket = item.country === '미국';

          return (
            <div key={index} className="flex flex-col p-4 rounded-xl bg-white/5 hover:bg-white/10 hover:border-primary/30 transition-all border border-white/5">
              {/* Row 1: Category/Strategy | Weight */}
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm text-[10px] font-medium">{item.category}</span>
                  <span className="text-[11px] text-muted-foreground">{item.strategy}</span>
                </div>
                <span className="font-medium text-[11px] text-muted-foreground">비중 {item.overallWeight || "-"}</span>
              </div>

              {/* Row 2: Name | Current Value */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-bold text-[15px] text-foreground/90 leading-none">{item.name}</span>
                  {item.country && (
                    <Globe className="w-3 h-3 text-muted-foreground/60" />
                  )}
                </div>
                
                {/* Current Value */}
                <div className="flex flex-col items-end">
                  {isUSMarket && isUsd ? (
                    <>
                      <span className="font-bold text-[16px] text-gradient leading-none">{item.currentUsd}</span>
                      <span className="text-[11px] text-muted-foreground mt-1">{item.current}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-[16px] text-gradient leading-none">{item.current}</span>
                      {isUsd && (
                        <span className="text-[11px] text-muted-foreground mt-1">{item.currentUsd}</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Row 3: Invested | Profit / Return Rate */}
              <div className="flex justify-between items-end mt-auto pt-1">
                {/* Invested */}
                <div className="flex flex-col">
                  {isUSMarket && item.investedUsd && item.investedUsd !== "0" ? (
                    <>
                      <span className="font-medium text-[13px] text-foreground/60 leading-none">{item.investedUsd}</span>
                      <span className="text-[10px] text-muted-foreground/60 mt-1">{item.investedKrw}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-[13px] text-foreground/60 leading-none">{item.investedKrw}</span>
                      {item.investedUsd && item.investedUsd !== "0" && (
                        <span className="text-[10px] text-muted-foreground/60 mt-1">{item.investedUsd}</span>
                      )}
                    </>
                  )}
                </div>

                {/* Profit / Return Rate */}
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-[12px] ${isPositive ? "text-red-500/90" : isNegative ? "text-blue-500/90" : "text-muted-foreground"}`}>
                    {isPositive && item.profit !== "0" && !item.profit.includes("+") ? "+" : ""}{item.profit}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {isPositive && <TrendingUp className="w-3.5 h-3.5 text-red-500" />}
                    {isNegative && <TrendingDown className="w-3.5 h-3.5 text-blue-500" />}
                    <span className={`font-bold text-[14px] ${isPositive ? "text-red-500" : isNegative ? "text-blue-500" : "text-muted-foreground"}`}>
                      {item.returnRate}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
