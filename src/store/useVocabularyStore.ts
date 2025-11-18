import { create } from 'zustand';
import { projectId } from '../utils/supabase/info';

type AuthGetter = () => string | null;

const initialState = {
  starredWords: [] as string[],
  graveyardWords: [] as string[],
  wrongAnswersWords: [] as string[],
  myVocabularies: [] as any[],
  isLoading: false,
  hasLoaded: false
};

const apiCall = async (
  getAuthToken: AuthGetter,
  endpoint: string,
  options: RequestInit = {}
) => {
  const token = getAuthToken?.();

  if (!token) {
    throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
  }

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/server${endpoint}`,
    {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    }
  );

  let data: any = null;
  const text = await response.text();

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      console.error('❌ Failed to parse response JSON:', error, text);
      data = { error: text };
    }
  }

  if (!response.ok) {
    const errorMessage = data?.message || data?.error || '요청 실패';
    throw new Error(errorMessage);
  }

  return data;
};

interface VocabularyStoreState {
  starredWords: string[];
  graveyardWords: string[];
  wrongAnswersWords: string[];
  myVocabularies: any[];
  isLoading: boolean;
  hasLoaded: boolean;
  loadWordLists: (getAuthToken: AuthGetter) => Promise<void>;
  toggleStarred: (getAuthToken: AuthGetter, wordId: string) => Promise<void>;
  moveToGraveyard: (getAuthToken: AuthGetter, wordId: string) => Promise<void>;
  deletePermanently: (getAuthToken: AuthGetter, wordId: string) => Promise<void>;
  addWrongAnswer: (getAuthToken: AuthGetter, wordId: string) => Promise<void>;
  refreshMyVocabularies: (getAuthToken: AuthGetter) => Promise<void>;
  reset: () => void;
}

export const useVocabularyStore = create<VocabularyStoreState>((set, get) => ({
  ...initialState,

  loadWordLists: async (getAuthToken) => {
    const token = getAuthToken?.();
    if (!token) {
      console.log('⏭️ Skipping word lists load - no auth token');
      return;
    }

    if (get().isLoading || get().hasLoaded) {
      return;
    }

    set({ isLoading: true });

    try {
      const [starredData, graveyardData, wrongAnswersData, myVocabulariesData] =
        await Promise.all([
          apiCall(getAuthToken, '/starred'),
          apiCall(getAuthToken, '/graveyard'),
          apiCall(getAuthToken, '/wrong-answers'),
          apiCall(getAuthToken, '/my-vocabularies')
        ]);

      set({
        starredWords: starredData?.words?.map((w: any) => w.id) || [],
        graveyardWords: graveyardData?.words?.map((w: any) => w.id) || [],
        wrongAnswersWords: wrongAnswersData?.words?.map((w: any) => w.id) || [],
        myVocabularies: myVocabulariesData?.vocabularies || [],
        hasLoaded: true
      });
    } catch (error) {
      console.error('❌ Failed to load word lists:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  toggleStarred: async (getAuthToken, wordId) => {
    const token = getAuthToken?.();
    if (!token) {
      console.warn('⚠️ Cannot toggle starred without auth token');
      return;
    }

    const isStarred = get().starredWords.includes(wordId);

    set((state) => ({
      starredWords: isStarred
        ? state.starredWords.filter((id) => id !== wordId)
        : [...state.starredWords, wordId]
    }));

    try {
      await apiCall(getAuthToken, `/starred/${wordId}`, {
        method: isStarred ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('❌ Error toggling starred:', error);
      set((state) => ({
        starredWords: isStarred
          ? [...state.starredWords, wordId]
          : state.starredWords.filter((id) => id !== wordId)
      }));
    }
  },

  moveToGraveyard: async (getAuthToken, wordId) => {
    const token = getAuthToken?.();
    if (!token) {
      console.warn('⚠️ Cannot move to graveyard without auth token');
      return;
    }

    const prevState = {
      graveyardWords: get().graveyardWords,
      starredWords: get().starredWords,
      wrongAnswersWords: get().wrongAnswersWords
    };

    set((state) => ({
      graveyardWords: state.graveyardWords.includes(wordId)
        ? state.graveyardWords
        : [...state.graveyardWords, wordId],
      starredWords: state.starredWords.filter((id) => id !== wordId),
      wrongAnswersWords: state.wrongAnswersWords.filter((id) => id !== wordId)
    }));

    try {
      await apiCall(getAuthToken, `/graveyard/${wordId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('❌ Error moving to graveyard:', error);
      set({
        graveyardWords: prevState.graveyardWords,
        starredWords: prevState.starredWords,
        wrongAnswersWords: prevState.wrongAnswersWords
      });
    }
  },

  deletePermanently: async (getAuthToken, wordId) => {
    const token = getAuthToken?.();
    if (!token) {
      console.warn('⚠️ Cannot delete from graveyard without auth token');
      return;
    }

    const prevState = {
      graveyardWords: get().graveyardWords,
      starredWords: get().starredWords,
      wrongAnswersWords: get().wrongAnswersWords
    };

    set((state) => ({
      graveyardWords: state.graveyardWords.filter((id) => id !== wordId),
      starredWords: state.starredWords.filter((id) => id !== wordId),
      wrongAnswersWords: state.wrongAnswersWords.filter((id) => id !== wordId)
    }));

    try {
      await apiCall(getAuthToken, `/graveyard/${wordId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('❌ Error deleting word permanently:', error);
      set({
        graveyardWords: prevState.graveyardWords,
        starredWords: prevState.starredWords,
        wrongAnswersWords: prevState.wrongAnswersWords
      });
    }
  },

  addWrongAnswer: async (getAuthToken, wordId) => {
    const token = getAuthToken?.();
    if (!token) {
      console.warn('⚠️ Cannot track wrong answer without auth token');
      return;
    }

    if (get().wrongAnswersWords.includes(wordId)) {
      return;
    }

    set((state) => ({
      wrongAnswersWords: [...state.wrongAnswersWords, wordId]
    }));

    try {
      await apiCall(getAuthToken, `/wrong-answers/${wordId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('❌ Error adding wrong answer:', error);
      set((state) => ({
        wrongAnswersWords: state.wrongAnswersWords.filter((id) => id !== wordId)
      }));
    }
  },

  refreshMyVocabularies: async (getAuthToken) => {
    const token = getAuthToken?.();
    if (!token) {
      console.warn('⚠️ Cannot refresh vocabularies without auth token');
      return;
    }

    try {
      const data = await apiCall(getAuthToken, '/my-vocabularies');
      set({
        myVocabularies: data?.vocabularies || []
      });
    } catch (error) {
      console.error('❌ Error refreshing vocabularies:', error);
    }
  },

  reset: () => {
    set(initialState);
  }
}));
