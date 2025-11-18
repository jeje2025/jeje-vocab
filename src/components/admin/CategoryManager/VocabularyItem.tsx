import React from 'react';
import { motion } from 'motion/react';
import { Edit, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { VocabularyItemProps } from './types';

export function VocabularyItem({
  vocabulary,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
}: VocabularyItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: vocabulary.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg p-4 shadow-sm border-2 transition-all ${
        isSelected
          ? 'border-[#8B5CF6] bg-purple-50'
          : 'border-gray-200 hover:border-gray-300'
      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(vocabulary.id)}
          className="w-5 h-5 rounded border-gray-300 text-[#8B5CF6] focus:ring-[#8B5CF6] cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center w-8 h-8 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing"
        >
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="font-semibold text-[#491B6D]">{vocabulary.title}</div>
          <div className="text-sm text-gray-500">
            {vocabulary.total_words || vocabulary.words?.length || 0}개 단어
            {vocabulary.description && ` • ${vocabulary.description}`}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(vocabulary);
            }}
            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4 text-blue-600" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(vocabulary.id);
            }}
            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
