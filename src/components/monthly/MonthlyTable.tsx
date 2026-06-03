"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { MonthlyData, MonthlyAccountDetail } from "@/types/portfolio";
import { ChevronDown, ChevronRight, Plus, X, Loader2 } from "lucide-react";

const accountNames = ['현금', '현주주식', '동민주식', '동민연금', '현주연금', '동민코인', '기타'];

export default function MonthlyTable({ data }: { data: MonthlyData[] }) {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Edit Modal State
  const [editRow, setEditRow] = useState<MonthlyData | null>(null);
  const [editDeposits, setEditDeposits] = useState<string[]>(Array(7).fill("0"));
  const [editValuations, setEditValuations] = useState<string[]>(Array(7).fill(""));
  const [editNotes, setEditNotes] = useState<string[]>(Array(7).fill(""));

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMonth, setNewMonth] = useState("");
  const [newDeposits, setNewDeposits] = useState<string[]>(Array(7).fill("0"));
  const [newValuations, setNewValuations] = useState<string[]>(Array(7).fill(""));
  const [newNotes, setNewNotes] = useState<string[]>(Array(7).fill(""));

  // Loading State
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleRow = (month: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(month)) {
      newExpanded.delete(month);
    } else {
      newExpanded.add(month);
    }
    setExpandedRows(newExpanded);
  };

  const getNextMonth = (lastMonthStr: string) => {
    if (!lastMonthStr) return "";
    
    // Normalize: remove spaces
    const normalized = lastMonthStr.replace(/\s+/g, "");
    
    // Match dots: "YYYY.MM." or "YYYY.MM"
    let match = normalized.match(/^(\d{4})\.(\d{1,2})\.?$/);
    if (!match) {
      // Match dash: "YYYY-MM"
      match = normalized.match(/^(\d{4})-(\d{1,2})$/);
    }
    
    if (!match) {
      // General match
      match = normalized.match(/^(\d{4})\D*(\d{1,2})\D*$/);
    }
    
    let year = 0;
    let month = 0;
    
    if (match) {
      year = parseInt(match[1]);
      month = parseInt(match[2]);
    }
    
    if (!year || !month || isNaN(year) || isNaN(month)) {
      const now = new Date();
      return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    }
    
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    
    return `${year}-${month.toString().padStart(2, '0')}`;
  };

  // Open Edit Modal
  const openEditModal = (row: MonthlyData) => {
    setEditRow(row);
    setEditDeposits(row.details.map(d => d.deposit.toString()));
    setEditValuations(row.details.map(d => {
      if (row.valuation === 0 || d.valuation === 0) {
        return "";
      }
      return d.valuation.toString();
    }));
    setEditNotes(row.details.map(d => d.note || ""));
  };

  // Open Add Modal
  const openAddModal = () => {
    const latestMonth = data[0]; // data is reversedHistory, so first item is latest
    if (latestMonth) {
      setNewMonth(getNextMonth(latestMonth.month));
      // Prefill deposits and notes from the previous month
      setNewDeposits(latestMonth.details.map(d => d.deposit.toString()));
      setNewNotes(latestMonth.details.map(d => d.note || ""));
    } else {
      // Fallback if no data
      const now = new Date();
      const nextMonthNum = now.getMonth() + 2;
      let year = now.getFullYear();
      let month = nextMonthNum;
      if (month > 12) {
        month = 1;
        year += 1;
      }
      setNewMonth(`${year}-${month.toString().padStart(2, '0')}`);
      setNewDeposits(Array(7).fill("0"));
      setNewNotes(Array(7).fill(""));
    }
    setNewValuations(Array(7).fill("")); // Prefill valuations empty
    setShowAddModal(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRow || isSubmitting) return;

    const parsedDeposits = editDeposits.map(d => parseFloat(d));
    if (parsedDeposits.some(d => isNaN(d))) {
      alert("적립액에 올바른 숫자 값을 입력해 주세요.");
      return;
    }

    // Convert valuations: blank becomes empty string, others become float numbers
    const parsedValuations = editValuations.map(v => {
      if (v.trim() === "") return "";
      const num = parseFloat(v);
      return isNaN(num) ? "" : num;
    });

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/portfolio/monthly", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rowIndex: editRow.rowIndex,
          deposits: parsedDeposits,
          valuations: parsedValuations,
          notes: editNotes,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        setEditRow(null);
        router.refresh();
      } else {
        alert(resData.error || "수정에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMonth.trim() || isSubmitting) return;

    // Validate and normalize month format (YYYY-MM or YYYY. MM. or YYYY.MM)
    const cleanMonth = newMonth.trim();
    const normalized = cleanMonth.replace(/\s+/g, "");
    
    let dateMatch = normalized.match(/^(\d{4})\.(\d{1,2})\.?$/);
    if (!dateMatch) {
      dateMatch = normalized.match(/^(\d{4})-(\d{1,2})$/);
    }
    if (!dateMatch) {
      dateMatch = normalized.match(/^(\d{4})\D*(\d{1,2})\D*$/);
    }
    
    if (!dateMatch) {
      alert("올바른 날짜 형식을 입력해 주세요. (예: 2026. 06. 또는 2026-06)");
      return;
    }
    
    const year = dateMatch[1];
    const month = dateMatch[2].padStart(2, '0');
    const normalizedMonth = `${year}. ${month}. `;

    const parsedDeposits = newDeposits.map(d => parseFloat(d));
    if (parsedDeposits.some(d => isNaN(d))) {
      alert("적립액에 올바른 숫자 값을 입력해 주세요.");
      return;
    }

    // Convert valuations: blank becomes empty string, others become float numbers
    const parsedValuations = newValuations.map(v => {
      if (v.trim() === "") return "";
      const num = parseFloat(v);
      return isNaN(num) ? "" : num;
    });

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/portfolio/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: normalizedMonth,
          deposits: parsedDeposits,
          valuations: parsedValuations,
          notes: newNotes,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        setShowAddModal(false);
        router.refresh();
      } else {
        alert(resData.error || "추가에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Button Area */}
      <div className="flex justify-end">
        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl transition-all flex items-center gap-1.5 text-sm font-semibold border border-primary/20 shadow-lg active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>월별 평가액 추가</span>
        </button>
      </div>

      <div className="w-full overflow-x-auto rounded-xl border border-white/10 bg-black/10">
        <table className="w-full text-xs md:text-sm text-left border-collapse">
          <thead className="text-[10px] md:text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/10">
            <tr>
              <th className="sticky left-0 z-30 bg-[#0e0e11] w-9 min-w-[36px] text-center py-3 rounded-tl-lg"></th>
              <th className="sticky left-9 z-30 bg-[#0e0e11] min-w-[70px] py-3 whitespace-nowrap border-r border-white/10 px-2">평가월</th>
              <th className="px-2 md:px-4 py-3 text-right whitespace-nowrap">월별 적립액</th>
              <th className="px-2 md:px-4 py-3 text-right whitespace-nowrap">누적 원금</th>
              <th className="px-2 md:px-4 py-3 text-right whitespace-nowrap">평가액</th>
              <th className="px-2 md:px-4 py-3 text-right whitespace-nowrap">월별 손익</th>
              <th className="px-2 md:px-4 py-3 text-right whitespace-nowrap">손익률</th>
              <th className="px-2 md:px-4 py-3 text-right whitespace-nowrap">누적 손익</th>
              <th className="px-2 md:px-4 py-3 text-right whitespace-nowrap">누적수익률</th>
              <th className="px-2 md:px-4 py-3 text-right whitespace-nowrap">시간가중수익률</th>
              <th className="px-2 md:px-4 py-3 text-right whitespace-nowrap rounded-tr-lg">YTD</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <React.Fragment key={row.month}>
                <tr 
                  className="border-b border-white/5 hover:bg-[#1b1b20]/60 transition-colors cursor-pointer group"
                  onClick={() => toggleRow(row.month)}
                >
                  <td className="sticky left-0 z-10 bg-[#0e0e11] w-9 min-w-[36px] text-center text-muted-foreground py-3 md:py-4 group-hover:bg-[#1b1b20] transition-colors">
                    {expandedRows.has(row.month) ? <ChevronDown size={14} className="mx-auto" /> : <ChevronRight size={14} className="mx-auto" />}
                  </td>
                  <td className="sticky left-9 z-10 bg-[#0e0e11] min-w-[70px] font-semibold text-foreground whitespace-nowrap border-r border-white/10 px-2 py-3 md:py-4 group-hover:bg-[#1b1b20] transition-colors">
                    {row.month}
                  </td>
                  <td className="px-2 md:px-4 py-3 md:py-4 text-right whitespace-nowrap text-indigo-400 font-medium">
                    {row.monthlyDeposit.toLocaleString()}
                  </td>
                  <td className="px-2 md:px-4 py-3 md:py-4 text-right whitespace-nowrap text-emerald-400 font-medium">
                    {row.cumulativePrincipal.toLocaleString()}
                  </td>
                  <td className="px-2 md:px-4 py-3 md:py-4 text-right whitespace-nowrap text-blue-400 font-bold">
                    {row.valuation > 0 ? row.valuation.toLocaleString() : "-"}
                  </td>
                  <td className={`px-2 md:px-4 py-3 md:py-4 text-right whitespace-nowrap font-semibold ${row.valuation > 0 ? (row.monthlyProfit > 0 ? 'text-red-400' : row.monthlyProfit < 0 ? 'text-blue-400' : '') : 'text-muted-foreground'}`}>
                    {row.valuation > 0 ? `${row.monthlyProfit > 0 ? '+' : ''}${row.monthlyProfit.toLocaleString()}` : "-"}
                  </td>
                  <td className={`px-2 md:px-4 py-3 md:py-4 text-right whitespace-nowrap font-medium ${row.valuation > 0 ? (row.profitRate > 0 ? 'text-red-400' : row.profitRate < 0 ? 'text-blue-400' : '') : 'text-muted-foreground'}`}>
                    {row.valuation > 0 ? `${row.profitRate > 0 ? '+' : ''}${row.profitRate.toFixed(2)}%` : "-"}
                  </td>
                  <td className={`px-2 md:px-4 py-3 md:py-4 text-right whitespace-nowrap ${row.valuation > 0 ? (row.cumulativeProfit > 0 ? 'text-red-400' : row.cumulativeProfit < 0 ? 'text-blue-400' : '') : 'text-muted-foreground'}`}>
                    {row.valuation > 0 ? `${row.cumulativeProfit > 0 ? '+' : ''}${row.cumulativeProfit.toLocaleString()}` : "-"}
                  </td>
                  <td className={`px-2 md:px-4 py-3 md:py-4 text-right whitespace-nowrap font-medium ${row.valuation > 0 ? (row.cumulativeReturnRate > 0 ? 'text-red-400' : row.cumulativeReturnRate < 0 ? 'text-blue-400' : '') : 'text-muted-foreground'}`}>
                    {row.valuation > 0 ? `${row.cumulativeReturnRate > 0 ? '+' : ''}${row.cumulativeReturnRate.toFixed(2)}%` : "-"}
                  </td>
                  <td className={`px-2 md:px-4 py-3 md:py-4 text-right whitespace-nowrap ${row.valuation > 0 ? (row.twr > 0 ? 'text-red-400' : row.twr < 0 ? 'text-blue-400' : '') : 'text-muted-foreground'}`}>
                    {row.valuation > 0 ? `${row.twr > 0 ? '+' : ''}${row.twr.toFixed(2)}%` : "-"}
                  </td>
                  <td className={`px-2 md:px-4 py-3 md:py-4 text-right whitespace-nowrap ${row.valuation > 0 ? (row.ytd > 0 ? 'text-red-400' : row.ytd < 0 ? 'text-blue-400' : '') : 'text-muted-foreground'}`}>
                    {row.valuation > 0 ? `${row.ytd > 0 ? '+' : ''}${row.ytd.toFixed(2)}%` : "-"}
                  </td>
                </tr>
                
                {expandedRows.has(row.month) && (
                  <tr className="bg-black/30">
                    <td colSpan={11} className="p-0 border-b border-white/5">
                      <div className="py-4 pl-4 sm:pl-14 pr-4 sticky left-0 w-[calc(100vw-3rem)] sm:w-full overflow-visible">
                        {/* Header for detail accounts edit */}
                        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2.5">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">세부 계좌 내역 ({row.month})</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(row);
                            }}
                            className="px-3.5 py-1.5 bg-primary hover:bg-primary/95 text-white rounded-lg transition-all text-xs font-semibold active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm border border-primary/20"
                          >
                            수정하기
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                          {row.details.map((detail, idx) => {
                            if (detail.deposit === 0 && detail.valuation === 0 && detail.profit === 0) return null;
                            return (
                              <div 
                                key={idx} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(row);
                                }}
                                className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 p-3.5 rounded-xl shadow-inner transition-all duration-200 cursor-pointer group active:scale-[0.99] flex flex-col gap-2 relative overflow-hidden"
                                title="클릭하여 세부 금액 일괄 수정"
                              >
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs md:text-sm font-bold text-foreground group-hover:text-primary transition-colors">{detail.name}</h4>
                                </div>
                                {detail.note && (
                                  <div className="text-[10px] md:text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg mt-1 whitespace-pre-wrap leading-relaxed shadow-sm">
                                    {detail.note}
                                  </div>
                                )}
                                
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] md:text-xs mt-1">
                                  <div className="flex justify-between col-span-2 border-b border-white/5 pb-1">
                                    <span className="text-muted-foreground/70">적립액</span>
                                    <span className="font-semibold text-indigo-400">{detail.deposit.toLocaleString()}원</span>
                                  </div>
                                  <div className="flex justify-between col-span-2 border-b border-white/5 pb-1">
                                    <span className="text-muted-foreground/70">평가액</span>
                                    <span className="font-bold text-blue-400">{row.valuation > 0 ? `${detail.valuation.toLocaleString()}원` : "-"}</span>
                                  </div>
                                  <div className="flex justify-between col-span-2 border-b border-white/5 pb-1">
                                    <span className="text-muted-foreground/70">월별 손익</span>
                                    <span className={row.valuation > 0 ? (detail.profit > 0 ? 'text-red-400 font-semibold' : detail.profit < 0 ? 'text-blue-400 font-semibold' : '') : 'text-muted-foreground'}>
                                      {row.valuation > 0 ? `${detail.profit > 0 ? '+' : ''}${detail.profit.toLocaleString()}원` : "-"}
                                    </span>
                                  </div>
                                  
                                  <div className="flex justify-between border-r border-white/5 pr-2">
                                    <span className="text-muted-foreground/60">손익률</span>
                                    <span className={row.valuation > 0 ? `font-medium ${detail.profitRate > 0 ? 'text-red-400' : detail.profitRate < 0 ? 'text-blue-400' : ''}` : 'text-muted-foreground'}>
                                      {row.valuation > 0 ? `${detail.profitRate > 0 ? '+' : ''}${detail.profitRate.toFixed(2)}%` : "-"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between pl-2">
                                    <span className="text-muted-foreground/60">누적손익</span>
                                    <span className={row.valuation > 0 ? `font-medium ${detail.cumulativeProfit > 0 ? 'text-red-400' : detail.cumulativeProfit < 0 ? 'text-blue-400' : ''}` : 'text-muted-foreground'}>
                                      {row.valuation > 0 ? `${detail.cumulativeProfit > 0 ? '+' : ''}${detail.cumulativeProfit.toLocaleString()}원` : "-"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between border-r border-white/5 pr-2">
                                    <span className="text-muted-foreground/60">가중수익률</span>
                                    <span className={row.valuation > 0 ? `font-medium ${detail.twr > 0 ? 'text-red-400' : detail.twr < 0 ? 'text-blue-400' : ''}` : 'text-muted-foreground'}>
                                      {row.valuation > 0 ? `${detail.twr > 0 ? '+' : ''}${detail.twr.toFixed(2)}%` : "-"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between pl-2">
                                    <span className="text-muted-foreground/60">YTD</span>
                                    <span className={row.valuation > 0 ? `font-medium ${detail.ytd > 0 ? 'text-red-400' : detail.ytd < 0 ? 'text-blue-400' : ''}` : 'text-muted-foreground'}>
                                      {row.valuation > 0 ? `${detail.ytd > 0 ? '+' : ''}${detail.ytd.toFixed(2)}%` : "-"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Sub-Account Details Modal */}
      {mounted && editRow && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-xl p-6 border border-white/10 rounded-2xl shadow-2xl relative animate-in scale-in duration-200 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => {
                setEditRow(null);
              }}
              className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold mb-6 text-foreground">월별 평가 정보 수정</h3>
            
            <div className="bg-white/2 p-4 rounded-xl border border-white/5 mb-6 text-sm flex items-center justify-between">
              <span className="text-muted-foreground font-semibold">평가년월</span>
              <span className="font-bold text-primary text-base">{editRow.month}</span>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-6">
              {/* Grid of Accounts */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase border-b border-white/5 pb-2">계좌별 금액 수정 (평가액은 비워둘 수 있음)</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {accountNames.map((name, idx) => (
                    <div key={idx} className="bg-white/2 p-3 rounded-xl border border-white/5 space-y-2">
                      <h5 className="text-xs font-bold text-primary">{name}</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-muted-foreground uppercase mb-0.5">적립액</label>
                          <input 
                            type="number" 
                            value={editDeposits[idx]}
                            onChange={(e) => {
                              const updated = [...editDeposits];
                              updated[idx] = e.target.value;
                              setEditDeposits(updated);
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-muted-foreground uppercase mb-0.5">평가액</label>
                          <input 
                            type="number" 
                            placeholder=""
                            value={editValuations[idx]}
                            onChange={(e) => {
                              const updated = [...editValuations];
                              updated[idx] = e.target.value;
                              setEditValuations(updated);
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] text-muted-foreground uppercase mb-0.5">메모</label>
                          <input 
                            type="text" 
                            placeholder="메모 입력..."
                            value={editNotes[idx]}
                            onChange={(e) => {
                              const updated = [...editNotes];
                              updated[idx] = e.target.value;
                              setEditNotes(updated);
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setEditRow(null);
                  }}
                  className="flex-1 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-white/5 border border-white/10 rounded-xl transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 text-sm font-semibold bg-primary hover:bg-primary/90 text-white rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add New Month Modal */}
      {mounted && showAddModal && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-xl p-6 border border-white/10 rounded-2xl shadow-2xl relative animate-in scale-in duration-200 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold mb-6 text-foreground">신규 월별 평가액 추가</h3>
            
            <form onSubmit={handleAddSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">평가월</label>
                <input 
                  type="month" 
                  value={newMonth}
                  onChange={(e) => setNewMonth(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder-white/20 focus:outline-none focus:border-primary/50 text-base [color-scheme:dark]"
                  required
                />
              </div>

              {/* Grid of Accounts */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase border-b border-white/5 pb-2">계좌별 금액 입력 (평가액은 비워둘 수 있음)</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {accountNames.map((name, idx) => (
                    <div key={idx} className="bg-white/2 p-3 rounded-xl border border-white/5 space-y-2">
                      <h5 className="text-xs font-bold text-primary">{name}</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-muted-foreground uppercase mb-0.5">적립액</label>
                          <input 
                            type="number" 
                            value={newDeposits[idx]}
                            onChange={(e) => {
                              const updated = [...newDeposits];
                              updated[idx] = e.target.value;
                              setNewDeposits(updated);
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-muted-foreground uppercase mb-0.5">평가액</label>
                          <input 
                            type="number" 
                            placeholder=""
                            value={newValuations[idx]}
                            onChange={(e) => {
                              const updated = [...newValuations];
                              updated[idx] = e.target.value;
                              setNewValuations(updated);
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] text-muted-foreground uppercase mb-0.5">메모</label>
                          <input 
                            type="text" 
                            placeholder="메모 입력..."
                            value={newNotes[idx]}
                            onChange={(e) => {
                              const updated = [...newNotes];
                              updated[idx] = e.target.value;
                              setNewNotes(updated);
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-white/5 border border-white/10 rounded-xl transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 text-sm font-semibold bg-primary hover:bg-primary/90 text-white rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  추가하기
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
