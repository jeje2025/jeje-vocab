import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  MoreVertical,
  Edit2,
  Trash2,
  PlayCircle,
  Home,
  Library
} from 'lucide-react';
import { BackButton } from './BackButton';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface VocabularyListScreenProps {
  onBack: () => void;
  onBackToHome?: () => void;
  onSelectVocabulary: (vocabularyId: string, vocabularyTitle: string, unitNumber?: number) => void;
  onStartFlashcards?: (vocabularyId: string, vocabularyTitle: string, unitNumber?: number) => void;
  getAuthToken?: () => string;
}

interface VocabularyItem {
  id: string;
  title: string;
  wordCount: number;
  estimatedTime: string;
  isCompleted: boolean;
  progress?: number;
}

interface SharedVocabularyUnit {
  id: string;
  title: string;
  subtitle: string;
  progress: number;
  units: Array<{
    id: string;
    title: string;
    wordCount: number;
    startIndex: number;
    endIndex: number;
  }>;
  isExpanded: boolean;
  vocabularyId: string;
  wordsPerUnit: number;
  totalWords: number;
}

interface VocabularyListCache {
  myOwnVocabularies: any[];
  mySharedVocabularies: any[];
  timestamp: number;
}

let vocabularyListCache: VocabularyListCache | null = null;
let vocabularyListPromise: Promise<VocabularyListCache> | null = null;

// Export function to invalidate cache
export function invalidateVocabularyListCache() {
  vocabularyListCache = null;
  vocabularyListPromise = null;
  console.log('🗑️ Vocabulary list cache invalidated');
}

