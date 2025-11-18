// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { action, payload } = await req.json();

    if (action === 'get-student-matrix') {
      const { data } = await supabase.rpc('get_student_matrix');
      return new Response(JSON.stringify(data ?? []), { headers: corsHeaders });
    }

    if (action === 'update-status') {
      const { studentId, universityId, status } = payload;
      const { data, error } = await supabase
        .from('student_applications')
        .upsert({
          student_id: studentId,
          university_id: universityId,
          status
        }, { onConflict: 'student_id,university_id' })
        .select();
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    if (action === 'search-departments') {
      const keyword = payload?.keyword ?? '';
      const { data, error } = await supabase
        .from('departments_view')
        .select('*')
        .ilike('department_name', `%${keyword}%`)
        .order('university_name');
      if (error) throw error;
      return new Response(JSON.stringify(data ?? []), { headers: corsHeaders });
    }

    if (action === 'get-dday-board') {
      const { data, error } = await supabase.rpc('get_admission_deadlines');
      if (error) throw error;
      return new Response(JSON.stringify(data ?? []), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: corsHeaders });
  }
});
