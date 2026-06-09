'use client';

import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, X as XIcon, Check, Search, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface Category {
  id: number;
  merchant: string;
  category: string;
  note: string | null;
}

const ALL_CATEGORIES = [
  '사업지출', '해외구매', '음식', '물건', '몸', '취미', '경험', '관계', 
  '관리비', '통신비', '교통비', '세금', '대출', '보험', '청약', 
  '사업세금', '기타경비', '사업지출', '사업소득', '기타'
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case '음식': case '물건': case '관리비': case '통신비': case '교통비':
      return 'bg-slate-500/20 text-slate-300 border border-slate-500/30';
    case '취미': case '경험': case '관계': case '몸':
      return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
    case '세금': case '대출': case '보험': case '청약':
      return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
    case '사업지출': case '해외구매':
      return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
    case '사업지출': case '사업소득': case '사업세금': case '기타경비':
      return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    default:
      return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
  }
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search, Filter, Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('CAT_MERCHANT_ASC');

  // Edit/Add state
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [editForm, setEditForm] = useState<{ merchant: string; category: string; note: string }>({
    merchant: '',
    category: '',
    note: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/categories?t=${Date.now()}`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      setCategories(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditForm({ merchant: cat.merchant, category: cat.category, note: cat.note || '' });
  };

  const handleAddNew = () => {
    setEditingId('new');
    setEditForm({ merchant: '', category: '', note: '' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ merchant: '', category: '', note: '' });
  };

  const handleSave = async () => {
    try {
      setError(null);
      if (!editForm.merchant || !editForm.category) {
        throw new Error('가맹점과 분류는 필수 항목입니다.');
      }

      if (editingId === 'new') {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm)
        });
        if (!res.ok) {
          const e = await res.json();
          throw new Error(e.error || 'Failed to create category');
        }
      } else {
        const res = await fetch('/api/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...editForm })
        });
        if (!res.ok) {
          const e = await res.json();
          throw new Error(e.error || 'Failed to update category');
        }
      }

      await fetchCategories();
      setEditingId(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      setError(null);
      const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete category');
      await fetchCategories();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredCategories = categories.filter(c => {
    const matchesSearch = c.merchant.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || c.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'MERCHANT_ASC': return a.merchant.localeCompare(b.merchant);
      case 'MERCHANT_DESC': return b.merchant.localeCompare(a.merchant);
      case 'CAT_ASC': return a.category.localeCompare(b.category);
      case 'CAT_DESC': return b.category.localeCompare(a.category);
      case 'CAT_MERCHANT_ASC':
      default:
        if (a.category < b.category) return -1;
        if (a.category > b.category) return 1;
        if (a.merchant < b.merchant) return -1;
        if (a.merchant > b.merchant) return 1;
        return 0;
    }
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/accounting" className="p-2 hover:bg-white/10 rounded-full transition-colors text-muted-foreground"><ChevronLeft /></Link>
        <h1 className="text-3xl font-bold text-foreground">지출 분류(가맹점 매핑) 관리</h1>
      </div>
      <div className="flex items-center justify-between mb-8 ml-14">
        <p className="text-muted-foreground">업로드된 거래내역의 가맹점명을 기준으로 소비분류를 자동 매핑합니다.</p>
        <button
          onClick={handleAddNew}
          disabled={editingId === 'new'}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <Plus size={18} />
          새 분류 추가
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/20 text-rose-400 p-4 rounded-lg mb-6 flex items-center justify-between border border-rose-500/50">
          <span>{error}</span>
          <button onClick={() => setError(null)}><XIcon size={18} /></button>
        </div>
      )}

      <div className="glass-card rounded-xl shadow-sm border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-black/20 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="가맹점 또는 분류 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-foreground focus:ring-primary focus:border-primary outline-none transition-colors"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-foreground focus:ring-primary focus:border-primary outline-none transition-colors"
            >
              <option value="ALL" className="bg-black text-white">전체 분류</option>
              {ALL_CATEGORIES.map(cat => (
                <option key={cat} value={cat} className="bg-black text-white">{cat}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-foreground focus:ring-primary focus:border-primary outline-none transition-colors"
            >
              <option value="CAT_MERCHANT_ASC" className="bg-black text-white">분류/가맹점 (기본)</option>
              <option value="MERCHANT_ASC" className="bg-black text-white">가맹점명 오름차순</option>
              <option value="MERCHANT_DESC" className="bg-black text-white">가맹점명 내림차순</option>
              <option value="CAT_ASC" className="bg-black text-white">분류명 오름차순</option>
              <option value="CAT_DESC" className="bg-black text-white">분류명 내림차순</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/40 text-muted-foreground border-b border-white/10">
              <tr>
                <th className="p-4 font-medium w-1/3">가맹점 (검색어)</th>
                <th className="p-4 font-medium w-1/4">소비 분류</th>
                <th className="p-4 font-medium w-1/3">비고</th>
                <th className="p-4 font-medium w-24 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-foreground">
              {editingId === 'new' && (
                <tr className="bg-primary/10 transition-colors">
                  <td className="p-3">
                    <input autoFocus type="text" value={editForm.merchant} onChange={e => setEditForm({...editForm, merchant: e.target.value})} placeholder="가맹점 키워드" className="w-full px-3 py-1.5 bg-black/20 border border-white/10 rounded text-foreground focus:ring-primary focus:border-primary outline-none" />
                  </td>
                  <td className="p-3">
                    <select 
                      value={editForm.category} 
                      onChange={e => setEditForm({...editForm, category: e.target.value})} 
                      className="w-full px-3 py-1.5 bg-black/20 border border-white/10 rounded text-foreground focus:ring-primary focus:border-primary outline-none"
                    >
                      <option value="" className="bg-black text-white">분류 선택</option>
                      {ALL_CATEGORIES.map(cat => (
                        <option key={cat} value={cat} className="bg-black text-white">{cat}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <input type="text" value={editForm.note} onChange={e => setEditForm({...editForm, note: e.target.value})} placeholder="비고" className="w-full px-3 py-1.5 bg-black/20 border border-white/10 rounded text-foreground focus:ring-primary focus:border-primary outline-none" />
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={handleSave} className="p-1.5 text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 rounded transition-colors" title="저장"><Check size={16} /></button>
                      <button onClick={handleCancel} className="p-1.5 text-slate-400 bg-white/5 hover:bg-white/10 rounded transition-colors" title="취소"><XIcon size={16} /></button>
                    </div>
                  </td>
                </tr>
              )}
              
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">데이터를 불러오는 중...</td>
                </tr>
              ) : filteredCategories.length === 0 && editingId !== 'new' ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">등록된 분류 기준이 없습니다.</td>
                </tr>
              ) : (
                filteredCategories.map(cat => (
                  <tr key={cat.id} className={`group transition-colors ${editingId === cat.id ? 'bg-white/5 shadow-inner border-y border-primary/20' : 'hover:bg-white/5'}`}>
                    {editingId === cat.id ? (
                      <>
                        <td className="p-3">
                          <input autoFocus type="text" value={editForm.merchant} onChange={e => setEditForm({...editForm, merchant: e.target.value})} className="w-full px-3 py-1.5 bg-black/20 border border-white/10 rounded text-foreground focus:ring-primary focus:border-primary outline-none" />
                        </td>
                        <td className="p-3">
                          <select 
                            value={editForm.category} 
                            onChange={e => setEditForm({...editForm, category: e.target.value})} 
                            className="w-full px-3 py-1.5 bg-black/20 border border-white/10 rounded text-foreground focus:ring-primary focus:border-primary outline-none"
                          >
                            <option value="" className="bg-black text-white">분류 선택</option>
                            {ALL_CATEGORIES.map(cat => (
                              <option key={cat} value={cat} className="bg-black text-white">{cat}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <input type="text" value={editForm.note} onChange={e => setEditForm({...editForm, note: e.target.value})} className="w-full px-3 py-1.5 bg-black/20 border border-white/10 rounded text-foreground focus:ring-primary focus:border-primary outline-none" />
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={handleSave} className="p-1.5 text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 rounded transition-colors"><Check size={16} /></button>
                            <button onClick={handleCancel} className="p-1.5 text-slate-400 bg-white/5 hover:bg-white/10 rounded transition-colors"><XIcon size={16} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4 font-medium text-foreground">{cat.merchant}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold ${getCategoryColor(cat.category)}`}>
                            {cat.category}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground">{cat.note || '-'}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(cat)} className="p-1.5 text-muted-foreground hover:bg-white/10 hover:text-primary rounded transition-colors" title="수정"><Pencil size={16} /></button>
                            <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-rose-400 hover:bg-rose-400/20 rounded transition-colors" title="삭제"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
