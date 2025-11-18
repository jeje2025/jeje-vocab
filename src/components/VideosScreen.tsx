import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  ChevronRight
} from 'lucide-react';
import { StandardHeader } from './StandardHeader';
import { toast } from 'sonner@2.0.3';
import { WordSelectionScreen } from './WordSelectionScreen';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface VideosScreenProps {
  onBack: () => void;
  getAuthToken?: () => string;
}

interface SharedVocabulary {
  id: string;
  name: string;
  description?: string;
  total_words: number;
  category?: string;
  difficulty_level?: string;
  created_at: string;
}

const categories = [
  { id: 'all', name: 'All' },
  { id: 'TOEIC', name: 'TOEIC' },
  { id: 'SAT', name: 'SAT' },
  { id: 'GRE', name: 'GRE' },
  { id: 'School', name: '학교별 기출' },
  { id: 'General', name: 'General English' },
];

export function VideosScreen({ onBack, getAuthToken }: VideosScreenProps) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [vocabularies, setVocabularies] = useState<SharedVocabulary[]>([]);
  const [filteredVocabularies, setFilteredVocabularies] = useState<SharedVocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVocabularyForDownload, setSelectedVocabularyForDownload] = useState<SharedVocabulary | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch vocabularies from Supabase
  useEffect(() => {
    fetchVocabularies();
  }, []);

  const fetchVocabularies = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/shared-vocabularies`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch vocabularies');
      }

      const data = await response.json();
      setVocabularies(data.vocabularies || []);
    } catch (error) {
      console.error('Error fetching vocabularies:', error);
      toast.error('Failed to load vocabularies');
    } finally {
      setLoading(false);
    }
  };

  // Filter vocabularies based on category
  useEffect(() => {
    let filtered = vocabularies;
    
    if (activeCategory !== 'all') {
      filtered = filtered.filter(vocab => vocab.category === activeCategory);
    }
    
    setFilteredVocabularies(filtered);
  }, [activeCategory, vocabularies]);

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'TOEIC':
        return 'bg-yellow-400 text-purple-900';
      case 'SAT':
        return 'bg-white text-purple-700';
      case 'GRE':
        return 'bg-purple-300 text-purple-900';
      case 'School':
        return 'bg-pink-300 text-purple-900';
      case 'General':
        return 'bg-green-300 text-green-900';
      default:
        return 'bg-purple-300 text-purple-900';
    }
  };

  const handleVocabClick = (vocab: SharedVocabulary) => {
    setSelectedVocabularyForDownload(vocab);
  };

  const handleWordSelectionComplete = async (selectedWordIds: string[], wordsPerUnit: number) => {
    if (!selectedVocabularyForDownload) return;

    try {
      const accessToken = getAuthToken ? getAuthToken() : localStorage.getItem('supabase_access_token') || publicAnonKey;
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/user-vocabularies`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: selectedVocabularyForDownload.name,
            description: selectedVocabularyForDownload.description,
            words_per_unit: wordsPerUnit,
            selected_word_ids: selectedWordIds,
            shared_vocabulary_id: selectedVocabularyForDownload.id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add vocabulary');
      }

      toast.success('Vocabulary added successfully!');
      setSelectedVocabularyForDownload(null);
    } catch (error) {
      console.error('Error adding vocabulary:', error);
      toast.error('Failed to add vocabulary');
    }
  };

  const scrollCategories = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Show word selection screen if vocabulary is selected for download
  if (selectedVocabularyForDownload) {
    return (
      <WordSelectionScreen
        onBack={() => setSelectedVocabularyForDownload(null)}
        vocabularyId={selectedVocabularyForDownload.id}
        vocabularyName={selectedVocabularyForDownload.name}
        totalWords={selectedVocabularyForDownload.total_words}
        onComplete={handleWordSelectionComplete}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#E8E0FF] to-[#F0EBFF]">
      <StandardHeader
        onBack={onBack}
        title="선물상자"
        subtitle="단어장을 다운로드해서 학습을 시작하세요"
      />

      {/* Category Tabs */}
      <div className="px-4 pb-4">
        {/* Category Tabs */}
        <div 
          ref={scrollContainerRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide"
        >
          {categories.map((category) => (
            <motion.button
              key={category.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm ${
                activeCategory === category.id
                  ? 'bg-white text-[#491B6D] shadow-md'
                  : 'bg-white/30 text-[#491B6D] border border-white/50'
              }`}
            >
              {category.name}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Vocabulary List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-[#8B6FC4] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredVocabularies.map((vocab, index) => (
                <motion.div
                  key={vocab.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleVocabClick(vocab)}
                  className="bg-white/40 backdrop-blur-lg rounded-3xl p-5 border border-white/50 shadow-lg"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-14 h-14 bg-white/60 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-7 h-7 text-[#8B6FC4]" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[#4A3A6B] mb-2 line-clamp-2">
                        {vocab.name}
                      </h3>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs ${getCategoryColor(vocab.category)}`}>
                          {vocab.category || 'General'}
                        </span>
                        <span className="text-[#8B6FC4] text-xs">
                          {vocab.total_words}개 단어
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-5 h-5 text-[#8B6FC4] flex-shrink-0 mt-1" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredVocabularies.length === 0 && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="w-16 h-16 bg-white/40 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-[#8B6FC4]" />
                </div>
                <p className="text-[#6B5A8B]">No vocabulary found</p>
              </motion.div>
            )}
          </div>
        )}

        {/* Bottom padding */}
        <div className="h-4" />
      </div>
    </div>
  );
}