export function VocabularyListScreen({ onBack, onBackToHome, onSelectVocabulary, onStartFlashcards, getAuthToken }: VocabularyListScreenProps) {
  const [myOwnVocabularies, setMyOwnVocabularies] = useState<any[]>([]);
  const [mySharedVocabularies, setMySharedVocabularies] = useState<any[]>([]);
  const [myOwnExpanded, setMyOwnExpanded] = useState(false);
  const [sharedVocabExpanded, setSharedVocabExpanded] = useState<{ [key: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(true);

  // Edit/Delete dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteSharedDialogOpen, setDeleteSharedDialogOpen] = useState(false);
  const [selectedVocab, setSelectedVocab] = useState<VocabularyItem | null>(null);
  const [selectedSharedVocab, setSelectedSharedVocab] = useState<{ id: string; title: string } | null>(null);
  const [newVocabName, setNewVocabName] = useState('');

  // Load all vocabularies - both shared and My Own
  useEffect(() => {
    let isCancelled = false;

    const applyCache = (cacheData: VocabularyListCache) => {
      if (isCancelled) return;
      setMyOwnVocabularies(cacheData.myOwnVocabularies);
      setMySharedVocabularies(cacheData.mySharedVocabularies);
      setIsLoading(false);
    };

    if (vocabularyListCache) {
      applyCache(vocabularyListCache);
      return () => {
        isCancelled = true;
      };
    }

    if (vocabularyListPromise) {
      setIsLoading(true);
      vocabularyListPromise
        .then((data) => applyCache(data))
        .catch((error) => {
          if (!isCancelled) {
            console.error('Failed to load vocabularies:', error);
            setIsLoading(false);
          }
        });
      return () => {
        isCancelled = true;
      };
    }

    setIsLoading(true);

    const loadPromise = (async (): Promise<VocabularyListCache> => {
      const userResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/user-vocabularies`,
        {
          headers: {
            'Authorization': `Bearer ${getAuthToken ? getAuthToken() : publicAnonKey}`
          }
        }
      );

      const cachePayload: VocabularyListCache = {
        myOwnVocabularies: [],
        mySharedVocabularies: [],
        timestamp: Date.now()
      };

      if (userResponse.ok) {
        const userData = await userResponse.json();
        const allVocabs = userData.vocabularies || [];
        // Separate user-created from shared vocabularies
        cachePayload.myOwnVocabularies = allVocabs.filter((v: any) => !v.shared_vocabulary_id);
        cachePayload.mySharedVocabularies = allVocabs.filter((v: any) => v.shared_vocabulary_id);
        console.log('✅ Loaded My Own vocabularies:', cachePayload.myOwnVocabularies.length);
        console.log('✅ Loaded My Shared vocabularies:', cachePayload.mySharedVocabularies.length);
      } else {
        const errorText = await userResponse.text();
        console.error('❌ Failed to load user vocabularies:', errorText);
      }

      vocabularyListCache = cachePayload;
      return cachePayload;
    })();

    vocabularyListPromise = loadPromise;

    loadPromise
      .then((data) => applyCache(data))
      .catch((error) => {
        if (!isCancelled) {
          console.error('Failed to load vocabularies:', error);
          setIsLoading(false);
        }
      })
      .finally(() => {
        if (vocabularyListPromise === loadPromise) {
          vocabularyListPromise = null;
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [getAuthToken]);

  // Create "My Own" unit dynamically (always show, even if empty)
  const myOwnUnit = {
    id: 'my-own',
    title: '내가 만든 단어장',
    subtitle: '나만의 단어장',
    progress: 0,
    isExpanded: myOwnExpanded,
    items: myOwnVocabularies.map((vocab: any) => ({
      id: vocab.id,
      title: vocab.title,
      wordCount: vocab.total_words || 0,
      estimatedTime: `${Math.ceil((vocab.total_words || 0) / 3)} min`,
      isCompleted: false,
      progress: 0
    }))
  };

  // Group shared vocabularies by category
  const createSharedVocabUnits = (): SharedVocabularyUnit[] => {
    console.log('🔍 Creating shared vocab units from:', mySharedVocabularies);
    console.log('📊 Current sharedVocabExpanded state:', sharedVocabExpanded);

    // Group vocabularies by category
    const categoryGroups: { [key: string]: any[] } = {};

    mySharedVocabularies.forEach((vocab: any) => {
      const category = vocab.category || 'Uncategorized';
      console.log(`📦 Vocab "${vocab.title}" -> category: "${category}"`);
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(vocab);
    });

    console.log('📊 Category groups:', categoryGroups);

    // Convert to units format
    return Object.entries(categoryGroups).map(([category, vocabs]) => {
      const totalWords = vocabs.reduce((sum, v) => sum + (v.total_words || 0), 0);

      return {
        id: `category-${category}`,
        title: category,
        subtitle: `${totalWords}개 단어 · ${vocabs.length}개 단어장`,
        progress: 0,
        units: vocabs.map((vocab: any) => ({
          id: vocab.id,
          title: vocab.title,
          wordCount: vocab.total_words || 0,
          startIndex: 1,
          endIndex: vocab.total_words || 0
        })),
        isExpanded: sharedVocabExpanded[category] || false,
        vocabularyId: category,
        wordsPerUnit: 0,
        totalWords
      };
    });
  };

  const sharedVocabUnits = createSharedVocabUnits();

  // Combine all units (currently only My Own section)
  const allUnits = [myOwnUnit];

  const toggleUnit = (unitId: string) => {
    console.log('🔄 Toggling unit:', unitId);
    if (unitId === 'my-own') {
      // Toggle My Own unit
      setMyOwnExpanded(!myOwnExpanded);
    } else if (unitId.startsWith('category-')) {
      // Toggle shared vocabulary category
      const categoryName = unitId.replace('category-', '');
      console.log('📂 Toggling category:', categoryName);
      setSharedVocabExpanded(prev => {
        const newState = {
          ...prev,
          [categoryName]: !prev[categoryName]
        };
        console.log('📊 New expanded state:', newState);
        return newState;
      });
    }
  };

  const handleVocabularyClick = (item: VocabularyItem) => {
    onSelectVocabulary(item.id, item.title);
  };

  // Handle edit vocabulary name
  const handleEdit = (item: VocabularyItem, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent item click
    setSelectedVocab(item);
    setNewVocabName(item.title);
    setEditDialogOpen(true);
  };

  // Handle delete vocabulary
  const handleDelete = (item: VocabularyItem, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent item click
    setSelectedVocab(item);
    setDeleteDialogOpen(true);
  };

  // Confirm edit
  const confirmEdit = async () => {
    if (!selectedVocab || !newVocabName.trim()) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/user-vocabularies/${selectedVocab.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${getAuthToken ? getAuthToken() : publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title: newVocabName.trim() })
        }
      );

      if (response.ok) {
        // Update local state
        setMyOwnVocabularies(prev =>
          prev.map(vocab =>
            vocab.id === selectedVocab.id
              ? { ...vocab, title: newVocabName.trim() }
              : vocab
          )
        );
        setEditDialogOpen(false);
        setSelectedVocab(null);
        setNewVocabName('');
        console.log('Vocabulary renamed successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to rename vocabulary:', errorData);
        alert('이름 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error renaming vocabulary:', error);
      alert('이름 변경 중 오류가 발생했습니다.');
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!selectedVocab) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/user-vocabularies/${selectedVocab.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${getAuthToken ? getAuthToken() : publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        // Update local state
        setMyOwnVocabularies(prev =>
          prev.filter(vocab => vocab.id !== selectedVocab.id)
        );
        setDeleteDialogOpen(false);
        setSelectedVocab(null);
        console.log('Vocabulary deleted successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to delete vocabulary:', errorData);
        alert('삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error deleting vocabulary:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // Handle delete shared vocabulary
  const handleDeleteShared = (vocabId: string, vocabTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSharedVocab({ id: vocabId, title: vocabTitle });
    setDeleteSharedDialogOpen(true);
  };

  // Confirm delete shared vocabulary
  const confirmDeleteShared = async () => {
    if (!selectedSharedVocab) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/user-vocabularies/${selectedSharedVocab.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${getAuthToken ? getAuthToken() : publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        // Update local state
        setMySharedVocabularies(prev =>
          prev.filter(vocab => vocab.id !== selectedSharedVocab.id)
        );
        setDeleteSharedDialogOpen(false);
        setSelectedSharedVocab(null);
        console.log('Shared vocabulary deleted successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to delete shared vocabulary:', errorData);
        alert('삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error deleting shared vocabulary:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40" style={{ background: 'transparent' }}>
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4">
          <BackButton onClick={onBack} />

          <div className="flex items-center gap-2">
            <Library className="w-5 h-5 text-[#091A7A]" />
            <h1 className="text-[#091A7A]" style={{ fontSize: '18px', fontWeight: 700 }}>
              Vocabulary
            </h1>
          </div>

          {/* Home Button */}
          {onBackToHome ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onBackToHome}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-md"
            >
              <Home className="w-5 h-5 text-[#091A7A]" />
            </motion.button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </div>

      {/* Vocabulary Units List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24" style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[#491B6D]" style={{ fontSize: '14px', fontWeight: 500 }}>
                단어장 불러오는 중...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 pt-2">
            {/* My Own Vocabularies */}
            {allUnits.map((unit, unitIndex) => (
              <div key={unit.id}>
                {/* Unit Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: unitIndex * 0.1 }}
                  className={`backdrop-blur-lg rounded-2xl overflow-hidden shadow-lg ${
                    unit.id === 'my-own'
                      ? 'bg-gradient-to-br from-[#FDF2F8] to-[#FCE7F3]'
                      : 'bg-white/95'
                  }`}
                >
                  {/* Unit Header - Clickable */}
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleUnit(unit.id)}
                    className="p-4"
                  >
                    <div className="flex items-center justify-between">
                      {/* Unit Info */}
                      <div className="flex-1">
                        <h3 className="text-[#091A7A] mb-1" style={{ fontSize: '16px', fontWeight: 600 }}>
                          {unit.title}
                        </h3>
                        <span className={`inline-block ${unit.id === 'my-own' ? 'text-[#9CA3AF]' : 'text-[#8B5CF6]'}`} style={{ fontSize: '11px', fontWeight: 500 }}>
                          {unit.items.reduce((sum, item) => sum + item.wordCount, 0)} words
                        </span>
                      </div>

                      {/* Progress % and Expand Icon */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`${unit.id === 'my-own' ? 'text-[#9CA3AF]' : 'text-[#8B5CF6]'}`} style={{ fontSize: '12px', fontWeight: 600 }}>
                          {unit.progress}%
                        </span>
                        <motion.div
                          animate={{ rotate: unit.isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ChevronDown className="w-5 h-5 text-[#091A7A]" />
                        </motion.div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2.5">
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${unit.progress}%` }}
                          transition={{ duration: 0.8, delay: unitIndex * 0.1 + 0.2 }}
                          className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] rounded-full"
                        />
                      </div>
                    </div>
                  </motion.div>

                  {/* Unit Items - Expandable */}
                  <AnimatePresence>
                    {unit.isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-gray-200/50 overflow-hidden"
                      >
                        <div className="p-2 space-y-1.5">
                          {unit.items.map((item, itemIndex) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: itemIndex * 0.05 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleVocabularyClick(item)}
                            className={`backdrop-blur-sm rounded-xl p-3 flex items-center gap-2.5 ${
                              unit.id === 'my-own'
                                ? 'bg-gradient-to-r from-white/95 to-[#FDF2F8]/90'
                                : 'bg-white/80'
                            }`}
                          >
                            {/* Item Number */}
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              unit.id === 'my-own'
                                ? 'bg-gradient-to-br from-[#F9A8D4] to-[#EC4899]'
                                : 'bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA]'
                            }`}>
                              <span className="text-white" style={{ fontSize: '12px', fontWeight: 600 }}>
                                {itemIndex + 1}
                              </span>
                            </div>

                            {/* Item Info */}
                            <div className="flex-1 min-w-0 flex items-center justify-between">
                              <h4 className="text-[#091A7A]" style={{ fontSize: '14px', fontWeight: 600 }}>
                                {item.title}
                              </h4>
                              <span className={`${unit.id === 'my-own' ? 'text-[#F472B6]' : 'text-[#6B7280]'}`} style={{ fontSize: '11px' }}>
                                {item.wordCount} words
                              </span>
                            </div>

                            {/* Flashcard Start Button */}
                            <div className="flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onStartFlashcards) {
                                    onStartFlashcards(item.id, item.title);
                                  }
                                }}
                                className={`p-1.5 ${unit.id === 'my-own' ? 'hover:bg-pink-100' : 'hover:bg-purple-100'} rounded-lg transition-colors`}
                                title="플래시카드 시작"
                              >
                                <PlayCircle className={`w-5 h-5 ${unit.id === 'my-own' ? 'text-[#EC4899]' : 'text-[#8B5CF6]'}`} />
                              </button>
                            </div>

                            {/* Edit/Delete Buttons */}
                            {unit.id === 'my-own' && (
                              <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="p-1 hover:bg-pink-100 rounded-lg transition-colors">
                                      <MoreVertical className="w-5 h-5 text-[#EC4899]" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-40 p-2 bg-white border border-gray-200 shadow-lg">
                                    <div className="space-y-1">
                                      <button
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                                        onClick={(e) => handleEdit(item, e)}
                                      >
                                        <Edit2 className="w-4 h-4 text-[#8B5CF6]" />
                                        <span className="text-[#8B5CF6]" style={{ fontSize: '14px', fontWeight: 500 }}>이름 변경</span>
                                      </button>
                                      <button
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                                        onClick={(e) => handleDelete(item, e)}
                                      >
                                        <Trash2 className="w-4 h-4 text-[#EF4444]" />
                                        <span className="text-[#EF4444]" style={{ fontSize: '14px', fontWeight: 500 }}>삭제</span>
                                      </button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            )}
                          </motion.div>
                        ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            ))}

            {/* My Shared Vocabularies - Separate Section */}
            {sharedVocabUnits.map((sharedUnit, sharedIndex) => (
              <div key={sharedUnit.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (allUnits.length + sharedIndex) * 0.1 }}
                  className="bg-gradient-to-br from-[#F3E8FF] to-[#E9D5FF] backdrop-blur-lg rounded-2xl overflow-hidden shadow-lg border border-[#C4B5FD]/30"
                >
                  {/* Shared Vocabulary Header */}
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      console.log('🖱️ CLICK detected on category:', sharedUnit.id, 'isExpanded:', sharedUnit.isExpanded);
                      toggleUnit(sharedUnit.id);
                    }}
                    className="p-4 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🎁</span>
                          <h3 className="text-[#5B21B6]" style={{ fontSize: '16px', fontWeight: 600 }}>
                            {sharedUnit.title}
                          </h3>
                        </div>
                        <span className="inline-block text-[#7C3AED] mt-1" style={{ fontSize: '11px', fontWeight: 500 }}>
                          {sharedUnit.subtitle}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[#7C3AED]" style={{ fontSize: '12px', fontWeight: 600 }}>
                          {sharedUnit.progress}%
                        </span>
                        <motion.div
                          animate={{ rotate: sharedUnit.isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ChevronDown className="w-5 h-5 text-[#5B21B6]" />
                        </motion.div>
                      </div>
                    </div>

                    <div className="mt-2.5">
                      <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${sharedUnit.progress}%` }}
                          transition={{ duration: 0.8, delay: (allUnits.length + sharedIndex) * 0.1 + 0.2 }}
                          className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] rounded-full"
                        />
                      </div>
                    </div>
                  </motion.div>

                  {/* Unit Items - Expandable */}
                  <AnimatePresence>
                    {sharedUnit.isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-[#C4B5FD]/30 overflow-hidden"
                      >
                        <div className="p-2 space-y-1.5">
                          {sharedUnit.units.map((unitItem, itemIndex) => (
                          <motion.div
                            key={unitItem.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: itemIndex * 0.05 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onSelectVocabulary(unitItem.id, unitItem.title)}
                            className="bg-white/90 backdrop-blur-sm rounded-xl p-3 flex items-center gap-2.5"
                          >
                            <div className="w-7 h-7 bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-white" style={{ fontSize: '12px', fontWeight: 600 }}>
                                {itemIndex + 1}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0 flex items-center justify-between">
                              <h4 className="text-[#5B21B6]" style={{ fontSize: '14px', fontWeight: 600 }}>
                                {unitItem.title}
                              </h4>
                              <span className="text-[#8B5CF6]" style={{ fontSize: '11px' }}>
                                {unitItem.wordCount} words
                              </span>
                            </div>

                            <div className="flex-shrink-0 flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onStartFlashcards) {
                                    onStartFlashcards(unitItem.id, unitItem.title);
                                  }
                                }}
                                className="p-1.5 hover:bg-purple-100 rounded-lg transition-colors"
                                title="플래시카드 시작"
                              >
                                <PlayCircle className="w-5 h-5 text-[#7C3AED]" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteShared(unitItem.id, unitItem.title, e)}
                                className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                                title="삭제"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Vocabulary Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[350px] bg-white rounded-[24px] border-none shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-[#091A7A] text-lg font-bold">단어장 이름 변경</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              id="name"
              value={newVocabName}
              onChange={(e) => setNewVocabName(e.target.value)}
              placeholder="새로운 이름"
              className="rounded-xl border-gray-200 focus:border-[#8B5CF6] focus:ring-[#8B5CF6]"
            />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              onClick={confirmEdit}
              className="w-full bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white rounded-xl h-11 font-medium"
            >
              변경
            </Button>
            <Button
              type="button"
              onClick={() => setEditDialogOpen(false)}
              className="w-full bg-white hover:bg-gray-50 text-[#091A7A] border border-gray-200 rounded-xl h-11 font-medium"
            >
              취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Vocabulary Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[350px] bg-white rounded-[24px] border-none shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-[#091A7A] text-lg font-bold">단어장 삭제</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[#091A7A] text-sm">정말로 이 단어장을 삭제하시겠습니까?</p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              onClick={confirmDelete}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl h-11 font-medium"
            >
              삭제
            </Button>
            <Button
              type="button"
              onClick={() => setDeleteDialogOpen(false)}
              className="w-full bg-white hover:bg-gray-50 text-[#091A7A] border border-gray-200 rounded-xl h-11 font-medium"
            >
              취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Shared Vocabulary Dialog */}
      <Dialog open={deleteSharedDialogOpen} onOpenChange={setDeleteSharedDialogOpen}>
        <DialogContent className="sm:max-w-[350px] bg-white rounded-[24px] border-none shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-[#091A7A] text-lg font-bold">선물 단어장 삭제</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[#091A7A] text-sm">
              <strong className="text-[#8B5CF6]">{selectedSharedVocab?.title}</strong> 단어장을 삭제하시겠습니까?
            </p>
            <p className="text-xs text-gray-500">
              삭제된 단어장은 선물 탭에서 다시 추가할 수 있습니다.
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              onClick={confirmDeleteShared}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl h-11 font-medium"
            >
              삭제
            </Button>
            <Button
              type="button"
              onClick={() => setDeleteSharedDialogOpen(false)}
              className="w-full bg-white hover:bg-gray-50 text-[#091A7A] border border-gray-200 rounded-xl h-11 font-medium"
            >
              취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
