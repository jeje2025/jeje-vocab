-- Universities
CREATE TABLE IF NOT EXISTS public.universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  logo_url text,
  application_start date,
  application_end date,
  exam_date date,
  result_date date,
  created_at timestamptz DEFAULT now()
);

-- Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid REFERENCES public.universities(id) ON DELETE CASCADE,
  name text NOT NULL,
  quota integer,
  competition_rate numeric,
  created_at timestamptz DEFAULT now()
);

-- Student applications
CREATE TABLE IF NOT EXISTS public.student_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES auth.users(id),
  university_id uuid REFERENCES public.universities(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id),
  status text DEFAULT '관심',
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, university_id, department_id)
);

-- View for department search
CREATE OR REPLACE VIEW public.departments_view AS
SELECT
  d.id AS department_id,
  d.name AS department_name,
  d.quota,
  d.competition_rate,
  u.id AS university_id,
  u.name AS university_name,
  u.application_start,
  u.application_end,
  u.exam_date,
  u.result_date
FROM public.departments d
JOIN public.universities u ON d.university_id = u.id;

-- RPC: Student matrix (returns student rows w statuses per university)
CREATE OR REPLACE FUNCTION public.get_student_matrix()
RETURNS json AS $$
DECLARE
  matrix json;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO matrix
  FROM (
    SELECT
      sa.student_id AS "studentId",
      coalesce(p.full_name, '학생') AS "studentName",
      json_object_agg(sa.university_id::text, sa.status) AS statuses
    FROM student_applications sa
    LEFT JOIN profiles p ON p.id = sa.student_id
    GROUP BY sa.student_id, p.full_name
  ) t;
  RETURN COALESCE(matrix, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: D-day board
CREATE OR REPLACE FUNCTION public.get_admission_deadlines()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  WITH deadline_sources AS (
    SELECT id, name, application_end AS deadline, '원서마감'::text AS deadline_type FROM universities UNION ALL
    SELECT id, name, exam_date, '시험' FROM universities UNION ALL
    SELECT id, name, result_date, '발표' FROM universities
  ), upcoming AS (
    SELECT s.id AS university_id, s.name AS university_name, s.deadline, s.deadline_type
    FROM deadline_sources s
    WHERE s.deadline IS NOT NULL
      AND s.deadline >= CURRENT_DATE
    ORDER BY s.deadline ASC
    LIMIT 50
  )
  SELECT json_agg(
    json_build_object(
      'universityId', u.university_id,
      'universityName', u.university_name,
      'deadlineType', u.deadline_type,
      'date', u.deadline,
      'countdown', (u.deadline - CURRENT_DATE),
      'students', (
        SELECT json_agg(json_build_object('id', sa.student_id, 'name', coalesce(p.full_name, '학생')))
        FROM student_applications sa
        LEFT JOIN profiles p ON p.id = sa.student_id
        WHERE sa.university_id = u.university_id
      )
    )
  ) INTO result
  FROM upcoming u;

  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
