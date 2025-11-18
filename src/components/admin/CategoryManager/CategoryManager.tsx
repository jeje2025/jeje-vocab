import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ChevronDown,
  Edit,
  Trash2,
  Save,
  Plus,
  GitMerge,
  CheckSquare,
  Square,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Category, CategoryManagerProps, Vocabulary } from './types';
import { categoryApi } from './api';
import { VocabularyItem } from './VocabularyItem';
import { MergeDialog } from './MergeDialog';
import { CategoryDropZone } from './CategoryDropZone';

export function CategoryManager({ getAuthToken, onUpdate }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedVocabIds, setSelectedVocabIds] = useState<Set<string>>(new Set());
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Edit states
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [newCategory, setNewCategory] = useState({ name: '', icon: '📚' });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      setLoading(true);
      const data = await categoryApi.getCategories(token);
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('카테고리 로딩 실패');
    } finally {
      setLoading(false);
    }
  };

  const loadVocabularies = async (categoryName: string) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const data = await categoryApi.getVocabularies(token, categoryName);
      setVocabularies(data);
    } catch (error) {
      console.error('Error loading vocabularies:', error);
      toast.error('단어장 로딩 실패');
    }
  };

  const handleToggleExpand = async (categoryId: string, categoryName: string) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
      setVocabularies([]);
      setSelectedVocabIds(new Set());
    } else {
      setExpandedCategory(categoryId);
      await loadVocabularies(categoryName);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedVocabIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedVocabIds.size === vocabularies.length) {
      setSelectedVocabIds(new Set());
    } else {
      setSelectedVocabIds(new Set(vocabularies.map((v) => v.id)));
    }
  };

  const handleMerge = async (targetId: string, newTitle: string) => {
    const token = getAuthToken();
    if (!token) return;

    const sourceIds = Array.from(selectedVocabIds).filter((id) => id !== targetId);

    try {
      await categoryApi.mergeVocabularies(token, targetId, sourceIds, newTitle);
      toast.success('단어장이 병합되었습니다!');
      setShowMergeDialog(false);
      setSelectedVocabIds(new Set());

      // Reload vocabularies
      const currentCategory = categories.find((c) => c.id === expandedCategory);
      if (currentCategory) {
        await loadVocabularies(currentCategory.name);
      }
      onUpdate?.();
    } catch (error) {
      console.error('Error merging vocabularies:', error);
      toast.error('병합 실패');
    }
  };

  const handleDeleteVocab = async (vocabId: string) => {
    if (!confirm('정말 이 단어장을 삭제하시겠습니까?')) return;

    const token = getAuthToken();
    if (!token) return;

    try {
      await categoryApi.deleteVocabulary(token, vocabId);
      toast.success('단어장이 삭제되었습니다.');

      // Reload vocabularies
      const currentCategory = categories.find((c) => c.id === expandedCategory);
      if (currentCategory) {
        await loadVocabularies(currentCategory.name);
      }
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting vocabulary:', error);
      toast.error('삭제 실패');
    }
  };

  const handleEditVocab = (vocab: Vocabulary) => {
    // Navigate to edit screen or open edit modal
    toast.info('편집 기능은 Vocabularies 탭에서 사용해주세요.');
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const vocab = vocabularies.find((v) => v.id === active.id);
    if (!vocab) return;

    // Check if dropped over a category drop zone
    const overId = String(over.id);
    if (overId.startsWith('category-')) {
      const categoryId = overId.replace('category-', '');
      const targetCategory = categories.find((c) => c.id === categoryId);

      if (targetCategory && vocab.category !== targetCategory.name) {
        await moveVocabularyToCategory(vocab.id, targetCategory.name);
      }
    }
  };

  const moveVocabularyToCategory = async (vocabId: string, newCategory: string) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      await categoryApi.updateVocabulary(token, vocabId, { category: newCategory });
      toast.success(`단어장이 "${newCategory}" 카테고리로 이동되었습니다!`);

      // Reload vocabularies
      const currentCategory = categories.find((c) => c.id === expandedCategory);
      if (currentCategory) {
        await loadVocabularies(currentCategory.name);
      }
      onUpdate?.();
    } catch (error) {
      console.error('Error moving vocabulary:', error);
      toast.error('이동 실패');
    }
  };

  const selectedVocabularies = vocabularies.filter((v) =>
    selectedVocabIds.has(v.id)
  );

  const activeVocab = activeId ? vocabularies.find((v) => v.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl mb-2" style={{ fontWeight: 700, color: '#491B6D' }}>
              고급 카테고리 관리
            </h1>
            <p className="text-gray-600">
              드래그 앤 드롭으로 단어장 이동 및 여러 단어장 병합 가능
            </p>
          </div>

          {/* Action Bar */}
          {selectedVocabIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-purple-900 font-semibold">
                  {selectedVocabIds.size}개 선택됨
                </span>
              </div>
              <div className="flex gap-2">
                {selectedVocabIds.size >= 2 && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowMergeDialog(true)}
                    className="px-4 py-2 bg-[#491B6D] text-white rounded-lg flex items-center gap-2 font-semibold hover:shadow-lg transition-shadow"
                  >
                    <GitMerge className="w-4 h-4" />
                    병합하기
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedVocabIds(new Set())}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold"
                >
                  선택 해제
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Categories List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">Loading...</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {categories.map((category) => (
                  <div key={category.id}>
                    {/* Category Header - Droppable Zone */}
                    <CategoryDropZone
                      category={category}
                      isExpanded={expandedCategory === category.id}
                      onToggle={() => handleToggleExpand(category.id, category.name)}
                    />

                    {/* Vocabularies List */}
                    {expandedCategory === category.id && (
                      <div className="bg-gray-50 border-t border-gray-200 p-4">
                        {vocabularies.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            이 카테고리에 단어장이 없습니다.
                          </div>
                        ) : (
                          <>
                            {/* Select All Button */}
                            <div className="mb-4 flex items-center justify-between">
                              <button
                                onClick={handleSelectAll}
                                className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#491B6D] font-semibold"
                              >
                                {selectedVocabIds.size === vocabularies.length ? (
                                  <CheckSquare className="w-5 h-5 text-[#8B5CF6]" />
                                ) : (
                                  <Square className="w-5 h-5" />
                                )}
                                모두 선택 / 해제
                              </button>
                              <div className="text-sm text-gray-500">
                                총 {vocabularies.length}개 단어장
                              </div>
                            </div>

                            {/* Sortable List */}
                            <SortableContext
                              items={vocabularies.map((v) => v.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-3">
                                {vocabularies.map((vocab) => (
                                  <VocabularyItem
                                    key={vocab.id}
                                    vocabulary={vocab}
                                    isSelected={selectedVocabIds.has(vocab.id)}
                                    onToggleSelect={handleToggleSelect}
                                    onEdit={handleEditVocab}
                                    onDelete={handleDeleteVocab}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">사용 방법</h4>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>카테고리를 클릭하여 단어장 목록을 확장하세요</li>
              <li>체크박스로 여러 단어장을 선택하고 병합할 수 있습니다</li>
              <li>단어장을 드래그하여 다른 카테고리로 이동할 수 있습니다</li>
              <li>모든 작업은 실시간으로 서버에 저장됩니다</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeVocab && (
          <div className="bg-white rounded-lg p-4 shadow-2xl border-2 border-[#8B5CF6] opacity-80">
            <div className="font-semibold text-[#491B6D]">{activeVocab.title}</div>
          </div>
        )}
      </DragOverlay>

      {/* Merge Dialog */}
      {showMergeDialog && (
        <MergeDialog
          selectedVocabularies={selectedVocabularies}
          onMerge={handleMerge}
          onClose={() => setShowMergeDialog(false)}
        />
      )}
    </DndContext>
  );
}
