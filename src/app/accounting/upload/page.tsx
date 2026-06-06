'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertCircle, Save, ArrowRight } from 'lucide-react';

interface Transaction {
  거래일: string;
  지출내용: string;
  지출금액: number;
  소비분류: string;
  매출처: string;
  주문번호: string;
  결제수단: string;
  사업자: string;
  비고: string;
}

export default function AccountingUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [passwords, setPasswords] = useState({ dongmin: '820126', hyunjoo: '840416' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<Transaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    setError(null);
    setResults(null);
    setSaveStatus('idle');

    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      formData.append('passwords', JSON.stringify(passwords));

      const res = await fetch('/api/accounting/process', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to process files');
      }

      const data = await res.json();
      setResults(data.transactions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!results || results.length === 0) return;
    
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/accounting/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: results })
      });

      if (!res.ok) throw new Error('저장 실패');
      setSaveStatus('success');
    } catch (err: any) {
      setSaveStatus('error');
      setError(err.message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">가계부 내역 업로드 및 분석</h1>
        <p className="text-gray-500 mt-1">카드사 및 은행의 엑셀/HTML 거래내역 파일을 업로드하여 자동으로 분류합니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="font-semibold text-gray-800 mb-4">1. 파일 업로드</h2>
            <div 
              onDragOver={e => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600">클릭하거나 파일을 이곳에 드롭하세요</p>
              <p className="text-xs text-gray-400 mt-1">.xls, .xlsx 파일 지원</p>
              <input type="file" multiple className="hidden" ref={fileInputRef} onChange={e => {
                if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
              }} />
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-100 text-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText size={14} className="text-blue-500 shrink-0" />
                      <span className="truncate text-gray-700">{f.name}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="font-semibold text-gray-800 mb-4">2. 암호화 파일 설정 (토스뱅크 등)</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">동민 비밀번호</label>
                <input type="password" value={passwords.dongmin} onChange={e => setPasswords({...passwords, dongmin: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">현주 비밀번호</label>
                <input type="password" value={passwords.hyunjoo} onChange={e => setPasswords({...passwords, hyunjoo: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
          </div>

          <button 
            onClick={handleProcess}
            disabled={files.length === 0 || isProcessing}
            className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-medium shadow-sm transition-all"
          >
            {isProcessing ? '분석 중...' : '파일 분석 시작'}
            {!isProcessing && <ArrowRight size={18} />}
          </button>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg flex gap-3 text-sm">
              <AlertCircle className="shrink-0" size={18} />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-12rem)]">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-xl">
              <h2 className="font-semibold text-gray-800">분석 결과 미리보기</h2>
              {results && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">총 {results.length}건</span>
                  <button 
                    onClick={handleSave}
                    disabled={saveStatus === 'saving' || saveStatus === 'success'}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {saveStatus === 'saving' ? '저장 중...' : saveStatus === 'success' ? <><CheckCircle2 size={16}/> 저장 완료</> : <><Save size={16}/> DB에 저장하기</>}
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto bg-white">
              {!results && !isProcessing ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <FileText size={48} className="mb-4 opacity-20" />
                  <p>파일을 업로드하고 분석을 시작하세요.</p>
                </div>
              ) : isProcessing ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                  <p>데이터 추출 및 자동 분류 중...</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                  <thead className="sticky top-0 bg-white shadow-sm ring-1 ring-gray-200">
                    <tr className="text-gray-500">
                      <th className="p-3 font-medium">거래일</th>
                      <th className="p-3 font-medium">결제수단</th>
                      <th className="p-3 font-medium">지출내용 (가맹점)</th>
                      <th className="p-3 font-medium text-right">금액</th>
                      <th className="p-3 font-medium">소비분류</th>
                      <th className="p-3 font-medium">매출처(스토어)</th>
                      <th className="p-3 font-medium">사업자</th>
                      <th className="p-3 font-medium">비고</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results?.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-3 text-gray-600">{row.거래일}</td>
                        <td className="p-3"><span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">{row.결제수단}</span></td>
                        <td className="p-3 font-medium text-gray-800">{row.지출내용}</td>
                        <td className="p-3 text-right font-medium text-gray-900">{row.지출금액.toLocaleString()}원</td>
                        <td className="p-3">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            row.소비분류 === '사업지출' || row.소비분류 === '국내구매' || row.소비분류 === '해외구매' 
                              ? 'bg-purple-100 text-purple-800' 
                              : row.소비분류 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {row.소비분류 || '미분류'}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">{row.매출처}</td>
                        <td className="p-3 text-gray-600">{row.사업자}</td>
                        <td className="p-3 text-gray-500">{row.비고}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
