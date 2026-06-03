import { supabase } from './supabase';
import { PortfolioData, AllocationHolding, Account, PositionDetail, MonthlyData, MonthlyAccountDetail } from '@/types/portfolio';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

function formatCurrency(val: number): string {
  return Math.round(val).toLocaleString('ko-KR');
}

function formatPercent(val: number): string {
  return (val * 100).toFixed(2) + '%';
}

function inferCurrency(ticker: string): 'KRW' | 'USD' {
  if (ticker === 'KRW' || ticker.endsWith('.KS') || ticker.endsWith('.KQ') || ticker.includes('KRW')) return 'KRW';
  return 'USD';
}

export async function getPortfolioData(): Promise<PortfolioData> {
  // 1. Fetch data from Supabase
  const [
    { data: accountsData, error: accountsErr },
    { data: holdingsData, error: holdingsErr },
    { data: monthlyData, error: monthlyErr }
  ] = await Promise.all([
    supabase.from('accounts').select('*').order('id', { ascending: true }),
    supabase.from('holdings').select('*, accounts(name)'),
    supabase.from('monthly_valuations').select('*, accounts(name)').order('month', { ascending: true })
  ]);

  if (accountsErr) throw new Error(accountsErr.message);
  if (holdingsErr) throw new Error(holdingsErr.message);
  if (monthlyErr) throw new Error(monthlyErr.message);

  // 2. Fetch Exchange Rate and Market Indices
  const targetIndices = [
    { symbol: '^IXIC', name: 'NASDAQ' },
    { symbol: '^GSPC', name: 'S&P 500' },
    { symbol: '^KS11', name: 'KOSPI' },
    { symbol: '^KQ11', name: 'KOSDAQ' },
    { symbol: 'KRW=X', name: 'USD/KRW 환율' },
    { symbol: 'DX-Y.NYB', name: '달러 인덱스' }
  ];

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const indices = await Promise.all(targetIndices.map(async (target) => {
    try {
      const [quote, chart] = await Promise.all([
        yahooFinance.quote(target.symbol),
        yahooFinance.chart(target.symbol, { period1: oneYearAgo, interval: '1wk' })
      ]);
      const changePercent = quote.regularMarketChangePercent || 0;
      const changeStr = (changePercent > 0 ? '+' : '') + changePercent.toFixed(2) + '%';
      return {
        name: target.name,
        ticker: target.symbol,
        current: quote.regularMarketPrice ? quote.regularMarketPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
        change: changeStr,
        history: chart.quotes ? chart.quotes.filter(q => q.close !== null).map(q => ({
          date: q.date.toISOString(),
          value: q.close as number
        })) : []
      };
    } catch (err) {
      return { name: target.name, ticker: target.symbol, current: 'N/A', change: 'N/A', history: [] };
    }
  }));

  const usdKrwRate = Number(indices.find(i => i.ticker === 'KRW=X')?.current?.replace(/,/g, '') || 1400);

  // 3. Process Holdings and get Live Prices
  const formatYahooTicker = (ticker: string): string => {
    let t = ticker.trim().toUpperCase();
    if (!t || t === 'KRW' || t === 'USD' || t === 'UNKNOWN') return "";
    if (/^\d{6}$/.test(t)) return `${t}.KS`;
    if (/^(BTC|ETH|SOL|XRP|DOGE|ADA)KRW$/.test(t)) return t.replace(/^(BTC|ETH|SOL|XRP|DOGE|ADA)KRW$/, "$1-KRW");
    if (t === "USDT") return "USDT-USD";
    if (t === "USDC") return "USDC-USD";
    if (t === "BTC") return "BTC-USD";
    if (t === "ETH") return "ETH-USD";
    return t.replace(/\./g, "-");
  };

  const tickersToFetch = new Set<string>();
  holdingsData.forEach((h: any) => {
    const formatted = formatYahooTicker(h.ticker);
    if (formatted) tickersToFetch.add(formatted);
  });

  const priceMap: Record<string, number> = {};
  const chartMap: Record<string, any[]> = {};

  await Promise.all(Array.from(tickersToFetch).map(async (ticker) => {
    try {
      const [quote, chart] = await Promise.all([
        yahooFinance.quote(ticker),
        yahooFinance.chart(ticker, { period1: oneYearAgo, interval: '1wk' })
      ]);
      priceMap[ticker] = quote.regularMarketPrice || 0;
      if (chart.quotes) {
        chartMap[ticker] = chart.quotes.filter(q => q.close !== null).map(q => ({
          date: q.date.toISOString(),
          value: q.close as number
        }));
      }
    } catch (err) {
      console.error(`Error fetching ticker ${ticker}`);
    }
  }));

  // 4. Calculate Allocations & Account Summaries
  const allocations: Record<string, AllocationHolding[]> = {};
  const accountSummaries: Record<string, any> = {};
  let totalPrincipal = 0;
  let totalCurrentValue = 0;
  let totalCurrentUsd = 0;

  accountsData.forEach((acc: any) => {
    allocations[acc.name] = [];
    accountSummaries[acc.name] = {
      name: acc.name,
      principal: 0,
      current: 0,
      currentUsd: 0,
    };
  });

  const positionDetails: PositionDetail[] = [];

  holdingsData.forEach((h: any, index: number) => {
    const accName = h.accounts?.name || '기타';
    const currency = inferCurrency(h.ticker);
    const formattedTicker = formatYahooTicker(h.ticker);
    
    let currentPrice = priceMap[formattedTicker] || h.unit_price;
    if (h.ticker === 'KRW') currentPrice = 1;
    if (h.ticker === 'USD') currentPrice = usdKrwRate;

    const quantity = Number(h.quantity);
    const unitPrice = Number(h.unit_price);
    
    const investedValueOrig = quantity * unitPrice;
    const currentValueOrig = quantity * currentPrice;

    // Convert to KRW
    const investedValueKrw = currency === 'USD' ? investedValueOrig * usdKrwRate : investedValueOrig;
    const currentValueKrw = currency === 'USD' ? currentValueOrig * usdKrwRate : currentValueOrig;
    
    // Profit and Rates
    const profitKrw = currentValueKrw - investedValueKrw;
    const profitRate = investedValueKrw > 0 ? profitKrw / investedValueKrw : 0;

    const holding: AllocationHolding = {
      rowIndex: index,
      accountId: accName,
      subAccount: h.strategy || '',
      name: h.name,
      strategy: h.strategy || '',
      ticker: h.ticker,
      currentPrice: currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 }),
      unitPrice: unitPrice.toLocaleString('en-US', { maximumFractionDigits: 2 }),
      quantity: quantity.toString(),
      investedValue: formatCurrency(investedValueKrw),
      currentValue: formatCurrency(currentValueOrig),
      currentValueKrw: formatCurrency(currentValueKrw),
      profitRate: formatPercent(profitRate),
      weight: '0%', // will calculate later
      history: chartMap[formattedTicker] || []
    };

    if (!allocations[accName]) allocations[accName] = [];
    allocations[accName].push(holding);

    positionDetails.push({
      category: accName,
      name: h.name,
      strategy: h.strategy || '',
      investedKrw: formatCurrency(investedValueKrw),
      investedUsd: currency === 'USD' ? formatCurrency(investedValueOrig) : '0',
      current: formatCurrency(currentValueKrw),
      currentUsd: currency === 'USD' ? formatCurrency(currentValueOrig) : '0',
      profit: formatCurrency(profitKrw),
      returnRate: formatPercent(profitRate),
      country: currency === 'USD' ? '미국' : '한국',
      overallWeight: '0%'
    });

    if (accountSummaries[accName]) {
      accountSummaries[accName].principal += investedValueKrw;
      accountSummaries[accName].current += currentValueKrw;
      if (currency === 'USD') accountSummaries[accName].currentUsd += currentValueOrig;
    }

    totalPrincipal += investedValueKrw;
    totalCurrentValue += currentValueKrw;
    totalCurrentUsd += (currency === 'USD' ? currentValueOrig : currentValueKrw / usdKrwRate);
  });

  // Calculate weights
  positionDetails.forEach(p => {
    const val = Number(p.current.replace(/,/g, ''));
    p.overallWeight = totalCurrentValue > 0 ? formatPercent(val / totalCurrentValue) : '0%';
  });
  
  Object.keys(allocations).forEach(acc => {
    const accTotal = accountSummaries[acc].current;
    allocations[acc].forEach(h => {
      const val = Number(h.currentValueKrw.replace(/,/g, ''));
      h.weight = accTotal > 0 ? formatPercent(val / accTotal) : '0%';
    });
  });

  const accounts: Account[] = Object.values(accountSummaries).filter(a => a.current > 0).map(a => {
    const profit = a.current - a.principal;
    const returnRate = a.principal > 0 ? profit / a.principal : 0;
    return {
      name: a.name,
      principal: formatCurrency(a.principal),
      allocationRatio: totalCurrentValue > 0 ? formatPercent(a.current / totalCurrentValue) : '0%',
      current: formatCurrency(a.current),
      currentUsd: formatCurrency(a.currentUsd),
      profit: formatCurrency(profit),
      returnRate: formatPercent(returnRate)
    };
  });

  const totalProfit = totalCurrentValue - totalPrincipal;
  const totalReturnRate = totalPrincipal > 0 ? totalProfit / totalPrincipal : 0;

  const summary = {
    principal: formatCurrency(totalPrincipal),
    current: formatCurrency(totalCurrentValue),
    currentUsd: formatCurrency(totalCurrentUsd),
    profit: formatCurrency(totalProfit),
    returnRate: formatPercent(totalReturnRate),
    highWaterMark: '0',
    drawdown: '0%',
    highWaterMarkDate: '',
    underwater: '0'
  };

  // 5. Calculate Monthly History
  const monthlyMap: Record<string, any> = {};
  let globalCumulativePrincipal = 0;
  let globalCumulativeProfit = 0;

  monthlyData.forEach((row: any) => {
    const month = row.month;
    const accName = row.accounts?.name || '기타';
    
    if (!monthlyMap[month]) {
      monthlyMap[month] = {
        month,
        monthlyDeposit: 0,
        valuation: 0,
        monthlyProfit: 0,
        detailsMap: {}
      };
    }

    monthlyMap[month].monthlyDeposit += Number(row.deposit);
    monthlyMap[month].valuation += Number(row.valuation);
    monthlyMap[month].monthlyProfit += Number(row.profit);

    monthlyMap[month].detailsMap[accName] = {
      name: accName,
      deposit: Number(row.deposit),
      valuation: Number(row.valuation),
      profit: Number(row.profit),
      profitRate: Number(row.profit_rate),
      cumulativeProfit: Number(row.cumulative_profit),
      twr: Number(row.twr),
      ytd: Number(row.ytd),
      note: row.note || ''
    };
  });

  const monthlyHistory: MonthlyData[] = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)).map((m: any, idx) => {
    globalCumulativePrincipal += m.monthlyDeposit;
    globalCumulativeProfit += m.monthlyProfit;
    const cumulativeReturnRate = globalCumulativePrincipal > 0 ? (globalCumulativeProfit / globalCumulativePrincipal) * 100 : 0;

    const details = accountsData.map((acc: any) => m.detailsMap[acc.name] || {
      name: acc.name, deposit: 0, valuation: 0, profit: 0, profitRate: 0, cumulativeProfit: 0, twr: 0, ytd: 0, note: ''
    });

    return {
      rowIndex: idx + 1,
      month: m.month,
      monthlyDeposit: m.monthlyDeposit,
      cumulativePrincipal: globalCumulativePrincipal,
      valuation: m.valuation,
      monthlyProfit: m.monthlyProfit,
      cumulativeProfit: globalCumulativeProfit,
      profitRate: 0, 
      cumulativeReturnRate,
      twr: 0,
      ytd: 0,
      details
    };
  });

  return { summary, accounts, indices, details: positionDetails, allocations, monthlyHistory };
}
