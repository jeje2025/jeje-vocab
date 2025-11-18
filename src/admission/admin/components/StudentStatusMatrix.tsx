import { AdmissionStatus, StudentMatrixRow, University } from '../../types';

interface Props {
  universities: University[];
  matrix: StudentMatrixRow[];
  onChangeStatus: (studentId: string, universityId: string, status: AdmissionStatus) => void;
}

const STATUS_ORDER: AdmissionStatus[] = ['관심', '원서작성', '제출완료', '1차합격', '최종합격'];
const STATUS_EMOJI: Record<AdmissionStatus, string> = {
  관심: '⭕',
  원서작성: '📝',
  제출완료: '✅',
  '1차합격': '🎯',
  '최종합격': '🏆'
};

export function StudentStatusMatrix({ universities, matrix, onChangeStatus }: Props) {
  const nextStatus = (current?: AdmissionStatus | null) => {
    if (!current) return STATUS_ORDER[0];
    const index = STATUS_ORDER.indexOf(current);
    return STATUS_ORDER[(index + 1) % STATUS_ORDER.length];
  };

  return (
    <section className="admission-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="admission-section-title">학생 지원 현황 매트릭스</p>
          <p className="text-sm text-gray-500">각 셀을 클릭해 상태를 순환 변경할 수 있습니다.</p>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="admission-matrix-table">
          <thead>
            <tr>
              <th className="text-left">학생명</th>
              {universities.map((university) => (
                <th key={university.id}>{university.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={row.studentId}>
                <td className="text-left font-semibold">{row.studentName}</td>
                {universities.map((university) => {
                  const status = row.statuses[university.id] as AdmissionStatus | undefined;
                  return (
                    <td
                      key={university.id}
                      className="admission-matrix-status"
                      onClick={() => onChangeStatus(row.studentId, university.id, nextStatus(status))}
                      title={status || '미지원'}
                    >
                      {status ? STATUS_EMOJI[status] : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
