import { Metadata } from "next";
import HistoryTabs from "@/components/history/HistoryTabs";
import { getHistoryData } from "@/lib/historyService";

export const metadata: Metadata = {
  title: "MoneyView - 히스토리",
  description: "통합 자산 관리 거래 및 환전 기록",
};

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const data = await getHistoryData();

  return (
    <div className="container mx-auto px-4 py-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <HistoryTabs 
        transactions={data.transactions} 
        exchanges={data.exchanges} 
        exchangeSummary={data.exchangeSummary}
        exchangeTotalSummary={data.exchangeTotalSummary}
      />
    </div>
  );
}
