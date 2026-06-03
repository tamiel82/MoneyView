import { PositionDetail } from "@/types/portfolio";
import { LayoutList } from "lucide-react";

export default function PositionDetails({ details }: { details: PositionDetail[] }) {
  return (
    <div className="glass-card p-6 h-full col-span-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
          <LayoutList className="w-5 h-5 text-primary" />
          상세 모니터링
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-4 py-3 rounded-tl-xl">분류</th>
              <th className="px-4 py-3">종목/계좌</th>
              <th className="px-4 py-3">전략</th>
              <th className="px-4 py-3 text-right">현재가 (KRW)</th>
              <th className="px-4 py-3 text-right">손익액</th>
              <th className="px-4 py-3 text-right">수익률</th>
              <th className="px-4 py-3 text-right rounded-tr-xl">전체비중</th>
            </tr>
          </thead>
          <tbody>
            {details.map((detail, index) => {
              const isPositive = !detail.profit.includes("-") && detail.profit !== "0 ";
              const isNegative = detail.profit.includes("-");
              return (
                <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground">{detail.category}</td>
                  <td className="px-4 py-3 font-semibold">{detail.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{detail.strategy}</td>
                  <td className="px-4 py-3 text-right font-medium">{detail.current}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : ''}`}>
                    {detail.profit !== "0 " ? detail.profit : "-"}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : ''}`}>
                    {detail.returnRate !== "0.0%" ? detail.returnRate : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{detail.overallWeight}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
