import { getPortfolioData } from "@/lib/portfolioService";
import HoldingsViewer from "@/components/dashboard/HoldingsViewer";

export const revalidate = 60; // Cache for 60 seconds

export default async function AccountsPage() {
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

  const { allocations } = portfolioData;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="min-h-[600px]">
        <HoldingsViewer allocations={allocations} />
      </div>
    </div>
  );
}
