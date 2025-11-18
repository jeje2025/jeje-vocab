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

interface TestQuestion {
  id: number;
  word: string;
  meaning: string;
  correctSynonyms: string[];
  allChoices: Array<{ word: string; isCorrect: boolean; meaning?: string }>;
}

interface VocabularyTestAnswerProps {
  data: VocabularyItem[];
  headerInfo?: HeaderInfo;
}

export function VocabularyTestSynonymAnswer({ data, headerInfo }: VocabularyTestAnswerProps) {
  // 테스트 문제 생성 (테스트지와 동일한 로직)
  const generateTestQuestions = (): TestQuestion[] => {
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
        meaning: item.meaning,
        correctSynonyms,
        allChoices: shuffledChoices
      };
    });
  };

  const questions = useMemo(() => generateTestQuestions(), [data]);

  // 데이터를 2개씩 묶기
  const pairedQuestions = [];
  for (let i = 0; i < questions.length; i += 2) {
    pairedQuestions.push({
      left: questions[i],
      right: questions[i + 1] || null
    });
  }

  // 각 행을 개별 컴포넌트로
  const answerRows = pairedQuestions.map((pair, pairIndex) => (
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
          <td className="py-3 px-4 align-top" style={{ width: '50%', verticalAlign: 'top' }}>
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                {/* 번호 */}
                <div className="inline-block px-2 py-0.5 bg-slate-100/80 backdrop-blur-md rounded-full border border-slate-200/60">
                  <p className="uppercase tracking-tight text-slate-600 font-medium" style={{ fontSize: '8px' }}>
                    {String(pair.left.id).padStart(3, '0')}
                  </p>
                </div>
                
                {/* 단어 */}
                <div style={{ fontSize: '14px', fontWeight: 'bold' }} className="text-black">
                  {pair.left.word}
                </div>
              </div>
              
              {/* 뜻 */}
              <div className="text-black mb-2" style={{ fontSize: '12px' }}>
                뜻: {pair.left.meaning}
              </div>
            </div>
            
            {/* 정답 및 오답 설명 */}
            <div style={{ fontSize: '11px' }}>
              {/* 정답 */}
              <div className="mb-1 text-[12px]">
                <span className="text-gray-600 print:text-black">동의어: </span>
                <span className="text-gray-800 print:text-black" style={{ fontWeight: 'bold' }}>
                  {pair.left.allChoices
                    .filter(c => c.isCorrect)
                    .map(c => c.word)
                    .join(', ')}
                </span>
              </div>
              
              {/* 오답 설명 */}
              <div className="space-y-0.5">
                {pair.left.allChoices
                  .filter(c => !c.isCorrect)
                  .map((choice, idx) => (
                    <div key={idx} className="text-gray-600 print:text-black text-[11px]">
                      <span className="text-red-600 print:text-black">✗</span> {choice.word}: {choice.meaning}
                    </div>
                  ))}
              </div>
            </div>
          </td>

          {/* 오른쪽 열 */}
          <td className="py-3 px-4 align-top border-l border-gray-200" style={{ width: '50%', verticalAlign: 'top' }}>
            {pair.right && (
              <>
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    {/* 번호 */}
                    <div className="inline-block px-2 py-0.5 bg-slate-100/80 backdrop-blur-md rounded-full border border-slate-200/60">
                      <p className="uppercase tracking-tight text-slate-600 font-medium" style={{ fontSize: '8px' }}>
                        {String(pair.right.id).padStart(3, '0')}
                      </p>
                    </div>
                    
                    {/* 단어 */}
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }} className="text-black">
                      {pair.right.word}
                    </div>
                  </div>
                  
                  {/* 뜻 */}
                  <div className="text-black mb-2" style={{ fontSize: '12px' }}>
                    뜻: {pair.right.meaning}
                  </div>
                </div>
                
                {/* 정답 및 오답 설명 */}
                <div style={{ fontSize: '11px' }}>
                  {/* 정답 */}
                  <div className="mb-1 text-[12px]">
                    <span className="text-gray-600 print:text-black">동의어: </span>
                    <span className="text-gray-800 print:text-black" style={{ fontWeight: 'bold' }}>
                      {pair.right.allChoices
                        .filter(c => c.isCorrect)
                        .map(c => c.word)
                        .join(', ')}
                    </span>
                  </div>
                  
                  {/* 오답 설명 */}
                  <div className="space-y-0.5">
                    {pair.right.allChoices
                      .filter(c => !c.isCorrect)
                      .map((choice, idx) => (
                        <div key={idx} className="text-gray-600 print:text-black text-[11px]">
                          <span className="text-red-600 print:text-black">✗</span> {choice.word}: {choice.meaning}
                        </div>
                      ))}
                  </div>
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
      {answerRows}
    </A4PageLayout>
  );
}
