import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, GitMerge } from 'lucide-react';
import { Vocabulary } from './types';

interface MergeDialogProps {
  selectedVocabularies: Vocabulary[];
  onMerge: (targetId: string, newTitle: string) => void;
  onClose: () => void;
}

export function MergeDialog({
  selectedVocabularies,
  onMerge,
  onClose,
}: MergeDialogProps) {
  const [targetId, setTargetId] = useState(selectedVocabularies[0]?.id || '');
  const [newTitle, setNewTitle] = useState('');

  const handleMerge = () => {
    if (!targetId) {
      alert('병합할 기준 단어장을 선택해주세요.');
      return;
    }
    onMerge(targetId, newTitle || selectedVocabularies.find(v => v.id === targetId)?.title || '병합된 단어장');
  };

  const totalWords = selectedVocabularies.reduce(
    (sum, vocab) => sum + (vocab.total_words || vocab.words?.length || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#491B6D] to-[#5E2278] p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GitMerge className="w-6 h-6" />
              <h2 className="text-xl font-bold">단어장 병합</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Selected Vocabularies */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              선택된 단어장 ({selectedVocabularies.length}개)
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedVocabularies.map((vocab) => (
                <div
                  key={vocab.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <input
                    type="radio"
                    name="target"
                    value={vocab.id}
                    checked={targetId === vocab.id}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-4 h-4 text-[#8B5CF6] focus:ring-[#8B5CF6]"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{vocab.title}</div>
                    <div className="text-xs text-gray-500">
                      {vocab.total_words || vocab.words?.length || 0}개 단어
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * 라디오 버튼을 선택하여 병합의 기준이 될 단어장을 지정하세요
            </p>
          </div>

          {/* New Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              새로운 단어장 이름 (선택사항)
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={selectedVocabularies.find(v => v.id === targetId)?.title || '병합된 단어장'}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/30"
            />
          </div>

          {/* Summary */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-purple-900 mb-2">병합 결과 예상</h4>
            <div className="text-sm text-purple-700 space-y-1">
              <p>총 단어 수: {totalWords}개</p>
              <p>
                병합 방식: {selectedVocabularies.length - 1}개 단어장이 기준 단어장에
                병합되며, 원본은 삭제됩니다.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleMerge}
              className="flex-1 bg-gradient-to-r from-[#491B6D] to-[#5E2278] text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow"
            >
              병합하기
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
            >
              취소
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
