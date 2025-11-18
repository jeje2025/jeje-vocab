import { useMemo, useState } from 'react';
import { getSupabaseClient } from '../../../utils/supabase/client';
import { Department, University } from '../../types';

interface Props {
  universities: University[];
  departments: Department[];
  onRefresh: () => void;
}

const emptyForm: Omit<University, 'id'> = {
  name: '',
  logo_url: '',
  application_start: '',
  application_end: '',
  exam_date: '',
  result_date: ''
};

export function UniversityManager({ universities, departments, onRefresh }: Props) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [form, setForm] = useState<Omit<University, 'id'>>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name?.trim()) return;
    if (editingId) {
      await supabase.from('universities').update(form).eq('id', editingId);
    } else {
      await supabase.from('universities').insert(form);
    }
    setForm(emptyForm);
    setEditingId(null);
    onRefresh();
  };

  const handleEdit = (university: University) => {
    setEditingId(university.id);
    setForm({
      name: university.name,
      logo_url: university.logo_url || '',
      application_start: university.application_start || '',
      application_end: university.application_end || '',
      exam_date: university.exam_date || '',
      result_date: university.result_date || ''
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('해당 대학을 삭제할까요? 연결된 학과도 함께 삭제됩니다.')) return;
    await supabase.from('universities').delete().eq('id', id);
    onRefresh();
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvLoading(true);
    try {
      const text = await file.text();
      const rows = text.split(/\r?\n/).filter(Boolean);
      const [headerLine, ...dataLines] = rows;
      const headers = headerLine.split(',').map((h) => h.trim());

      const inserts = dataLines.map((line) => {
        const cells = line.split(',');
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = cells[index]?.trim();
        });
        return obj;
      });

      if (inserts.length) {
        await supabase.from('universities').upsert(inserts, { onConflict: 'name' });
        onRefresh();
      }
    } finally {
      setCsvLoading(false);
    }
  };

  return (
    <section className="admission-card space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="admission-section-title">대학 정보 관리</p>
          <p className="text-sm text-gray-500">대학, 일정, 학과 정보를 등록하고 CSV로 일괄 업로드할 수 있습니다.</p>
        </div>
        <label className="admission-button-primary cursor-pointer">
          {csvLoading ? '업로드 중...' : 'CSV 업로드'}
          <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} disabled={csvLoading} />
        </label>
      </div>

      <form onSubmit={handleSubmit} className="admission-grid two">
        <label className="space-y-2">
          <span className="text-sm text-gray-500">대학명</span>
          <input
            className="w-full border rounded-xl px-3 py-2"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="예: 고려대학교"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-gray-500">로고 URL</span>
          <input
            className="w-full border rounded-xl px-3 py-2"
            value={form.logo_url || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, logo_url: e.target.value }))}
            placeholder="https://"
          />
        </label>
        {['application_start', 'application_end', 'exam_date', 'result_date'].map((key) => (
          <label key={key} className="space-y-2">
            <span className="text-sm text-gray-500">
              {{
                application_start: '원서 시작',
                application_end: '원서 마감',
                exam_date: '시험일',
                result_date: '결과 발표'
              }[key as keyof typeof emptyForm]}
            </span>
            <input
              type="date"
              className="w-full border rounded-xl px-3 py-2"
              value={(form as any)[key] || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
            />
          </label>
        ))}

        <div className="col-span-full flex gap-3">
          <button className="admission-button-primary" type="submit">
            {editingId ? '대학 정보 수정' : '대학 추가'}
          </button>
          {editingId && (
            <button
              type="button"
              className="admission-button-primary bg-gray-300 text-gray-800"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              취소
            </button>
          )}
        </div>
      </form>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-gray-500">
              <th className="py-2">대학명</th>
              <th>원서</th>
              <th>시험</th>
              <th>발표</th>
              <th>학과 수</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {universities.map((university) => (
              <tr key={university.id} className="border-t">
                <td className="py-2 font-semibold">{university.name}</td>
                <td className="text-xs text-gray-500">
                  {university.application_start || '-'} ~ {university.application_end || '-'}
                </td>
                <td>{university.exam_date || '-'}</td>
                <td>{university.result_date || '-'}</td>
                <td>{departments.filter((d) => d.university_id === university.id).length}</td>
                <td className="flex gap-2 justify-end py-2">
                  <button className="text-[#7c3aed]" onClick={() => handleEdit(university)}>
                    수정
                  </button>
                  <button className="text-rose-500" onClick={() => handleDelete(university.id)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
