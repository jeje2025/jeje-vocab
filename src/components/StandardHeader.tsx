import { BackButton } from './BackButton';

interface StandardHeaderProps {
  onBack: () => void;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
}

export function StandardHeader({ onBack, title, subtitle, rightElement }: StandardHeaderProps) {
  return (
    <div className="sticky top-0 z-40 backdrop-blur-lg flex-shrink-0" style={{ background: 'transparent' }}>
      <div className="flex items-center justify-between p-4 sm:p-6 md:p-8 gap-2 sm:gap-4">
        <div className="flex-shrink-0">
          <BackButton onClick={onBack} />
        </div>

        <div className="flex flex-col items-center flex-1 min-w-0">
          <h1 className="text-[#091A7A] text-center truncate max-w-full" style={{ fontSize: '18px', fontWeight: 600 }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-[#6B7280] text-center truncate max-w-full" style={{ fontSize: '12px', fontWeight: 500 }}>
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex-shrink-0">
          {rightElement || <div className="w-11 h-11" />}
        </div>
      </div>
    </div>
  );
}
