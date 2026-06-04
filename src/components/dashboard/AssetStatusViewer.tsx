import { PositionDetail } from "@/types/portfolio";
import { TrendingUp, TrendingDown, Layers, Globe } from "lucide-react";

export default function AssetStatusViewer({ details }: { details: PositionDetail[] }) {
  if (!details || details.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground mb-4">
        <Layers className="w-5 h-5 text-primary" />
        자산별 상세 현황
      </h2>

      <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-white/5 text-muted-foreground border-b border-white/10">
              <tr>
                <th scope="col" className="px-6 py-4 font-semibold">자산 / 전략</th>
                <th scope="col" className="px-6 py-4 font-semibold">종목명</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">투자 원금</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">평가액</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">손익액</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">수익률</th>
                <th scope="col" className="px-6 py-4 font-semibold text-center">비중</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {details.map((item, index) => {
                const isPositive = Boolean(item.returnRate && !item.returnRate.includes("-") && item.returnRate !== "0.00%" && item.returnRate !== "0%");
                const isNegative = Boolean(item.returnRate && item.returnRate.includes("-"));
                const isUsd = Boolean(item.currentUsd && item.currentUsd !== "0" && item.currentUsd !== "");

                return (
                  <tr key={index} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-foreground">{item.category}</span>
                        <span className="text-xs text-muted-foreground">{item.strategy}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground/90">{item.name}</span>
                        {item.country && (
                          <span className="text-[10px] bg-white/10 text-muted-foreground px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Globe className="w-2.5 h-2.5" />
                            {item.country}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground/80">{item.investedKrw}</span>
                        {item.investedUsd && item.investedUsd !== "0" && (
                          <span className="text-xs text-muted-foreground">{item.investedUsd}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col">
                        <span className="font-bold text-gradient">{item.current}</span>
                        {isUsd && (
                          <span className="text-xs text-muted-foreground">{item.currentUsd}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-medium ${isPositive ? "text-red-500/90" : isNegative ? "text-blue-500/90" : "text-muted-foreground"}`}>
                        {isPositive && item.profit !== "0" && !item.profit.includes("+") ? "+" : ""}{item.profit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isPositive && <TrendingUp className="w-3 h-3 text-red-500" />}
                        {isNegative && <TrendingDown className="w-3 h-3 text-blue-500" />}
                        <span className={`font-bold ${isPositive ? "text-red-500" : isNegative ? "text-blue-500" : "text-muted-foreground"}`}>
                          {item.returnRate}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.overallWeight && item.overallWeight !== "0" && item.overallWeight !== "" ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                          {item.overallWeight}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
