import { google } from 'googleapis';
import { PortfolioData } from '@/types/portfolio';
import YahooFinance from 'yahoo-finance2';
import { createClient } from '@supabase/supabase-js';
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export async function getPortfolioData(): Promise<PortfolioData> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error('Google Sheets 환경 변수가 설정되지 않았습니다.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  
  // 1. Fetch values for portfolio and allocations, and get grid data for monthly history to retrieve notes
  const [batchResponse, monthlySheetResponse] = await Promise.all([
    sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: ['포트폴리오!A1:Z50', '자산배분현황!A1:U200'],
    }),
    sheets.spreadsheets.get({
      spreadsheetId,
      ranges: ['월별평가액!A1:BL150'],
      includeGridData: true,
    })
  ]);

  const portfolioRows = batchResponse.data.valueRanges?.[0]?.values || [];
  const allocationRows = batchResponse.data.valueRanges?.[1]?.values || [];

  // Parse monthly sheet response into rows and notes
  const monthlySheet = monthlySheetResponse.data.sheets?.[0];
  const gridData = monthlySheet?.data?.[0];
  const rowData = gridData?.rowData || [];

  const monthlyRows: string[][] = [];
  const monthlyNotes: string[][] = [];

  for (let r = 0; r < rowData.length; r++) {
    const row = rowData[r];
    const valRow: string[] = [];
    const noteRow: string[] = [];

    const cells = row.values || [];
    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c];
      valRow.push(cell.formattedValue || '');
      noteRow.push(cell.note || '');
    }
    monthlyRows.push(valRow);
    monthlyNotes.push(noteRow);
  }

  if (portfolioRows.length === 0) {
    throw new Error('데이터가 없습니다.');
  }

  // 1. 총합 요약 (Row 11, index 10)
  const summaryRow = portfolioRows[10] || [];
  const summary = {
    principal: summaryRow[3] || '0',
    current: summaryRow[5] || '0',
    currentUsd: summaryRow[6] || '0',
    profit: summaryRow[7] || '0',
    returnRate: summaryRow[8] || '0',
    highWaterMark: summaryRow[9] || '0',
    drawdown: summaryRow[10] || '0%',
    highWaterMarkDate: summaryRow[11] || '',
    underwater: summaryRow[12] || '0',
  };

  // 2. 계좌별 요약 (Row 3~10, index 2~9)
  const accounts = [];
  
  for (let i = 2; i <= 9; i++) {
    const row = portfolioRows[i];
    if (!row) continue;

    if (row[0] && row[0].trim() !== '') {
      accounts.push({
        name: row[0],
        principal: row[3] || '0',
        allocationRatio: row[4] || '0',
        current: row[5] || '0',
        currentUsd: row[6] || '0',
        profit: row[7] || '0',
        returnRate: row[8] || '0',
      });
    }
  }

  // Fetch Market Indices using Yahoo Finance
  const targetIndices = [
    { symbol: '^IXIC', name: 'NASDAQ' },
    { symbol: '^GSPC', name: 'S&P 500' },
    { symbol: '^KS11', name: 'KOSPI' },
    { symbol: '^KQ11', name: 'KOSDAQ' },
    { symbol: 'KRW=X', name: 'USD/KRW 환율' },
    { symbol: 'BTC-USD', name: '비트코인' }
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
      console.error(`Error fetching data for ${target.symbol}:`, err);
      return {
        name: target.name,
        ticker: target.symbol,
        current: 'N/A',
        change: 'N/A',
        history: []
      };
    }
  }));

  // 3. 종목별 상세 현황 (Row 15~, index 14~)
  let details = [];
  for (let i = 14; i < portfolioRows.length; i++) {
    const row = portfolioRows[i];
    if (!row || !row[0] || row[0] === '' || row[0] === '계좌' || row[0].includes('계좌')) continue;

    details.push({
      category: row[0],
      name: row[1] || row[2],
      strategy: row[2] || '', 
      investedKrw: row[3] || '0',
      investedUsd: row[4] || '0',
      current: row[5] || '0',
      currentUsd: row[6] || '0',
      profit: row[7] || '0',
      returnRate: row[8] || '0',
      country: row[13] || '',
      overallWeight: row[17] || '0',
    });
  }

  // 4. 자산배분현황 파싱
  const allocations: Record<string, any[]> = {};
  let currentAccountId = "";
  const DB_TARGET_ACCOUNTS = ['현주주식', '동민주식', '현주절세', '동민절세', '동민코인'];

  const getCanonicalAccountName = (sheetHeaderName: string) => {
    const map: Record<string, string> = {
      '현주 위탁계좌': '현주주식',
      '동민 위탁계좌': '동민주식',
      '현주 절세계좌': '현주절세',
      '동민 절세계좌': '동민절세',
      '암호화폐': '동민코인',
      '현금': '현금'
    };
    return map[sheetHeaderName] || sheetHeaderName;
  };

  for (let i = 0; i < allocationRows.length; i++) {
    const row = allocationRows[i];
    if (!row) continue;

    // Detect Account Header
    if (row[1] && row[1] !== "자산" && row[1] !== "평가손익" && !row[6]) {
       const rawHeader = row[1].trim();
       currentAccountId = getCanonicalAccountName(rawHeader);
       if (!allocations[currentAccountId]) {
         allocations[currentAccountId] = [];
       }
       continue;
    }

    // Detect Holding
    if (currentAccountId && row[6] && row[6] !== "현재가") {
       // DB 전환 계좌는 시트에서 읽지 않고 스킵
       if (DB_TARGET_ACCOUNTS.includes(currentAccountId)) continue;

       allocations[currentAccountId].push({
         rowIndex: i + 1, // Store the 1-indexed row number of this holding
         accountId: currentAccountId,
         subAccount: row[1] || '',
         strategy: row[3] || '',
         name: row[4] || row[3] || '',
         ticker: row[5] || '',
         currentPrice: row[6] || '',
         unitPrice: row[8] || '',
         quantity: row[9] || '',
         investedValue: row[10] || '',
         currentValue: row[11] || '',
         currentValueKrw: row[12] || '',
         profitRate: row[13] || '',
         weight: row[14] || '',
       });
    }
  }

  // 4-1. Fetch Target Accounts from Supabase DB
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    global: {
      fetch: (url: any, options: any) => fetch(url, { ...options, cache: 'no-store' })
    }
  });
  
  const accountIdMap: Record<number, string> = {
    1: '현주주식',
    2: '동민주식',
    3: '현주절세',
    4: '동민절세',
    5: '동민코인'
  };

  const { data: dbHoldings } = await supabase
    .from('holdings')
    .select('*')
    .in('account_id', [1, 2, 3, 4, 5])
    .order('row_index', { ascending: true });

  if (dbHoldings) {
    const formatYahooTickerLocal = (ticker: string): string => {
      let t = ticker.trim().toUpperCase();
      if (!t) return "";
      if (/^\d{6}$/.test(t)) return `${t}.KS`;
      if (/^(BTC|ETH|SOL|XRP|DOGE|ADA)KRW$/.test(t)) return t.replace(/^(BTC|ETH|SOL|XRP|DOGE|ADA)KRW$/, "$1-KRW");
      if (t === "USDT") return "USDT-USD";
      if (t === "USDC") return "USDC-USD";
      if (t === "BTC") return "BTC-USD";
      if (t === "ETH") return "ETH-USD";
      return t.replace(/\./g, "-");
    };

    const isUsdTicker = (ticker: string) => {
      if (!ticker) return false;
      const t = ticker.trim().toUpperCase();
      if (t === 'USD') return true;
      if (t === 'KRW' || t === 'UNKNOWN') return false;
      if (/^\d{6}$/.test(t)) return false; 
      if (/KRW$/.test(t)) return false; 
      return true; 
    };

    const dbTickers: string[] = Array.from(new Set(dbHoldings.map((h: any) => h.ticker).filter((t: any) => typeof t === 'string' && t !== 'UNKNOWN' && t !== 'KRW' && t !== 'USD')));
    
    // Fetch quotes concurrently
    const quotesArr = await Promise.allSettled(dbTickers.map((t: any) => yahooFinance.quote(formatYahooTickerLocal(t))));
    const quotesMap: Record<string, number> = {};
    quotesArr.forEach((res: any, i: number) => {
      if (res.status === 'fulfilled' && res.value && res.value.regularMarketPrice) {
        quotesMap[dbTickers[i]] = res.value.regularMarketPrice;
      }
    });

    const krwQuote = await yahooFinance.quote('KRW=X').catch(() => null);
    const exchangeRate = krwQuote?.regularMarketPrice || 1400;

    for (const h of dbHoldings) {
      const accName = accountIdMap[h.account_id];
      if (!accName) continue;
      
      if (!allocations[accName]) allocations[accName] = [];
      
      const isUsd = isUsdTicker(h.ticker);
      let currentPriceNum = h.unit_price; 
      if (h.ticker === 'USD') currentPriceNum = exchangeRate;
      else if (quotesMap[h.ticker]) currentPriceNum = quotesMap[h.ticker];

      const investedVal = h.unit_price * h.quantity;
      const currentVal = currentPriceNum * h.quantity;
      let currentValKrw = currentVal;
      if (isUsd) currentValKrw = currentVal * exchangeRate;

      let profitRateNum = 0;
      if (investedVal > 0) profitRateNum = (currentVal / investedVal) - 1;

      const formatNum = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
      const formatKrw = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
      
      allocations[accName].push({
        rowIndex: h.row_index,
        accountId: accName,
        subAccount: h.sub_account || '',
        strategy: h.strategy || '',
        name: h.name || '',
        ticker: h.ticker || '',
        currentPrice: formatNum(currentPriceNum),
        unitPrice: formatNum(h.unit_price),
        quantity: Number(h.quantity).toLocaleString('en-US', { maximumFractionDigits: 8 }),
        investedValue: formatNum(investedVal),
        currentValue: formatNum(currentVal),
        currentValueKrw: (accName === '현주주식' || accName === '동민주식') ? formatKrw(currentValKrw) : formatNum(currentValKrw),
        profitRate: (profitRateNum * 100).toFixed(2) + '%',
        weight: '0%', 
        currency: h.currency || (isUsd ? 'USD' : 'KRW'),
      });
    }

    // 4-2. Override Top-Level Summaries with Live DB Values
    let totalCurrentDiff = 0;
    let totalUsdDiff = 0;
    
    const formatInt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    const formatUsd = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const parseCurrency = (val: string) => {
      if (!val || typeof val !== 'string') return 0;
      const num = Number(val.replace(/[^0-9.-]+/g, ''));
      return isNaN(num) ? 0 : num;
    };

    accounts.forEach(acc => {
      if (DB_TARGET_ACCOUNTS.includes(acc.name)) {
        const hList = allocations[acc.name] || [];
        let newCurrent = 0;
        let newCurrentUsd = 0;
        
        hList.forEach(h => {
          newCurrent += parseCurrency(h.currentValueKrw);
          const isUsd = isUsdTicker(h.ticker);
          if (isUsd) newCurrentUsd += parseCurrency(h.currentValue);
        });
        
        const oldCurrent = parseCurrency(acc.current);
        const oldCurrentUsd = parseCurrency(acc.currentUsd);
        
        totalCurrentDiff += (newCurrent - oldCurrent);
        totalUsdDiff += (newCurrentUsd - oldCurrentUsd);
        
        const oldPrincipal = parseCurrency(acc.principal);
        const newProfit = newCurrent - oldPrincipal;
        
        acc.current = formatInt(newCurrent);
        acc.currentUsd = formatUsd(newCurrentUsd);
        acc.profit = formatInt(newProfit);
        acc.returnRate = oldPrincipal > 0 ? ((newProfit / oldPrincipal) * 100).toFixed(2) + '%' : '0.00%';
      }
    });

    // Rebuild details for DB categories
    const dbDetails: any[] = [];
    const groupedHoldings: Record<string, {
      category: string,
      name: string,
      strategy: string,
      country: string,
      isUsd: boolean,
      investedNative: number,
      currentNative: number,
      currentKrw: number
    }> = {};

    dbHoldings.forEach((h: any) => {
      const isUsd = isUsdTicker(h.ticker) || h.currency === 'USD';
      let currentPriceNum = h.unit_price; 
      if (h.ticker === 'USD') currentPriceNum = exchangeRate;
      else if (quotesMap[h.ticker]) currentPriceNum = quotesMap[h.ticker];

      const invVal = h.unit_price * h.quantity;
      const curVal = currentPriceNum * h.quantity;
      const curValKrw = isUsd ? curVal * exchangeRate : curVal;

      let category = '';
      let groupKey = '';
      let name = '';
      let strategy = h.strategy || '';
      let country = '';

      if (h.account_id === 1 || h.account_id === 2) {
        category = '주식';
        country = '미국';
        name = h.ticker;
        groupKey = `주식_${name}`;
      } else if (h.account_id === 3 || h.account_id === 4) {
        category = '절세';
        country = '한국';
        name = strategy; // name fallback to strategy
        groupKey = `절세_${strategy}`;
      } else if (h.account_id === 5) {
        category = '동민코인';
        country = '한국';
        name = h.ticker;
        groupKey = `동민코인_${name}`;
      } else {
        return;
      }

      if (!groupedHoldings[groupKey]) {
        groupedHoldings[groupKey] = {
          category, name, strategy, country, isUsd,
          investedNative: 0, currentNative: 0, currentKrw: 0
        };
      }
      groupedHoldings[groupKey].investedNative += invVal;
      groupedHoldings[groupKey].currentNative += curVal;
      groupedHoldings[groupKey].currentKrw += curValKrw;
    });

    const formatPct = (n: number) => (n * 100).toFixed(1) + '%';
    const formatCur = (n: number, isUsd: boolean) => isUsd ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '₩' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });

    Object.values(groupedHoldings).forEach(g => {
      const profit = g.currentNative - g.investedNative;
      const returnRate = g.investedNative > 0 ? (profit / g.investedNative) : 0;
      
      const item: any = {
        category: g.category,
        name: g.name,
        strategy: g.strategy,
        country: g.country,
        profit: formatCur(profit, g.isUsd),
        returnRate: formatPct(returnRate),
        _currentKrw: g.currentKrw // Temp for overallWeight
      };

      if (g.isUsd) {
        item.investedUsd = formatCur(g.investedNative, true);
        item.investedKrw = '';
        item.currentUsd = formatCur(g.currentNative, true);
        item.current = formatCur(g.currentKrw, false);
      } else {
        item.investedUsd = '';
        item.investedKrw = formatCur(g.investedNative, false);
        item.currentUsd = '';
        item.current = formatCur(g.currentNative, false);
      }
      dbDetails.push(item);
    });

    const sumOldPrincipal = parseCurrency(summary.principal);
    const sumOldCurrent = parseCurrency(summary.current);
    const sumOldCurrentUsd = parseCurrency(summary.currentUsd);
    
    const sumNewCurrent = sumOldCurrent + totalCurrentDiff;
    const sumNewCurrentUsd = sumOldCurrentUsd + totalUsdDiff;
    const sumNewProfit = sumNewCurrent - sumOldPrincipal;
    
    summary.current = formatInt(sumNewCurrent);
    summary.currentUsd = formatUsd(sumNewCurrentUsd);
    summary.profit = formatInt(sumNewProfit);
    summary.returnRate = sumOldPrincipal > 0 ? ((sumNewProfit / sumOldPrincipal) * 100).toFixed(2) + '%' : '0.00%';

    // Combine and calculate overallWeight
    dbDetails.forEach(d => {
      d.overallWeight = sumNewCurrent > 0 ? formatPct(d._currentKrw / sumNewCurrent) : '0%';
    });
    const sheetDetails = details.filter(d => !['주식', '절세', '동민코인'].includes(d.category));
    const categoryOrder = ['주식', '절세', '동민코인', '동민기타', '채원주식'];
    details = [...dbDetails, ...sheetDetails].sort((a, b) => {
      const idxA = categoryOrder.indexOf(a.category);
      const idxB = categoryOrder.indexOf(b.category);
      const orderA = idxA !== -1 ? idxA : 999;
      const orderB = idxB !== -1 ? idxB : 999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      const wA = parseFloat(a.overallWeight || '0');
      const wB = parseFloat(b.overallWeight || '0');
      return wB - wA; // descending
    });
  }

  // 5. 월별평가액 파싱
  const monthlyHistory = [];
  const accountNames = ['현금', '현주주식', '동민주식', '동민연금', '현주연금', '동민코인', '기타'];
  
  let cumulativePrincipal = 0;
  let cumulativeProfit = 0;

  for (let i = 2; i < monthlyRows.length; i++) {
    const row = monthlyRows[i];
    if (!row || !row[0] || row[0].trim() === '') continue;

    // 계좌별 적립액(Column B~H / index 1~7)이 입력되지 않은 평가월은 제외합니다.
    const hasDeposits = Array.from({ length: 7 }, (_, idx) => row[1 + idx]).some(val => val !== undefined && val.trim() !== '');
    if (!hasDeposits) continue;

    const parseCurrency = (val: string) => {
      if (!val) return 0;
      return Number(val.replace(/[^0-9.-]+/g, ''));
    };
    
    const parsePercent = (val: string) => {
      if (!val) return 0;
      return Number(val.replace(/[^0-9.-]+/g, ''));
    };

    const monthStr = row[0].trim();
    const valuation = parseCurrency(row[16]);
    const monthlyDeposit = parseCurrency(row[8]);
    const monthlyProfit = parseCurrency(row[25]);
    
    const profitRate = row[33] ? parsePercent(row[33]) : 0;
    const twr = row[49] ? parsePercent(row[49]) : 0;
    const ytd = row[57] ? parsePercent(row[57]) : 0;
    
    cumulativePrincipal += monthlyDeposit;
    cumulativeProfit += monthlyProfit;

    const cumulativeReturnRate = cumulativePrincipal > 0 ? (cumulativeProfit / cumulativePrincipal) * 100 : 0;

    const details = accountNames.map((name, idx) => ({
      name,
      deposit: parseCurrency(row[1 + idx]),
      valuation: parseCurrency(row[9 + idx]),
      profit: parseCurrency(row[18 + idx]),
      profitRate: (row[26 + idx] && row[26 + idx].trim() !== '') ? parsePercent(row[26 + idx]) : 0,
      cumulativeProfit: (row[34 + idx] && row[34 + idx].trim() !== '') ? parseCurrency(row[34 + idx]) : 0,
      twr: (row[42 + idx] && row[42 + idx].trim() !== '') ? parsePercent(row[42 + idx]) : 0,
      ytd: (row[50 + idx] && row[50 + idx].trim() !== '') ? parsePercent(row[50 + idx]) : 0,
      note: monthlyNotes[i]?.[1 + idx] || '',
    }));

    monthlyHistory.push({
      rowIndex: i + 1,
      month: monthStr,
      monthlyDeposit,
      cumulativePrincipal,
      valuation,
      monthlyProfit,
      cumulativeProfit,
      profitRate,
      cumulativeReturnRate,
      twr,
      ytd,
      details,
    });
  }

  // 6. 각 종목별 1년 역사적 차트 데이터 페칭 및 바인딩
  const formatYahooTicker = (ticker: string): string => {
    let t = ticker.trim().toUpperCase();
    if (!t) return "";

    // 1. 한국 주식/ETF (6자리 숫자형) -> .KS (KOSPI) 접미사 부여
    if (/^\d{6}$/.test(t)) {
      return `${t}.KS`;
    }

    // 2. KRW 마켓 가상자산 (예: BTCKRW -> BTC-KRW)
    if (/^(BTC|ETH|SOL|XRP|DOGE|ADA)KRW$/.test(t)) {
      return t.replace(/^(BTC|ETH|SOL|XRP|DOGE|ADA)KRW$/, "$1-KRW");
    }

    // 3. 주요 스태이블코인 및 기축 통화 가상자산
    if (t === "USDT") return "USDT-USD";
    if (t === "USDC") return "USDC-USD";
    if (t === "BTC") return "BTC-USD";
    if (t === "ETH") return "ETH-USD";

    // 4. 미국 클래스 주식 (예: BRK.B -> BRK-B)
    return t.replace(/\./g, "-");
  };

  const tickers = new Set<string>();
  const rawToFormattedTicker: Record<string, string> = {};

  Object.values(allocations).forEach(holdingList => {
    holdingList.forEach(h => {
      if (h.ticker && h.ticker !== "USD" && h.ticker !== "KRW" && !h.ticker.includes("원") && !h.ticker.includes("현금")) {
        const cleanTicker = h.ticker.replace(/=HYPERLINK\(.*,"(.*)"\)/, "$1").trim();
        if (cleanTicker) {
          const formatted = formatYahooTicker(cleanTicker);
          if (formatted) {
            tickers.add(formatted);
            rawToFormattedTicker[cleanTicker] = formatted;
          }
        }
      }
    });
  });

  const tickerCharts: Record<string, any[]> = {};
  await Promise.all(Array.from(tickers).map(async (ticker) => {
    try {
      const chart = await yahooFinance.chart(ticker, { period1: oneYearAgo, interval: '1wk' });
      if (chart.quotes) {
        tickerCharts[ticker] = chart.quotes
          .filter(q => q.close !== null)
          .map(q => ({
            date: q.date.toISOString(),
            value: q.close as number
          }));
      }
    } catch (err) {
      console.error(`Error fetching chart for ticker ${ticker}:`, err);
    }
  }));

  Object.keys(allocations).forEach(accountId => {
    allocations[accountId] = allocations[accountId].map(h => {
      if (!h.ticker) return { ...h, history: [] };
      const cleanTicker = h.ticker.replace(/=HYPERLINK\(.*,"(.*)"\)/, "$1").trim();
      const formatted = rawToFormattedTicker[cleanTicker] || cleanTicker;
      return {
        ...h,
        history: tickerCharts[formatted] || []
      };
    });

    // Sort items within account by evaluation amount (currentValueKrw) descending
    allocations[accountId].sort((a, b) => {
      const valA = parseFloat(String(a.currentValueKrw || '0').replace(/[^0-9.-]+/g, ''));
      const valB = parseFloat(String(b.currentValueKrw || '0').replace(/[^0-9.-]+/g, ''));
      return valB - valA;
    });
  });

  return { summary, accounts, indices, details, allocations, monthlyHistory };
}
