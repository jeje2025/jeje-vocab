export type AdmissionStatus = '관심' | '원서작성' | '제출완료' | '1차합격' | '최종합격';

export interface University {
  id: string;
  name: string;
  logo_url?: string | null;
  application_start?: string | null;
  application_end?: string | null;
  exam_date?: string | null;
  result_date?: string | null;
}

export interface Department {
  id: string;
  university_id: string;
  name: string;
  quota?: number | null;
  competition_rate?: number | null;
}

export interface StudentApplication {
  id: string;
  student_id: string;
  student_name?: string;
  university_id: string;
  university_name?: string;
  department_id?: string | null;
  department_name?: string | null;
  status: AdmissionStatus;
  admin_notes?: string | null;
}

export interface StudentMatrixRow {
  studentId: string;
  studentName: string;
  statuses: Record<string, AdmissionStatus | null>;
}

export interface DdayItem {
  universityId: string;
  universityName: string;
  countdown: number;
  deadlineType: '원서마감' | '시험' | '발표';
  students: Array<{ id: string; name: string }>;
  date: string;
}
