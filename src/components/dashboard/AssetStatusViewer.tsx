import { PositionDetail } from "@/types/portfolio";
import { TrendingUp, TrendingDown, Landmark, Globe, Layers } from "lucide-react";

export default function AssetStatusViewer({ details }: { details: PositionDetail[] }) {
  if (!details || details.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground mb-4">
        <Layers className="w-5 h-5 text-primary" />
        자산별 상세 현황
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {details.map((item, index) => {
          const isPositive = Boolean(item.returnRate && !item.returnRate.includes("-") && item.returnRate !== "0.00%" && item.returnRate !== "0%");
          const isNegative = Boolean(item.returnRate && item.returnRate.includes("-"));
          
          const isUsd = Boolean(item.currentUsd && item.currentUsd !== "0" && item.currentUsd !== "");

          return (
            <div 
              key={index} 
              className="glass-card p-5 rounded-2xl flex flex-col gap-4 border border-white/5 hover:border-white/10 transition-all group"
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold group-hover:text-primary transition-colors flex items-center gap-2">
                    {item.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <span className="bg-white/10 px-2 py-0.5 rounded-full">{item.category}</span>
                    <span>{item.strategy}</span>
                  </p>
                </div>
                {item.country && (
                  <div className="text-xs font-semibold text-muted-foreground bg-white/5 px-2 py-1 rounded flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {item.country}
                  </div>
                )}
              </div>

              {/* Values */}
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">평가액</span>
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-gradient">{item.current}</span>
                    {isUsd && <span className="text-xs text-muted-foreground">{item.currentUsd}</span>}
                  </div>
                </div>

                <div className="flex flex-col gap-1 items-end text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">수익률</span>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1">
                      {isPositive && <TrendingUp className="w-3 h-3 text-red-500" />}
                      {isNegative && <TrendingDown className="w-3 h-3 text-blue-500" />}
                      <span className={`text-base font-bold ${isPositive ? "text-red-500" : isNegative ? "text-blue-500" : "text-muted-foreground"}`}>
                        {item.returnRate}
                      </span>
                    </div>
                    {item.profit && item.profit !== "0" && (
                      <span className={`text-xs font-medium ${isPositive ? "text-red-500/80" : isNegative ? "text-blue-500/80" : "text-muted-foreground"}`}>
                        {isPositive && !item.profit.includes("+") ? "+" : ""}{item.profit}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer / Meta */}
              <div className="pt-3 border-t border-white/5 flex justify-between items-center text-xs mt-auto">
                <div className="text-muted-foreground">
                  투자원금: <span className="font-semibold text-foreground/80">{item.investedKrw}</span>
                </div>
                {item.overallWeight && item.overallWeight !== "0" && item.overallWeight !== "" && (
                  <div className="text-muted-foreground">
                    포트 비중: <span className="font-semibold text-foreground/80 text-primary">{item.overallWeight}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
