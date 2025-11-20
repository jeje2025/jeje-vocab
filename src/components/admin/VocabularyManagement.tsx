import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trash2, RefreshCw, Edit, Check, X, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';

interface VocabularyManagementProps {
  getAuthToken: () => string | null;
}

interface Vocabulary {
  id: string;
  title: string;
  category: string;
  level: string;
  total_words: number;
  downloads?: number;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
}

export function VocabularyManagement({ getAuthToken }: VocabularyManagementProps) {
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingVocabId, setEditingVocabId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string>('');
  const [selectedVocabs, setSelectedVocabs] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');
  const [regeneratedVocabs, setRegeneratedVocabs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCategories();
    loadVocabularies();
  }, []);

  const loadCategories = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/categories`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadVocabularies = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/shared-vocabularies`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.vocabularies) {
        setVocabularies(data.vocabularies);
      }
    } catch (error) {
      console.error('Error loading vocabularies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vocabId: string) => {
    if (!confirm('정말 이 단어장을 삭제하시겠습니까?')) return;

    const token = getAuthToken();
    if (!token) return;

    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/shared-vocabularies/${vocabId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      toast.success('단어장이 삭제되었습니다.');
      await loadVocabularies();
    } catch (error) {
      console.error('Error deleting vocabulary:', error);
      toast.error('삭제 실패했습니다.');
    }
  };

  const handleRegenerateExamples = async (vocabId: string, vocabTitle: string) => {
    if (!confirm(`"${vocabTitle}" 단어장의 뜻과 예문을 AI로 재생성하시겠습니까?\n\n이 작업은 시간이 걸릴 수 있으며, AI 비용이 발생합니다.`)) return;

    const token = getAuthToken();
    if (!token) {
      toast.error('인증이 필요합니다.');
      return;
    }

    const loadingToast = toast.loading('뜻과 예문 AI 재생성 중...');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-tools/regenerate-examples`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ vocabularyId: vocabId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'AI 재생성 실패');
      }

      toast.success(`AI 재생성 완료!\n성공: ${data.processedCount}개, 실패: ${data.errorCount}개`, {
        id: loadingToast,
        duration: 5000,
      });

      // Mark this vocabulary as regenerated
      setRegeneratedVocabs(prev => new Set(prev).add(vocabId));

      await loadVocabularies();
    } catch (error: any) {
      console.error('Error regenerating examples:', error);
      toast.error(`AI 재생성 실패: ${error.message}`, {
        id: loadingToast,
      });
    }
  };

  const handleStartEdit = (vocabId: string, currentCategory: string) => {
    setEditingVocabId(vocabId);
    setEditingCategory(currentCategory);
  };

  const handleCancelEdit = () => {
    setEditingVocabId(null);
    setEditingCategory('');
  };

  const handleSaveCategory = async (vocabId: string) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/shared-vocabularies/${vocabId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ category: editingCategory }),
        }
      );

      if (!response.ok) {
        throw new Error('카테고리 변경 실패');
      }

      toast.success('카테고리가 변경되었습니다.');
      setEditingVocabId(null);
      setEditingCategory('');
      await loadVocabularies();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('카테고리 변경 실패');
    }
  };

  const toggleSelectVocab = (vocabId: string) => {
    setSelectedVocabs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vocabId)) {
        newSet.delete(vocabId);
      } else {
        newSet.add(vocabId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedVocabs.size === filteredVocabularies.length) {
      setSelectedVocabs(new Set());
    } else {
      setSelectedVocabs(new Set(filteredVocabularies.map(v => v.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedVocabs.size === 0) {
      toast.error('삭제할 단어장을 선택해주세요.');
      return;
    }

    if (!confirm(`선택한 ${selectedVocabs.size}개의 단어장을 삭제하시겠습니까?`)) return;

    const token = getAuthToken();
    if (!token) return;

    const loadingToast = toast.loading('단어장 삭제 중...');

    try {
      const deletePromises = Array.from(selectedVocabs).map(vocabId =>
        fetch(
          `https://${projectId}.supabase.co/functions/v1/server/admin/shared-vocabularies/${vocabId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        )
      );

      await Promise.all(deletePromises);

      toast.success(`${selectedVocabs.size}개의 단어장이 삭제되었습니다.`, {
        id: loadingToast,
      });

      setSelectedVocabs(new Set());
      await loadVocabularies();
    } catch (error) {
      console.error('Error deleting vocabularies:', error);
      toast.error('일부 단어장 삭제에 실패했습니다.', {
        id: loadingToast,
      });
    }
  };

  const filteredVocabularies = selectedCategory === 'all'
    ? vocabularies
    : vocabularies.filter(v => v.category === selectedCategory);

  const sortedVocabularies = [...filteredVocabularies].sort((a, b) => {
    if (sortOrder === 'none') return 0;

    const comparison = a.title.localeCompare(b.title, 'ko-KR');
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl mb-2" style={{ fontWeight: 700, color: '#491B6D' }}>
            Vocabulary Management
          </h1>
          <p className="text-gray-600">Manage all shared vocabulary lists</p>
        </div>

        {/* Filter and Bulk Actions */}
        <div className="flex items-center gap-4">
          {selectedVocabs.size > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              style={{ fontWeight: 600 }}
            >
              <Trash2 className="w-4 h-4" />
              선택 삭제 ({selectedVocabs.size})
            </motion.button>
          )}

          <label className="text-sm text-gray-600" style={{ fontWeight: 600 }}>
            정렬:
          </label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc' | 'none')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="none">정렬 안함</option>
            <option value="asc">가나다순 (↑)</option>
            <option value="desc">가나다 역순 (↓)</option>
          </select>

          <label className="text-sm text-gray-600" style={{ fontWeight: 600 }}>
            필터:
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">전체 카테고리</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Vocabulary Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : sortedVocabularies.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {selectedCategory === 'all'
              ? '단어장이 없습니다. "Create Vocabulary" 탭에서 새 단어장을 만들어주세요.'
              : '이 카테고리에 단어장이 없습니다.'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 hover:text-purple-600 transition-colors"
                  >
                    {selectedVocabs.size === sortedVocabularies.length && sortedVocabularies.length > 0 ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                    <span>Select All</span>
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  Title
                </th>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  Category
                </th>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  Level
                </th>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  Words
                </th>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  Downloads
                </th>
                <th className="px-6 py-4 text-right text-xs text-gray-600 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedVocabularies.map((vocab) => (
                <tr key={vocab.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleSelectVocab(vocab.id)}
                      className="flex items-center justify-center hover:text-purple-600 transition-colors"
                    >
                      {selectedVocabs.has(vocab.id) ? (
                        <CheckSquare className="w-5 h-5 text-purple-600" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                      {vocab.title}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {editingVocabId === vocab.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editingCategory}
                          onChange={(e) => setEditingCategory(e.target.value)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.name}>
                              {cat.icon} {cat.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleSaveCategory(vocab.id)}
                          className="p-1 hover:bg-green-50 rounded transition-colors"
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 hover:bg-red-50 rounded transition-colors"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs bg-[#8B5CF6]/10 text-[#8B5CF6]" style={{ fontWeight: 600 }}>
                          {vocab.category}
                        </span>
                        <button
                          onClick={() => handleStartEdit(vocab.id, vocab.category)}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-all"
                        >
                          <Edit className="w-3 h-3 text-gray-500" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{vocab.level}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{vocab.total_words?.toLocaleString() || 0}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{vocab.downloads?.toLocaleString() || 0}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleRegenerateExamples(vocab.id, vocab.title)}
                        className={`p-2 rounded-lg transition-colors relative ${
                          regeneratedVocabs.has(vocab.id)
                            ? 'bg-green-50 hover:bg-green-100'
                            : 'hover:bg-purple-50'
                        }`}
                        title={
                          regeneratedVocabs.has(vocab.id)
                            ? 'AI 재생성 완료 (이번 세션)'
                            : 'AI 재생성 (뜻 + 예문)'
                        }
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${
                            regeneratedVocabs.has(vocab.id)
                              ? 'text-green-600'
                              : 'text-purple-500'
                          }`}
                        />
                        {regeneratedVocabs.has(vocab.id) && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                        )}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(vocab.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </motion.button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
