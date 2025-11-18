export interface Vocabulary {
  id: string;
  title: string;
  category: string;
  description?: string;
  total_words?: number;
  words?: any[];
  downloads?: number;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
}

export interface CategoryManagerProps {
  getAuthToken: () => string | null;
  onUpdate?: () => void;
}

export interface VocabularyItemProps {
  vocabulary: Vocabulary;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (vocab: Vocabulary) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
}
