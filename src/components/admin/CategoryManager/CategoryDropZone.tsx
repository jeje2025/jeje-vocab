import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ChevronDown, CheckSquare, Square, Edit } from 'lucide-react';
import { Category } from './types';

interface CategoryDropZoneProps {
  category: Category;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onToggleSelect: () => void;
  onEdit?: () => void;
  isOver?: boolean;
}

export function CategoryDropZone({
  category,
  isExpanded,
  isSelected,
  onToggle,
  onToggleSelect,
  onEdit,
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
      className={`p-6 flex items-center justify-between transition-all ${
        isOver
          ? 'bg-purple-100 border-l-4 border-[#8B5CF6]'
          : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Checkbox */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className="cursor-pointer"
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-[#8B5CF6]" />
          ) : (
            <Square className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {/* Category Info */}
        <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={onToggle}>
          <div className="text-3xl">{category.icon}</div>
          <div>
            <div style={{ fontWeight: 600, color: '#491B6D' }}>
              {category.name}
            </div>
            <div className="text-sm text-gray-500">
              {isOver ? '여기에 드롭하여 이동' : `ID: ${category.id}`}
            </div>
          </div>
        </div>

        {/* Edit Button */}
        {onEdit && (
          <Edit
            className="w-5 h-5 text-blue-500 cursor-pointer hover:text-blue-700 mr-2"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          />
        )}

        {/* Expand Icon */}
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform cursor-pointer ${
            isExpanded ? 'rotate-180' : ''
          }`}
          onClick={onToggle}
        />
      </div>
    </div>
  );
}
