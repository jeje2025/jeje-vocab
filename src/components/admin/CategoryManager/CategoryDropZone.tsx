import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ChevronDown } from 'lucide-react';
import { Category } from './types';

interface CategoryDropZoneProps {
  category: Category;
  isExpanded: boolean;
  onToggle: () => void;
  isOver?: boolean;
}

export function CategoryDropZone({
  category,
  isExpanded,
  onToggle,
}: CategoryDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `category-${category.id}`,
    data: {
      type: 'category',
      category: category.name,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`p-6 flex items-center justify-between cursor-pointer transition-all ${
        isOver
          ? 'bg-purple-100 border-l-4 border-[#8B5CF6]'
          : 'hover:bg-gray-50'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="text-3xl">{category.icon}</div>
        <div>
          <div style={{ fontWeight: 600, color: '#491B6D' }}>
            {category.name}
          </div>
          <div className="text-sm text-gray-500">
            {isOver ? '여기에 드롭하여 이동' : `ID: ${category.id}`}
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </div>
    </div>
  );
}
