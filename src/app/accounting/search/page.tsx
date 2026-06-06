'use client';

import { useState } from 'react';
import { Search, Loader2, RefreshCw } from 'lucide-react';
import TransactionGrid, { Transaction } from '@/components/accounting/TransactionGrid';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setSearchQuery(query);
      setHasSearched(true);
      const res = await fetch(`/api/accounting/transactions?search=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('데이터를 불러오는데 실패했습니다.');
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    if (searchQuery) {
      handleSearch();
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col h-full gap-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">통합 검색</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            전체 가계부 데이터에서 내역, 가맹점, 비고 등을 검색합니다. (최대 1000건)
          </p>
        </div>
      </div>

      {/* Search Input Area */}
      <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색어를 입력하세요..."
            className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm glass"
          />
        </div>
        <button 
          type="submit"
          disabled={loading || !query.trim()}
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          검색
        </button>
      </form>

      {/* Error State */}
      {error && (
        <div className="bg-rose-500/20 text-rose-400 p-4 rounded-lg flex items-center justify-between border border-rose-500/50">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300">
            <RefreshCw size={18} />
          </button>
        </div>
      )}

      {/* Results Area */}
      {hasSearched && (
        <div className="flex-1 flex flex-col glass-card p-4 h-full min-h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              검색 결과 <span className="text-primary">{transactions.length}</span>건
            </h2>
            <button
              onClick={refreshData}
              disabled={loading}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-muted-foreground"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="flex-1 -mx-4 sm:mx-0 overflow-hidden rounded-lg border border-white/5 bg-black/20 relative">
            {loading && !transactions.length ? (
              <div className="absolute inset-0 z-10 bg-black/20 backdrop-blur-sm flex flex-col items-center justify-center text-primary gap-4">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="font-medium animate-pulse text-sm">검색 중...</span>
              </div>
            ) : null}
            
            <TransactionGrid 
              transactions={transactions} 
              onRefresh={refreshData} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
