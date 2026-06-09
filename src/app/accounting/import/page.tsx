'use client';

import { useState, useRef, useMemo } from 'react';
import { Upload, CheckCircle, Loader2, Save, ExternalLink, FileText, X as XIcon, Search, Filter, ArrowUpDown, Pencil, Trash2, Check } from 'lucide-react';
import { RawTransaction } from '@/lib/accounting/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ImportPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [passwords, setPasswords] = useState({ dongmin: '820126', hyunjoo: '840416' });
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  type TxItem = RawTransaction & { id: string; category: string };
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  
  const [parsedData, setParsedData] = useState<{ totalRows: number; unclassifiedRows: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sorting and Filtering State
  const [filterText, setFilterText] = useState('');
  const [showUnclassified, setShowUnclassified] = useState(false);
  const [showUnmatchedBusiness, setShowUnmatchedBusiness] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc'|'desc' } | null>(null);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TxItem>>({});

  // Bulk Edit State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkEditForm, setBulkEditForm] = useState<{ category?: string; businessNum?: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
      setError(null);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
      setError(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('passwords', JSON.stringify(passwords));

    try {
      const res = await fetch('/api/accounting/process', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || '업로드 실패');
      }

      const mappedTransactions = data.transactions.map((t: any, i: number) => ({
        id: `tx-${Date.now()}-${i}`,
        date: t.거래일,
        content: t.지출내용,
        amount: t.지출금액,
        category: t.소비분류 || '',
        type: t.비고 === '입금' ? 'INCOME' : 'EXPENSE',
        merchant: t.매출처 || '',
        orderNo: t.주문번호 || '',
        paymentMethod: t.결제수단 || '',
        businessNum: t.사업자 || '',
        note: t.비고 || ''
      }));

      // Default sort by [PaymentMethod, Date] ascending
      mappedTransactions.sort((a: any, b: any) => {
        const aMethod = a.paymentMethod || '';
        const bMethod = b.paymentMethod || '';
        if (aMethod !== bMethod) {
          return aMethod < bMethod ? -1 : 1;
        }
        if (a.date !== b.date) {
          return a.date < b.date ? -1 : 1;
        }
        return 0;
      });

      setTransactions(mappedTransactions);
      setParsedData({
        totalRows: mappedTransactions.length,
        unclassifiedRows: mappedTransactions.filter((t: any) => !t.category || t.category === '미분류').length
      });
      setFilterText('');
      setShowUnclassified(false);
      setShowUnmatchedBusiness(false);
      setSortConfig(null);
      setEditingId(null);
      setSelectedIds([]);
      setBulkEditForm({});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleEditClick = (tx: TxItem) => {
    if (editingId && editingId !== tx.id) {
      // Auto-save previous editing row
      setTransactions(prev => prev.map(t => t.id === editingId ? { ...t, ...editForm } as TxItem : t));
    }
    setEditingId(tx.id);
    setEditForm({ ...tx });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingId) return;
    setTransactions(prev => prev.map(tx => tx.id === editingId ? { ...tx, ...editForm } as TxItem : tx));
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('정말로 삭제하시겠습니까?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>, filteredData: TxItem[]) => {
    if (e.target.checked) {
      setSelectedIds(filteredData.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleApplyBulkEdit = () => {
    if (selectedIds.length === 0) return;
    
    setTransactions(prev => prev.map(tx => {
      if (selectedIds.includes(tx.id)) {
        return {
          ...tx,
          ...(bulkEditForm.category !== undefined ? { category: bulkEditForm.category } : {}),
          ...(bulkEditForm.businessNum !== undefined ? { businessNum: bulkEditForm.businessNum } : {})
        };
      }
      return tx;
    }));
    
    setSelectedIds([]);
    setBulkEditForm({});
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`선택한 ${selectedIds.length}개의 내역을 정말 삭제하시겠습니까?`)) {
      setTransactions(prev => prev.filter(t => !selectedIds.includes(t.id)));
      setSelectedIds([]);
      setBulkEditForm({});
    }
  };

  const handleFillBusiness = () => {
    let filledCount = 0;
    const newTransactions = transactions.map(tx => {
      if (tx.category === '국내구매' && !tx.businessNum) {
        if (tx.paymentMethod?.startsWith('현주')) {
          filledCount++;
          return { ...tx, businessNum: '더엠제이' };
        } else if (tx.paymentMethod?.startsWith('동민')) {
          filledCount++;
          return { ...tx, businessNum: '동주' };
        }
      }
      return tx;
    });
    
    if (filledCount > 0) {
      setTransactions(newTransactions);
    }
    alert(`총 ${filledCount}건의 사업자가 자동으로 채워졌습니다.`);
  };

  const handleSaveToLedger = async () => {
    setIsSaving(true);
    try {
      const payloadTransactions = transactions.map(({ id, ...rest }) => rest);
      const res = await fetch('/api/accounting/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: payloadTransactions }),
      });
      
      if (!res.ok) throw new Error('저장 실패');
      
      alert('성공적으로 저장되었습니다.');
      router.push('/accounting');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];

    if (showUnclassified) {
      result = result.filter(tx => !tx.category || tx.category === '미분류');
    }

    if (showUnmatchedBusiness) {
      result = result.filter(tx => tx.category === '국내구매' && !tx.businessNum);
    }

    if (filterText) {
      const lower = filterText.toLowerCase();
      result = result.filter(tx => 
        (tx.content && tx.content.toLowerCase().includes(lower)) ||
        (tx.merchant && tx.merchant.toLowerCase().includes(lower)) ||
        (tx.paymentMethod && tx.paymentMethod.toLowerCase().includes(lower)) ||
        (tx.category && tx.category.toLowerCase().includes(lower))
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        let aValue = (a as any)[sortConfig.key] || '';
        let bValue = (b as any)[sortConfig.key] || '';

        if (sortConfig.key === 'amount') {
          aValue = Number(aValue);
          bValue = Number(bValue);
        } else {
          aValue = String(aValue);
          bValue = String(bValue);
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [transactions, filterText, showUnclassified, showUnmatchedBusiness, sortConfig]);

  const EXPENSE_CATEGORIES = ['국내구매', '사업세금', '기타경비', '음식', '물건', '몸', '취미', '경험', '관계', '기타', '관리비', '통신비', '교통비', '세금', '대출', '보험', '청약'];
  const INCOME_CATEGORIES = ['사업소득', '기타'];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-foreground">데이터 업로드</h1>
        <Link href="/accounting/categories" className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-foreground font-medium rounded-lg transition-colors">
          지출 분류 기준 관리
        </Link>
      </div>
      <p className="text-muted-foreground mb-6">은행이나 카드사의 엑셀 거래내역을 업로드하여 자동으로 분류합니다.</p>

      {/* 다운로드 링크 섹션 */}
      <div className="mb-8 p-6 glass-card shadow-sm rounded-xl border-white/10">
        <h2 className="text-sm font-semibold text-foreground mb-4">거래내역 다운로드 바로가기</h2>
        <div className="flex flex-wrap gap-3">
          <a href="https://card.kbcard.com/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-white/5 border border-white/10 hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-colors text-muted-foreground">KB국민카드 <ExternalLink size={14} /></a>
          <a href="https://www.shinhancard.com" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-white/5 border border-white/10 hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-colors text-muted-foreground">신한카드 <ExternalLink size={14} /></a>
          <a href="https://www.hyundaicard.com" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-white/5 border border-white/10 hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-colors text-muted-foreground">현대카드 <ExternalLink size={14} /></a>
          <a href="https://pc.wooricard.com/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-white/5 border border-white/10 hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-colors text-muted-foreground">우리카드 <ExternalLink size={14} /></a>
          <a href="https://www.wooribank.com" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-white/5 border border-white/10 hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-colors text-muted-foreground">우리은행 <ExternalLink size={14} /></a>
          <a href="https://www.kebhana.com" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-white/5 border border-white/10 hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-colors text-muted-foreground">하나은행 <ExternalLink size={14} /></a>
        </div>
      </div>

      {transactions.length === 0 && !isUploading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 glass-card p-8 shadow-sm rounded-xl">
            <h2 className="text-lg font-medium text-foreground mb-4">파일 업로드 (다중 선택 가능)</h2>
            <div 
              className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center hover:bg-white/5 hover:border-white/40 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={handleFileDrop}
            >
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-6">
                여기로 엑셀/HTML 파일을 끌어오거나 클릭해서 선택하세요
              </p>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                multiple
                accept=".xls,.xlsx,.csv,.html"
                onChange={handleFileChange}
              />
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10 text-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText size={16} className="text-primary shrink-0" />
                      <span className="truncate text-foreground">{f.name}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="text-muted-foreground hover:text-red-400"><XIcon size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="glass-card p-6 shadow-sm rounded-xl">
              <h2 className="font-semibold text-foreground mb-4">토스뱅크 암호 입력</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">동민 비밀번호</label>
                  <input type="password" value={passwords.dongmin} onChange={e => setPasswords({...passwords, dongmin: e.target.value})} className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-md text-sm text-white focus:ring-primary focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">현주 비밀번호</label>
                  <input type="password" value={passwords.hyunjoo} onChange={e => setPasswords({...passwords, hyunjoo: e.target.value})} className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-md text-sm text-white focus:ring-primary focus:border-primary" />
                </div>
              </div>
            </div>

            <button 
              className={`w-full py-3 rounded-xl font-medium shadow-sm transition-all ${files.length > 0 ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-white/5 text-muted-foreground cursor-not-allowed border border-white/10'}`}
              onClick={handleUpload}
              disabled={files.length === 0 || isUploading}
            >
              업로드 및 자동 분석 시작
            </button>
            {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
          </div>
        </div>
      )}

      {isUploading && (
        <div className="flex flex-col items-center justify-center py-12 glass-card shadow-sm rounded-xl">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium text-foreground">파일을 분석하고 사업지출 매칭 중입니다...</p>
        </div>
      )}

      {parsedData && !isUploading && (
        <div className="space-y-6">
          <div className="flex justify-between items-center glass-card shadow-sm rounded-xl p-6 border-white/10">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <CheckCircle className="text-emerald-500 w-5 h-5" />
                분석 완료 ({files.length}개 파일)
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                총 <span className="font-medium text-foreground">{parsedData.totalRows}건</span> 중 
                <span className="text-orange-400 font-medium ml-1">{transactions.filter(t => !t.category || t.category === '미분류').length}건 미분류</span>, 
                <span className="text-rose-400 font-medium ml-1">{transactions.filter(t => t.category === '국내구매' && !t.businessNum).length}건 사업자 미매칭</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3">

              <button
                onClick={() => {
                  setFiles([]);
                  setParsedData(null);
                  setTransactions([]);
                }}
                className="px-4 py-2 text-sm font-medium text-muted-foreground bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
              >
                다시 업로드
              </button>
              <button
                onClick={handleSaveToLedger}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                원장 저장
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass-card p-4 rounded-xl shadow-sm border-white/10">
            <div className="flex flex-1 w-full gap-4 items-center flex-wrap">
              <div className="relative flex-1 max-w-sm min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="내용, 결제수단, 매출처 검색..." 
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:ring-primary focus:border-primary"
                />
              </div>
              <button
                onClick={() => setShowUnclassified(!showUnclassified)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  showUnclassified 
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' 
                    : 'bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10'
                }`}
              >
                <Filter size={14} />
                미분류 필터링
              </button>
              <button
                onClick={() => setShowUnmatchedBusiness(!showUnmatchedBusiness)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  showUnmatchedBusiness 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/50' 
                    : 'bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10'
                }`}
              >
                <Filter size={14} />
                사업자 미매칭 필터링
              </button>
              <button
                onClick={handleFillBusiness}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-lg hover:bg-blue-400/20 transition-colors"
              >
                사업자 자동채우기
              </button>
            </div>
            <div className="text-sm text-muted-foreground shrink-0">
              목록: <span className="font-medium text-white">{filteredAndSortedTransactions.length}</span>건
            </div>
          </div>

          <div className="glass-card shadow-sm rounded-xl border-white/10 overflow-hidden relative">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-black/40 text-muted-foreground border-b border-white/10 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-3 font-medium w-10 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-white/20 bg-black/20" 
                        checked={filteredAndSortedTransactions.length > 0 && selectedIds.length === filteredAndSortedTransactions.length}
                        onChange={(e) => handleSelectAll(e, filteredAndSortedTransactions)}
                      />
                    </th>
                    <th className="px-3 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('date')}>
                      <div className="flex items-center gap-1">거래일 <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-3 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('type')}>
                      <div className="flex items-center gap-1">유형 <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-3 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('category')}>
                      <div className="flex items-center gap-1">분류 <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-3 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('content')}>
                      <div className="flex items-center gap-1">내용 <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-3 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('merchant')}>
                      <div className="flex items-center gap-1">매출처 <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-3 py-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => handleSort('amount')}>
                      <div className="flex items-center justify-end gap-1">금액 <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-3 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('paymentMethod')}>
                      <div className="flex items-center gap-1">결제수단 <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-3 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('businessNum')}>
                      <div className="flex items-center gap-1">사업자 <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-3 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('orderNo')}>
                      <div className="flex items-center gap-1">주문번호 <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-3 py-3 font-medium text-center w-20">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAndSortedTransactions.map((tx) => {
                    const isEditing = editingId === tx.id;
                    const isUnclassified = !tx.category || tx.category === '미분류';
                    const isUnmatchedBusiness = tx.category === '국내구매' && !tx.businessNum;

                    if (isEditing) {
                      return (
                        <tr key={tx.id} className="bg-white/5 transition-colors shadow-inner border-y border-primary/20">
                          <td className="px-2 py-2 text-center">
                            <input 
                              type="checkbox" 
                              className="rounded border-white/20 bg-black/20 cursor-pointer" 
                              checked={selectedIds.includes(tx.id)}
                              onChange={(e) => handleSelectOne(e, tx.id)}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input type="date" value={editForm.date || ''} onChange={e => setEditForm({...editForm, date: e.target.value})} className="w-full min-w-[110px] bg-black/20 border border-white/10 rounded px-2 py-1.5 text-foreground text-xs" />
                          </td>
                          <td className="px-2 py-2">
                            <select value={editForm.type || 'EXPENSE'} onChange={e => setEditForm({...editForm, type: e.target.value as 'INCOME'|'EXPENSE', category: ''})} className="w-full bg-black/20 border border-white/10 rounded px-1 py-1.5 text-foreground text-xs">
                              <option value="EXPENSE" className="bg-black text-white">지출</option>
                              <option value="INCOME" className="bg-black text-white">수입</option>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <select value={editForm.category || ''} onChange={e => setEditForm({...editForm, category: e.target.value})} className="w-full min-w-[80px] bg-black/20 border border-white/10 rounded px-1 py-1.5 text-foreground text-xs">
                              <option value="" className="bg-black text-white">(선택)</option>
                              {(editForm.type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                                <option key={cat} value={cat} className="bg-black text-white">{cat}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <input type="text" value={editForm.content || ''} onChange={e => setEditForm({...editForm, content: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-foreground text-xs" />
                          </td>
                          <td className="px-2 py-2">
                            <input type="text" value={editForm.merchant || ''} onChange={e => setEditForm({...editForm, merchant: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-foreground text-xs" />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" value={editForm.amount || 0} onChange={e => setEditForm({...editForm, amount: Number(e.target.value)})} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-foreground text-xs text-right min-w-[80px]" />
                          </td>
                          <td className="px-2 py-2">
                            <input type="text" value={editForm.paymentMethod || ''} onChange={e => setEditForm({...editForm, paymentMethod: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-foreground text-xs min-w-[80px]" />
                          </td>
                          <td className="px-2 py-2">
                            <select value={editForm.businessNum || ''} onChange={e => setEditForm({...editForm, businessNum: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-1 py-1.5 text-foreground text-xs min-w-[70px]">
                              <option value="" className="bg-black text-white">(없음)</option>
                              <option value="더엠제이" className="bg-black text-white">더엠제이</option>
                              <option value="동주" className="bg-black text-white">동주</option>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <input type="text" value={editForm.orderNo || ''} onChange={e => setEditForm({...editForm, orderNo: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-foreground text-xs" />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={handleSaveEdit} className="p-1.5 text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 rounded" title="저장"><Check className="w-4 h-4" /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }} className="p-1.5 text-slate-400 bg-white/5 hover:bg-white/10 rounded" title="취소"><XIcon className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr 
                        key={tx.id} 
                        onClick={() => handleEditClick(tx)}
                        className={`hover:bg-white/5 transition-colors cursor-pointer group ${
                          isUnclassified ? 'bg-orange-500/10' : ''
                        } ${isUnmatchedBusiness ? 'bg-rose-500/10' : ''} ${selectedIds.includes(tx.id) ? 'bg-primary/10' : ''}`}
                      >
                        <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            className="rounded border-white/20 bg-black/20 cursor-pointer" 
                            checked={selectedIds.includes(tx.id)}
                            onChange={(e) => handleSelectOne(e, tx.id)}
                          />
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{tx.date}</td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-1 rounded text-[10px] font-semibold ${tx.type === 'INCOME' ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {tx.type === 'INCOME' ? '수입' : '지출'}
                          </span>
                        </td>
                        <td className={`px-3 py-3 font-medium ${isUnclassified ? 'text-orange-400' : 'text-foreground'}`}>{tx.category || '-'}</td>
                        <td className="px-3 py-3 max-w-[150px] truncate text-foreground" title={tx.content || ''}>{tx.content}</td>
                        <td className="px-3 py-3 max-w-[150px] truncate text-muted-foreground" title={tx.merchant || ''}>{tx.merchant || '-'}</td>
                        <td className="px-3 py-3 text-right font-medium text-foreground">{tx.amount.toLocaleString()}</td>
                        <td className="px-3 py-3 text-muted-foreground">{tx.paymentMethod}</td>
                        <td className={`px-3 py-3 whitespace-nowrap ${isUnmatchedBusiness ? 'text-rose-400 font-medium' : 'text-muted-foreground'}`}>{tx.businessNum || '-'}</td>
                        <td className="px-3 py-3 max-w-[100px] truncate text-muted-foreground text-xs" title={tx.orderNo || ''}>{tx.orderNo || '-'}</td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => handleDelete(tx.id, e)} className="p-1.5 text-rose-400 hover:bg-rose-400/20 rounded transition-colors" title="삭제">
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

            {/* Floating Bulk Edit Bar */}
            {selectedIds.length > 0 && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/90 border border-white/20 shadow-2xl rounded-2xl px-6 py-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6 z-50 backdrop-blur-xl animate-in slide-in-from-bottom-5 max-w-[95vw] w-max">
                <div className="flex items-center gap-2 sm:border-r border-white/10 sm:pr-6">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">
                    {selectedIds.length}
                  </span>
                  <span className="text-sm font-medium text-white whitespace-nowrap">건 선택됨</span>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
                  <select 
                    value={bulkEditForm.category || ''} 
                    onChange={e => setBulkEditForm({...bulkEditForm, category: e.target.value})}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary w-[110px] sm:w-32"
                  >
                    <option value="" className="bg-black text-white">분류 변경안함</option>
                    {['국내구매', '사업세금', '기타경비', '음식', '물건', '몸', '취미', '경험', '관계', '기타', '관리비', '통신비', '교통비', '세금', '대출', '보험', '청약', '사업소득'].map(cat => (
                      <option key={cat} value={cat} className="bg-black text-white">{cat}</option>
                    ))}
                  </select>

                  <select 
                    value={bulkEditForm.businessNum || ''} 
                    onChange={e => setBulkEditForm({...bulkEditForm, businessNum: e.target.value})}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary w-[120px] sm:w-32"
                  >
                    <option value="" className="bg-black text-white">사업자 변경안함</option>
                    <option value="더엠제이" className="bg-black text-white">더엠제이</option>
                    <option value="동주" className="bg-black text-white">동주</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 sm:pl-4 sm:border-l border-white/10 flex-wrap justify-center">
                  <button 
                    onClick={handleBulkDelete}
                    className="px-3 py-1.5 text-sm font-medium text-rose-400 bg-rose-400/10 hover:bg-rose-400/20 rounded-lg transition-colors"
                  >
                    일괄 삭제
                  </button>
                  <button 
                    onClick={() => setSelectedIds([])}
                    className="px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    취소
                  </button>
                  <button 
                    onClick={handleApplyBulkEdit}
                    disabled={!bulkEditForm.category && !bulkEditForm.businessNum}
                    className="px-3 sm:px-4 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap"
                  >
                    일괄 적용
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
