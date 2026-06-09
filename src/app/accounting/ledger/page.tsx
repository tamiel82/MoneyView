'use client';

import { useState, useEffect } from 'react';
import { Loader2, Calendar } from 'lucide-react';

export default function LedgerPage() {
  const [year, setYear] = useState(new Date('2026-04-01').getFullYear());
  const [transactions, setTransactions] = useState<any[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    income: false,
    business: false,
    daily: false,
    fixed: false,
    nonConsumption: false,
    savings: false,
  });

  const toggleSection = (section: 'income' | 'business' | 'daily' | 'fixed' | 'nonConsumption' | 'savings') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    fetchData();
  }, [year]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [txRes, pfRes, statRes] = await Promise.all([
        fetch(`/api/accounting/yearly?year=${year}`),
        fetch('/api/portfolio'),
        fetch(`/api/accounting/monthly-stats?all=true`)
      ]);
      
      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data.transactions || []);
      }
      if (pfRes.ok) {
        const pfData = await pfRes.json();
        setPortfolioStats(pfData.monthlyHistory || []);
      }
      if (statRes.ok) {
        const data = await statRes.json();
        setMonthlyStats(data.stats || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Evaluate Expression Safely
  const parseExpression = (expr: string) => {
    try {
      if (!expr) return 0;
      return new Function(`return ${expr.replace(/[^0-9+\-*/.]/g, '')}`)() || 0;
    } catch {
      return 0;
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Helper functions for categorization (same logic as dashboard)
  const isBusinessExpense = (t: any) => {
    const businessCategories = ['사업세금', '기타경비', '사업지출', '동주', '더엠제이'];
    if (businessCategories.some(bc => (t.category || '').includes(bc))) return true;
    if (t.category === '국내구매' && (t.businessNum === '동주' || t.businessNum === '더엠제이')) return true;
    return false;
  };

  const isDailyExpense = (t: any) => ['음식', '물건', '몸', '취미', '경험', '관계', '기타'].includes(t.category);
  const isFixedExpense = (t: any) => ['관리비', '통신비', '교통비', '세금'].includes(t.category);

  const getMonthStr = (m: number) => `${year}-${String(m).padStart(2, '0')}`;
  const getPortfolioMonthStr1 = (m: number) => `${year}.${String(m).padStart(2, '0')}.`;
  const getPortfolioMonthStr2 = (m: number) => `${year}. ${m}.`;

  // Get current transactions for a month, excluding '미분류'
  const getValidTx = (m: number) => transactions.filter(t => t.date.startsWith(getMonthStr(m)) && t.category && t.category !== '미분류');

  const getMonthlyData = (m: number) => {
    const mStr = getMonthStr(m);
    
    const tx = getValidTx(m);
    const incomeList = tx.filter(t => t.type === 'INCOME');
    const expenseList = tx.filter(t => t.type === 'EXPENSE');

    // 1. 소득
    let incDongju = 0, incTheMj = 0, incEtc = 0;
    incomeList.forEach(t => {
      if (t.category !== '기타' && t.businessNum === '동주') incDongju += t.amount;
      else if (t.category !== '기타' && t.businessNum === '더엠제이') incTheMj += t.amount;
      else incEtc += t.amount;
    });
    const totalIncome = incDongju + incTheMj + incEtc;

    // 2. 사업지출
    const bExp = expenseList.filter(isBusinessExpense);
    let bexDongju = 0, bexTheMj = 0, bexTax = 0, bexEtc = 0;
    bExp.forEach(t => {
      if (t.category === '국내구매' && t.businessNum === '동주') bexDongju += t.amount;
      else if (t.category === '국내구매' && t.businessNum === '더엠제이') bexTheMj += t.amount;
      else if (t.category === '동주') bexDongju += t.amount;
      else if (t.category === '더엠제이') bexTheMj += t.amount;
      else if (t.category === '사업세금') bexTax += t.amount;
      else bexEtc += t.amount;
    });
    const totalBusinessExp = bexDongju + bexTheMj + bexTax + bexEtc;

    // 3. 소비성 지출
    const pExp = expenseList.filter(t => !isBusinessExpense(t));
    
    const legacyDailyMap: Record<string, string> = { '외식': '음식', '커피': '음식', '간식': '음식', '주류': '음식', '와인': '음식', '생활용품': '물건', '가전가구': '물건', '의류': '물건', '기타물품': '물건', '해외구매': '물건', '국내구매': '물건', '미용': '몸', '건강': '몸', '문화': '경험', '자기계발': '경험', '여행': '경험', '경조사': '관계' };
    const legacyFixedMap: Record<string, string> = { '대중교통': '교통비', '차량유지비': '교통비', '자동차': '교통비' };

    const dailyBreakdown: Record<string, number> = { 음식: 0, 물건: 0, 몸: 0, 취미: 0, 경험: 0, 관계: 0, 기타: 0 };
    const fixedBreakdown: Record<string, number> = { 관리비: 0, 통신비: 0, 교통비: 0, 세금: 0 };

    pExp.forEach(t => {
      if (isDailyExpense(t)) {
        dailyBreakdown[t.category] += t.amount;
      } else if (legacyDailyMap[t.category]) {
        dailyBreakdown[legacyDailyMap[t.category]] += t.amount;
      } else if (isFixedExpense(t)) {
        fixedBreakdown[t.category] += t.amount;
      } else if (legacyFixedMap[t.category]) {
        fixedBreakdown[legacyFixedMap[t.category]] += t.amount;
      } else if (!['대출', '대출이자', '보험', '부모님', '투자분배금', '원금상환', '청약', '투자', '주식'].includes(t.category)) {
        dailyBreakdown['기타'] += t.amount;
      }
    });

    const cDaily = Object.values(dailyBreakdown).reduce((a, b) => a + b, 0);
    const cFixed = Object.values(fixedBreakdown).reduce((a, b) => a + b, 0);
    const totalConsumption = cDaily + cFixed;

    // 4. 비소비성 지출
    const loanExpenses = pExp.filter(t => t.category === '대출' || t.category === '대출이자');
    const samsungLoans = loanExpenses.filter(t => (t.content || '').includes('삼성화재대출'));
    const principalRepayment = samsungLoans.length > 0 ? Math.min(...samsungLoans.map(t => t.amount)) : 0;
    const ncLoanInterest = loanExpenses.reduce((s, t) => s + t.amount, 0) - principalRepayment;

    const ncInsurance = pExp.filter(t => t.category === '보험').reduce((s, t) => s + t.amount, 0);
    const ncParents = pExp.filter(t => t.category === '부모님').reduce((s, t) => s + t.amount, 0);
    const ncInvestDist = pExp.filter(t => t.category === '투자분배금').reduce((s, t) => s + t.amount, 0);

    const totalNonConsumption = ncLoanInterest + ncInsurance + ncParents + ncInvestDist;

    // 5. 가처분 소득 & 순수익
    const disposable = totalIncome - totalBusinessExp;
    const netProfit = disposable - totalConsumption - totalNonConsumption;

    // 6. Portfolio & Assets
    const targetKey = `${year}${String(m).padStart(2, '0')}`;
    const pf = portfolioStats.find((s: any) => {
      const digits = (s.month || '').replace(/\D/g, '');
      const key = digits.length === 5 ? digits.substring(0, 4) + '0' + digits.substring(4) : digits;
      return key === targetKey;
    }) || {};
    const pfProfit = pf.monthlyProfit || 0;
    const financialAsset = pf.valuation || 0;
    const monthlyDeposit = pf.monthlyDeposit || 0; // 투자

    // 4.5 저축
    const savingsCategories = ['청약', '주식'];
    const savingsBreakdown: Record<string, number> = {
      원금상환: principalRepayment,
      투자: monthlyDeposit,
      청약: pExp.filter(t => t.category === '청약').reduce((s, t) => s + t.amount, 0),
      주식: pExp.filter(t => t.category === '주식').reduce((s, t) => s + t.amount, 0),
    };
    const totalSavings = Object.values(savingsBreakdown).reduce((a, b) => a + b, 0);

    // To find realEstate/liabilities, if not in this month, find most recent past month
    const validStats = monthlyStats.filter((s: any) => s.month <= mStr).sort((a: any, b: any) => b.month.localeCompare(a.month));
    const closestStat = validStats.length > 0 ? validStats[0] : { real_estate: 0, liability_expr: '0' };
    
    const realEstate = closestStat.real_estate || 0;
    const totalAssets = financialAsset + realEstate;
    const liabilities = parseExpression(closestStat.liability_expr);
    const netAssets = totalAssets - liabilities;

    return {
      totalIncome, incDongju, incTheMj, incEtc,
      totalBusinessExp, bexDongju, bexTheMj, bexTax, bexEtc,
      totalConsumption, cDaily, cFixed,
      totalNonConsumption, ncLoanInterest, ncInsurance, ncParents, ncInvestDist,
      disposable, netProfit, pfProfit,
      financialAsset, realEstate, totalAssets, liabilities, netAssets,
      dailyBreakdown, fixedBreakdown,
      totalSavings, savingsBreakdown
    };
  };

  const rowsData = months.map(m => getMonthlyData(m));

  const getValForMonth = (m: number, key: string, data: any) => {
    const isTargetRow = ['netProfit', 'pfProfit', 'totalAssets', 'financialAsset', 'realEstate', 'liabilities', 'netAssets'].includes(key);
    if (isTargetRow && getValidTx(m).length === 0) {
      return null;
    }
    return data[key];
  };

  const getRowStats = (key: string, section?: 'daily' | 'fixed' | 'savings', catKey?: string) => {
    let values: number[] = [];
    months.forEach(m => {
      const hasTx = getValidTx(m).length > 0;
      const isTargetRow = ['netProfit', 'pfProfit', 'totalAssets', 'financialAsset', 'realEstate', 'liabilities', 'netAssets'].includes(key);
      
      if (isTargetRow && !hasTx) {
        return;
      }
      
      if (!hasTx) {
        return;
      }

      const data = rowsData[m - 1];
      if (!data) return;

      let val = 0;
      if (section === 'daily') {
        val = data.dailyBreakdown?.[catKey!] || 0;
      } else if (section === 'fixed') {
        val = data.fixedBreakdown?.[catKey!] || 0;
      } else if (section === 'savings') {
        val = data.savingsBreakdown?.[catKey!] || 0;
      } else {
        val = (data as any)[key] || 0;
      }
      values.push(val);
    });

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = values.length > 0 ? Math.round(sum / values.length) : 0;
    const count = values.length;

    return { sum, avg, count };
  };

  const renderRow = (
    label: string, 
    key: string, 
    options?: {
      isHeader?: boolean;
      isSubHeader?: boolean;
      colorClass?: string;
      isHighlighted?: boolean;
      onClick?: () => void;
      hasChevron?: boolean;
      isOpen?: boolean;
      rowBgClass?: string;
      stickyBgClass?: string;
      textStyle?: string;
      borderStyle?: string;
      paddingStyle?: string;
    }
  ) => {
    const stats = getRowStats(key);
    const isSummaryRow = ['disposable', 'netProfit', 'pfProfit', 'totalAssets', 'financialAsset', 'realEstate', 'liabilities', 'netAssets'].includes(key);
    
    if (!isSummaryRow && stats.sum === 0) return null;

    const opt = options || {};
    
    // Default style calculations
    const rowBgClass = opt.rowBgClass || (
      opt.isHighlighted 
        ? 'bg-blue-950/40 text-blue-300 border-y border-blue-500/20 font-bold' 
        : opt.isHeader 
          ? `font-bold bg-white/5 ${opt.colorClass || ''}` 
          : opt.isSubHeader 
            ? 'font-semibold bg-black/20 text-muted-foreground' 
            : 'text-muted-foreground'
    );

    const stickyBgClass = opt.stickyBgClass || (
      opt.isHighlighted 
        ? 'bg-[#15233c]' 
        : opt.isHeader 
          ? 'bg-[#1a202c]' 
          : opt.isSubHeader 
            ? 'bg-[#161c28]' 
            : 'bg-[#111827]'
    );

    const borderStyle = opt.borderStyle || 'border-b border-white/10';
    const paddingStyle = opt.paddingStyle || 'px-2 sm:px-4 py-2 sm:py-3';
    const textStyle = opt.textStyle || '';

    const sumColor = key === 'netProfit' || key === 'pfProfit'
      ? (stats.sum > 0 ? 'text-rose-400' : stats.sum < 0 ? 'text-blue-400' : '')
      : '';
    const avgColor = key === 'netProfit' || key === 'pfProfit'
      ? (stats.avg > 0 ? 'text-rose-400' : stats.avg < 0 ? 'text-blue-400' : '')
      : '';

    const isSnapshot = ['totalAssets', 'financialAsset', 'realEstate', 'liabilities', 'netAssets'].includes(key);

    return (
      <tr className={`${borderStyle} hover:bg-white/5 ${rowBgClass}`}>
        <td 
          className={`${paddingStyle} border-r border-white/10 sticky left-0 z-10 ${stickyBgClass} shadow-[2px_0_5px_rgba(0,0,0,0.3)] min-w-[120px] lg:min-w-[180px] ${!opt.isHeader && !opt.isSubHeader ? 'pl-4 sm:pl-8' : ''} ${opt.onClick ? 'cursor-pointer hover:text-foreground transition-colors' : ''} ${textStyle}`}
          onClick={opt.onClick}
        >
          <div className="flex items-center gap-1.5">
            {opt.hasChevron && (
              <span className="text-[10px] text-muted-foreground shrink-0 transition-transform duration-200" style={{ transform: opt.isOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>
                ▶
              </span>
            )}
            <span>{label}</span>
          </div>
        </td>
        <td className={`${paddingStyle} text-right border-r border-white/10 font-bold ${sumColor || opt.colorClass || 'text-foreground'} ${textStyle}`}>
          {isSnapshot ? '-' : stats.sum.toLocaleString()}
        </td>
        <td className={`${paddingStyle} text-right border-r border-white/10 font-bold ${avgColor || 'text-muted-foreground/80'} ${textStyle}`}>
          {isSnapshot ? '-' : stats.avg.toLocaleString()}
        </td>
        {rowsData.map((data: any, idx) => {
          const m = idx + 1;
          const val = getValForMonth(m, key, data);
          let cellColor = '';
          if (val !== null && (key === 'netProfit' || key === 'pfProfit') && val !== 0) {
            cellColor = val > 0 ? 'text-rose-400' : 'text-blue-400';
          }
          return (
            <td key={idx} className={`${paddingStyle} text-right border-r border-white/10 ${textStyle} ${val === null || val === 0 ? 'opacity-30' : cellColor}`}>
              {val !== null && val !== 0 ? val.toLocaleString() : '-'}
            </td>
          );
        })}
      </tr>
    );
  };

  const renderSubRow = (label: string, section: 'daily' | 'fixed' | 'savings', catKey: string) => {
    const stats = getRowStats('', section, catKey);
    if (stats.sum === 0) return null;

    return (
      <tr className="border-b border-white/5 hover:bg-white/5 text-xs text-muted-foreground/80 bg-black/10">
        <td className="px-2 sm:px-4 py-1.5 sm:py-2 border-r border-white/10 sticky left-0 z-10 bg-[#161c28] shadow-[2px_0_5px_rgba(0,0,0,0.3)] min-w-[120px] lg:min-w-[180px] pl-6 sm:pl-12 font-medium">
          └ {label}
        </td>
        <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right border-r border-white/10 font-bold text-foreground">
          {stats.sum.toLocaleString()}
        </td>
        <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right border-r border-white/10 font-bold text-muted-foreground/80">
          {stats.avg.toLocaleString()}
        </td>
        {rowsData.map((data: any, idx) => {
          const val = section === 'daily' 
            ? data.dailyBreakdown[catKey] 
            : section === 'fixed' 
              ? data.fixedBreakdown[catKey] 
              : data.savingsBreakdown[catKey];
          return (
            <td key={idx} className={`px-2 sm:px-4 py-1.5 sm:py-2 text-right border-r border-white/10 ${val === 0 ? 'opacity-30' : ''}`}>
              {val !== 0 ? val.toLocaleString() : '-'}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="p-2 sm:p-8 max-w-[1600px] mx-auto w-full">
      <div className="flex justify-between items-center mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3 text-foreground">
          <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-primary shrink-0" />
          <span>
            <span className="hidden sm:inline">{year}년 연도별 결산</span>
            <span className="sm:hidden">{year}년</span>
          </span>
        </h1>
        
        <div className="flex bg-black/20 rounded-lg p-1 border border-white/5">
          {[year - 1, year, year + 1].map(y => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${y === year ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
            >
              {y}년
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="glass-card shadow-sm border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-black/40 border-b border-white/10 text-muted-foreground">
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-bold min-w-[120px] lg:min-w-[180px] border-r border-white/10 sticky left-0 z-20 bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">구분</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-bold border-r border-white/10 bg-primary/10 text-primary min-w-[120px]">연간 합계</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-bold border-r border-white/10 bg-emerald-500/10 text-emerald-400 min-w-[120px]">월별 평균</th>
                  {months.map(m => (
                    <th key={m} className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold min-w-[110px] border-r border-white/10">{m}월</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* 1. Income */}
                {getRowStats('totalIncome').sum > 0 && (
                  <>
                    {renderRow('소득 합계', 'totalIncome', { isHeader: true, colorClass: 'text-blue-400', onClick: () => toggleSection('income'), hasChevron: true, isOpen: expandedSections.income })}
                    {expandedSections.income && (
                      <>
                        {renderRow('동주', 'incDongju')}
                        {renderRow('더엠제이', 'incTheMj')}
                        {renderRow('기타', 'incEtc')}
                      </>
                    )}
                  </>
                )}

                {/* 2. Business */}
                {getRowStats('totalBusinessExp').sum > 0 && (
                  <>
                    {renderRow('사업지출 합계', 'totalBusinessExp', { isHeader: true, colorClass: 'text-rose-400', onClick: () => toggleSection('business'), hasChevron: true, isOpen: expandedSections.business })}
                    {expandedSections.business && (
                      <>
                        {renderRow('동주', 'bexDongju')}
                        {renderRow('더엠제이', 'bexTheMj')}
                        {renderRow('사업세금', 'bexTax')}
                        {renderRow('기타경비', 'bexEtc')}
                      </>
                    )}
                  </>
                )}

                {/* Disposable */}
                {renderRow('가처분 소득', 'disposable', { isHighlighted: true })}

                {/* Spacer between 가처분 소득 and 소비성지출 합계 */}
                <tr className="h-4 bg-[#0f172a]/20">
                  <td colSpan={15} className="h-4 border-0"></td>
                </tr>

                {/* 3. Consumption */}
                {getRowStats('totalConsumption').sum > 0 && (
                  <>
                    {renderRow('소비성지출 합계', 'totalConsumption', { isHeader: true, colorClass: 'text-orange-400' })}
                    {renderRow('일상지출', 'cDaily', { onClick: () => toggleSection('daily'), hasChevron: true, isOpen: expandedSections.daily })}
                    {expandedSections.daily && (
                      <>
                        {renderSubRow('음식', 'daily', '음식')}
                        {renderSubRow('물건', 'daily', '물건')}
                        {renderSubRow('몸', 'daily', '몸')}
                        {renderSubRow('취미', 'daily', '취미')}
                        {renderSubRow('경험', 'daily', '경험')}
                        {renderSubRow('관계', 'daily', '관계')}
                        {renderSubRow('기타', 'daily', '기타')}
                      </>
                    )}
                    {renderRow('고정지출', 'cFixed', { onClick: () => toggleSection('fixed'), hasChevron: true, isOpen: expandedSections.fixed })}
                    {expandedSections.fixed && (
                      <>
                        {renderSubRow('관리비', 'fixed', '관리비')}
                        {renderSubRow('통신비', 'fixed', '통신비')}
                        {renderSubRow('교통비', 'fixed', '교통비')}
                        {renderSubRow('세금', 'fixed', '세금')}
                      </>
                    )}
                  </>
                )}

                {/* 4. Non-Consumption */}
                {getRowStats('totalNonConsumption').sum > 0 && (
                  <>
                    {renderRow('비소비성지출 합계', 'totalNonConsumption', { isHeader: true, colorClass: 'text-emerald-400', onClick: () => toggleSection('nonConsumption'), hasChevron: true, isOpen: expandedSections.nonConsumption })}
                    {expandedSections.nonConsumption && (
                      <>
                        {renderRow('대출이자', 'ncLoanInterest')}
                        {renderRow('보험', 'ncInsurance')}
                        {renderRow('부모님', 'ncParents')}
                        {renderRow('투자분배금', 'ncInvestDist')}
                      </>
                    )}
                  </>
                )}

                {/* 5. Savings */}
                {getRowStats('totalSavings').sum > 0 && (
                  <>
                    {renderRow('저축 합계', 'totalSavings', { isHeader: true, colorClass: 'text-teal-400', onClick: () => toggleSection('savings'), hasChevron: true, isOpen: expandedSections.savings })}
                    {expandedSections.savings && (
                      <>
                        {renderSubRow('원금상환', 'savings', '원금상환')}
                        {renderSubRow('투자', 'savings', '투자')}
                        {renderSubRow('청약', 'savings', '청약')}
                        {renderSubRow('주식', 'savings', '주식')}
                      </>
                    )}
                  </>
                )}

                {/* Spacer between 저축 합계 and 순수익 */}
                <tr className="h-4 bg-[#0f172a]/20">
                  <td colSpan={15} className="h-4 border-0"></td>
                </tr>

                {/* Net Profit & Portfolio */}
                {renderRow('순수익', 'netProfit', {
                  rowBgClass: 'bg-black/20 font-bold text-foreground',
                  stickyBgClass: 'bg-[#161c28]',
                  borderStyle: 'border-y-2 border-white/20',
                  paddingStyle: 'px-4 py-4'
                })}
                {renderRow('투자수익', 'pfProfit', { isSubHeader: true, colorClass: 'text-foreground' })}

                {/* Assets Overview */}
                {renderRow('총자산', 'totalAssets', {
                  rowBgClass: 'bg-slate-900/50 font-bold text-foreground',
                  stickyBgClass: 'bg-[#141b27]',
                  borderStyle: 'border-t-2 border-white/20',
                  paddingStyle: 'px-4 py-4'
                })}
                {renderRow('금융자산', 'financialAsset')}
                {renderRow('부동산', 'realEstate')}
                
                {renderRow('부채', 'liabilities', {
                  rowBgClass: 'bg-rose-900/10 font-bold text-rose-300',
                  stickyBgClass: 'bg-[#1c1822]',
                  borderStyle: 'border-t border-rose-500/20',
                  paddingStyle: 'px-4 py-4',
                  colorClass: 'text-rose-300'
                })}

                {renderRow('순자산', 'netAssets', {
                  rowBgClass: 'bg-emerald-900/30 font-bold text-emerald-400',
                  stickyBgClass: 'bg-[#122220]',
                  borderStyle: 'border-t-2 border-emerald-500/50',
                  paddingStyle: 'px-4 py-4',
                  textStyle: 'text-lg',
                  colorClass: 'text-emerald-400'
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
