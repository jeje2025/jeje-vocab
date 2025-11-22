import { useState, useEffect, useRef, useCallback } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface UseVocabularyLoaderProps {
  propsVocabularyWords?: any[];
  selectedSubject?: { id: string };
  getAuthToken?: () => string | null;
  starredWordIds?: string[];
  graveyardWordIds?: string[];
  wrongAnswersWordIds?: string[];
}

export const useVocabularyLoader = ({
  propsVocabularyWords,
  selectedSubject,
  getAuthToken,
  starredWordIds = [],
  graveyardWordIds = [],
  wrongAnswersWordIds = []
}: UseVocabularyLoaderProps) => {
  const [rawVocabularyWords, setRawVocabularyWords] = useState<any[]>([]);
  const [isLoadingWords, setIsLoadingWords] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const vocabularyCacheRef = useRef<Record<string, any[]>>({});
  const loadingVocabularyIdRef = useRef<string | null>(null);
  const vocabularyVersionRef = useRef<Record<string, number>>({});
  const loadedVersionRef = useRef<Record<string, number>>({});
  const requestPromisesRef = useRef<Record<string, Promise<any[]>>>({});
  const specialSignatureRef = useRef({
    starred: '',
    graveyard: '',
    wrongAnswers: ''
  });

  const invalidateVocabulary = useCallback((vocabId: string) => {
    if (!vocabId) return;
    delete vocabularyCacheRef.current[vocabId];
    delete loadedVersionRef.current[vocabId];
    Object.keys(requestPromisesRef.current).forEach((key) => {
      if (key.startsWith(`${vocabId}:`)) {
        delete requestPromisesRef.current[key];
      }
    });
    vocabularyVersionRef.current[vocabId] = (vocabularyVersionRef.current[vocabId] || 0) + 1;
    setRefreshCounter((prev) => prev + 1);
  }, []);

  const refreshVocabulary = useCallback((vocabularyId?: string) => {
    console.log('[useVocabularyLoader] refreshVocabulary called');
    if (vocabularyId) {
      invalidateVocabulary(vocabularyId);
    }
  }, [invalidateVocabulary]);

  // Track special vocabulary changes
  useEffect(() => {
    const signature = (starredWordIds || []).join('|');
    if (signature === specialSignatureRef.current.starred) return;
    specialSignatureRef.current.starred = signature;
    invalidateVocabulary('starred');
  }, [starredWordIds, invalidateVocabulary]);

  useEffect(() => {
    const signature = (graveyardWordIds || []).join('|');
    if (signature === specialSignatureRef.current.graveyard) return;
    specialSignatureRef.current.graveyard = signature;
    invalidateVocabulary('graveyard');
  }, [graveyardWordIds, invalidateVocabulary]);

  useEffect(() => {
    const signature = (wrongAnswersWordIds || []).join('|');
    if (signature === specialSignatureRef.current.wrongAnswers) return;
    specialSignatureRef.current.wrongAnswers = signature;
    invalidateVocabulary('wrong-answers');
  }, [wrongAnswersWordIds, invalidateVocabulary]);

  // Load vocabulary words
  useEffect(() => {
    // If parent provided vocabularyWords, use them directly
    if (propsVocabularyWords && propsVocabularyWords.length > 0) {
      console.log(`[useVocabularyLoader] ✅ Using ${propsVocabularyWords.length} words from props`);
      setRawVocabularyWords(propsVocabularyWords);
      setIsLoadingWords(false);
      return;
    }

    const vocabId = selectedSubject?.id;

    if (!vocabId) {
      console.log('[useVocabularyLoader] ❌ No selectedSubject.id');
      setRawVocabularyWords([]);
      setIsLoadingWords(false);
      return;
    }

    const version = vocabularyVersionRef.current[vocabId] || 0;
    const loadKey = `${vocabId}:${version}`;
    const cachedWords = vocabularyCacheRef.current[vocabId];

    if (cachedWords && loadedVersionRef.current[vocabId] === version) {
      setRawVocabularyWords(cachedWords);
      setIsLoadingWords(false);
      return;
    }

    const reusePromise = requestPromisesRef.current[loadKey];
    if (reusePromise) {
      setIsLoadingWords(true);
      let isStale = false;
      reusePromise
        .then((words) => {
          if (!isStale) {
            setRawVocabularyWords(words);
            setIsLoadingWords(false);
          }
        })
        .catch((error) => {
          if (!isStale) {
            console.error('[useVocabularyLoader] ❌ Error loading vocabulary words:', error);
            setIsLoadingWords(false);
          }
        });
      return () => {
        isStale = true;
      };
    }

    if (loadingVocabularyIdRef.current === loadKey) {
      return;
    }

    let isCancelled = false;
    const fetchPromise = (async () => {
      const isSpecialVocabulary = ['starred', 'graveyard', 'wrong-answers'].includes(vocabId);

      let endpoint = '';
      if (isSpecialVocabulary) {
        endpoint = `https://${projectId}.supabase.co/functions/v1/server/${vocabId}`;
      } else {
        endpoint = `https://${projectId}.supabase.co/functions/v1/server/user-vocabularies/${vocabId}`;
      }

      const authToken = getAuthToken ? getAuthToken() : publicAnonKey;
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to load vocabulary words');
      }

      const data = await response.json();
      console.log('[useVocabularyLoader] 📦 API response:', data);
      const allWords: any[] = [];

      if (isSpecialVocabulary) {
        if (data.words && Array.isArray(data.words)) {
          allWords.push(...data.words);
        } else if (Array.isArray(data)) {
          allWords.push(...data);
        }
      } else {
        if (data.units && Array.isArray(data.units)) {
          data.units.forEach((unit: any) => {
            if (unit.words && Array.isArray(unit.words)) {
              allWords.push(...unit.words);
            }
          });
        }
      }

      console.log(`[useVocabularyLoader] ✅ Loaded ${allWords.length} words from vocabulary ${vocabId}`);
      vocabularyCacheRef.current[vocabId] = allWords;
      loadedVersionRef.current[vocabId] = version;
      return allWords;
    })();

    requestPromisesRef.current[loadKey] = fetchPromise;
    loadingVocabularyIdRef.current = loadKey;
    setIsLoadingWords(true);
    console.log('[useVocabularyLoader] 📚 Loading words for vocabulary ID:', vocabId);

    fetchPromise
      .then((words) => {
        if (!isCancelled) {
          setRawVocabularyWords(words);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error('[useVocabularyLoader] ❌ Error loading vocabulary words:', error);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingWords(false);
        }
        if (loadingVocabularyIdRef.current === loadKey) {
          loadingVocabularyIdRef.current = null;
        }
        delete requestPromisesRef.current[loadKey];
      });

    return () => {
      isCancelled = true;
    };
  }, [propsVocabularyWords, selectedSubject?.id, getAuthToken, refreshCounter]);

  return {
    rawVocabularyWords,
    isLoadingWords,
    refreshVocabulary,
    invalidateVocabulary
  };
};
