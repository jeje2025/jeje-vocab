import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { getSupabaseClient } from '../../utils/supabase/client';
import '../../styles/admission.css';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  color: string;
  subtitle?: string;
  status?: string;
}

interface DepartmentResult {
  university_id: string;
  university_name: string;
  department_id: string;
  department_name: string;
  quota?: number | null;
  competition_rate?: number | null;
  application_start?: string | null;
  application_end?: string | null;
  exam_date?: string | null;
  result_date?: string | null;
}

interface StudentCalendarScreenProps {
  onBack?: () => void;
}

const EVENT_COLORS = {
  application_end: '#f43f5e',
  exam_date: '#2563eb',
  result_date: '#22c55e'
};

export function StudentCalendarScreen({ onBack }: StudentCalendarScreenProps) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<DepartmentResult[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [departmentKeyword, setDepartmentKeyword] = useState('경영학과');
  const [departmentTable, setDepartmentTable] = useState<DepartmentResult[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  const fetchMyApplications = async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('student_applications')
      .select('id,status,universities(name,application_start,application_end,exam_date,result_date),departments(name)')
      .eq('student_id', userId);
    const mapped =
      data?.map((row: any) => ({
        id: row.id,
        status: row.status,
        university_name: row.universities?.name,
        department_name: row.departments?.name,
        ...row.universities
      })) || [];
    setMyApplications(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchMyApplications();
  }, [userId]);

  useEffect(() => {
    const list: CalendarEvent[] = [];
    myApplications.forEach((application) => {
      ['application_end', 'exam_date', 'result_date'].forEach((key) => {
        const value = application?.[key];
        if (value) {
          list.push({
            id: `${application.id}-${key}`,
            title: application.university_name || '대학',
            subtitle: {
              application_end: '원서 마감',
              exam_date: '시험',
              result_date: '발표'
            }[key as 'application_end' | 'exam_date' | 'result_date'],
            date: value,
            color: EVENT_COLORS[key as keyof typeof EVENT_COLORS],
            status: application.status
          });
        }
      });
    });
    setEvents(list);
  }, [myApplications]);

  const handleSearch = async () => {
    const { data } = await supabase.functions.invoke<DepartmentResult[]>('admission-manager', {
      body: { action: 'search-departments', payload: { keyword: searchKeyword } }
    });
    setSearchResults(data || []);
  };

  const registerInterest = async (department: DepartmentResult) => {
    if (!userId) {
      alert('로그인이 필요합니다.');
      return;
    }
    await supabase.from('student_applications').upsert({
      student_id: userId,
      university_id: department.university_id,
      department_id: department.department_id,
      status: '관심'
    });
    fetchMyApplications();
    alert(`${department.university_name} ${department.department_name} 관심 등록 완료!`);
  };

  const handleDepartmentSearch = async () => {
    const { data } = await supabase.functions.invoke<DepartmentResult[]>('admission-manager', {
      body: { action: 'search-departments', payload: { keyword: departmentKeyword } }
    });
    setDepartmentTable(data || []);
  };

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blankDays = Array.from({ length: firstDayIndex }, (_, i) => i);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const eventsByDate = events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    const key = event.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});

  const selectedDateKey = selectedDate.toISOString().slice(0, 10);
  const selectedEvents = eventsByDate[selectedDateKey] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDF2F8] via-[#F5F3FF] to-[#E0F2FE] py-10">
      <div className="max-w-5xl mx-auto px-4 space-y-8">
        <div className="flex items-center justify-between">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-2 rounded-full bg-white/90 border border-white/70 shadow-lg px-4 py-2 text-sm font-semibold text-[#7c3aed]"
              style={{ boxShadow: '0 12px 32px rgba(124,58,237,0.15)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              홈으로
            </button>
          ) : (
            <div />
          )}
        </div>
        <header className="text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-[#7c3aed]">Student Planner</p>
          <h1 className="text-3xl font-black text-[#1e1b4b]">내 편입 지원 캘린더</h1>
          <p className="text-gray-600 text-sm">관심 대학을 등록하고 원서·시험·발표 일정을 한눈에 확인하세요.</p>
        </header>

        <section className="bg-white/95 rounded-3xl border border-white/70 shadow-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="flex-1 rounded-3xl border border-gray-100 bg-gray-50 px-5 py-3 shadow-inner text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
              placeholder="대학명 혹은 학과명으로 검색"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            <button
              className="rounded-3xl px-6 py-3 bg-[#7c3aed] text-white font-semibold shadow-lg shadow-purple-200"
              onClick={handleSearch}
            >
              검색
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {searchResults.map((result) => (
              <div key={result.department_id} className="border rounded-3xl p-4 bg-white/95 shadow">
                <p className="text-xs text-[#7c3aed] uppercase tracking-[0.2em]">{result.university_name}</p>
                <h3 className="text-xl font-bold text-[#1e1b4b]">{result.department_name}</h3>
                <p className="text-sm text-gray-500">
                  정원 {result.quota || '-'}명 / 경쟁률 {result.competition_rate || '-'}
                </p>
                <div className="text-xs text-gray-500 mt-2 space-y-1">
                  <p>원서: {result.application_start || '-'} ~ {result.application_end || '-'}</p>
                  <p>시험: {result.exam_date || '-'}</p>
                  <p>발표: {result.result_date || '-'}</p>
                </div>
                <button
                  className="admission-button-primary mt-3 rounded-2xl bg-[#7c3aed] px-4 py-2 text-white"
                  onClick={() => registerInterest(result)}
                >
                  관심 등록
                </button>
              </div>
            ))}
            {!searchResults.length && <p className="text-center text-gray-500 col-span-full">검색 결과가 없습니다.</p>}
          </div>
        </section>

        <section className="bg-white/95 rounded-3xl border border-white/70 shadow-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="admission-section-title">시험 일정 Calendar</p>
              <p className="text-sm text-gray-500">날짜를 선택하면 해당 일정과 지원 대학을 확인할 수 있어요.</p>
            </div>
            <div className="flex gap-2">
              <button
                className="w-10 h-10 rounded-full bg-[#f3e8ff] text-[#7c3aed] flex items-center justify-center shadow-inner"
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
              >
                ‹
              </button>
              <button
                className="w-10 h-10 rounded-full bg-[#f3e8ff] text-[#7c3aed] flex items-center justify-center shadow-inner"
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
              >
                ›
              </button>
            </div>
          </div>

          <div className="text-center font-semibold text-lg text-[#4c1d95]">
            {calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월
          </div>

          <div className="grid grid-cols-7 text-center text-sm text-gray-400">
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <div key={day} className={day === '일' ? 'text-rose-400' : day === '토' ? 'text-blue-500' : ''}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {blankDays.map((blank) => (
              <div key={`blank-${blank}`} />
            ))}
            {daysArray.map((day) => {
              const cellDate = new Date(year, month, day);
              const isoDate = cellDate.toISOString().slice(0, 10);
              const isSelected = selectedDateKey === isoDate;
              const hasEvent = eventsByDate[isoDate]?.length;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(cellDate)}
                  className={`relative mx-auto flex h-11 w-11 items-center justify-center rounded-full font-semibold transition-all ${
                    isSelected ? 'bg-white text-[#7c3aed] border-2 border-[#7c3aed] shadow-lg' : 'text-[#1e1b4b]'
                  }`}
                >
                  {day}
                  {hasEvent && !isSelected && (
                    <span className="absolute bottom-0 h-1.5 w-1.5 rounded-full" style={{ background: eventsByDate[isoDate][0].color }} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 space-y-3">
            <p className="text-sm font-semibold text-[#4c1d95] flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" /> 선택한 날짜의 일정
            </p>
            {selectedEvents.length ? (
              selectedEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between rounded-2xl border border-[#ede9fe] bg-[#f9f5ff] px-4 py-3 shadow-sm">
                  <div>
                    <p className="text-sm text-[#7c3aed] font-semibold">{event.title}</p>
                    <p className="text-xs text-gray-500">{event.subtitle}</p>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: event.color }}>
                    {event.subtitle}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">선택한 날짜에 일정이 없습니다.</p>
            )}
          </div>
        </section>

        <section className="bg-white/95 rounded-3xl border border-white/70 shadow-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="admission-section-title">내 지원 대학 목록</p>
              <p className="text-sm text-gray-500">관심 등록한 학교의 원서 마감 / 시험 / 발표 일정을 모아봤어요.</p>
            </div>
          </div>
          <div className="space-y-3">
            {myApplications.map((application) => (
              <div key={application.id} className="rounded-3xl border border-[#f1e7ff] bg-white px-4 py-3 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#4c1d95]">{application.university_name}</p>
                  <p className="text-sm text-gray-500">{application.department_name || '학과 미정'}</p>
                  <p className="text-xs text-gray-400">
                    마감: {application.application_end || '-'} · 시험: {application.exam_date || '-'} · 발표: {application.result_date || '-'}
                  </p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#f5f0ff] text-[#7c3aed]">{application.status}</span>
              </div>
            ))}
            {!myApplications.length && <p className="text-sm text-center text-gray-500">관심 등록한 대학이 없습니다.</p>}
          </div>
        </section>

        <section className="bg-white/95 rounded-3xl border border-white/70 shadow-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="admission-section-title">학과별 비교</p>
              <p className="text-sm text-gray-500">원하는 학과명을 입력하면 모든 대학 모집 정보를 비교할 수 있습니다.</p>
            </div>
            <div className="flex gap-2 flex-1">
              <input
                className="flex-1 rounded-3xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
                value={departmentKeyword}
                onChange={(e) => setDepartmentKeyword(e.target.value)}
              />
              <button
                className="rounded-3xl px-6 py-3 bg-[#7c3aed] text-white font-semibold shadow-lg shadow-purple-200"
                onClick={handleDepartmentSearch}
              >
                조회
              </button>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-gray-500">
                  <th className="py-2">대학</th>
                  <th>학과</th>
                  <th>정원</th>
                  <th>경쟁률</th>
                  <th>원서</th>
                  <th>시험</th>
                  <th>발표</th>
                </tr>
              </thead>
              <tbody>
                {departmentTable.map((row) => (
                  <tr key={row.department_id} className="border-t">
                    <td className="py-2 font-semibold">{row.university_name}</td>
                    <td>{row.department_name}</td>
                    <td>{row.quota || '-'}</td>
                    <td>{row.competition_rate || '-'}</td>
                    <td className="text-xs">
                      {row.application_start || '-'} ~ {row.application_end || '-'}
                    </td>
                    <td>{row.exam_date || '-'}</td>
                    <td>{row.result_date || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!departmentTable.length && <p className="text-center text-gray-500 py-6">조회된 학과가 없습니다.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
