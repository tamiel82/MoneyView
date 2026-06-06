'use client';

import { useState, useRef, useMemo } from 'react';
import { Upload, CheckCircle, Loader2, Save, ExternalLink, FileText, X, Search, Filter, ArrowUpDown } from 'lucide-react';
import { RawTransaction } from '@/lib/accounting/types';
import { useRouter } from 'next/navigation';

export default function ImportPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [passwords, setPasswords] = useState({ dongmin: '820126', hyunjoo: '840416' });
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use a custom type that includes an id for safe updates after filtering/sorting
  type TxItem = RawTransaction & { id: string; category: string };
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  
  const [parsedData, setParsedData] = useState<{ totalRows: number; unclassifiedRows: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sorting and Filtering State
  const [filterText, setFilterText] = useState('');
  const [showUnclassified, setShowUnclassified] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc'|'desc' } | null>(null);

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
      // Reset filters on new upload
      setFilterText('');
      setShowUnclassified(false);
      setSortConfig(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCategoryChange = (id: string, newCategory: string) => {
    setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, category: newCategory } : tx));
  };

  const handleTypeChange = (id: string, newType: 'INCOME' | 'EXPENSE') => {
    setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, type: newType } : tx));
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
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
  }, [transactions, filterText, showUnclassified, sortConfig]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-foreground">데이터 업로드</h1>
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
                    <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="text-muted-foreground hover:text-red-400"><X size={16} /></button>
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
                총 {parsedData.totalRows}건 중 <span className="text-orange-400">{transactions.filter(t => !t.category || t.category === '미분류').length}건 미분류</span>
              </p>
            </div>
            <div className="flex gap-3">
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
            <div className="flex flex-1 w-full gap-4 items-center">
              <div className="relative flex-1 max-w-sm">
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
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  showUnclassified 
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' 
                    : 'bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10'
                }`}
              >
                <Filter size={16} />
                미분류만 보기
              </button>
            </div>
            <div className="text-sm text-muted-foreground">
              검색 결과: <span className="font-medium text-white">{filteredAndSortedTransactions.length}</span>건
            </div>
          </div>

          <div className="glass-card shadow-sm rounded-xl border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-black/40 text-muted-foreground border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('date')}>
                      <div className="flex items-center gap-1">거래일 <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('content')}>
                      <div className="flex items-center gap-1">내용(가맹점) <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-4 py-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => handleSort('amount')}>
                      <div className="flex items-center justify-end gap-1">금액 <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('paymentMethod')}>
                      <div className="flex items-center gap-1">결제수단 <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('merchant')}>
                      <div className="flex items-center gap-1">매출처 <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('orderNo')}>
                      <div className="flex items-center gap-1">주문번호 <ArrowUpDown size={12}/></div>
                    </th>
                    <th className="px-4 py-3 font-medium">사업자</th>
                    <th className="px-4 py-3 font-medium">유형</th>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('category')}>
                      <div className="flex items-center gap-1">분류 (수정가능) <ArrowUpDown size={12}/></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAndSortedTransactions.map((tx) => (
                    <tr key={tx.id} className={`hover:bg-white/5 transition-colors ${!tx.category || tx.category === '미분류' ? 'bg-orange-500/10' : ''}`}>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{tx.date}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-foreground" title={tx.content || ''}>{tx.content}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{tx.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{tx.paymentMethod}</td>
                      <td className="px-4 py-3 max-w-[150px] truncate text-muted-foreground" title={tx.merchant || ''}>{tx.merchant || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{tx.orderNo || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{tx.businessNum || '-'}</td>
                      <td className="px-4 py-3">
                        <select 
                          value={tx.type}
                          onChange={(e) => handleTypeChange(tx.id, e.target.value as 'INCOME' | 'EXPENSE')}
                          className={`text-xs px-2 py-1 rounded-md border-0 font-medium cursor-pointer ${
                            tx.type === 'INCOME' ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          <option value="EXPENSE" className="bg-slate-900 text-white">지출</option>
                          <option value="INCOME" className="bg-slate-900 text-white">수입</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={tx.category || ''}
                          onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                          placeholder="미분류"
                          className={`w-32 bg-transparent border-b focus:border-primary focus:ring-0 px-1 py-1 text-sm ${
                            !tx.category || tx.category === '미분류' ? 'border-orange-500/50 text-orange-400' : 'border-white/10 text-foreground'
                          }`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
