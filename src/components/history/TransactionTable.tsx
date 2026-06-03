"use client";

import React, { useState, useMemo } from "react";
import { TransactionData } from "@/types/portfolio";
import { Search, Plus, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TransactionTable({ data }: { data: TransactionData[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<TransactionData | null>(null);
  
  // Form State
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setDate("");
    setAmount("");
    setMemo("");
  };

  const handleAmountChange = (val: string) => {
    const numeric = val.replace(/[^0-9]/g, "");
    if (!numeric) {
      setAmount("");
    } else {
      setAmount("₩" + Number(numeric).toLocaleString());
    }
  };

  const openEditModal = (row: TransactionData) => {
    setEditRow(row);
    
    // Parse YYYY. M. D. or YYYY. M. D to YYYY-MM-DD for date input
    let formattedDate = "";
    if (row.date) {
      const parts = row.date.replace(/\s+/g, "").split(".");
      if (parts.length >= 2) {
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const d = (parts[2] || "1").replace(/\./g, "").padStart(2, '0');
        formattedDate = `${y}-${m}-${d}`;
      }
    }
    setDate(formattedDate);
    setAmount(row.amount);
    setMemo(row.memo);
  };

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(row => row.memo.toLowerCase().includes(term));
  }, [data, searchTerm]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !amount) return;

    // Convert YYYY-MM-DD to YYYY. M. D
    const [year, month, day] = date.split("-");
    const formattedDate = `${year}. ${parseInt(month)}. ${parseInt(day)}`;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/history/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: formattedDate, amount, memo }),
      });

      if (!res.ok) {
        throw new Error("Failed to add transaction");
      }

      setIsAddModalOpen(false);
      resetForm();
      router.refresh(); // Refresh the page data
    } catch (error) {
      console.error(error);
      alert("거래기록 추가에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRow || !date || !amount) return;

    // Convert YYYY-MM-DD to YYYY. M. D
    const [year, month, day] = date.split("-");
    const formattedDate = `${year}. ${parseInt(month)}. ${parseInt(day)}`;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/history/transactions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rowIndex: editRow.rowIndex,
          date: formattedDate,
          amount,
          memo
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to edit transaction");
      }

      setEditRow(null);
      resetForm();
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("거래기록 수정에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar: Search and Add Button */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-black/10 p-3 rounded-xl border border-white/10">
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="메모 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-sm rounded-lg pl-10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground transition-all"
          />
        </div>
        <button
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary px-4 py-2 rounded-lg font-medium text-sm transition-colors border border-primary/20"
        >
          <Plus className="w-4 h-4" />
          추가
        </button>
      </div>

      {(!data || data.length === 0) ? (
        <div className="py-12 text-center text-muted-foreground bg-white/5 rounded-2xl border border-white/10">
          거래기록이 존재하지 않습니다.
        </div>
      ) : filteredData.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground bg-white/5 rounded-2xl border border-white/10">
          검색 결과가 없습니다.
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-white/10 bg-black/10">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 min-w-[120px] text-center">일자</th>
                <th className="px-4 py-3 min-w-[120px] text-center">금액</th>
                <th className="px-4 py-3 min-w-[300px] text-center">메모</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredData.map((row, idx) => (
                <tr 
                  key={idx} 
                  onClick={() => openEditModal(row)}
                  className="hover:bg-white/5 transition-colors group cursor-pointer"
                  title="클릭하여 수정하기"
                >
                  <td className="px-4 py-4 font-medium text-foreground whitespace-nowrap text-center">
                    {row.date}
                  </td>
                  <td className="px-4 py-4 text-center font-bold text-emerald-400 whitespace-nowrap">
                    {row.amount}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground group-hover:text-foreground transition-colors whitespace-pre-wrap">
                    {row.memo}
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
                {editRow ? "거래기록 수정" : "새 거래기록 추가"}
              </h3>
              <button 
                onClick={() => { setIsAddModalOpen(false); setEditRow(null); resetForm(); }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={editRow ? handleEditSubmit : handleAddSubmit} className="p-5 space-y-4">
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
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">금액 (예: ₩1,200,000)</label>
                <input 
                  type="text" 
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="₩1,000,000"
                  required
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">메모</label>
                <textarea 
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="거래 내용 입력..."
                  rows={3}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
                />
              </div>
              
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setEditRow(null); resetForm(); }}
                  className="flex-1 py-2.5 rounded-lg font-medium text-sm bg-white/5 text-foreground hover:bg-white/10 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !date || !amount}
                  className="flex-1 py-2.5 rounded-lg font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editRow ? '수정하기' : '추가하기')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
