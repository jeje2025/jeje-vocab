import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Gift, BookOpen, Download, ChevronRight, Search, Filter, X, Plus, ChevronLeft } from 'lucide-react';
import { StandardHeader } from './StandardHeader';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface SharedVocabulary {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty_level: string;
  total_words: number;
}

interface GiftScreenProps {
  onBack: () => void;
  onSelectVocabulary: (vocab: SharedVocabulary) => void;
}

export function GiftScreen({ onBack, onSelectVocabulary }: GiftScreenProps) {
  const [vocabularies, setVocabularies] = useState<SharedVocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedVocabs, setSelectedVocabs] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchSharedVocabularies();
  }, []);

  useEffect(() => {
    const targets = [document.documentElement, document.body];
    targets.forEach((el) => el?.classList.add('gift-fullscreen'));
    return () => {
      targets.forEach((el) => el?.classList.remove('gift-fullscreen'));
    };
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/categories`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch categories:', await response.text());
        return;
      }

      const data = await response.json();
      const enabledCategories = (data.categories || [])
        .filter((cat: any) => cat.enabled)
        .map((cat: any) => cat.name);
      
      setCategories(['All', ...enabledCategories]);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSharedVocabularies = async () => {
    try {
      // 기존 API와 새로운 관리자 API 둘 다 시도
      let response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/shared-vocabularies`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        // 실패하면 기존 API 시도
        response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/server/shared-vocabularies`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );
      }

      if (!response.ok) {
        console.error('Failed to fetch vocabularies:', await response.text());
        return;
      }

      const data = await response.json();
      setVocabularies(data.vocabularies || []);
    } catch (error) {
      console.error('Error fetching shared vocabularies:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-[#8B5CF6]/10 text-[#8B5CF6]';
      case 'intermediate':
        return 'bg-[#A78BFA]/10 text-[#7C3AED]';
      case 'advanced':
        return 'bg-[#7C3AED]/10 text-[#6D28D9]';
      default:
        return 'bg-[#8B5CF6]/10 text-[#8B5CF6]';
    }
  };

  const getDifficultyLabel = (level: string) => {
    switch (level) {
      case 'beginner':
        return '초급';
      case 'intermediate':
        return '중급';
      case 'advanced':
        return '고급';
      default:
        return level;
    }
  };

  const filteredVocabularies = vocabularies
    .filter(vocab =>
      (vocab.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) &&
      (selectedCategory === 'All' || vocab.category === selectedCategory)
    )
    .sort((a, b) => {
      // 한글 가나다순 정렬
      return a.title.localeCompare(b.title, 'ko-KR');
    });

  const toggleSelection = (vocabId: string) => {
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

  const handleAddSelected = async () => {
    setIsAdding(true);
    const selectedVocabsList = vocabularies.filter(v => selectedVocabs.has(v.id));

    try {
      // Process all selected vocabularies
      for (const vocab of selectedVocabsList) {
        await onSelectVocabulary(vocab);
      }

      setSelectedVocabs(new Set());

      // Navigate back to home screen - this will trigger refresh
      onBack();
    } catch (error) {
      console.error('Error adding vocabularies:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
          opacity: 0;
        }
      `}</style>
      <div className="min-h-screen h-full flex flex-col bg-transparent overflow-hidden">
        <StandardHeader
          onBack={onBack}
          title="Presets"
          subtitle="공유된 단어장을 다운로드하세요"
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="sticky top-0 z-20 bg-transparent backdrop-blur-xl border-b border-white/20">
              {/* Search Bar & Add Button */}
              <div className="flex items-center gap-3 px-6 py-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B5CF6]/50" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search preset vocabulary..."
                      className="w-full pl-12 pr-4 py-3 rounded-full bg-white/90 shadow-md text-[#491B6D] placeholder:text-[#8B5CF6]/40 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/30"
                    />
                  </div>
                </div>

                {/* Add Button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddSelected}
                  disabled={isAdding || selectedVocabs.size === 0}
                  className="bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white rounded-full px-5 py-3 flex items-center gap-2 shadow-lg whitespace-nowrap disabled:opacity-50"
                  style={{ fontSize: '14px', fontWeight: 600 }}
                >
                  {isAdding ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      추가 중...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      추가 {selectedVocabs.size > 0 && `(${selectedVocabs.size})`}
                    </>
                  )}
                </motion.button>
              </div>

              {/* Category Tabs */}
              <div
                className="flex gap-3 px-6 pb-4 overflow-x-auto"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedCategory(category);
                    }}
                    className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all flex-shrink-0 active:scale-95 ${
                      selectedCategory === category
                        ? 'bg-[#091A7A] text-white shadow-lg'
                        : 'bg-transparent text-[#091A7A]'
                    }`}
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4 pb-32">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-[#8B5CF6]/20 border-t-[#8B5CF6] rounded-full animate-spin" />
                </div>
              ) : filteredVocabularies.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="w-16 h-16 text-[#491B6D]/40 mx-auto mb-4" />
                  <p className="text-[#491B6D]/70">검색 결과가 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3 pt-4">
                  {filteredVocabularies.map((vocab, index) => (
                    <div
                      key={vocab.id}
                      onClick={() => toggleSelection(vocab.id)}
                      className="bg-white/95 backdrop-blur-lg rounded-2xl overflow-hidden shadow-md p-4 cursor-pointer active:scale-[0.98] transition-all duration-200 hover:shadow-lg animate-fade-in"
                      style={{
                        animationDelay: `${Math.min(index * 30, 300)}ms`
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center flex-shrink-0">
                          <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                            selectedVocabs.has(vocab.id)
                              ? 'bg-[#8B5CF6] border-[#8B5CF6]'
                              : 'bg-white border-[#8B5CF6]/30'
                          }`}>
                            {selectedVocabs.has(vocab.id) && (
                              <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M5 13l4 4L19 7"></path>
                              </svg>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="text-[#491B6D] font-semibold text-sm truncate">
                              {vocab.title}
                            </h3>
                            <span className="text-[#8B5CF6] text-xs font-medium whitespace-nowrap">
                              {vocab.total_words.toLocaleString()}개
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
