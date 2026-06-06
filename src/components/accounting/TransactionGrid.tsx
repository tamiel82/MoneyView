'use client';

import { useState, useMemo } from 'react';
import { Pencil, Trash2, Check, X as XIcon, Plus, ChevronsUpDown, ChevronUp, ChevronDown, Filter } from 'lucide-react';
import { RawTransaction } from '@/lib/accounting/types';

interface Transaction extends RawTransaction {
  id: number;
  category: string;
}

interface TransactionGridProps {
  transactions: Transaction[];
  onRefresh: () => void;
  monthStr: string;
}

type SortConfig = { key: keyof Transaction | ''; direction: 'asc' | 'desc' };

const EXPENSE_CATEGORIES = ['국내구매', '사업세금', '기타경비', '음식', '물건', '몸', '취미', '경험', '관계', '기타', '관리비', '통신비', '교통비', '세금', '대출', '보험', '청약'];
const INCOME_CATEGORIES = ['사업소득', '기타'];

export default function TransactionGrid({ transactions, onRefresh, monthStr }: TransactionGridProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState<Partial<Transaction>>({
    date: `${monthStr}-01`,
    type: 'EXPENSE',
    amount: 0,
    content: '',
    merchant: '',
    category: '',
    paymentMethod: '현금',
    orderNo: '',
    businessNum: '',
  });

  // Sorting state (Default: date asc)
  const [sortConfig, setSortConfig] = useState<SortConfig[]>([
    { key: 'date', direction: 'asc' },
  ]);

  // Filtering state
  const [filters, setFilters] = useState<Partial<Record<keyof Transaction, string>>>({});
  const [showFilters, setShowFilters] = useState(false);

  const handleSort = (key: keyof Transaction) => {
    setSortConfig((prev) => {
      const existing = prev.find(p => p.key === key);
      if (existing) {
        if (existing.direction === 'asc') {
          return [{ key, direction: 'desc' }, ...prev.filter(p => p.key !== key)];
        } else {
          return prev.filter(p => p.key !== key);
        }
      }
      return [{ key, direction: 'asc' }, ...prev];
    });
  };

  const handleFilterChange = (key: keyof Transaction, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const processedData = useMemo(() => {
    let data = [...transactions];

    // Apply filters
    Object.keys(filters).forEach((key) => {
      const filterValue = filters[key as keyof Transaction];
      if (filterValue) {
        data = data.filter(t => {
          const val = t[key as keyof Transaction];
          return String(val || '').toLowerCase().includes(filterValue.toLowerCase());
        });
      }
    });

    // Apply sorting
    if (sortConfig.length > 0) {
      data.sort((a, b) => {
        for (const { key, direction } of sortConfig) {
          if (!key) continue;
          const aVal = a[key] || '';
          const bVal = b[key] || '';
          
          if (aVal < bVal) return direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return data;
  }, [transactions, sortConfig, filters]);

  const handleEditClick = async (t: Transaction) => {
    if (editingId && editingId !== t.id) {
      // Auto-save previous editing row
      try {
        const res = await fetch('/api/accounting/transactions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm),
        });
        if (!res.ok) throw new Error('수정 실패');
        onRefresh();
      } catch (err: any) {
        alert('이전 항목 자동 저장 실패: ' + err.message);
        return;
      }
    }
    
    setEditingId(t.id);
    setEditForm({
      ...t,
      category: t.category || '',
      businessNum: t.businessNum || '',
      orderNo: t.orderNo || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingId) return;
    try {
      const res = await fetch('/api/accounting/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('수정 실패');
      setEditingId(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말로 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/accounting/transactions?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('삭제 실패');
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSaveAdd = async () => {
    try {
      const res = await fetch('/api/accounting/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: [addForm] }),
      });
      if (!res.ok) throw new Error('추가 실패');
      setIsAdding(false);
      setAddForm({
        date: `${monthStr}-01`,
        type: 'EXPENSE',
        amount: 0,
        content: '',
        merchant: '',
        category: '',
        paymentMethod: '현금',
        orderNo: '',
        businessNum: '',
      });
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const renderSortIcon = (key: keyof Transaction) => {
    const sort = sortConfig.find(s => s.key === key);
    if (!sort) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
    return sort.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />;
  };

  const getCategoryOptions = (type: string | undefined) => {
    return type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  };

  return (
    <div className="glass-card shadow-sm rounded-xl border border-white/10 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
        <div className="flex items-center gap-4">
          <h3 className="font-bold text-foreground">상세 거래 내역</h3>
          <span className="text-sm text-muted-foreground">총 {processedData.length}건</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border ${showFilters ? 'bg-primary/20 text-primary border-primary/30' : 'bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10'}`}
          >
            <Filter className="w-4 h-4" /> 필터
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> 내역 추가
          </button>
        </div>
      </div>

      <div className="overflow-x-auto flex-1 relative">
        <table className="w-full text-sm text-left">
          <thead className="bg-black/40 text-muted-foreground sticky top-0 z-10 backdrop-blur-md">
            <tr>
              {['date', 'type', 'category', 'content', 'merchant', 'amount', 'paymentMethod', 'businessNum', 'orderNo'].map((k) => {
                const key = k as keyof Transaction;
                const labels: Record<string, string> = { 
                  date: '날짜', type: '유형', category: '분류', content: '내용', 
                  merchant: '매출처', amount: '금액', paymentMethod: '결제수단', 
                  businessNum: '사업자', orderNo: '주문번호' 
                };
                return (
                  <th key={key} className="px-3 py-3 font-medium border-b border-white/10 whitespace-nowrap">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-foreground" onClick={() => handleSort(key)}>
                        {labels[key]} {renderSortIcon(key)}
                      </div>
                      {showFilters && (
                        <input
                          type="text"
                          placeholder="검색..."
                          value={filters[key] || ''}
                          onChange={(e) => handleFilterChange(key, e.target.value)}
                          className="w-full min-w-[60px] bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                        />
                      )}
                    </div>
                  </th>
                );
              })}
              <th className="px-3 py-3 font-medium border-b border-white/10 text-center w-20">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isAdding && (
              <tr className="bg-primary/10 transition-colors">
                <td className="px-2 py-2">
                  <input type="date" value={addForm.date || ''} onChange={e => setAddForm({...addForm, date: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-foreground text-xs" />
                </td>
                <td className="px-2 py-2">
                  <select value={addForm.type || 'EXPENSE'} onChange={e => {
                    const newType = e.target.value as 'INCOME'|'EXPENSE';
                    // clear category when switching types to avoid invalid category
                    setAddForm({...addForm, type: newType, category: ''});
                  }} className="w-full bg-black/20 border border-white/10 rounded px-1 py-1 text-foreground text-xs">
                    <option value="EXPENSE">지출</option>
                    <option value="INCOME">수입</option>
                  </select>
                </td>
                <td className="px-2 py-2">
                  <select value={addForm.category || ''} onChange={e => setAddForm({...addForm, category: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-1 py-1 text-foreground text-xs">
                    <option value="">(선택)</option>
                    {getCategoryOptions(addForm.type).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input type="text" placeholder="내용" value={addForm.content || ''} onChange={e => setAddForm({...addForm, content: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-foreground text-xs" />
                </td>
                <td className="px-2 py-2">
                  <input type="text" placeholder="매출처" value={addForm.merchant || ''} onChange={e => setAddForm({...addForm, merchant: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-foreground text-xs" />
                </td>
                <td className="px-2 py-2">
                  <input type="number" placeholder="금액" value={addForm.amount || 0} onChange={e => setAddForm({...addForm, amount: Number(e.target.value)})} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-foreground text-xs text-right min-w-[80px]" />
                </td>
                <td className="px-2 py-2">
                  <input type="text" placeholder="결제수단" value={addForm.paymentMethod || ''} onChange={e => setAddForm({...addForm, paymentMethod: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-foreground text-xs" />
                </td>
                <td className="px-2 py-2">
                  <select value={addForm.businessNum || ''} onChange={e => setAddForm({...addForm, businessNum: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-1 py-1 text-foreground text-xs">
                    <option value="">(없음)</option>
                    <option value="더엠제이">더엠제이</option>
                    <option value="동주">동주</option>
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input type="text" placeholder="주문번호" value={addForm.orderNo || ''} onChange={e => setAddForm({...addForm, orderNo: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-foreground text-xs" />
                </td>
                <td className="px-2 py-2 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button onClick={handleSaveAdd} className="p-1 text-emerald-400 hover:bg-emerald-400/20 rounded"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setIsAdding(false)} className="p-1 text-rose-400 hover:bg-rose-400/20 rounded"><XIcon className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            )}

            {processedData.map((tx) => {
              const isEditing = editingId === tx.id;
              
              if (isEditing) {
                return (
                  <tr key={tx.id} className="bg-white/5 transition-colors shadow-inner">
                    <td className="px-2 py-2">
                      <input type="date" value={editForm.date || ''} onChange={e => setEditForm({...editForm, date: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-foreground text-xs" />
                    </td>
                    <td className="px-2 py-2">
                      <select value={editForm.type || 'EXPENSE'} onChange={e => {
                        const newType = e.target.value as 'INCOME'|'EXPENSE';
                        // clear category if invalid
                        setEditForm({...editForm, type: newType, category: ''});
                      }} className="w-full bg-black/20 border border-white/10 rounded px-1 py-1 text-foreground text-xs">
                        <option value="EXPENSE">지출</option>
                        <option value="INCOME">수입</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <select value={editForm.category || ''} onChange={e => setEditForm({...editForm, category: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-1 py-1 text-foreground text-xs min-w-[80px]">
                        <option value="">(선택)</option>
                        {getCategoryOptions(editForm.type).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" value={editForm.content || ''} onChange={e => setEditForm({...editForm, content: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-foreground text-xs" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" value={editForm.merchant || ''} onChange={e => setEditForm({...editForm, merchant: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-foreground text-xs" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" value={editForm.amount || 0} onChange={e => setEditForm({...editForm, amount: Number(e.target.value)})} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-foreground text-xs text-right min-w-[80px]" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" value={editForm.paymentMethod || ''} onChange={e => setEditForm({...editForm, paymentMethod: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-foreground text-xs" />
                    </td>
                    <td className="px-2 py-2">
                      <select value={editForm.businessNum || ''} onChange={e => setEditForm({...editForm, businessNum: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-1 py-1 text-foreground text-xs min-w-[70px]">
                        <option value="">(없음)</option>
                        <option value="더엠제이">더엠제이</option>
                        <option value="동주">동주</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" value={editForm.orderNo || ''} onChange={e => setEditForm({...editForm, orderNo: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-foreground text-xs" />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={handleSaveEdit} className="p-1 text-emerald-400 hover:bg-emerald-400/20 rounded" title="저장"><Check className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }} className="p-1 text-slate-400 hover:bg-white/10 rounded" title="취소"><XIcon className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={tx.id} onClick={() => handleEditClick(tx)} className="hover:bg-white/5 transition-colors cursor-pointer group">
                  <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{tx.date}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-semibold ${tx.type === 'INCOME' ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {tx.type === 'INCOME' ? '수입' : '지출'}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-medium text-foreground">{tx.category || '-'}</td>
                  <td className="px-3 py-3 max-w-[150px] truncate text-muted-foreground" title={tx.content || ''}>{tx.content}</td>
                  <td className="px-3 py-3 max-w-[150px] truncate text-muted-foreground" title={tx.merchant || ''}>{tx.merchant || '-'}</td>
                  <td className="px-3 py-3 text-right font-medium text-foreground">{tx.amount.toLocaleString()}</td>
                  <td className="px-3 py-3 text-muted-foreground">{tx.paymentMethod || '-'}</td>
                  <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{tx.businessNum || '-'}</td>
                  <td className="px-3 py-3 max-w-[100px] truncate text-muted-foreground" title={tx.orderNo || ''}>{tx.orderNo || '-'}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(tx.id); }} className="p-1.5 text-rose-400 hover:bg-rose-400/20 rounded transition-colors" title="삭제">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
