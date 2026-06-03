import { getPortfolioData } from "@/lib/portfolioService";
import AssetSummary from "@/components/dashboard/AssetSummary";
import AccountList from "@/components/dashboard/AccountList";
import AssetChart from "@/components/dashboard/AssetChart";
import IndexMonitor from "@/components/dashboard/IndexMonitor";
import MonthlyChart from "@/components/dashboard/MonthlyChart";
import AutoRefresh from "@/components/dashboard/AutoRefresh";

export const revalidate = 60; // Cache for 60 seconds

export default async function Home() {
  let portfolioData;
  let errorMsg = null;

  try {
    portfolioData = await getPortfolioData();
  } catch (err: any) {
    errorMsg = err.message || "데이터를 불러오는 데 실패했습니다.";
  }

  if (errorMsg || !portfolioData) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="glass-card p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-red-400 mb-2">데이터 로드 실패</h2>
          <p className="text-muted-foreground">{errorMsg}</p>
        </div>
      </div>
    );
  }

  const { summary, accounts, indices, monthlyHistory } = portfolioData;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <AutoRefresh />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[600px]">
        <div className="md:col-span-4">
          <AssetSummary summary={summary} />
        </div>
        <div className="md:col-span-8">
          <IndexMonitor indices={indices} />
        </div>
        
        <div className="md:col-span-4">
          <AssetChart accounts={accounts} />
        </div>
        <div className="md:col-span-8">
          <AccountList accounts={accounts} />
        </div>

        {/* 월별 자산 추이 (Full Width) */}
        <div className="md:col-span-12">
          <MonthlyChart data={monthlyHistory.filter(h => h.valuation > 0)} />
        </div>
      </div>
    </div>
  );
}
