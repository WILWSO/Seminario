

import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface Course {
  id: string;
  name: string;
  teacher_id: string;
}

interface Period {
  id: string;
  name: string;
  start_date?: string;
  end_date?: string;
}

interface Enrollment {
  id: string;
  final_grade: number | null;
  status: string;
  period_id: string;
  course_id: string;
  user_id: string;
  type_coursed: string;
  users?: Student;
  courses?: Course;
  periods?: Period;
}

const ManageFinalGrade = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [message, setMessage] = useState('');
  const [selectedProfessor, setSelectedProfessor] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Fetch students
    supabase.from('users').select('id, first_name, last_name').then(({ data }) => {
      setStudents(data || []);
    });
    // Fetch courses
    supabase.from('courses').select('id, name, teacher_id').then(({ data }) => {
      setCourses(data || []);
    });
    // Fetch periods
    supabase.from('periods').select('id, name, start_date, end_date').then(({ data }) => {
      setPeriods(data || []);
    });
    // Fetch enrollments with joins
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    const { data, error } = await supabase
      .from('enrollments')
      .select('id, final_grade, status, period_id, course_id, user_id, type_coursed');
    if (!error) setEnrollments(data || []);
  };

  // Filtros y join manual
  const filtered = enrollments
    .map((e) => ({
      ...e,
      users: students.find((s) => s.id === e.user_id),
      courses: courses.find((c) => c.id === e.course_id),
      periods: periods.find((p) => p.id === e.period_id),
    }))
    .filter((e) => {
      const matchStudent = selectedStudent === 'all' || e.user_id === selectedStudent;
      const matchCourse = selectedCourse === 'all' || e.course_id === selectedCourse;
      const matchPeriod = selectedPeriod === 'all' || e.period_id === selectedPeriod;
      return matchStudent && matchCourse && matchPeriod;
    });

  // Obtener profesor del curso seleccionado para mensaje
  useEffect(() => {
    if (selectedCourse !== 'all') {
      const course = courses.find((c) => c.id === selectedCourse);
      if (course) setSelectedProfessor(course.teacher_id);
    } else {
      setSelectedProfessor('');
    }
  }, [selectedCourse, courses]);

  // Enviar mensaje al profesor
  const handleSendMessage = async () => {
    setSending(true);
    // Aquí deberías guardar el mensaje en una tabla messages o similar, asociada al profesor y curso
    // Ejemplo:
    // await supabase.from('messages').insert({ to_user_id: selectedProfessor, course_id: selectedCourse, content: message });
    setTimeout(() => {
      setSending(false);
      setMessage('');
      alert('Mensaje enviado al profesor.');
    }, 1000);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Gestión de Nota Final</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div>
          <label className="block mb-2 font-medium">Estudiante</label>
          <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="w-full p-2 border rounded" title="Seleccionar estudiante">
            <option value="all">Todos</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-2 font-medium">Curso</label>
          <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="w-full p-2 border rounded" title="Seleccionar curso">
            <option value="all">Todos</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-2 font-medium">Periodo</label>
          <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)} className="w-full p-2 border rounded" title="Seleccionar periodo">
            <option value="all">Todos</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2">Estudiante</th>
              <th className="px-4 py-2">Curso</th>
              <th className="px-4 py-2">Periodo</th>
              <th className="px-4 py-2">Nota Final</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="text-center">
                <td className="px-4 py-2">{e.users?.first_name} {e.users?.last_name}</td>
                <td className="px-4 py-2">{e.courses?.name}</td>
                <td className="px-4 py-2">{e.periods?.name}</td>
                <td className="px-4 py-2">{e.final_grade !== null ? e.final_grade.toFixed(2) : '-'}</td>
                <td className="px-4 py-2">{e.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">No hay datos para los filtros seleccionados.</div>
        )}
      </div>

      {/* Depuración visual: mostrar enrollments crudos */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Depuración: Datos crudos de enrollments</h2>
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
          {JSON.stringify(enrollments, null, 2)}
        </pre>
      </div>

      {/* Mensaje al profesor */}
      <div className="mt-8 max-w-xl">
        <h2 className="text-lg font-semibold mb-2">Enviar mensaje al profesor del curso</h2>
        <textarea
          className="w-full border rounded p-2 mb-2"
          rows={3}
          placeholder="Escribe tu mensaje..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          disabled={!selectedProfessor || !selectedCourse || selectedCourse === 'all'}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={handleSendMessage}
          disabled={!message || !selectedProfessor || !selectedCourse || selectedCourse === 'all' || sending}
        >
          {sending ? 'Enviando...' : 'Enviar mensaje'}
        </button>
      </div>
    </div>
  );
};

export default ManageFinalGrade;
