"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AllocationHolding } from "@/types/portfolio";
import { Landmark, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Layers, Plus, X, Loader2 } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";

export default function HoldingsViewer({ allocations }: { allocations: Record<string, AllocationHolding[]> }) {
  const router = useRouter();
  const accountNames = Object.keys(allocations);

  // State for accordion toggle
  const [openAccounts, setOpenAccounts] = useState<Record<string, boolean>>(
    accountNames.reduce((acc, name) => {
      acc[name] = true; // All open by default
      return acc;
    }, {} as Record<string, boolean>)
  );

  // Modal States
  const [editHolding, setEditHolding] = useState<AllocationHolding | null>(null);
  const [addAccountName, setAddAccountName] = useState<string | null>(null);
  const [isCustomSubAccount, setIsCustomSubAccount] = useState(false);

  // Form States (Edit)
  const [editPrice, setEditPrice] = useState("");
  const [editQty, setEditQty] = useState("");

  // Form States (Add)
  const [subAccount, setSubAccount] = useState("");
  const [strategy, setStrategy] = useState("");
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [quantity, setQuantity] = useState("");

  // Loading States
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleAccount = (name: string) => {
    setOpenAccounts(prev => ({ ...prev, [name]: !prev[name] }));
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const focus = params.get("focus");
      if (focus && allocations[focus]) {
        // Ensure the focused account is open
        setOpenAccounts(prev => ({ ...prev, [focus]: true }));
        
        // Scroll to the element
        setTimeout(() => {
          const element = document.getElementById(`account-${focus}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
            
            // Visual highlight effect
            element.classList.add("ring-2", "ring-primary", "scale-[1.01]", "border-primary/50");
            setTimeout(() => {
              element.classList.remove("ring-2", "ring-primary", "scale-[1.01]", "border-primary/50");
            }, 2500);
          }
        }, 300);
      }
    }
  }, [allocations]);

  // Open Modals
  const openEditModal = (holding: AllocationHolding) => {
    setEditHolding(holding);
    // Parse numeric parts to default values
    const rawPrice = holding.unitPrice.replace(/[^0-9.-]+/g, "");
    const rawQty = holding.quantity.replace(/[^0-9.-]+/g, "");
    setEditPrice(rawPrice);
    setEditQty(rawQty);
  };

  const openAddModal = (accountName: string, subName = "") => {
    setAddAccountName(accountName);
    
    // Default subAccount to the first holding's subAccount if exists
    const existingHoldings = allocations[accountName] || [];
    const uniqueSubs = Array.from(new Set(existingHoldings.map(h => h.subAccount).filter(Boolean)));
    
    if (subName) {
      setSubAccount(subName);
      setIsCustomSubAccount(false);
    } else {
      setSubAccount(uniqueSubs[0] || "");
      setIsCustomSubAccount(uniqueSubs.length === 0);
    }
    
    setStrategy("");
    setName("");
    setTicker("");
    setUnitPrice("");
    setQuantity("");
  };

  // Submit functions
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHolding || !editHolding.rowIndex || isSubmitting) return;

    const parsedPrice = parseFloat(editPrice);
    const parsedQty = parseFloat(editQty);

    if (isNaN(parsedPrice) || isNaN(parsedQty)) {
      alert("올바른 숫자 값을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/portfolio/holding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rowIndex: editHolding.rowIndex,
          unitPrice: parsedPrice,
          quantity: parsedQty,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditHolding(null);
        router.refresh();
      } else {
        alert(data.error || "수정에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!editHolding || !editHolding.rowIndex || isSubmitting) return;

    if (!confirm(`정말 "${editHolding.name}" 종목을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/portfolio/holding", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rowIndex: editHolding.rowIndex,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditHolding(null);
        router.refresh();
      } else {
        alert(data.error || "삭제에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addAccountName || isSubmitting) return;

    const parsedPrice = parseFloat(unitPrice);
    const parsedQty = parseFloat(quantity);

    if (!subAccount.trim() || !name.trim() || !ticker.trim() || isNaN(parsedPrice) || isNaN(parsedQty)) {
      alert("모든 필수 필드를 올바르게 입력해 주세요.");
      return;
    }

    // Calculate insertion index
    const accountDetails = allocations[addAccountName] || [];
    
    // Find the holdings within this sub-account to find "예수금" or get the insertion boundary
    const subDetails = accountDetails.filter(h => h.subAccount === subAccount.trim());
    const cashHolding = subDetails.find(h => h.name === "예수금");
    
    let insertRowIndex = 0;
    if (cashHolding && cashHolding.rowIndex) {
      // Insert right above the "예수금" row (meaning we use its exact row index)
      insertRowIndex = cashHolding.rowIndex;
    } else {
      const maxRowIndex = subDetails.reduce((max, h) => Math.max(max, h.rowIndex || 0), 0);
      if (maxRowIndex > 0) {
        insertRowIndex = maxRowIndex + 1; // Insert right after the last holding in this sub-account
      } else {
        // If it's a new sub-account, insert before the SUM row at the end of the entire account
        const maxAccountRowIndex = accountDetails.reduce((max, h) => Math.max(max, h.rowIndex || 0), 0);
        if (maxAccountRowIndex === 0) {
          alert("계좌의 위치를 확인하는 데 실패했습니다.");
          return;
        }
        insertRowIndex = maxAccountRowIndex + 1;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/portfolio/holding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insertRowIndex,
          subAccount: subAccount.trim(),
          strategy: strategy.trim(),
          name: name.trim(),
          ticker: ticker.toUpperCase().trim(),
          unitPrice: parsedPrice,
          quantity: parsedQty,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAddAccountName(null);
        router.refresh();
      } else {
        alert(data.error || "추가에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {accountNames.map(accountName => {
        const accountDetails = allocations[accountName] || [];
        if (accountDetails.length === 0) return null;
        
        const isOpen = openAccounts[accountName];

        return (
          <div 
            key={accountName} 
            id={`account-${accountName}`} 
            className="glass-card rounded-2xl overflow-hidden border border-white/10 transition-all duration-300 scroll-mt-20"
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => toggleAccount(accountName)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{accountName}</h3>
                  <p className="text-xs text-muted-foreground">{accountDetails.length}개 종목 보유</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <div className="text-muted-foreground cursor-pointer p-1" onClick={() => toggleAccount(accountName)}>
                  {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
            </div>

            {/* Content List */}
            {isOpen && (
              <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-white/5 mb-2">
                  <div className="col-span-3">종목 (티커)</div>
                  <div className="col-span-2 text-right">보유수량</div>
                  <div className="col-span-2 text-right">매수평단가</div>
                  <div className="col-span-3 text-right">현재가 / 평가액</div>
                  <div className="col-span-2 text-right">수익률</div>
                </div>

                <div className="space-y-6">
                  {Object.entries(accountDetails.reduce((acc, detail) => {
                    const sub = detail.subAccount || '기본 계좌';
                    if (!acc[sub]) acc[sub] = [];
                    acc[sub].push(detail);
                    return acc;
                  }, {} as Record<string, AllocationHolding[]>)).map(([subName, subDetails], subIdx) => (
                    <div key={subIdx} className="space-y-3">
                      <h4 className="text-sm font-semibold text-primary/80 flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="flex items-center gap-2">
                          <Layers className="w-4 h-4" /> {subName}
                        </span>
                        <button
                          type="button"
                          onClick={() => openAddModal(accountName, subName)}
                          className="p-1 hover:bg-primary/20 text-primary rounded-md transition-colors flex items-center gap-0.5 text-xs border border-transparent hover:border-primary/20 active:scale-95 cursor-pointer"
                          title="이 계좌에 종목 추가"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="text-[10px]">추가</span>
                        </button>
                      </h4>
                      <div className="space-y-2">
                        {subDetails.map((detail, idx) => {
                          const isPositive = Boolean(detail.profitRate && !detail.profitRate.includes("-") && detail.profitRate !== "0.00%" && detail.profitRate !== "0%");
                          const isNegative = Boolean(detail.profitRate && detail.profitRate.includes("-"));
                          
                          const isUsdAsset = Boolean(detail.currentValueKrw && detail.currentValueKrw !== "" && detail.currentValueKrw !== detail.currentValue);
                          
                          const formatCurrency = (val: string, isUsd: boolean) => {
                            if (!val || val === "-" || val === "") return val;
                            if (val.includes("₩") || val.includes("$") || val.includes("원") || val.includes("USD") || val.includes("krw")) return val;
                            return isUsd ? `$${val}` : `₩${val}`;
                          };
                          
                          const displayTotalValue = detail.currentValueKrw ? formatCurrency(detail.currentValueKrw, false) : formatCurrency(detail.currentValue, false);
                          
                          const color = isPositive ? "#ef4444" : isNegative ? "#3b82f6" : "#a1a1aa";
                          
                          return (
                            <div 
                              key={idx} 
                              onClick={() => openEditModal(detail)}
                              className="relative overflow-hidden flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 items-start md:items-center p-4 rounded-xl bg-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer border border-transparent active:scale-[0.99] group"
                              title="클릭하여 종목 수정"
                            >
                              
                              {/* 1. Name & Strategy */}
                              <div className="col-span-3 flex flex-col w-full z-10">
                                <span className="font-bold text-base group-hover:text-primary transition-colors">{detail.name}</span>
                                <span className="text-xs text-muted-foreground">{detail.strategy} {detail.ticker && `· ${detail.ticker}`}</span>
                              </div>

                              {/* 2. Quantity */}
                              <div className="col-span-2 flex flex-row md:flex-col justify-between md:justify-center w-full md:text-right z-10">
                                <span className="md:hidden text-xs text-muted-foreground">보유수량:</span>
                                <span className="text-sm font-semibold text-primary">{detail.quantity !== "" ? detail.quantity : "-"}</span>
                              </div>

                              {/* 3. Unit Price */}
                              <div className="col-span-2 flex flex-row md:flex-col justify-between md:justify-center w-full md:text-right z-10">
                                <span className="md:hidden text-xs text-muted-foreground">매수평단가:</span>
                                <span className="text-sm font-medium">{detail.unitPrice !== "" ? formatCurrency(detail.unitPrice, isUsdAsset) : "-"}</span>
                              </div>

                              {/* 4. Current Price & Value */}
                              <div className="col-span-3 flex flex-row md:flex-col justify-between md:justify-center w-full md:text-right z-10">
                                <span className="md:hidden text-xs text-muted-foreground">현재가 / 평가액:</span>
                                <div className="flex flex-col items-end">
                                  <span className="text-sm font-bold text-gradient">{detail.currentPrice !== "" ? formatCurrency(detail.currentPrice, isUsdAsset) : "-"}</span>
                                  {displayTotalValue && displayTotalValue !== "" && (
                                    <span className="text-xs text-muted-foreground">{displayTotalValue}</span>
                                  )}
                                </div>
                              </div>

                              {/* 5. Profit Rate */}
                              <div className="col-span-2 flex flex-row md:flex-col justify-between md:justify-center w-full md:items-end z-10">
                                <span className="md:hidden text-xs text-muted-foreground">수익률:</span>
                                <div className="flex items-center gap-1">
                                  {isPositive && <TrendingUp className="w-3 h-3 text-red-500" />}
                                  {isNegative && <TrendingDown className="w-3 h-3 text-blue-500" />}
                                  <span className={`text-sm font-semibold ${isPositive ? "text-red-500" : isNegative ? "text-blue-500" : "text-muted-foreground"}`}>
                                    {detail.profitRate !== "" ? (isPositive && !detail.profitRate.includes("+") ? `+${detail.profitRate}` : detail.profitRate) : "-"}
                                  </span>
                                </div>
                              </div>

                              {/* Sparkline Background Chart */}
                              {detail.history && detail.history.length > 0 && (
                                <div className="absolute top-0 left-0 right-0 h-[40%] md:h-full w-full md:left-[58.33%] md:w-[25%] md:right-0 md:bottom-0 opacity-35 group-hover:opacity-55 transition-opacity pointer-events-none z-0">
                                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                    <AreaChart data={detail.history}>
                                      <defs>
                                        <linearGradient id={`colorGrad-${detail.rowIndex}-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor={color} stopOpacity={0.9}/>
                                          <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                        </linearGradient>
                                      </defs>
                                      <YAxis domain={['dataMin', 'dataMax']} hide />
                                      <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fillOpacity={1} fill={`url(#colorGrad-${detail.rowIndex}-${idx})`} isAnimationActive={false} />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              )}

                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Edit Holding Modal */}
      {editHolding && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-md p-6 border border-white/10 rounded-2xl shadow-2xl relative animate-in scale-in duration-200">
            <button 
              onClick={() => setEditHolding(null)}
              className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold mb-6 text-foreground">종목 정보 수정</h3>
            
            <div className="bg-white/2 p-4 rounded-xl border border-white/5 mb-6 text-sm">
              <div className="flex justify-between py-1"><span className="text-muted-foreground">종목명:</span><span className="font-semibold">{editHolding.name}</span></div>
              <div className="flex justify-between py-1"><span className="text-muted-foreground">자산 상세:</span><span>{editHolding.strategy}</span></div>
              <div className="flex justify-between py-1"><span className="text-muted-foreground">현재가:</span><span className="text-gradient font-semibold">{editHolding.currentPrice}</span></div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">보유수량</label>
                <input 
                  type="number" 
                  step="any"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder-white/20 focus:outline-none focus:border-primary/50 text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">매수평단가</label>
                <input 
                  type="number" 
                  step="any"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder-white/20 focus:outline-none focus:border-primary/50 text-base"
                  required
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={handleDeleteSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-3 text-sm font-semibold text-red-500 hover:text-white hover:bg-red-500/80 border border-red-500/30 rounded-xl transition-all disabled:opacity-50"
                  title="종목 삭제"
                >
                  삭제
                </button>
                <button
                  type="button"
                  onClick={() => setEditHolding(null)}
                  className="flex-1 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-white/5 border border-white/10 rounded-xl transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 text-sm font-semibold bg-primary hover:bg-primary/90 text-white rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Holding Modal */}
      {addAccountName && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-md p-6 border border-white/10 rounded-2xl shadow-2xl relative animate-in scale-in duration-200">
            <button 
              onClick={() => setAddAccountName(null)}
              className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold mb-6 text-foreground">신규 종목 추가</h3>
            
            <div className="bg-white/2 p-3 rounded-xl border border-white/5 mb-4 text-xs">
              <span className="text-muted-foreground">계좌 구분:</span> <span className="font-semibold text-primary">{addAccountName}</span>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">자산 (기관/계좌번호)</label>
                {!isCustomSubAccount ? (
                  <div className="flex gap-2">
                    <select
                      value={subAccount}
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          setIsCustomSubAccount(true);
                          setSubAccount("");
                        } else {
                          setSubAccount(e.target.value);
                        }
                      }}
                      className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 text-base appearance-none cursor-pointer"
                    >
                      {Array.from(new Set((allocations[addAccountName] || []).map(h => h.subAccount).filter(Boolean))).map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                      <option value="__NEW__">+ 새 계좌 추가 (직접 입력)</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="예: 삼성 7103894053-01"
                      value={subAccount}
                      onChange={(e) => setSubAccount(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder-white/20 focus:outline-none focus:border-primary/50 text-base"
                      required
                    />
                    {Array.from(new Set((allocations[addAccountName] || []).map(h => h.subAccount).filter(Boolean))).length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomSubAccount(false);
                          const existing = (allocations[addAccountName] || [])[0]?.subAccount || "";
                          setSubAccount(existing);
                        }}
                        className="px-3 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-muted-foreground transition-all"
                      >
                        목록에서 선택
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">자산 상세 (전략)</label>
                <input 
                  type="text" 
                  placeholder="예: 나스닥 1배수"
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder-white/20 focus:outline-none focus:border-primary/50 text-base"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">종목명</label>
                  <input 
                    type="text" 
                    placeholder="예: QQQ"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder-white/20 focus:outline-none focus:border-primary/50 text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">티커</label>
                  <input 
                    type="text" 
                    placeholder="예: QQQ"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder-white/20 focus:outline-none focus:border-primary/50 text-base"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">매수가 (단가)</label>
                  <input 
                    type="number" 
                    step="any"
                    placeholder="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder-white/20 focus:outline-none focus:border-primary/50 text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">보유수</label>
                  <input 
                    type="number" 
                    step="any"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder-white/20 focus:outline-none focus:border-primary/50 text-base"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setAddAccountName(null)}
                  className="flex-1 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-white/5 border border-white/10 rounded-xl transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 text-sm font-semibold bg-primary hover:bg-primary/90 text-white rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  추가하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
