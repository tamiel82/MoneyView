"use client";

import { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { Account } from "@/types/portfolio";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export default function AssetChart({ accounts }: { accounts: Account[] }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Recalculate percentage based on evaluation values (총자산 대비 원화기준 평가액)
  const data = useMemo(() => {
    if (!accounts || !Array.isArray(accounts)) return [];

    const parseCurrencyToNumber = (valStr: string): number => {
      if (!valStr) return 0;
      const cleanStr = valStr.replace(/[₩$,\s]/g, '');
      return parseFloat(cleanStr) || 0;
    };

    const parsedAccounts = accounts.map((acc) => {
      const rawValue = parseCurrencyToNumber(acc?.current);
      return {
        name: acc?.name || '',
        currentStr: acc?.current || '0',
        rawValue,
      };
    });

    const totalValuation = parsedAccounts.reduce((sum, acc) => sum + acc.rawValue, 0);

    const filteredAndSorted = parsedAccounts
      .map((acc) => {
        const percentage = totalValuation > 0 ? (acc.rawValue / totalValuation) * 100 : 0;
        return {
          name: acc.name,
          value: parseFloat(percentage.toFixed(4)), // keep high precision for rendering
          rawValue: acc.rawValue,
          currentStr: acc.currentStr,
        };
      })
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);

    return filteredAndSorted.map((d, index) => ({
      ...d,
      color: COLORS[index % COLORS.length]
    }));
  }, [accounts]);

  if (!isMounted) {
    return (
      <div className="glass-card p-6 h-full flex flex-col min-h-[400px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
            <PieChartIcon className="w-5 h-5 text-primary animate-pulse" />
            자산 비중
          </h2>
        </div>
        <div className="flex-1 w-full flex items-center justify-center min-h-[300px]">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* outer glowing ring */}
            <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-primary/60 animate-spin" />
            {/* inner slow glowing ring */}
            <div className="absolute inset-2 rounded-full border-4 border-white/5 border-b-red-500/50 animate-spin" style={{ animationDirection: "reverse", animationDuration: "3s" }} />
            <span className="text-xs text-muted-foreground font-medium tracking-wider animate-pulse">자산 매핑 중...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
          <PieChartIcon className="w-5 h-5 text-primary" />
          자산 비중
        </h2>
      </div>

      <div className="flex-1 w-full min-h-[400px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={1}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="40%"
              innerRadius={65}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any, name: any, props: any) => {
                const item = props?.payload;
                const currentStr = item?.currentStr || '';
                return [`${currentStr} (${Number(value).toFixed(2)}%)`, item?.name || name];
              }}
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                color: "#fafafa"
              }}
              itemStyle={{ color: "#fafafa" }}
            />
            <Legend 
              verticalAlign="bottom"
              content={() => (
                <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-6">
                  {data.map((entry, index) => (
                    <li key={`legend-${index}`} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                      <span className="text-muted-foreground">{entry.name} <span className="font-medium">({entry.value.toFixed(1)}%)</span></span>
                    </li>
                  ))}
                </ul>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
