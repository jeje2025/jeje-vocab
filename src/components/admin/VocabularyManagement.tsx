import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trash2, RefreshCw, Edit, Check, X } from 'lucide-react';
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
    if (!confirm(`"${vocabTitle}" 단어장의 예문을 재생성하시겠습니까?\n\n이 작업은 시간이 걸릴 수 있으며, AI 비용이 발생합니다.`)) return;

    const token = getAuthToken();
    if (!token) {
      toast.error('인증이 필요합니다.');
      return;
    }

    const loadingToast = toast.loading('예문 재생성 중...');

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
        throw new Error(data.error || '예문 재생성 실패');
      }

      toast.success(`예문 재생성 완료!\n성공: ${data.processedCount}개, 실패: ${data.errorCount}개`, {
        id: loadingToast,
        duration: 5000,
      });

      await loadVocabularies();
    } catch (error: any) {
      console.error('Error regenerating examples:', error);
      toast.error(`예문 재생성 실패: ${error.message}`, {
        id: loadingToast,
      });
    }
  };

  const handleMigrateChapters = async () => {
    if (!confirm('단어장들을 챕터/강별로 마이그레이션하시겠습니까?\n\n처리 대상:\n- 301 chapter X → 정병권T 카테고리\n- 어휘끝 블랙 X강 → 어휘끝 블랙 카테고리\n\n다운로드 시 챕터/강별 유닛 구분')) return;

    const token = getAuthToken();
    if (!token) {
      toast.error('인증이 필요합니다.');
      return;
    }

    const loadingToast = toast.loading('챕터 마이그레이션 중...');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/migrate-chapters`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '마이그레이션 실패');
      }

      toast.success(`마이그레이션 완료!\n${data.processedVocabs}개 단어장, ${data.processedWords}개 단어 처리`, {
        id: loadingToast,
        duration: 5000,
      });

      await loadCategories();
      await loadVocabularies();
    } catch (error: any) {
      console.error('Error migrating chapters:', error);
      toast.error(`마이그레이션 실패: ${error.message}`, {
        id: loadingToast,
      });
    }
  };

  const handleAutoMerge = async () => {
    if (!confirm('챕터별 단어장들을 자동으로 합치시겠습니까?\n\n처리 내용:\n- 정병권T 단어장들 → "정병권 301" 하나로 통합\n- 어휘끝 블랙 단어장들 → "어휘끝 블랙" 하나로 통합\n\n각 챕터/강은 유닛으로 유지됩니다.')) return;

    const token = getAuthToken();
    if (!token) {
      toast.error('인증이 필요합니다.');
      return;
    }

    const loadingToast = toast.loading('단어장 자동 통합 중...');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/auto-merge-chapters`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '자동 통합 실패');
      }

      toast.success(`자동 통합 완료!\n${data.message}`, {
        id: loadingToast,
        duration: 5000,
      });

      await loadCategories();
      await loadVocabularies();
    } catch (error: any) {
      console.error('Error auto-merging:', error);
      toast.error(`자동 통합 실패: ${error.message}`, {
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

  const filteredVocabularies = selectedCategory === 'all'
    ? vocabularies
    : vocabularies.filter(v => v.category === selectedCategory);

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

        {/* Actions and Filter */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleMigrateChapters}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
            style={{ fontWeight: 600 }}
          >
            챕터 마이그레이션
          </button>
          <button
            onClick={handleAutoMerge}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            style={{ fontWeight: 600 }}
          >
            자동 통합
          </button>
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
        ) : filteredVocabularies.length === 0 ? (
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
              {filteredVocabularies.map((vocab) => (
                <tr key={vocab.id} className="hover:bg-gray-50 transition-colors">
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
                        className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
                        title="예문 재생성"
                      >
                        <RefreshCw className="w-4 h-4 text-purple-500" />
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
