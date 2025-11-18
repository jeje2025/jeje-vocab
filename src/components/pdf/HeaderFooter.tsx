interface HeaderInfo {
  headerTitle: string;
  headerDescription: string;
  footerLeft: string;
}

interface HeaderFooterProps {
  headerInfo?: HeaderInfo;
  showHeader?: boolean;
  showFooter?: boolean;
  isEditable?: boolean;
  onFooterChange?: (value: string) => void;
  onHeaderChange?: (headerInfo: { headerTitle: string; headerDescription: string }) => void;
}

export function HeaderFooter({ 
  headerInfo, 
  showHeader = true, 
  showFooter = true,
  isEditable = false,
  onFooterChange,
  onHeaderChange
}: HeaderFooterProps) {
  if (!headerInfo) return null;

  const hasHeaderContent = headerInfo.headerTitle || headerInfo.headerDescription;

  return (
    <>
      {/* Header - 세련된 라벨 스타일 */}
      {showHeader && hasHeaderContent && (
        <div className="mb-6">
          {/* 상단 중앙 라벨 */}
          <div className="flex justify-center mb-4">
            <div className="inline-block px-4 py-1.5 bg-slate-100 backdrop-blur-md border border-slate-300 rounded-xl rounded-bl-none">
              {isEditable ? (
                <input
                  type="text"
                  value={headerInfo.headerTitle || ''}
                  onChange={(e) => onHeaderChange?.({ ...headerInfo, headerTitle: e.target.value })}
                  placeholder="제목 입력"
                  className="text-xs uppercase tracking-[0.2em] text-slate-800 placeholder-slate-400 font-medium bg-transparent border-none outline-none text-center min-w-[200px]"
                />
              ) : (
                <p className="text-xs uppercase tracking-[0.2em] text-slate-800 font-medium">
                  {headerInfo.headerTitle || 'Vocabulary Builder'}
                </p>
              )}
            </div>
          </div>
          
          {/* 설명 (있으면 표시) */}
          {headerInfo.headerDescription && (
            <div className="flex justify-center">
              {isEditable ? (
                <input
                  type="text"
                  value={headerInfo.headerDescription || ''}
                  onChange={(e) => onHeaderChange?.({ ...headerInfo, headerDescription: e.target.value })}
                  placeholder="설명 입력"
                  style={{ fontSize: '11px', fontFamily: 'SUIT' }}
                  className="text-gray-600 print:text-black text-center border-b border-gray-300 focus:border-gray-600 outline-none bg-transparent max-w-md"
                />
              ) : (
                <p style={{ fontSize: '11px', fontFamily: 'SUIT' }} className="text-gray-600 print:text-black text-center">
                  {headerInfo.headerDescription}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer - 좌하단 입력창만 */}
      {showFooter && (
        <div className="mt-4 pt-2">
          {isEditable ? (
            <input
              type="text"
              value={headerInfo.footerLeft || ''}
              onChange={(e) => onFooterChange?.(e.target.value)}
              placeholder="푸터 내용 입력"
              style={{ fontSize: '11px', fontFamily: 'SUIT' }}
              className="text-gray-600 print:text-black border-b border-gray-300 focus:border-gray-600 outline-none bg-transparent w-64"
            />
          ) : (
            <p style={{ fontSize: '11px', fontFamily: 'SUIT' }} className="text-gray-600 print:text-black">
              {headerInfo.footerLeft || ''}
            </p>
          )}
        </div>
      )}
    </>
  );
}