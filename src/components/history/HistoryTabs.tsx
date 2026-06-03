"use client";

import React, { useState } from "react";
import { TransactionData, ExchangeData, ExchangeSummary, ExchangeTotalSummary } from "@/types/portfolio";
import TransactionTable from "./TransactionTable";
import ExchangeTable from "./ExchangeTable";
import { Wallet, RefreshCcw } from "lucide-react";

interface HistoryTabsProps {
  transactions: TransactionData[];
  exchanges: ExchangeData[];
  exchangeSummary?: ExchangeSummary;
  exchangeTotalSummary?: ExchangeTotalSummary;
}

export default function HistoryTabs({ transactions, exchanges, exchangeSummary, exchangeTotalSummary }: HistoryTabsProps) {
  const [activeTab, setActiveTab] = useState<"transactions" | "exchanges">("transactions");

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex p-1 space-x-1 bg-black/20 backdrop-blur-sm rounded-xl max-w-md mx-auto border border-white/5">
        <button
          onClick={() => setActiveTab("transactions")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === "transactions"
              ? "bg-white/10 text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
          }`}
        >
          <Wallet className="w-4 h-4" />
          거래기록
        </button>
        <button
          onClick={() => setActiveTab("exchanges")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === "exchanges"
              ? "bg-white/10 text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
          }`}
        >
          <RefreshCcw className="w-4 h-4" />
          환전기록
        </button>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-300">
        {activeTab === "transactions" ? (
          <TransactionTable data={transactions} />
        ) : (
        <ExchangeTable 
            data={exchanges} 
            summary={exchangeSummary}
            totalSummary={exchangeTotalSummary}
          />
        )}
      </div>
    </div>
  );
}
