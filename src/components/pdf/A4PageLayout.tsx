import React from 'react';

interface A4PageLayoutProps {
  children: React.ReactNode[];
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  showHeaderOnFirstPageOnly?: boolean;
  showFooterOnLastPageOnly?: boolean;
  tableHeader?: React.ReactNode;
}

export function A4PageLayout({
  children,
  headerContent,
  showHeaderOnFirstPageOnly = false
}: A4PageLayoutProps) {
  // 페이지 분할을 브라우저에게 맡기고, 모든 아이템을 단일 컨테이너에 렌더링
  return (
    <div className="page-container">
      <div className="a4-page">
        {/* 헤더 - 첫 페이지에만 표시 */}
        {showHeaderOnFirstPageOnly && headerContent && (
          <div className="page-header" style={{ marginBottom: '16px' }}>
            {headerContent}
          </div>
        )}

        {/* 모든 카드를 연속으로 렌더링 - 브라우저가 자동으로 페이지 분할 */}
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
