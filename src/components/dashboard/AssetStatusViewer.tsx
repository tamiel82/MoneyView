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
            <div key={index} className="flex flex-col gap-3 p-5 rounded-xl bg-white/5 hover:bg-white/10 hover:border-primary/30 transition-all border border-white/5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[15px] text-foreground/90">{item.name}</span>
                    {item.country && (
                      <span className="text-[10px] bg-white/10 text-muted-foreground px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Globe className="w-2.5 h-2.5" />
                        {item.country}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm">{item.category}</span>
                    <span>{item.strategy}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-muted-foreground mb-0.5">비중</span>
                  <span className="font-semibold text-sm text-foreground/90">{item.overallWeight || "-"}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-white/5 my-1" />

              {/* Body (Invested vs Current) */}
              <div className="flex justify-between items-center">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground/70">투자 원금</span>
                  {isUSMarket && item.investedUsd && item.investedUsd !== "0" ? (
                    <div className="flex flex-col">
                      <span className="font-medium text-sm text-foreground/80">{item.investedUsd}</span>
                      <span className="text-[11px] text-muted-foreground">{item.investedKrw}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="font-medium text-sm text-foreground/80">{item.investedKrw}</span>
                      {item.investedUsd && item.investedUsd !== "0" && (
                        <span className="text-[11px] text-muted-foreground">{item.investedUsd}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 items-end">
                  <span className="text-[11px] text-muted-foreground/70">평가액</span>
                  {isUSMarket && isUsd ? (
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-[15px] text-gradient">{item.currentUsd}</span>
                      <span className="text-[11px] text-muted-foreground">{item.current}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-[15px] text-gradient">{item.current}</span>
                      {isUsd && (
                        <span className="text-[11px] text-muted-foreground">{item.currentUsd}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-white/5 my-1" />

              {/* Footer (Profit & Return Rate) */}
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[11px] text-muted-foreground/70 mb-0.5">손익액</span>
                  <span className={`font-semibold text-sm ${isPositive ? "text-red-500/90" : isNegative ? "text-blue-500/90" : "text-muted-foreground"}`}>
                    {isPositive && item.profit !== "0" && !item.profit.includes("+") ? "+" : ""}{item.profit}
                  </span>
                </div>
                
                <div className="flex flex-col items-end">
                  <span className="text-[11px] text-muted-foreground/70 mb-0.5">수익률</span>
                  <div className="flex items-center gap-1">
                    {isPositive && <TrendingUp className="w-3.5 h-3.5 text-red-500" />}
                    {isNegative && <TrendingDown className="w-3.5 h-3.5 text-blue-500" />}
                    <span className={`font-bold text-[15px] ${isPositive ? "text-red-500" : isNegative ? "text-blue-500" : "text-muted-foreground"}`}>
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
