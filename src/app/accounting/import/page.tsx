'use client';

import { useState, useRef } from 'react';
import { Upload, CheckCircle, Loader2, Save, ExternalLink } from 'lucide-react';
import { RawTransaction } from '@/lib/accounting/types';
import { useRouter } from 'next/navigation';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<(RawTransaction & { category: string | null })[]>([]);
  const [parserName, setParserName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<{ totalRows: number; unclassifiedRows: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/accounting/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || '업로드 실패');
      }

      setTransactions(data.transactions);
      setParserName(data.parserName);
      setParsedData({
        totalRows: data.transactions.length,
        unclassifiedRows: data.transactions.filter((t: any) => !t.category).length
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCategoryChange = (index: number, newCategory: string) => {
    const updated = [...transactions];
    updated[index].category = newCategory;
    setTransactions(updated);
  };

  const handleTypeChange = (index: number, newType: 'INCOME' | 'EXPENSE') => {
    const updated = [...transactions];
    updated[index].type = newType;
    setTransactions(updated);
  };

  const handleSaveToLedger = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/accounting/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions }),
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
        <div className="glass-card p-8 shadow-sm">
          <div 
            className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center hover:bg-white/5 hover:border-white/40 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              {file ? file.name : "엑셀/CSV 파일 선택"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              우리은행, 하나은행, KB카드, 신한카드, 현대카드 양식 지원
            </p>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xls,.xlsx,.csv"
              onChange={handleFileChange}
            />

            <button 
              className={`px-6 py-2.5 rounded-full font-medium ${file ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-white/5 text-muted-foreground cursor-not-allowed border border-white/10'}`}
              onClick={(e) => {
                e.stopPropagation();
                handleUpload();
              }}
              disabled={!file || isUploading}
            >
              업로드 및 자동 분류 시작
            </button>
            
            {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
          </div>
        </div>
      )}

      {isUploading && (
        <div className="flex flex-col items-center justify-center py-12 glass-card shadow-sm rounded-xl">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium text-foreground">파일을 분석하고 자동 분류 중입니다...</p>
        </div>
      )}

      {parsedData && !isUploading && (
        <div className="space-y-6">
          <div className="flex justify-between items-center glass-card shadow-sm rounded-xl p-6 border-white/10">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <CheckCircle className="text-emerald-500 w-5 h-5" />
                분석 완료 ({file?.name})
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                인식된 양식: <span className="font-semibold text-primary">{parserName}</span> | 총 {parsedData.totalRows}건 중 <span className="text-orange-400">{parsedData.unclassifiedRows}건 미분류</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setFile(null);
                  setParsedData(null);
                  setTransactions([]);
                }}
                className="px-4 py-2 text-sm font-medium text-muted-foreground bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
              >
                취소
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

          <div className="glass-card shadow-sm rounded-xl border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-black/40 text-muted-foreground border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 font-medium">거래일</th>
                    <th className="px-4 py-3 font-medium">내용</th>
                    <th className="px-4 py-3 font-medium text-right">금액</th>
                    <th className="px-4 py-3 font-medium">매출처</th>
                    <th className="px-4 py-3 font-medium">유형</th>
                    <th className="px-4 py-3 font-medium">분류 (수정가능)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.map((tx, idx) => (
                    <tr key={idx} className={`hover:bg-white/5 transition-colors ${!tx.category ? 'bg-orange-500/10' : ''}`}>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{tx.date}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-foreground" title={tx.content || ''}>{tx.content}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{tx.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 max-w-[150px] truncate text-muted-foreground" title={tx.merchant || ''}>{tx.merchant || '-'}</td>
                      <td className="px-4 py-3">
                        <select 
                          value={tx.type}
                          onChange={(e) => handleTypeChange(idx, e.target.value as 'INCOME' | 'EXPENSE')}
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
                          onChange={(e) => handleCategoryChange(idx, e.target.value)}
                          placeholder="미분류"
                          className={`w-32 bg-transparent border-b focus:border-primary focus:ring-0 px-1 py-1 text-sm ${
                            !tx.category ? 'border-orange-500/50 text-orange-400' : 'border-white/10 text-foreground'
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
