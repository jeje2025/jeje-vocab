import { StudentApplication, University } from '../../types';

interface Props {
  universities: University[];
  applicants: StudentApplication[];
  selectedUniversity: string;
  onSelectUniversity: (id: string) => void;
}

export function UniversityApplicants({ universities, applicants, selectedUniversity, onSelectUniversity }: Props) {
  return (
    <section className="admission-card space-y-4">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <p className="admission-section-title">대학별 지원자 목록</p>
          <p className="text-sm text-gray-500">드롭다운에서 대학을 선택하면 지원자 명단을 확인할 수 있습니다.</p>
        </div>
        <select
          value={selectedUniversity}
          onChange={(event) => onSelectUniversity(event.target.value)}
          className="border rounded-xl px-3 py-2 min-w-[200px]"
        >
          <option value="">대학 선택</option>
          {universities.map((university) => (
            <option key={university.id} value={university.id}>
              {university.name}
            </option>
          ))}
        </select>
      </div>

      {selectedUniversity ? (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-gray-500">
                <th className="py-2">학생명</th>
                <th>학과</th>
                <th>상태</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              {applicants.map((application) => (
                <tr key={application.id} className="border-t">
                  <td className="py-2 font-semibold">{application.student_name}</td>
                  <td>{application.department_name || '-'}</td>
                  <td>{application.status}</td>
                  <td className="text-gray-500">{application.admin_notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-10">왼쪽 드롭다운에서 대학을 선택하세요.</div>
      )}
    </section>
  );
}
