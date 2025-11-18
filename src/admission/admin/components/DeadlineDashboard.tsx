import { DdayItem } from '../../types';

interface Props {
  loading: boolean;
  items: DdayItem[];
}

const COLOR_MAP: Record<DdayItem['deadlineType'], string> = {
  원서마감: '#f43f5e',
  시험: '#3b82f6',
  발표: '#10b981'
};

export function DeadlineDashboard({ loading, items }: Props) {
  return (
    <section className="admission-card space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="admission-section-title">D-day 대시보드</p>
          <p className="text-sm text-gray-500">다가오는 마감일과 영향을 받는 학생을 보여줍니다.</p>
        </div>
      </div>

      {loading && <p className="text-center text-gray-500 py-6">일정을 불러오는 중...</p>}

      {!loading && (
        <div className="admission-grid two">
          {items.map((item) => (
            <article key={`${item.universityId}-${item.deadlineType}`} className="border rounded-2xl p-4 bg-white/80">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-gray-500">{item.deadlineType}</p>
                  <h3 className="text-xl font-bold">{item.universityName}</h3>
                  <p className="text-sm text-gray-500">{item.date}</p>
                </div>
                <span className="admission-chip" style={{ background: `${COLOR_MAP[item.deadlineType]}22`, color: COLOR_MAP[item.deadlineType] }}>
                  D-{item.countdown}
                </span>
              </div>
              <div className="mt-3 text-sm text-gray-600">
                {item.students.length ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {item.students.map((student) => (
                      <li key={student.id}>{student.name}</li>
                    ))}
                  </ul>
                ) : (
                  <p>아직 지원 학생이 없습니다.</p>
                )}
              </div>
            </article>
          ))}
          {!items.length && <p className="text-center text-gray-500 col-span-full">예정된 마감일이 없습니다.</p>}
        </div>
      )}
    </section>
  );
}
