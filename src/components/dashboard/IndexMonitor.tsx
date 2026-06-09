"use client";

import { IndexData } from "@/types/portfolio";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";

export default function IndexMonitor({ indices }: { indices: IndexData[] }) {
  return (
    <div className="glass-card p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
          <Activity className="w-5 h-5 text-primary" />
          시장 지표
          <span className="text-xs font-normal text-muted-foreground bg-white/5 px-2 py-1 rounded-md ml-2 hidden sm:inline-block">
            1년 (1Y)
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 md:grid-flow-col gap-4">
        {indices.map((idx, i) => {
          const isPositive = Boolean(idx.change && !idx.change.includes("-") && idx.change !== "0.00%");
          const color = isPositive ? "#ef4444" : "#3b82f6"; // red-500 or blue-500

          const historyVals = idx.history?.map(h => h.value) || [];
          const currentNum = parseFloat(idx.current.replace(/,/g, ''));
          let high = historyVals.length > 0 ? Math.max(...historyVals) : null;
          
          if (high !== null && !isNaN(currentNum)) {
            if (currentNum > high) high = currentNum;
          }

          let drawdownStr = "";
          let highStr = "";
          if (high !== null && !isNaN(currentNum)) {
            const drawdown = ((currentNum - high) / high) * 100;
            drawdownStr = `${drawdown.toFixed(2)}%`;
            highStr = high.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: high % 1 !== 0 ? 2 : 0 });
          }

          return (
            <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col gap-2 overflow-hidden relative group hover:bg-white/10 transition-colors">
              <div className="z-10 flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground font-medium">{idx.name}</span>
                  <span className="text-lg font-bold">{idx.current}</span>
                  {idx.change && (
                    <div className={`flex items-center gap-1 text-xs font-semibold ${
                      isPositive ? "text-red-500" : "text-blue-500"
                    }`}>
                      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>{isPositive && !idx.change.includes("+") ? `+${idx.change}` : idx.change}</span>
                    </div>
                  )}
                </div>
                
                {highStr && (
                  <div className="flex flex-col text-[11px] text-right space-y-1 mt-0.5">
                    <div>
                      <span className="text-muted-foreground/60 mr-1.5">전고점</span>
                      <span className="font-medium text-muted-foreground">{highStr}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground/60 mr-1.5">고점대비</span>
                      <span className={`font-medium ${drawdownStr === '0.00%' ? 'text-muted-foreground' : 'text-blue-500'}`}>{drawdownStr}</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Sparkline Chart */}
              {idx.history && idx.history.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 group-hover:opacity-50 transition-opacity pointer-events-none">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1}>
                    <AreaChart data={idx.history}>
                      <defs>
                        <linearGradient id={`colorGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={color} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <YAxis domain={['dataMin', 'dataMax']} hide />
                      <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fillOpacity={1} fill={`url(#colorGrad-${i})`} isAnimationActive={true} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
