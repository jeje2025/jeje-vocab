import { HeaderFooter } from './HeaderFooter';
import { A4PageLayout } from './A4PageLayout';
import { useMemo } from 'react';

interface VocabularyItem {
  id: number;
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  meaning: string;
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

interface VocabularyTestSynonymProps {
  data: VocabularyItem[];
  headerInfo?: HeaderInfo;
}

interface TestQuestion {
  id: number;
  word: string;
  correctSynonyms: string[];
  allChoices: Array<{ word: string; isCorrect: boolean; meaning?: string }>;
}

export function VocabularyTestSynonym({ data, headerInfo }: VocabularyTestSynonymProps) {
  // ⚡ 테스트 문제 생성을 useMemo로 캐싱 (메모리 최적화)
  const questions = useMemo((): TestQuestion[] => {
    return data.map((item) => {
      const correctSynonyms = item.synonyms.slice(0, Math.min(3, item.synonyms.length));
      const distractors: Array<{ word: string; meaning: string }> = [];
      
      // 다른 단어들과 그 동의어들에서 오답 선택지 생성
      const otherWords = data.filter(d => d.id !== item.id);
      for (const other of otherWords) {
        // 다른 표제어 자체도 추가
        distractors.push({ word: other.word, meaning: other.meaning });
        // 다른 표제어의 동의어들도 추가
        other.synonyms.forEach(syn => {
          distractors.push({ word: syn, meaning: `(${other.word}의 동의어)` });
        });
      }
      
      // 랜덤하게 오답 선택
      const shuffledDistractors = distractors.sort(() => Math.random() - 0.5);
      const selectedDistractors = shuffledDistractors.slice(0, 4);
      
      // 정답과 오답 합치기
      const allChoices = [
        ...correctSynonyms.map(syn => ({ word: syn, isCorrect: true })),
        ...selectedDistractors.map(d => ({ word: d.word, isCorrect: false, meaning: d.meaning }))
      ];
      
      // 섞기
      const shuffledChoices = allChoices.sort(() => Math.random() - 0.5);
      
      return {
        id: item.id,
        word: item.word,
        correctSynonyms,
        allChoices: shuffledChoices
      };
    });
  }, [data]); // data가 변경될 때만 재생성
  
  // 데이터를 2개씩 묶기
  const pairedQuestions = [];
  for (let i = 0; i < questions.length; i += 2) {
    pairedQuestions.push({
      left: questions[i],
      right: questions[i + 1] || null
    });
  }

  // 각 행을 개별 컴포넌트로
  const testRows = pairedQuestions.map((pair, pairIndex) => (
    <table key={pairIndex} className="w-full border-collapse">
      <tbody>
        <tr 
          className="border-b border-gray-200"
          style={{
            pageBreakInside: 'avoid',
            breakInside: 'avoid'
          }}
        >
          {/* 왼쪽 열 */}
          <td className="py-3 px-4 align-top pb-6" style={{ width: '50%', verticalAlign: 'top' }}>
            <div className="mb-3">
              <div className="flex items-start gap-2 my-[4px] mx-[0px] px-[0px] py-[4px]">
                {/* 번호 */}
                <div className="inline-block px-1.5 py-0.5 bg-slate-100/80 backdrop-blur-md rounded-full border border-slate-200/60" style={{ flexShrink: 0 }}>
                  <p className="uppercase tracking-tight text-slate-600 font-medium" style={{ fontSize: '8px' }}>
                    {String(pair.left.id).padStart(3, '0')}
                  </p>
                </div>
                
                {/* 단어 */}
                <div style={{ fontSize: '14px', fontWeight: 'bold', flexShrink: 0 }} className="text-black">
                  {pair.left.word}
                </div>
                
                {/* 뜻: 라벨 */}
                <div className="text-gray-500 print:text-black" style={{ fontSize: '9px', flexShrink: 0, paddingTop: '4px' }}>
                  뜻:
                </div>
                
                {/* 뜻 쓰는 칸 */}
                <div className="flex-1" style={{ 
                  borderBottom: '1px solid #d1d5db',
                  minHeight: '20px'
                }}>
                </div>
              </div>
            </div>
            
            {/* 동의어 선택 */}
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 my-[16px] mx-[0px]">
              {pair.left.allChoices.map((choice, idx) => (
                <div 
                  key={idx}
                  className="inline-flex items-center gap-1.5"
                  style={{ fontSize: '11px' }}
                >
                  <span className="text-gray-400 print:text-black">□</span>
                  <span className="text-gray-700 print:text-black text-[12px]">{choice.word}</span>
                </div>
              ))}
            </div>
          </td>

          {/* 오른쪽 열 */}
          <td className="py-3 px-4 align-top border-l border-gray-200 pb-6" style={{ width: '50%', verticalAlign: 'top' }}>
            {pair.right && (
              <>
                <div className="mb-3">
                  <div className="flex items-start gap-2 my-[4px] mx-[0px] px-[0px] py-[4px]">
                    {/* 번호 */}
                    <div className="inline-block px-1.5 py-0.5 bg-slate-100/80 backdrop-blur-md rounded-full border border-slate-200/60" style={{ flexShrink: 0 }}>
                      <p className="uppercase tracking-tight text-slate-600 font-medium" style={{ fontSize: '8px' }}>
                        {String(pair.right.id).padStart(3, '0')}
                      </p>
                    </div>
                    
                    {/* 단어 */}
                    <div style={{ fontSize: '14px', fontWeight: 'bold', flexShrink: 0 }} className="text-black">
                      {pair.right.word}
                    </div>
                    
                    {/* 뜻: 라벨 */}
                    <div className="text-gray-500 print:text-black" style={{ fontSize: '9px', flexShrink: 0, paddingTop: '4px' }}>
                      뜻:
                    </div>
                    
                    {/* 뜻 쓰는 칸 */}
                    <div className="flex-1" style={{ 
                      borderBottom: '1px solid #d1d5db',
                      minHeight: '20px'
                    }}>
                    </div>
                  </div>
                </div>
                
                {/* 동의어 선택 */}
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 my-[16px] mx-[0px]">
                  {pair.right.allChoices.map((choice, idx) => (
                    <div 
                      key={idx}
                      className="inline-flex items-center gap-1.5"
                      style={{ fontSize: '11px' }}
                    >
                      <span className="text-gray-400 print:text-black">□</span>
                      <span className="text-gray-700 print:text-black text-[12px]">{choice.word}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  ));

  return (
    <A4PageLayout
      headerContent={<HeaderFooter headerInfo={headerInfo} showFooter={false} />}
      showHeaderOnFirstPageOnly={true}
    >
      {testRows}
    </A4PageLayout>
  );
}
