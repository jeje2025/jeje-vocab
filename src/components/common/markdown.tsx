import { ReactNode } from 'react';

interface RenderOptions {
  paragraphClassName?: string;
  listClassName?: string;
  boldClassName?: string;
}

const defaultOptions: Required<RenderOptions> = {
  paragraphClassName: 'text-[12px] leading-relaxed text-[#35215d] mb-2 last:mb-0',
  listClassName: 'list-disc pl-4 space-y-1 text-[12px] text-[#35215d]',
  boldClassName: 'font-semibold text-[#4C1D95]',
};

const renderInlineText = (line: string, keyPrefix: string, boldClassName: string) => {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${keyPrefix}-bold-${index}`} className={boldClassName}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${keyPrefix}-text-${index}`}>{part}</span>;
  });
};

export const renderMessageText = (text: string, options: RenderOptions = {}): ReactNode[] => {
  const mergedOptions = { ...defaultOptions, ...options };
  const sections = text.split(/\n{2,}/);
  return sections.map((section, sectionIndex) => {
    const lines = section.split('\n').filter(Boolean);
    const isList = lines.length > 1 && lines.every((line) => /^[-*•]\s+/.test(line.trim()));

    if (isList) {
      return (
        <ul
          key={`section-${sectionIndex}`}
          className={mergedOptions.listClassName}
        >
          {lines.map((line, lineIndex) => {
            const content = line.replace(/^[-*•]\s+/, '');
            return (
              <li key={`li-${sectionIndex}-${lineIndex}`}>
                {renderInlineText(content, `li-${sectionIndex}-${lineIndex}`, mergedOptions.boldClassName)}
              </li>
            );
          })}
        </ul>
      );
    }

    return (
      <p
        key={`section-${sectionIndex}`}
        className={mergedOptions.paragraphClassName}
      >
        {renderInlineText(section, `p-${sectionIndex}`, mergedOptions.boldClassName)}
      </p>
    );
  });
};
