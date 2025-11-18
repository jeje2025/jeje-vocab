import { HeaderFooter } from './HeaderFooter';
import { A4PageLayout } from './A4PageLayout';

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

interface VocabularyTestSimpleProps {
  data: VocabularyItem[];
  headerInfo?: HeaderInfo;
}

export function VocabularyTestSimple({ data, headerInfo }: VocabularyTestSimpleProps) {
  // 데이터를 2개씩 묶기
  const pairedData = [];
  for (let i = 0; i < data.length; i += 2) {
    pairedData.push({
      left: data[i],
      right: data[i + 1] || null
    });
  }

  // 각 행을 개별 컴포넌트로
  const tableRows = pairedData.map((pair, index) => (
    <table key={index} className="w-full border-collapse">
      <tbody>
        <tr 
          className="border-b border-gray-200"
          style={{
            pageBreakInside: 'avoid',
            breakInside: 'avoid'
          }}
        >
          {/* 왼쪽 - 번호 */}
          <td className="py-2 px-1 align-top" style={{ width: '4%' }}>
            <div className="inline-block px-2 py-0.5 bg-slate-100/80 backdrop-blur-md rounded-full border border-slate-200/60">
              <p className="uppercase tracking-tight text-slate-600 font-medium" style={{ fontSize: '8px' }}>
                {String(pair.left.id).padStart(3, '0')}
              </p>
            </div>
          </td>

          {/* 왼쪽 - 단어 */}
          <td className="py-2 px-3 align-top" style={{ width: '46%' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }} className="text-black">
              {pair.left.word}
            </div>
          </td>

          {/* 오른쪽 - 번호 */}
          <td className="py-2 px-1 align-top" style={{ width: '4%' }}>
            {pair.right && (
              <div className="inline-block px-2 py-0.5 bg-slate-100/80 backdrop-blur-md rounded-full border border-slate-200/60">
                <p className="uppercase tracking-tight text-slate-600 font-medium" style={{ fontSize: '8px' }}>
                  {String(pair.right.id).padStart(3, '0')}
                </p>
              </div>
            )}
          </td>

          {/* 오른쪽 - 단어 */}
          <td className="py-2 px-3 align-top" style={{ width: '46%' }}>
            {pair.right && (
              <div style={{ fontSize: '14px', fontWeight: 'bold' }} className="text-black">
                {pair.right.word}
              </div>
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
      {tableRows}
    </A4PageLayout>
  );
}
