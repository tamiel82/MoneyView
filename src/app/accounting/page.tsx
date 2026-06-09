'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Download, ChevronLeft, ChevronRight, Loader2, Plus, Calculator, RefreshCw, Pencil, X as XIcon } from 'lucide-react';
import Link from 'next/link';
import TransactionGrid from '@/components/accounting/TransactionGrid';

export default function AccountingDashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isInitializingDate, setIsInitializingDate] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<any>(null);
  const [monthlyStats, setMonthlyStats] = useState<any>({ real_estate: 0, liability_expr: '224000000+56465188+100000000' });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

  // Quick Add State
  const [quickAdd, setQuickAdd] = useState<{ [key: string]: string }>({});
  const [isNonConsModalOpen, setIsNonConsModalOpen] = useState(false);
  const [isEditingLiability, setIsEditingLiability] = useState(false);
  const [isEditingRealEstate, setIsEditingRealEstate] = useState(false);

  const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const pfMonthStr1 = `${currentDate.getFullYear()}.${String(currentDate.getMonth() + 1).padStart(2, '0')}.`;
  const pfMonthStr2 = `${currentDate.getFullYear()}. ${currentDate.getMonth() + 1}.`;

  useEffect(() => {
    fetch('/api/accounting/latest-month')
      .then(res => res.json())
      .then(data => {
        if (data.latestMonth) {
          setCurrentDate(new Date(data.latestMonth + '-01'));
        }
      })
      .finally(() => {
        setIsInitializingDate(false);
      });
  }, []);

  useEffect(() => {
    if (!isInitializingDate) {
      fetchData();
    }
  }, [monthStr, isInitializingDate]);

  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [txRes, pfRes, statRes] = await Promise.all([
        fetch(`/api/accounting/transactions?month=${monthStr}`),
        fetch('/api/portfolio'),
        fetch(`/api/accounting/monthly-stats?month=${monthStr}`)
      ]);
      
      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data.transactions || []);
      }
      
      if (pfRes.ok) {
        const pfData = await pfRes.json();
        const stat = pfData.monthlyHistory?.find((s: any) => 
          s.month.replace(/\s/g, '') === pfMonthStr1.replace(/\s/g, '') ||
          s.month.replace(/\s/g, '') === pfMonthStr2.replace(/\s/g, '') ||
          s.month === monthStr
        );
        setPortfolioStats(stat || null);
      }

      if (statRes.ok) {
        const data = await statRes.json();
        setMonthlyStats(data.stat || { real_estate: 0, liability_expr: '224000000+56465188+100000000' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/accounting/export?month=${monthStr}&t=${Date.now()}`);
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `가계부-${monthStr.replace('-', '')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('엑셀 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleQuickAddBatch = async () => {
    const existingParentsTx = personalExpenses.find(t => t.category === '부모님');
    const existingInvestTx = personalExpenses.find(t => t.category === '투자분배금');

    try {
      if (existingParentsTx) {
        await fetch(`/api/accounting/transactions?id=${existingParentsTx.id}`, { method: 'DELETE' });
      }
      if (existingInvestTx) {
        await fetch(`/api/accounting/transactions?id=${existingInvestTx.id}`, { method: 'DELETE' });
      }

      const txs = [];
      const parentVal = quickAdd['부모님'] !== undefined ? Number(quickAdd['부모님']) : parentsExp;
      if (parentVal > 0) {
        txs.push({
          date: `${monthStr}-01`,
          type: 'EXPENSE',
          amount: parentVal,
          content: '부모님',
          merchant: '부모님',
          category: '부모님',
          paymentMethod: '현금',
        });
      }
      const distVal = quickAdd['투자분배금'] !== undefined ? Number(quickAdd['투자분배금']) : investDistExp;
      if (distVal > 0) {
        txs.push({
          date: `${monthStr}-01`,
          type: 'EXPENSE',
          amount: distVal,
          content: '투자분배금',
          merchant: '투자분배금',
          category: '투자분배금',
          paymentMethod: '현금',
        });
      }

      if (txs.length > 0) {
        const res = await fetch('/api/accounting/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactions: txs }),
        });
        if (!res.ok) throw new Error('추가 실패');
      }

      setQuickAdd({});
      setIsNonConsModalOpen(false);
      fetchData();
    } catch (e) {
      alert('저장 중 오류 발생');
    }
  };

  const handleMonthlyStatSave = async (key: 'real_estate' | 'liability_expr', value: string | number) => {
    try {
      const payload = {
        month: monthStr,
        real_estate: monthlyStats.real_estate,
        liability_expr: monthlyStats.liability_expr,
        [key]: value
      };
      
      const res = await fetch('/api/accounting/monthly-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMonthlyStats(payload);
      }
    } catch (e) {
      alert('저장 실패');
    }
  };

  // Evaluate Expression
  const parseExpression = (expr: string) => {
    try {
      if (!expr) return 0;
      // Evaluate basic math safely
      return new Function(`return ${expr.replace(/[^0-9+\-*/.]/g, '')}`)() || 0;
    } catch {
      return 0;
    }
  };

  // 1. Filter out unclassified completely
  const validTransactions = transactions.filter(t => t.category && t.category !== '미분류');

  const incomeList = validTransactions.filter(t => t.type === 'INCOME');
  const expenseList = validTransactions.filter(t => t.type === 'EXPENSE');

  const totalIncome = incomeList.reduce((sum, t) => sum + t.amount, 0);

  // Income Pie Breakdown
  const incomeBreakdown = incomeList.reduce((acc, t) => {
    let key = t.category;
    if (t.category !== '기타' && (t.businessNum === '동주' || t.businessNum === '더엠제이')) {
      key = t.businessNum;
    } else if (t.category === '사업소득' && !t.businessNum) {
      key = '기타 사업소득';
    }
    acc[key] = (acc[key] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const incomePieData = Object.entries(incomeBreakdown)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value);

  // Business vs Personal Expenses
  const businessCategories = ['사업세금', '기타경비', '사업지출', '동주', '더엠제이'];
  
  const isBusinessExpense = (t: any) => {
    if (businessCategories.some(bc => t.category.includes(bc))) return true;
    if (t.category === '국내구매' && (t.businessNum === '동주' || t.businessNum === '더엠제이')) return true;
    return false;
  };

  const businessExpenses = expenseList.filter(isBusinessExpense);
  const totalBusinessExpense = businessExpenses.reduce((sum, t) => sum + t.amount, 0);

  const businessBreakdown = businessExpenses.reduce((acc, t) => {
    let key = t.category;
    if (t.category === '국내구매' && (t.businessNum === '동주' || t.businessNum === '더엠제이')) {
      key = t.businessNum;
    } else if (t.category === '국내구매') {
      key = '기타 국내구매';
    }
    acc[key] = (acc[key] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const businessPieData = Object.entries(businessBreakdown)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value);

  // Personal Expenses
  const personalExpenses = expenseList.filter(t => !isBusinessExpense(t));

  // Daily Consumption
  const dailyCategories = ['음식', '물건', '몸', '취미', '경험', '관계', '기타'];
  const fixedCategories = ['관리비', '통신비', '교통비', '세금'];

  const dailyExpenses = personalExpenses.filter(t => dailyCategories.includes(t.category));
  const fixedExpenses = personalExpenses.filter(t => fixedCategories.includes(t.category));

  const legacyDailyMap: Record<string, string> = { '외식': '음식', '커피': '음식', '간식': '음식', '주류': '음식', '와인': '음식', '생활용품': '물건', '가전가구': '물건', '의류': '물건', '기타물품': '물건', '해외구매': '물건', '미용': '몸', '건강': '몸', '문화': '경험', '자기계발': '경험', '여행': '경험', '경조사': '관계' };
  const legacyFixedMap: Record<string, string> = { '대중교통': '교통비', '차량유지비': '교통비', '자동차': '교통비' };

  const mappedDaily = personalExpenses.filter(t => legacyDailyMap[t.category] !== undefined);
  const mappedFixed = personalExpenses.filter(t => legacyFixedMap[t.category] !== undefined);

  const unmatchedPersonal = personalExpenses.filter(t => 
    !dailyCategories.includes(t.category) && !fixedCategories.includes(t.category) && 
    legacyDailyMap[t.category] === undefined && legacyFixedMap[t.category] === undefined &&
    !['대출', '대출이자', '보험', '부모님', '투자분배금', '원금상환', '청약', '투자', '주식'].includes(t.category)
  );

  const totalDailyExpense = dailyExpenses.reduce((s, t) => s + t.amount, 0) + mappedDaily.reduce((s, t) => s + t.amount, 0) + unmatchedPersonal.reduce((s, t) => s + t.amount, 0);
  const totalFixedExpense = fixedExpenses.reduce((s, t) => s + t.amount, 0) + mappedFixed.reduce((s, t) => s + t.amount, 0);
  const totalConsumption = totalDailyExpense + totalFixedExpense;

  const dailyAgg = [...dailyExpenses, ...mappedDaily, ...unmatchedPersonal].reduce((acc, t) => {
    let cat = t.category;
    if (legacyDailyMap[cat]) cat = legacyDailyMap[cat];
    if (unmatchedPersonal.includes(t)) cat = '기타';
    acc[cat] = (acc[cat] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const fixedAgg = [...fixedExpenses, ...mappedFixed].reduce((acc, t) => {
    let cat = t.category;
    if (legacyFixedMap[cat]) cat = legacyFixedMap[cat];
    acc[cat] = (acc[cat] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const sortedDailyItems = Object.entries(dailyAgg).map(([name, value]) => ({ name: `[일상] ${name}`, value: value as number })).sort((a, b) => b.value - a.value);
  const sortedFixedItems = Object.entries(fixedAgg).map(([name, value]) => ({ name: `[고정] ${name}`, value: value as number })).sort((a, b) => b.value - a.value);
  const consumptionPieData = [...sortedDailyItems, ...sortedFixedItems].filter(d => d.value > 0);

  // Non-Consumption & Savings
  const loanExpenses = personalExpenses.filter(t => t.category === '대출' || t.category === '대출이자');
  const samsungLoans = loanExpenses.filter(t => (t.content || '').includes('삼성화재대출'));
  const principalRepayment = samsungLoans.length > 0 ? Math.min(...samsungLoans.map(t => t.amount)) : 0;
  const totalLoanInterest = loanExpenses.reduce((s, t) => s + t.amount, 0) - principalRepayment;

  const insuranceExp = personalExpenses.filter(t => t.category === '보험').reduce((s, t) => s + t.amount, 0);
  const parentsExp = personalExpenses.filter(t => t.category === '부모님').reduce((s, t) => s + t.amount, 0);
  const investDistExp = personalExpenses.filter(t => t.category === '투자분배금').reduce((s, t) => s + t.amount, 0);

  const totalNonConsumption = totalLoanInterest + insuranceExp + parentsExp + investDistExp;

  const savingsCategories = ['청약', '주식'];
  const savingsExpenses = personalExpenses.filter(t => savingsCategories.includes(t.category));
  const otherSavings = savingsExpenses.reduce((sum, t) => sum + t.amount, 0);
  const totalSavings = otherSavings + principalRepayment;

  const monthlyDeposit = portfolioStats?.monthlyDeposit || 0; // 투자
  
  const nonConsPieData = [
    { name: '[비소비] 대출이자', value: totalLoanInterest },
    { name: '[비소비] 보험', value: insuranceExp },
    { name: '[비소비] 부모님', value: parentsExp },
    { name: '[비소비] 투자분배금', value: investDistExp },
    { name: '[저축] 원금상환', value: principalRepayment },
    ...savingsCategories.map(cat => ({ 
      name: `[저축] ${cat}`, 
      value: personalExpenses.filter(t => t.category === cat).reduce((s, t) => s + t.amount, 0) 
    }))
  ].filter(d => d.value > 0).sort((a, b) => {
    const isABi = a.name.startsWith('[비소비]');
    const isBBi = b.name.startsWith('[비소비]');
    if (isABi && !isBBi) return -1;
    if (!isABi && isBBi) return 1;
    return b.value - a.value;
  });

  // Net Profit: Income - (Business + Consumption + NonConsumption)
  const disposableIncome = totalIncome - totalBusinessExpense;
  const netProfit = disposableIncome - (totalConsumption + totalNonConsumption);

  // Asset Variables
  const portfolioProfit = portfolioStats?.monthlyProfit || 0; // 투자수익
  const financialAssets = portfolioStats?.valuation || 0; // 금융자산
  const realEstate = monthlyStats.real_estate || 0; // 부동산
  const totalAssets = financialAssets + realEstate; // 총자산
  const liabilities = parseExpression(monthlyStats.liability_expr); // 부채
  const netAssets = totalAssets - liabilities; // 순자산

  const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#64748b', '#0ea5e9', '#84cc16'];

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4 text-foreground">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft className="text-muted-foreground" /></button>
          
          <div className="relative flex items-center group cursor-pointer">
            <h1 className="text-3xl font-bold group-hover:text-primary transition-colors">
              {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
            </h1>
            <input 
              type="month"
              value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`}
              onChange={(e) => {
                if (e.target.value) {
                  setCurrentDate(new Date(e.target.value + '-01'));
                }
              }}
              onClick={(e) => {
                try {
                  if ('showPicker' in HTMLInputElement.prototype) {
                    e.currentTarget.showPicker();
                  }
                } catch (err) {}
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="원하는 연/월 선택"
            />
          </div>

          <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronRight className="text-muted-foreground" /></button>
        </div>
        
        <div className="flex gap-3">

          <button 
            onClick={handleExport}
            disabled={isExporting || transactions.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-medium rounded-lg transition-colors border border-emerald-500/30"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            엑셀 다운로드
          </button>
          <Link href="/accounting/import" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-lg transition-colors">
            거래내역 업로드
          </Link>
        </div>
      </div>

      {isInitializingDate || isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : transactions.length === 0 && !portfolioStats ? (
        <div className="glass-card p-16 text-center shadow-sm">
          <p className="text-muted-foreground mb-4">해당 월의 거래 내역 및 포트폴리오 데이터가 없습니다.</p>
          <Link href="/accounting/import" className="text-primary hover:underline font-medium">새로운 내역 업로드하기</Link>
        </div>
      ) : (
        <>
          {/* 4 Pie Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            
            {/* Income */}
            <div className="glass-card p-5 shadow-sm flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-8 -mt-8" />
              <div className="mb-4 relative z-10">
                <h3 className="text-base font-bold text-foreground">소득 내역</h3>
                <h4 className="text-2xl font-bold text-blue-400">{totalIncome.toLocaleString()}원</h4>
              </div>
              <div className="flex-1 flex flex-col items-center relative z-10">
                <div className="w-full h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={incomePieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                        {incomePieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(value: any) => `${Number(value || 0).toLocaleString()}원`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full space-y-2 mt-2">
                  {incomePieData.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-foreground truncate">{item.name}</span>
                      </div>
                      <span className="text-muted-foreground font-medium shrink-0">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Business Expenses */}
            <div className="glass-card p-5 shadow-sm flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl -mr-8 -mt-8" />
              <div className="mb-4 relative z-10">
                <h3 className="text-base font-bold text-foreground">사업지출 내역</h3>
                <h4 className="text-2xl font-bold text-rose-400">{totalBusinessExpense.toLocaleString()}원</h4>
              </div>
              <div className="flex-1 flex flex-col items-center relative z-10">
                <div className="w-full h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={businessPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                        {businessPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(value: any) => `${Number(value || 0).toLocaleString()}원`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full space-y-2 mt-2">
                  {businessPieData.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[(idx + 2) % COLORS.length] }} />
                        <span className="text-foreground truncate">{item.name}</span>
                      </div>
                      <span className="text-muted-foreground font-medium shrink-0">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Consumption */}
            <div className="glass-card p-5 shadow-sm flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -mr-8 -mt-8" />
              <div className="mb-4 relative z-10">
                <h3 className="text-base font-bold text-foreground">소비성 지출</h3>
                <h4 className="text-2xl font-bold text-orange-400">{totalConsumption.toLocaleString()}원</h4>
              </div>
              <div className="flex-1 flex flex-col items-center relative z-10">
                <div className="w-full h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={consumptionPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                        {consumptionPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(value: any) => `${Number(value || 0).toLocaleString()}원`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full space-y-2 mt-2 h-24 overflow-y-auto pr-1">
                  {consumptionPieData.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[(idx + 4) % COLORS.length] }} />
                        <span className="text-foreground truncate">{item.name}</span>
                      </div>
                      <span className="text-muted-foreground font-medium shrink-0">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Non-Consumption & Savings (Clickable) */}
            <div 
              onClick={() => setIsNonConsModalOpen(true)}
              className="glass-card p-5 shadow-sm flex flex-col relative overflow-hidden cursor-pointer hover:bg-white/5 transition-colors group"
              title="클릭하여 수동 입력 추가"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8" />
              <div className="mb-4 relative z-10 flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-foreground">비소비성 지출 및 저축</h3>
                  <h4 className="text-2xl font-bold text-emerald-400">{(totalNonConsumption + totalSavings).toLocaleString()}원</h4>
                </div>
                <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <div className="flex-1 flex flex-col items-center relative z-10">
                <div className="w-full h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={nonConsPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                        {nonConsPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 7) % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(value: any) => `${Number(value || 0).toLocaleString()}원`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full space-y-2 mt-2 h-24 overflow-y-auto pr-1">
                  {nonConsPieData.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[(idx + 7) % COLORS.length] }} />
                        <span className="text-foreground truncate">{item.name}</span>
                      </div>
                      <span className="text-muted-foreground font-medium shrink-0">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Summary Grid */}
          <div className="glass-card shadow-sm border-emerald-500/20 bg-emerald-950/20 p-6 relative overflow-hidden">
            <h3 className="text-xl font-bold text-emerald-400 mb-6 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              월별 자산 현황 요약
            </h3>
            <div className="space-y-6">
              {/* Row 1: 가처분소득 ~ 투자수익 */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 text-center lg:divide-x lg:divide-white/10">
                <div className="px-2">
                  <p className="text-xs text-muted-foreground mb-1">가처분소득</p>
                  <p className={`font-bold ${disposableIncome >= 0 ? 'text-blue-300' : 'text-rose-400'}`}>
                    {disposableIncome.toLocaleString()}원
                  </p>
                </div>
                <div className="px-2">
                  <p className="text-xs text-muted-foreground mb-1">투자</p>
                  <p className="font-bold text-emerald-400">
                    {monthlyDeposit.toLocaleString()}원
                  </p>
                </div>
                <div className="px-2">
                  <p className="text-xs text-muted-foreground mb-1">순수익</p>
                  <p className={`font-bold ${netProfit > 0 ? 'text-rose-400' : netProfit < 0 ? 'text-blue-400' : 'text-emerald-300'}`}>
                    {netProfit.toLocaleString()}원
                  </p>
                </div>
                <div className="px-2">
                  <p className="text-xs text-muted-foreground mb-1">투자수익</p>
                  <p className={`font-bold ${portfolioProfit > 0 ? 'text-rose-400' : portfolioProfit < 0 ? 'text-blue-400' : 'text-emerald-300'}`}>
                    {portfolioProfit.toLocaleString()}원
                  </p>
                </div>
              </div>

              {/* Row 2: 금융자산 ~ 순자산 */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 text-center lg:divide-x lg:divide-white/10 border-t border-white/10 pt-4">
                <div className="px-2">
                  <p className="text-xs text-muted-foreground mb-1">금융자산</p>
                  <p className="font-bold text-foreground">{financialAssets.toLocaleString()}원</p>
                </div>
                
                {/* Real Estate Input */}
                <div className="px-2 group">
                  <p 
                    onClick={() => setIsEditingRealEstate(true)}
                    className="text-xs text-muted-foreground mb-1 flex justify-center gap-1 items-center cursor-pointer"
                  >
                    부동산 <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                  {isEditingRealEstate ? (
                    <input 
                      type="number"
                      value={monthlyStats.real_estate || ''}
                      onChange={(e) => setMonthlyStats({...monthlyStats, real_estate: Number(e.target.value)})}
                      onBlur={(e) => { handleMonthlyStatSave('real_estate', Number(e.target.value)); setIsEditingRealEstate(false); }}
                      onKeyDown={(e) => { if(e.key === 'Enter') { handleMonthlyStatSave('real_estate', Number((e.target as HTMLInputElement).value)); setIsEditingRealEstate(false); } }}
                      className="w-full bg-black/40 text-center font-bold text-foreground rounded focus:border-emerald-500/50 focus:outline-none transition-colors"
                      placeholder="0"
                      autoFocus
                    />
                  ) : (
                    <div 
                      onClick={() => setIsEditingRealEstate(true)} 
                      className="w-full text-center font-bold text-foreground hover:bg-white/5 border-b border-transparent rounded cursor-pointer transition-colors"
                    >
                      {realEstate.toLocaleString()}원
                    </div>
                  )}
                </div>

                <div className="px-2">
                  <p className="text-xs text-emerald-400/70 mb-1">총자산</p>
                  <p className="font-bold text-emerald-400">{totalAssets.toLocaleString()}원</p>
                </div>

                {/* Liabilities Input */}
                <div className="px-2 group relative">
                  <p className="text-xs text-rose-300/70 mb-1 flex justify-center gap-1 items-center cursor-pointer">
                    부채 <Calculator className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                  {isEditingLiability ? (
                    <input 
                      type="text"
                      value={monthlyStats.liability_expr || ''}
                      onChange={(e) => setMonthlyStats({...monthlyStats, liability_expr: e.target.value})}
                      onBlur={(e) => { handleMonthlyStatSave('liability_expr', e.target.value); setIsEditingLiability(false); }}
                      onKeyDown={(e) => { if(e.key === 'Enter') { handleMonthlyStatSave('liability_expr', (e.target as HTMLInputElement).value); setIsEditingLiability(false); } }}
                      className="w-full bg-black/40 text-center font-bold text-rose-300 rounded focus:border-rose-500/50 focus:outline-none transition-colors"
                      placeholder="수식 입력"
                      autoFocus
                    />
                  ) : (
                    <div 
                      onClick={() => setIsEditingLiability(true)} 
                      className="w-full text-center font-bold text-rose-300 hover:bg-white/5 border-b border-transparent rounded cursor-pointer transition-colors"
                    >
                      {liabilities.toLocaleString()}원
                    </div>
                  )}
                  <div className="absolute -bottom-5 left-0 w-full text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {monthlyStats.liability_expr}
                  </div>
                </div>

                <div className="px-2">
                  <p className="text-xs text-emerald-400/70 mb-1">순자산</p>
                  <p className="font-bold text-emerald-400 text-lg">
                    {netAssets.toLocaleString()}원
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Grid Tabs */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <button 
                onClick={() => setActiveTab('EXPENSE')} 
                className={`px-6 py-2.5 text-sm font-bold rounded-t-xl transition-colors ${activeTab === 'EXPENSE' ? 'bg-primary/20 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-white/5'}`}
              >
                지출 내역
              </button>
              <button 
                onClick={() => setActiveTab('INCOME')} 
                className={`px-6 py-2.5 text-sm font-bold rounded-t-xl transition-colors ${activeTab === 'INCOME' ? 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-400' : 'text-muted-foreground hover:bg-white/5'}`}
              >
                수입 내역
              </button>
            </div>
            
            <TransactionGrid 
              transactions={activeTab === 'EXPENSE' ? expenseList : incomeList} 
              onRefresh={() => fetchData(true)} 
              monthStr={monthStr} 
            />
          </div>
        </>
      )}

      {/* Non-Consumption & Quick Add Modal */}
      {isNonConsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 relative">
            <button 
              onClick={() => setIsNonConsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-full transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-bold text-foreground mb-6">비소비성 지출 / 저축 수동 입력</h3>
            
            <div className="space-y-6">
              <div className="flex flex-col gap-2 bg-black/20 p-4 rounded-lg border border-white/5">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-sm text-foreground">부모님</h4>
                  <span className="text-emerald-400 font-medium text-sm">{parentsExp > 0 ? parentsExp.toLocaleString() + '원' : '미입력'}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <input 
                    type="number" 
                    placeholder="금액 입력" 
                    value={quickAdd['부모님'] !== undefined ? quickAdd['부모님'] : parentsExp || ''} 
                    onChange={e => setQuickAdd({...quickAdd, '부모님': e.target.value})}
                    className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 bg-black/20 p-4 rounded-lg border border-white/5">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-sm text-foreground">투자분배금</h4>
                  <span className="text-emerald-400 font-medium text-sm">{investDistExp > 0 ? investDistExp.toLocaleString() + '원' : '미입력'}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <input 
                    type="number" 
                    placeholder="금액 입력" 
                    value={quickAdd['투자분배금'] !== undefined ? quickAdd['투자분배금'] : investDistExp || ''} 
                    onChange={e => setQuickAdd({...quickAdd, '투자분배금': e.target.value})}
                    className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-center gap-2 bg-black/20 p-4 rounded-lg border border-white/5">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-sm text-foreground">투자 (월별 적립액)</h4>
                  <span className="text-emerald-400 font-medium text-sm">{monthlyDeposit > 0 ? monthlyDeposit.toLocaleString() + '원' : '미입력'}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">이 항목은 포트폴리오의 <strong>{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월</strong> 데이터와 자동 연동됩니다.</p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setIsNonConsModalOpen(false)}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-foreground font-medium rounded-lg transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleQuickAddBatch}
                className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors shadow-lg shadow-primary/20"
              >
                일괄 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
