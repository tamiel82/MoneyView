"use client";

import React, { useState } from "react";
import { ExchangeData, ExchangeSummary, ExchangeTotalSummary } from "@/types/portfolio";
import { Plus, X, Loader2, Edit3 } from "lucide-react";
import { useRouter } from "next/navigation";

interface ExchangeTableProps {
  data: ExchangeData[];
  summary?: ExchangeSummary;
  totalSummary?: ExchangeTotalSummary;
}

export default function ExchangeTable({ data, summary, totalSummary }: ExchangeTableProps) {
  const router = useRouter();
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<ExchangeData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [user, setUser] = useState<"현주 환전" | "동민 환전">("현주 환전");
  const [date, setDate] = useState("");
  const [rate, setRate] = useState("");
  const [krw, setKrw] = useState("");
  const [usd, setUsd] = useState("");

  const resetForm = () => {
    setUser("현주 환전");
    setDate("");
    setRate("");
    setKrw("");
    setUsd("");
  };

  const calculateUsd = (currentKrw: string, currentRate: string) => {
    const rawKrwStr = currentKrw.replace(/[^0-9]/g, "");
    const rawRateStr = currentRate.replace(/[^0-9.]/g, "");

    if (!rawKrwStr || !rawRateStr) {
      setUsd("");
      return;
    }

    const rawKrw = parseFloat(rawKrwStr);
    const rawRate = parseFloat(rawRateStr);

    if (rawKrw > 0 && rawRate > 0) {
      const calculated = rawKrw / rawRate;
      const formattedUsd = "$" + calculated.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      setUsd(formattedUsd);
    } else {
      setUsd("");
    }
  };

  const handleKrwChange = (val: string) => {
    const numeric = val.replace(/[^0-9]/g, "");
    let formatted = "";
    if (numeric) {
      formatted = "₩" + Number(numeric).toLocaleString();
    }
    setKrw(formatted);
    calculateUsd(formatted, rate);
  };

  const handleRateChange = (val: string) => {
    const cleanVal = val.replace(/[^0-9.]/g, "");
    const parts = cleanVal.split(".");
    let finalVal = cleanVal;
    if (parts.length > 2) {
      finalVal = parts[0] + "." + parts.slice(1).join("");
    }
    setRate(finalVal);
    calculateUsd(krw, finalVal);
  };

  const handleUsdChange = (val: string) => {
    const cleanVal = val.replace(/[^0-9.]/g, "");
    const parts = cleanVal.split(".");
    let finalVal = cleanVal;
    if (parts.length > 2) {
      finalVal = parts[0] + "." + parts.slice(1).join("");
    }
    setUsd(finalVal ? "$" + finalVal : "");
  };

  const openEditModal = (row: ExchangeData) => {
    setEditRow(row);
    setUser(row.user);
    
    // Convert YYYY. M. D. or similar to YYYY-MM-DD for input type date
    let formattedDate = "";
    if (row.date && row.date !== "(미상)") {
      const parts = row.date.replace(/\s+/g, "").split(".");
      if (parts.length >= 2) {
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const d = (parts[2] || "1").padStart(2, '0');
        formattedDate = `${y}-${m}-${d}`;
      }
    }
    setDate(formattedDate);
    setRate(row.rate !== "-" ? row.rate : "");
    setKrw(row.krw !== "-" ? row.krw : "");
    setUsd(row.usd !== "-" ? row.usd : "");
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !rate) return;

    // Format date back to YYYY. M. D
    const [y, m, d] = date.split("-");
    const finalDate = `${y}. ${parseInt(m)}. ${parseInt(d)}`;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/history/exchanges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, date: finalDate, rate, krw, usd }),
      });

      if (!res.ok) throw new Error("Failed to add exchange");

      setIsAddModalOpen(false);
      resetForm();
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("추가에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRow || !date || !rate) return;

    const [y, m, d] = date.split("-");
    const finalDate = `${y}. ${parseInt(m)}. ${parseInt(d)}`;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/history/exchanges", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          rowIndex: editRow.rowIndex, 
          user: editRow.user, // Cannot change user (column boundaries)
          date: finalDate, 
          rate, 
          krw, 
          usd 
        }),
      });

      if (!res.ok) throw new Error("Failed to edit exchange");

      setEditRow(null);
      resetForm();
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("수정에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Summary Dashboard */}
      {(summary || totalSummary) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Hyunju Summary */}
          {summary && (
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]"></span>
                <h4 className="text-sm font-bold text-foreground">현주 환전 합계</h4>
              </div>
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                <span className="text-xs text-muted-foreground">총 원화</span>
                <span className="font-semibold text-indigo-400">{summary.hyunjuKrw}</span>
              </div>
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                <span className="text-xs text-muted-foreground">총 달러</span>
                <span className="font-bold text-emerald-400">{summary.hyunjuUsd}</span>
              </div>
              <div className="flex justify-between items-end pt-1">
                <span className="text-xs text-muted-foreground">평균 환율</span>
                <span className="font-medium text-foreground">{summary.hyunjuAvgRate}</span>
              </div>
            </div>
          )}

          {/* Dongmin Summary */}
          {summary && (
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
                <h4 className="text-sm font-bold text-foreground">동민 환전 합계</h4>
              </div>
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                <span className="text-xs text-muted-foreground">총 원화</span>
                <span className="font-semibold text-indigo-400">{summary.dongminKrw}</span>
              </div>
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                <span className="text-xs text-muted-foreground">총 달러</span>
                <span className="font-bold text-emerald-400">{summary.dongminUsd}</span>
              </div>
              <div className="flex justify-between items-end pt-1">
                <span className="text-xs text-muted-foreground">평균 환율</span>
                <span className="font-medium text-foreground">{summary.dongminAvgRate}</span>
              </div>
            </div>
          )}

          {/* Total Summary */}
          {totalSummary && (
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 p-5 rounded-2xl flex flex-col gap-2 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/20 blur-2xl rounded-full"></div>
              <h4 className="text-sm font-bold text-primary mb-2">전체 요약</h4>
              <div className="flex justify-between items-end border-b border-white/10 pb-2">
                <span className="text-xs text-primary/70">총 합계 원화</span>
                <span className="font-bold text-indigo-300">{totalSummary.totalKrw}</span>
              </div>
              <div className="flex justify-between items-end border-b border-white/10 pb-2">
                <span className="text-xs text-primary/70">총 합계 달러</span>
                <span className="font-bold text-emerald-300 text-lg">{totalSummary.totalUsd}</span>
              </div>
              <div className="flex justify-between items-end pt-1">
                <span className="text-xs text-primary/70">평균 / 현재 / 차이</span>
                <div className="flex gap-2 text-xs font-semibold">
                  <span className="text-muted-foreground">{parseFloat(totalSummary.avgRate).toFixed(2)}</span>
                  <span className="text-white/30">|</span>
                  <span className="text-foreground">{totalSummary.currentRate}</span>
                  <span className="text-white/30">|</span>
                  <span className="text-red-400">{totalSummary.diff}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex justify-end">
        <button
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-lg active:scale-95 border border-primary/20"
        >
          <Plus className="w-4 h-4" />
          환전기록 추가
        </button>
      </div>

      {(!data || data.length === 0) ? (
        <div className="py-12 text-center text-muted-foreground bg-white/5 rounded-2xl border border-white/10">
          환전기록이 존재하지 않습니다.
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-white/10 bg-black/10">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 min-w-[120px] text-center">일자</th>
                <th className="px-4 py-3 min-w-[100px] text-center">구분</th>
                <th className="px-4 py-3 min-w-[100px] text-center">적용 환율</th>
                <th className="px-4 py-3 min-w-[140px] text-center">원화 금액</th>
                <th className="px-4 py-3 min-w-[140px] text-center">달러 금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((row, idx) => (
                <tr 
                  key={idx} 
                  onClick={() => { if (row.rowIndex) openEditModal(row); }}
                  className={`hover:bg-white/5 transition-colors group ${row.rowIndex ? "cursor-pointer" : ""}`}
                  title={row.rowIndex ? "클릭하여 수정하기" : undefined}
                >
                  <td className="px-4 py-4 font-medium text-foreground whitespace-nowrap text-center">
                    {row.date}
                  </td>
                  <td className="px-4 py-4 text-center whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      row.user === "현주 환전" 
                        ? "bg-pink-500/10 text-pink-400 border-pink-500/20" 
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    }`}>
                      {row.user}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center font-medium text-muted-foreground whitespace-nowrap">
                    {row.rate}
                  </td>
                  <td className="px-4 py-4 text-center font-semibold text-indigo-400 whitespace-nowrap">
                    {row.krw}
                  </td>
                  <td className="px-4 py-4 text-center font-bold text-emerald-400 whitespace-nowrap">
                    {row.usd}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {(isAddModalOpen || editRow) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h3 className="text-lg font-bold text-foreground">
                {editRow ? "환전기록 수정" : "새 환전기록 추가"}
              </h3>
              <button 
                onClick={() => { setIsAddModalOpen(false); setEditRow(null); }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={editRow ? handleEditSubmit : handleAddSubmit} className="p-5 space-y-4">
              
              {!editRow && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">구분</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setUser("현주 환전")}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-all ${
                        user === "현주 환전" 
                          ? "bg-pink-500/20 text-pink-400 border-pink-500/30" 
                          : "bg-black/20 text-muted-foreground border-white/10 hover:border-white/20"
                      }`}
                    >
                      현주 환전
                    </button>
                    <button
                      type="button"
                      onClick={() => setUser("동민 환전")}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-all ${
                        user === "동민 환전" 
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/30" 
                          : "bg-black/20 text-muted-foreground border-white/10 hover:border-white/20"
                      }`}
                    >
                      동민 환전
                    </button>
                  </div>
                </div>
              )}

              {editRow && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">구분</label>
                  <div className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-muted-foreground font-semibold">
                    {user}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">일자</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">적용 환율</label>
                <input 
                  type="text" 
                  value={rate}
                  onChange={(e) => handleRateChange(e.target.value)}
                  placeholder="예: 1300.5"
                  required
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">원화 금액</label>
                  <input 
                    type="text" 
                    value={krw}
                    onChange={(e) => handleKrwChange(e.target.value)}
                    placeholder="예: ₩1,000,000"
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">달러 금액</label>
                  <input 
                    type="text" 
                    value={usd}
                    onChange={(e) => handleUsdChange(e.target.value)}
                    placeholder="예: $1,000.00"
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  />
                </div>
              </div>
              
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setEditRow(null); }}
                  className="flex-1 py-2.5 rounded-lg font-medium text-sm bg-white/5 text-foreground hover:bg-white/10 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !date || !rate}
                  className="flex-1 py-2.5 rounded-lg font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editRow ? '저장하기' : '추가하기')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
