import { HeaderFooter } from './HeaderFooter';
import { EditableText } from './EditableText';
import { memo } from 'react';
import { A4PageLayout } from './A4PageLayout';

interface VocabularyItem {
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
  etymology: string;
}

interface HeaderInfo {
  headerTitle: string;
  headerDescription: string;
  footerLeft: string;
}

interface VocabularyTableProps {
  data: VocabularyItem[];
  headerInfo?: HeaderInfo;
  isEditable?: boolean;
  onUpdate?: (id: number, field: string, value: any) => void;
  onHeaderChange?: (headerInfo: { headerTitle: string; headerDescription: string }) => void;
}

const VocabularyTableComponent = ({ data, headerInfo, isEditable = false, onUpdate, onHeaderChange }: VocabularyTableProps) => {
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
        <strong>{text.substring(index, index + wordToHighlight.length)}</strong>
        {text.substring(index + wordToHighlight.length)}
      </>
    );
  };

  // 각 행을 개별 컴포넌트로
  const tableRows = data.map((item) => (
    <table key={item.id} className="w-full border-collapse">
      <tbody>
        <tr 
          className="border-b border-gray-200"
          style={{
            pageBreakInside: 'avoid',
            breakInside: 'avoid'
          }}
        >
          {/* 번호 */}
          <td className="pt-1 pb-2 px-1 align-top" style={{ width: '3%' }}>
            <div className="inline-block px-2 py-0.5 bg-slate-100/80 backdrop-blur-md rounded-full border border-slate-200/60">
              <p className="uppercase tracking-tight text-slate-600 font-medium" style={{ fontSize: '8px' }}>
                {String(item.id).padStart(3, '0')}
              </p>
            </div>
          </td>

          {/* 단어 / 파생어 */}
          <td className="pt-1 pb-2 px-3 align-top" style={{ width: '18%' }}>
            <div className="space-y-1">
              <div style={{ fontSize: '14px', fontWeight: 'bold' }} className="text-black">
                {isEditable ? (
                  <EditableText
                    value={item.word}
                    onChange={(val) => onUpdate?.(item.id, 'word', val)}
                    isEditable={true}
                    className="text-black"
                    style={{ fontSize: '14px', fontWeight: 'bold' }}
                  />
                ) : (
                  item.word
                )}
              </div>
              <div className="space-y-1 pb-1">
                {item.derivatives.map((der, idx) => (
                  <div key={idx} style={{ lineHeight: '1.3' }}>
                    <div className="text-gray-800 print:text-black" style={{ fontSize: '11px' }}>{der.word}</div>
                    <div className="text-gray-500" style={{ fontSize: '8px' }}>{der.meaning}</div>
                  </div>
                ))}
              </div>
            </div>
          </td>

          {/* 뜻 / 예문 */}
          <td className="pt-1 pb-2 px-3 align-top" style={{ width: '42%' }}>
            <div className="space-y-1">
              <div className="text-[14px]">
                <span className="text-black" style={{ fontSize: '12px', lineHeight: '0.9' }}>
                  {isEditable ? (
                    <EditableText
                      value={item.meaning}
                      onChange={(val) => onUpdate?.(item.id, 'meaning', val)}
                      isEditable={true}
                      className="text-black"
                      style={{ fontSize: '12px', lineHeight: '0.9' }}
                    />
                  ) : (
                    item.meaning
                  )}
                </span>
              </div>
              {item.definition && (
                <div className="text-gray-500 italic" style={{ fontSize: '9px', lineHeight: '1.3' }}>
                  {isEditable ? (
                    <EditableText
                      value={item.definition}
                      onChange={(val) => onUpdate?.(item.id, 'definition', val)}
                      isEditable={true}
                      className="text-gray-500 italic"
                      style={{ fontSize: '9px', lineHeight: '1.3' }}
                      multiline
                    />
                  ) : (
                    item.definition
                  )}
                </div>
              )}
              <div className="text-black" style={{ fontSize: '10px', lineHeight: '1.3' }}>
                {isEditable ? (
                  <EditableText
                    value={item.example}
                    onChange={(val) => onUpdate?.(item.id, 'example', val)}
                    isEditable={true}
                    className="text-black"
                    style={{ fontSize: '10px', lineHeight: '1.3' }}
                    multiline
                  />
                ) : (
                  highlightWord(item.example, item.word)
                )}
              </div>
              <div className="text-gray-600" style={{ fontSize: '9px', lineHeight: '1.3' }}>
                {isEditable ? (
                  <EditableText
                    value={item.translation}
                    onChange={(val) => onUpdate?.(item.id, 'translation', val)}
                    isEditable={true}
                    className="text-gray-600"
                    style={{ fontSize: '9px', lineHeight: '1.3' }}
                    multiline
                  />
                ) : (
                  item.translation
                )}
              </div>
            </div>
          </td>

          {/* 동의어 */}
          <td className="pt-1 pb-2 px-3 align-top" style={{ width: '14%' }}>
            <div className="inline-block px-1 py-0.5 bg-slate-100/80 backdrop-blur-md rounded-full border border-slate-200/60 mb-0.5">
              <p className="uppercase tracking-tight text-slate-600 font-medium" style={{ fontSize: '8px' }}>동</p>
            </div>
            <div className="text-gray-600 print:text-black" style={{ fontSize: '10px', lineHeight: '1.4' }}>
              {isEditable ? (
                <EditableText
                  value={item.synonyms.join(', ')}
                  onChange={(val) => {
                    const synonymsArray = val.split(',').map(s => s.trim()).filter(s => s);
                    onUpdate?.(item.id, 'synonyms', synonymsArray);
                  }}
                  isEditable={true}
                  className="text-gray-600 print:text-black"
                  style={{ fontSize: '10px', lineHeight: '1.4' }}
                  multiline
                  inputWidth="100%"
                />
              ) : (
                item.synonyms.join(', ')
              )}
            </div>
          </td>

          {/* 반의어 */}
          <td className="pt-1 pb-2 px-3 align-top text-[16px]" style={{ width: '14%' }}>
            <div className="inline-block px-1 py-0.5 bg-slate-100/80 backdrop-blur-md rounded-full border border-slate-200/60 mb-0.5">
              <p className="uppercase tracking-tight text-slate-600 font-medium" style={{ fontSize: '8px' }}>반</p>
            </div>
            <div className="text-gray-600 print:text-black" style={{ fontSize: '10px', lineHeight: '1.4' }}>
              {isEditable ? (
                <EditableText
                  value={item.antonyms.join(', ')}
                  onChange={(val) => {
                    const antonymsArray = val.split(',').map(s => s.trim()).filter(s => s);
                    onUpdate?.(item.id, 'antonyms', antonymsArray);
                  }}
                  isEditable={true}
                  className="text-gray-600 print:text-black"
                  style={{ fontSize: '10px', lineHeight: '1.4' }}
                  multiline
                  inputWidth="100%"
                />
              ) : (
                item.antonyms.join(', ')
              )}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  ));

  return (
    <A4PageLayout
      headerContent={
        <HeaderFooter 
          headerInfo={headerInfo} 
          showFooter={false}
          isEditable={isEditable}
          onHeaderChange={onHeaderChange}
        />
      }
      showHeaderOnFirstPageOnly={true}
    >
      {tableRows}
    </A4PageLayout>
  );
}

export const VocabularyTable = memo(VocabularyTableComponent);