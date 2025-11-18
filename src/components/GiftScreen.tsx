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

  useEffect(() => {
    fetchCategories();
    fetchSharedVocabularies();
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

  const filteredVocabularies = vocabularies.filter(vocab =>
    (vocab.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) &&
    (selectedCategory === 'All' || vocab.category === selectedCategory)
  );

  return (
    <div className="h-full flex flex-col bg-transparent">
      <StandardHeader
        onBack={onBack}
        title="Presets"
        subtitle="공유된 단어장을 다운로드하세요"
      />

      {/* Sticky Header */}
      <div className="sticky top-0 z-40 backdrop-blur-lg pb-2" style={{ background: 'transparent' }}>
        {/* Search Bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B5CF6]/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search preset vocabulary..."
                className="w-full pl-12 pr-4 py-3 rounded-full bg-white/80 backdrop-blur-lg shadow-md text-[#491B6D] placeholder:text-[#8B5CF6]/40 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/30"
              />
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide">
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="p-2 flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-[#491B6D]" />
          </motion.button>
          
          {categories.map((category) => (
            <motion.button
              key={category}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2.5 rounded-full whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-[#091A7A] text-white shadow-lg'
                  : 'bg-transparent text-[#091A7A]'
              }`}
              style={{ fontSize: '15px', fontWeight: 600 }}
            >
              {category}
            </motion.button>
          ))}
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="p-2 flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5 text-[#491B6D]" />
          </motion.button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-8">
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
          <div className="space-y-4 pt-4">
            {filteredVocabularies.map((vocab, index) => (
              <motion.div
                key={vocab.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileTap={{ scale: 0.98 }}
                onTap={() => onSelectVocabulary(vocab)}
                className="bg-white/95 backdrop-blur-lg rounded-3xl overflow-hidden shadow-lg p-5 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  {/* Icon Badge */}
                  <div className="w-12 h-12 bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Gift className="w-6 h-6 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[#491B6D] mb-1.5" style={{ fontSize: '16px', fontWeight: 600 }}>
                          {vocab.title}
                        </h3>
                        {vocab.description && (
                          <p className="text-[#491B6D]/60 text-sm line-clamp-2">
                            {vocab.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#491B6D]/30 flex-shrink-0 mt-0.5" />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-3 py-1.5 rounded-full text-xs ${getDifficultyColor(vocab.difficulty_level)}`}>
                        {getDifficultyLabel(vocab.difficulty_level)}
                      </span>
                      <span className="px-3 py-1.5 rounded-full text-xs bg-[#491B6D]/8 text-[#491B6D]/70">
                        {vocab.category}
                      </span>
                      <span className="text-[#491B6D]/50 text-sm ml-auto">
                        {vocab.total_words.toLocaleString()}개 단어
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}