"use client";

import { useMemo, useState } from "react";
import { ComposedChart, Area, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { LineChart as LineChartIcon, ChevronRight } from "lucide-react";
import { MonthlyData } from "@/types/portfolio";
import Link from "next/link";

export default function MonthlyChart({ data }: { data: MonthlyData[] }) {
  const [filter, setFilter] = useState<"all" | "1y" | "3y">("all");
  
  // Toggles for chart series
  const [showValuation, setShowValuation] = useState(true);
  const [showPrincipal, setShowPrincipal] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showProfit, setShowProfit] = useState(false);

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (filter === "all") return data;
    
    const monthsToKeep = filter === "1y" ? 12 : 36;
    return data.slice(-monthsToKeep);
  }, [data, filter]);

  const formatLeftYAxis = (tickItem: number) => {
    if (tickItem === 0) return "0";
    if (tickItem >= 100000000) {
      return `${(tickItem / 100000000).toFixed(0)}억`;
    }
    if (tickItem >= 10000000) {
      return `${(tickItem / 10000000).toFixed(0)}천만`;
    }
    return `${(tickItem / 10000).toFixed(0)}만`;
  };

  const formatRightYAxis = (tickItem: number) => {
    if (tickItem === 0) return "0";
    if (Math.abs(tickItem) >= 10000) {
      return `${(tickItem / 10000).toFixed(0)}만`;
    }
    return tickItem.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pData = payload[0].payload as MonthlyData;
      const isProfit = pData.monthlyProfit >= 0;
      
      return (
        <div className="bg-zinc-900 border border-white/10 p-4 rounded-xl shadow-xl min-w-[200px]">
          <p className="text-sm text-muted-foreground mb-3 font-medium">{label}</p>
          <div className="space-y-2">
            {showValuation && (
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span className="text-foreground/80">평가액</span>
                </div>
                <span className="font-semibold">{pData.valuation.toLocaleString()}원</span>
              </div>
            )}
            {showPrincipal && (
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-foreground/80">누적 원금</span>
                </div>
                <span className="font-semibold">{pData.cumulativePrincipal.toLocaleString()}원</span>
              </div>
            )}
            {(showDeposit || showProfit) && (showValuation || showPrincipal) && (
              <div className="border-t border-white/10 my-2" />
            )}
            {showDeposit && (
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                  <span className="text-foreground/80">월 적립액</span>
                </div>
                <span className="font-medium text-indigo-400">{pData.monthlyDeposit.toLocaleString()}원</span>
              </div>
            )}
            {showProfit && (
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2.5 h-2.5 rounded-full ${isProfit ? 'bg-red-500' : 'bg-blue-400'}`}></span>
                  <span className="text-foreground/80">월별 손익</span>
                </div>
                <span className={`font-semibold ${isProfit ? "text-red-500" : "text-blue-500"}`}>
                  {isProfit ? "+" : ""}{pData.monthlyProfit.toLocaleString()}원
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card p-6 flex flex-col h-[520px]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
          <LineChartIcon className="w-5 h-5 text-primary" />
          월별 자산 추이
        </h2>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
            <button
              onClick={() => setFilter("1y")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === "1y" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              최근 1년
            </button>
            <button
              onClick={() => setFilter("3y")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === "3y" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              최근 3년
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === "all" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              전체
            </button>
          </div>

          <Link 
            href="/monthly" 
            className="px-3 py-1.5 text-xs font-semibold text-primary hover:text-white bg-primary/10 hover:bg-primary/30 border border-primary/20 hover:border-primary/40 rounded-lg transition-all flex items-center gap-1 active:scale-95 whitespace-nowrap"
          >
            상세보기
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Series Toggles */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 mb-6 text-sm bg-white/2 p-3 rounded-xl border border-white/5">
        <label className="flex items-center gap-2 cursor-pointer select-none group">
          <input 
            type="checkbox" 
            checked={showValuation} 
            onChange={(e) => setShowValuation(e.target.checked)}
            className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer accent-blue-500"
          />
          <span className={`transition-colors ${showValuation ? 'text-blue-400 font-semibold' : 'text-muted-foreground group-hover:text-foreground'}`}>평가액</span>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer select-none group">
          <input 
            type="checkbox" 
            checked={showPrincipal} 
            onChange={(e) => setShowPrincipal(e.target.checked)}
            className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer accent-emerald-500"
          />
          <span className={`transition-colors ${showPrincipal ? 'text-emerald-400 font-semibold' : 'text-muted-foreground group-hover:text-foreground'}`}>누적 원금</span>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer select-none group">
          <input 
            type="checkbox" 
            checked={showDeposit} 
            onChange={(e) => setShowDeposit(e.target.checked)}
            className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer accent-indigo-400"
          />
          <span className={`transition-colors ${showDeposit ? 'text-indigo-400 font-semibold' : 'text-muted-foreground group-hover:text-foreground'}`}>월 적립액</span>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer select-none group">
          <input 
            type="checkbox" 
            checked={showProfit} 
            onChange={(e) => setShowProfit(e.target.checked)}
            className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer accent-red-500"
          />
          <span className={`transition-colors ${showProfit ? 'text-red-400 font-semibold' : 'text-muted-foreground group-hover:text-foreground'}`}>월별 손익</span>
        </label>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={1}>
          <ComposedChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValuation" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12, fill: "rgba(255,255,255,0.4)" }}
              tickMargin={10}
              axisLine={false}
              tickLine={false}
              minTickGap={30}
            />
            {showValuation || showPrincipal ? (
              <YAxis 
                yAxisId="left"
                tickFormatter={formatLeftYAxis} 
                tick={{ fontSize: 12, fill: "rgba(255,255,255,0.4)" }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
            ) : null}
            {showDeposit || showProfit ? (
              <YAxis 
                yAxisId="right"
                orientation="right"
                tickFormatter={formatRightYAxis} 
                tick={{ fontSize: 12, fill: "rgba(255,255,255,0.4)" }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
            ) : null}
            <Tooltip content={<CustomTooltip />} />
            
            {showDeposit && (
              <Bar yAxisId="right" dataKey="monthlyDeposit" name="월 적립액" barSize={12} radius={[2, 2, 0, 0]} fill="#818cf8" />
            )}
            
            {showProfit && (
              <Bar yAxisId="right" dataKey="monthlyProfit" name="월별 손익" barSize={12} radius={[2, 2, 0, 0]}>
                {filteredData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.monthlyProfit >= 0 ? '#ef4444' : '#3b82f6'} />
                ))}
              </Bar>
            )}

            {showPrincipal && (
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="cumulativePrincipal" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorPrincipal)" 
                name="누적 원금"
              />
            )}
            
            {showValuation && (
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="valuation" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorValuation)" 
                name="평가액"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
