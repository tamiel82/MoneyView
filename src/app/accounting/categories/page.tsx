'use client';

import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, X, Check, Search } from 'lucide-react';

interface Category {
  id: number;
  merchant: string;
  category: string;
  note: string | null;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

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
      const res = await fetch('/api/categories');
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

  const filteredCategories = categories.filter(c => 
    c.merchant.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">가계부 지출 분류 관리</h1>
          <p className="text-gray-500 mt-1">업로드된 거래내역의 가맹점명을 기준으로 소비분류를 자동 매핑합니다.</p>
        </div>
        <button
          onClick={handleAddNew}
          disabled={editingId === 'new'}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <Plus size={18} />
          새 분류 추가
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={18} /></button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="가맹점 또는 분류 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
                <th className="p-4 w-1/3">가맹점 (검색어)</th>
                <th className="p-4 w-1/4">소비 분류</th>
                <th className="p-4 w-1/3">비고</th>
                <th className="p-4 w-24 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
              {editingId === 'new' && (
                <tr className="bg-blue-50">
                  <td className="p-3">
                    <input autoFocus type="text" value={editForm.merchant} onChange={e => setEditForm({...editForm, merchant: e.target.value})} placeholder="가맹점 키워드" className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                  </td>
                  <td className="p-3">
                    <input type="text" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} placeholder="분류 (예: 식비, 사업지출)" className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                  </td>
                  <td className="p-3">
                    <input type="text" value={editForm.note} onChange={e => setEditForm({...editForm, note: e.target.value})} placeholder="비고" className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={handleSave} className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"><Check size={18} /></button>
                      <button onClick={handleCancel} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded transition-colors"><X size={18} /></button>
                    </div>
                  </td>
                </tr>
              )}
              
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">데이터를 불러오는 중...</td>
                </tr>
              ) : filteredCategories.length === 0 && editingId !== 'new' ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">등록된 분류 기준이 없습니다.</td>
                </tr>
              ) : (
                filteredCategories.map(cat => (
                  <tr key={cat.id} className="hover:bg-gray-50 group">
                    {editingId === cat.id ? (
                      <>
                        <td className="p-3">
                          <input autoFocus type="text" value={editForm.merchant} onChange={e => setEditForm({...editForm, merchant: e.target.value})} className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                        </td>
                        <td className="p-3">
                          <input type="text" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                        </td>
                        <td className="p-3">
                          <input type="text" value={editForm.note} onChange={e => setEditForm({...editForm, note: e.target.value})} className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={handleSave} className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"><Check size={18} /></button>
                            <button onClick={handleCancel} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded transition-colors"><X size={18} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4 font-medium">{cat.merchant}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {cat.category}
                          </span>
                        </td>
                        <td className="p-4 text-gray-500">{cat.note}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(cat)} className="p-1.5 text-gray-500 hover:bg-gray-200 hover:text-blue-600 rounded transition-colors"><Pencil size={16} /></button>
                            <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-gray-500 hover:bg-gray-200 hover:text-red-600 rounded transition-colors"><Trash2 size={16} /></button>
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
