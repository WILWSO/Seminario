import { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';

interface FinalGradeProps {
  studentId: string;
  courseId: string;
  periodId: string;
}


const FinalGrade = ({ studentId, courseId, periodId }: FinalGradeProps) => {
  const [finalGrade, setFinalGrade] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const calculateAndSaveFinalGrade = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. SUMA A: Sumar max_score de assignments del curso y periodo
        const { data: assignments, error: assignmentsError } = await supabase
          .from('assignments')
          .select('id, max_score')
          .eq('course_id', courseId)
          .eq('period_id', periodId)
          .eq('is_active', true);
        if (assignmentsError) throw assignmentsError;
        const sumaA = (assignments || []).reduce((acc, a) => acc + (a.max_score || 0), 0);

        // 2. SUMA B: Sumar grade de assignment_submissions del estudiante, curso y periodo
        const assignmentIds = (assignments || []).map(a => a.id);
        if (assignmentIds.length === 0) {
          setFinalGrade(0);
          // Si no hay assignments, no actualizamos status ni final_grade
          setLoading(false);
          return;
        }
        const { data: submissions, error: submissionsError } = await supabase
          .from('assignment_submissions')
          .select('grade, assignment_id')
          .eq('student_id', studentId)
          .in('assignment_id', assignmentIds)
          .not('grade', 'is', null);
        if (submissionsError) throw submissionsError;
        const sumaB = (submissions || []).reduce((acc, s) => acc + (s.grade || 0), 0);

        // 3. Calcular nota final
        const notaFinal = sumaA > 0 ? (sumaB / sumaA) * 100 : 0;
        setFinalGrade(notaFinal);

        // 4. Obtener enrollment para lógica de status
        const { data: enrollment, error: enrollmentError } = await supabase
          .from('enrollments')
          .select('id, type_coursed, status')
          .eq('user_id', studentId)
          .eq('course_id', courseId)
          .eq('period_id', periodId)
          .single();
        if (enrollmentError) throw enrollmentError;

        // 5. Lógica de status
        let status = 'Aprobado';
        if (enrollment.status === 'Desistido') {
          status = 'Desistido';
        } else if (enrollment.type_coursed === 'Oyente') {
          status = 'Oyente';
        } else if (notaFinal < 70) {
          status = 'Desaprobado';
        }

        // 6. Guardar en enrollments (final_grade y status)
        await supabase
          .from('enrollments')
          .update({ final_grade: notaFinal, status })
          .eq('id', enrollment.id);
      } catch (err: any) {
        setError('Error al calcular o guardar la nota final');
      } finally {
        setLoading(false);
      }
    };
    if (studentId && courseId && periodId) {
      calculateAndSaveFinalGrade();
    }
  }, [studentId, courseId, periodId]);

  if (loading) return <div>Calculando nota final...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  return (
    <div>
      <h2 className="text-lg font-bold">Nota Final</h2>
      <p className="text-xl">{finalGrade !== null ? finalGrade.toFixed(2) : 'Sin nota'}</p>
    </div>
  );
};

export default FinalGrade;
