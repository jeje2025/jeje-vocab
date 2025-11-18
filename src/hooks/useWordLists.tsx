import { useCallback } from 'react';
import { useVocabularyStore } from '../store/useVocabularyStore';

export function useWordLists(getAuthToken: () => string | null) {
  const {
    starredWords,
    graveyardWords,
    wrongAnswersWords,
    myVocabularies,
    isLoading,
    loadWordLists,
    toggleStarred,
    moveToGraveyard,
    deletePermanently,
    addWrongAnswer,
    refreshMyVocabularies,
    reset
  } = useVocabularyStore();

  const loadWordListsWithToken = useCallback(() => {
    return loadWordLists(getAuthToken);
  }, [loadWordLists, getAuthToken]);

  const toggleStarredWithToken = useCallback(
    (wordId: string) => toggleStarred(getAuthToken, wordId),
    [toggleStarred, getAuthToken]
  );

  const moveToGraveyardWithToken = useCallback(
    (wordId: string) => moveToGraveyard(getAuthToken, wordId),
    [moveToGraveyard, getAuthToken]
  );

  const deletePermanentlyWithToken = useCallback(
    (wordId: string) => deletePermanently(getAuthToken, wordId),
    [deletePermanently, getAuthToken]
  );

  const addWrongAnswerWithToken = useCallback(
    (wordId: string) => addWrongAnswer(getAuthToken, wordId),
    [addWrongAnswer, getAuthToken]
  );

  const refreshMyVocabulariesWithToken = useCallback(() => {
    return refreshMyVocabularies(getAuthToken);
  }, [refreshMyVocabularies, getAuthToken]);

  return {
    starredWords,
    graveyardWords,
    wrongAnswersWords,
    myVocabularies,
    isLoading,
    loadWordLists: loadWordListsWithToken,
    toggleStarred: toggleStarredWithToken,
    moveToGraveyard: moveToGraveyardWithToken,
    deletePermanently: deletePermanentlyWithToken,
    addWrongAnswer: addWrongAnswerWithToken,
    refreshMyVocabularies: refreshMyVocabulariesWithToken,
    resetStore: reset
  };
}
