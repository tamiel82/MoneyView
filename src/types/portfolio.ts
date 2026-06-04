export interface PortfolioSummary {
  principal: string;
  current: string;
  currentUsd: string;
  profit: string;
  returnRate: string;
  highWaterMark: string;
  drawdown: string;
  highWaterMarkDate: string;
  underwater: string;
}

export interface Account {
  name: string;
  principal: string;
  allocationRatio: string;
  current: string;
  currentUsd: string;
  profit: string;
  returnRate: string;
}

export interface IndexData {
  name: string;
  ticker: string;
  current: string;
  change: string;
  history?: { date: string; value: number }[];
}

export interface PositionDetail {
  category: string;
  name: string;
  strategy: string;
  investedKrw: string;
  investedUsd: string;
  current: string;
  currentUsd: string;
  profit: string;
  returnRate: string;
  country: string;
  overallWeight: string;
}

export interface AllocationHolding {
  rowIndex?: number;
  accountId: string;
  subAccount: string;
  name: string;
  strategy: string;
  ticker: string;
  currentPrice: string;
  unitPrice: string;
  quantity: string;
  investedValue: string;
  currentValue: string;
  currentValueKrw: string;
  profitRate: string;
  weight: string;
  history?: { date: string; value: number }[];
}

export interface MonthlyAccountDetail {
  name: string;
  deposit: number;
  valuation: number;
  profit: number;
  profitRate: number;
  cumulativeProfit: number;
  twr: number;
  ytd: number;
  note?: string;
}

export interface MonthlyData {
  rowIndex: number;
  month: string;
  monthlyDeposit: number;
  cumulativePrincipal: number;
  valuation: number;
  monthlyProfit: number;
  cumulativeProfit: number;
  profitRate: number;
  cumulativeReturnRate: number;
  twr: number;
  ytd: number;
  details: MonthlyAccountDetail[];
}

export interface PortfolioData {
  summary: PortfolioSummary;
  accounts: Account[];
  indices: IndexData[];
  details: PositionDetail[];
  allocations: Record<string, AllocationHolding[]>;
  monthlyHistory: MonthlyData[];
  assetSummaries: AssetSummary[];
}

export interface TransactionData {
  rowIndex?: number;
  date: string;
  amount: string;
  memo: string;
}

export interface ExchangeData {
  rowIndex?: number;
  user: "현주 환전" | "동민 환전";
  date: string;
  rate: string;
  krw: string;
  usd: string;
}

export interface ExchangeSummary {
  hyunjuKrw: string;
  hyunjuUsd: string;
  hyunjuAvgRate: string;
  dongminKrw: string;
  dongminUsd: string;
  dongminAvgRate: string;
}

export interface ExchangeTotalSummary {
  totalKrw: string;
  totalUsd: string;
  avgRate: string;
  currentRate: string;
  diff: string;
}

export interface AssetSummary {
  assetClass: string; // 계좌 (주식, 채권, 현금 등)
  ticker: string; // 종목/티커
  strategy: string; // 전략
  investedKrw: string; // 원화 투자원금
  investedUsd: string; // 외화 투자원금
  currentKrw: string; // 원화 평가액
  currentUsd: string; // 외화 평가액
  profitAmount: string; // 손익액
  profitRate: string; // 누적수익률
  currency: string; // 통화
  targetWeight: string; // 전체비중
}
