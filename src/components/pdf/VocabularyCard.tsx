import React, { memo } from 'react';
import { EditableText } from './EditableText';

interface VocabularyCardProps {
  id: number;
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  meaning: string;
  definition?: string;
  synonyms: string[];
  antonyms: string[];
  derivatives: Array<{ word: string; meaning: string }>;
  example: string;
  translation: string;
  translationHighlight?: string;
  etymology: string;
  isEditable?: boolean;
  onUpdate?: (id: number, field: string, value: any) => void;
}

const VocabularyCardComponent = ({
  id,
  word,
  pronunciation,
  partOfSpeech,
  meaning,
  definition,
  synonyms,
  antonyms,
  derivatives,
  example,
  translation,
  translationHighlight,
  etymology,
  isEditable = false,
  onUpdate
}: VocabularyCardProps) => {
  // 예문에서 표제어를 굵게 처리하는 함수
  const highlightWord = (text: string, wordToHighlight: string) => {
    // 대소문자 구분 없이 찾기
    const lowerText = text.toLowerCase();
    const lowerWord = wordToHighlight.toLowerCase();
    
    // 단어의 다양한 형태를 찾기 위해 indexOf 사용
    const index = lowerText.indexOf(lowerWord);
    
    if (index === -1) return text;
    
    return (
      <>
        {text.substring(0, index)}
        <span style={{ fontWeight: 'bold' }}>{text.substring(index, index + wordToHighlight.length)}</span>
        {text.substring(index + wordToHighlight.length)}
      </>
    );
  };

  // 번역에서 특정 문구를 굵게 처리하는 함수
  const highlightTranslation = (text: string, highlightText?: string) => {
    if (!highlightText) return text;
    
    const index = text.indexOf(highlightText);
    if (index === -1) return text;
    
    return (
      <>
        {text.substring(0, index)}
        <span style={{ fontWeight: 'bold' }}>{highlightText}</span>
        {text.substring(index + highlightText.length)}
      </>
    );
  };

  return (
    <div
      className="vocabulary-card border border-gray-200/60 rounded-lg bg-white py-3 pl-4 pr-8 mb-3"
      style={{
        overflow: 'visible',
        marginBottom: '12px',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        WebkitColumnBreakInside: 'avoid',
        display: 'block'
      }}
    >
      <div style={{ overflow: 'visible' }}>
        {/* Top section - Word on left, Meaning & Examples on right */}
        <div className="grid gap-4 mb-3" style={{ gridTemplateColumns: '28% 72%' }}>
          {/* Left: Word */}
          <div>
            <div className="inline-block px-1.5 py-0.5 bg-slate-100/80 backdrop-blur-md rounded-full border border-slate-200/60 mb-2">
              <p className="uppercase tracking-tight text-slate-600 font-medium" style={{ fontSize: '8px' }}>
                {String(id).padStart(3, '0')}
              </p>
            </div>
            <h2 className="text-black mb-0.5 tracking-tight" style={{ fontSize: '22px', fontWeight: 'bold' }}>
              {isEditable ? (
                <EditableText
                  value={word}
                  onChange={(val) => onUpdate?.(id, 'word', val)}
                  isEditable={true}
                  className="text-black tracking-tight"
                  style={{ fontSize: '22px', fontWeight: 'bold' }}
                />
              ) : (
                word
              )}
            </h2>
          </div>
          
          {/* Right: Meaning & Examples + Checkboxes */}
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="mb-2">
                <p className="text-black leading-snug" style={{ fontSize: '13px' }}>
                  <span className="text-gray-400 print:text-black" style={{ fontSize: '10px', fontWeight: 'bold' }}>
                    {isEditable ? (
                      <EditableText
                        value={partOfSpeech}
                        onChange={(val) => onUpdate?.(id, 'partOfSpeech', val)}
                        isEditable={true}
                        className="text-gray-400"
                        style={{ fontSize: '10px', fontWeight: 'bold' }}
                      />
                    ) : (
                      partOfSpeech
                    )}
                  </span>{' '}
                  {isEditable ? (
                    <EditableText
                      value={meaning}
                      onChange={(val) => onUpdate?.(id, 'meaning', val)}
                      isEditable={true}
                      className="text-black leading-snug"
                      style={{ fontSize: '13px' }}
                    />
                  ) : (
                    meaning
                  )}
                </p>
                {definition && (
                  <p className="text-gray-500 leading-snug mt-0.5 italic" style={{ fontSize: '10.5px' }}>
                    {isEditable ? (
                      <EditableText
                        value={definition}
                        onChange={(val) => onUpdate?.(id, 'definition', val)}
                        isEditable={true}
                        className="text-gray-500 leading-snug italic"
                        style={{ fontSize: '10.5px' }}
                      />
                    ) : (
                      definition
                    )}
                  </p>
                )}
              </div>
              <div className="pl-2.5 border-l border-gray-300">
                <p className="text-xs text-black leading-snug mb-0.5">
                  {isEditable ? (
                    <EditableText
                      value={example}
                      onChange={(val) => onUpdate?.(id, 'example', val)}
                      isEditable={isEditable}
                      className="text-xs text-black leading-snug"
                    >
                      {highlightWord(example, word)}
                    </EditableText>
                  ) : (
                    highlightWord(example, word)
                  )}
                </p>
                <p className="text-gray-600 leading-snug mb-0" style={{ fontSize: '10px' }}>
                  {isEditable ? (
                    <EditableText
                      value={translation}
                      onChange={(val) => onUpdate?.(id, 'translation', val)}
                      isEditable={isEditable}
                      className="text-gray-600 leading-snug"
                      style={{ fontSize: '10px' }}
                    >
                      {highlightTranslation(translation, translationHighlight)}
                    </EditableText>
                  ) : (
                    highlightTranslation(translation, translationHighlight)
                  )}
                </p>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex gap-1.5 items-start">
              <div className="w-2 h-2 border-gray-300" style={{ border: '1px solid #d1d5db' }}></div>
              <div className="w-2 h-2 border-gray-300" style={{ border: '1px solid #d1d5db' }}></div>
              <div className="w-2 h-2 border-gray-300" style={{ border: '1px solid #d1d5db' }}></div>
            </div>
          </div>
        </div>

        {/* Bottom section - Derivatives on left, Synonyms/Antonyms/Etymology on right */}
        <div className="grid gap-4 text-xs bg-[rgba(0,0,0,0)]" style={{ gridTemplateColumns: '28% 72%' }}>
          {/* Left: Derivatives */}
          <div>
            <div className="space-y-1">
              {derivatives.map((der, idx) => (
                <div key={idx} className="leading-tight">
                  <div className="text-gray-800 print:text-black">{der.word}</div>
                  <div className="text-gray-500" style={{ fontSize: '10px' }}>{der.meaning}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Synonyms, Antonyms, Etymology */}
          <div className="grid grid-cols-4 gap-2">
            {/* Synonyms - 25% */}
            <div>
              <div className="inline-block px-1 py-0.5 bg-slate-100/80 backdrop-blur-md rounded-full border border-slate-200/60 mb-0.5">
                <p className="uppercase tracking-tight text-slate-600 font-medium" style={{ fontSize: '8px' }}>동</p>
              </div>
              <div className="space-y-0.5">
                {isEditable ? (
                  <EditableText
                    value={synonyms.join(', ')}
                    onChange={(val) => {
                      const synonymsArray = val.split(',').map(s => s.trim()).filter(s => s);
                      onUpdate?.(id, 'synonyms', synonymsArray);
                    }}
                    isEditable={true}
                    className="text-gray-600 print:text-black"
                    style={{ fontSize: '10px' }}
                    multiline
                    inputWidth="100%"
                  />
                ) : (
                  synonyms.map((syn, idx) => (
                    <div key={idx} className="text-gray-600 print:text-black" style={{ fontSize: '10px' }}>{syn}</div>
                  ))
                )}
              </div>
            </div>

            {/* Antonyms - 25% */}
            <div>
              <div className="inline-block px-1 py-0.5 bg-slate-100/80 backdrop-blur-md rounded-full border border-slate-200/60 mb-0.5">
                <p className="uppercase tracking-tight text-slate-600 font-medium" style={{ fontSize: '8px' }}>반</p>
              </div>
              <div className="space-y-0.5">
                {isEditable ? (
                  <EditableText
                    value={antonyms.join(', ')}
                    onChange={(val) => {
                      const antonymsArray = val.split(',').map(s => s.trim()).filter(s => s);
                      onUpdate?.(id, 'antonyms', antonymsArray);
                    }}
                    isEditable={true}
                    className="text-gray-600 print:text-black"
                    style={{ fontSize: '10px' }}
                    multiline
                    inputWidth="100%"
                  />
                ) : (
                  antonyms.map((ant, idx) => (
                    <div key={idx} className="text-gray-600 print:text-black" style={{ fontSize: '10px' }}>{ant}</div>
                  ))
                )}
              </div>
            </div>

            {/* Etymology - 50% */}
            <div className="col-span-2">
              <div className="inline-block px-1.5 py-0.5 bg-slate-100/80 backdrop-blur-md rounded-full border border-slate-200/60 mb-0.5">
                <p className="uppercase tracking-tight text-slate-600 font-medium" style={{ fontSize: '8px' }}>Tip</p>
              </div>
              <div className="text-gray-600 print:text-black leading-snug" style={{ fontSize: '10px' }}>
                {isEditable ? (
                  <EditableText
                    value={etymology}
                    onChange={(val) => onUpdate?.(id, 'etymology', val)}
                    isEditable={true}
                    className="text-gray-600 leading-snug"
                    style={{ fontSize: '10px' }}
                    multiline
                  />
                ) : (
                  etymology
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(VocabularyCardComponent);

// 호환성을 위한 named export
export const VocabularyCard = memo(VocabularyCardComponent);