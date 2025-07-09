import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { User, GraduationCap, Mail, Calendar, Award, FileText, Loader2 } from 'lucide-react';

interface Student {
  id: string;
  status: string | null;
  final_grade: number | null;
  observations: string | null;
  enrollment_date: string;
  completion_date: string | null;
  user: {
    id: string;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

interface StudentListProps {
  courseId: string;
}

export default function StudentList({ courseId }: StudentListProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, [courseId]);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          id,
          status,
          final_grade,
          observations,
          enrollment_date,
          completion_date,
          user:users!enrollments_user_id_fkey(
            id, 
            name, 
            first_name, 
            last_name, 
            email
          )
        `)
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('enrollment_date', { ascending: false });

      if (enrollmentsError) {
        throw enrollmentsError;
      }

      setStudents(enrollmentsData || []);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  const getStudentDisplayName = (student: Student) => {
    const { user } = student;
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.name || user.email;
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'Aprobado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Reprobado':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Oyente':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'En Progreso':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600">Cargando estudiantes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="text-center py-12">
        <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay estudiantes matriculados</h3>
        <p className="mt-1 text-sm text-gray-500">
          Aún no hay estudiantes matriculados en este curso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Estudiantes Matriculados ({students.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {students.map((student) => (
            <div key={student.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-indigo-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getStudentDisplayName(student)}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-sm text-gray-500 flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {student.user.email}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          Matriculado: {new Date(student.enrollment_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {student.final_grade !== null && (
                    <div className="flex items-center space-x-1">
                      <Award className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium text-gray-900">
                        {student.final_grade}
                      </span>
                    </div>
                  )}
                  
                  {student.status && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(student.status)}`}>
                      {student.status}
                    </span>
                  )}
                </div>
              </div>
              
              {student.observations && (
                <div className="mt-3 pl-13">
                  <div className="bg-gray-50 rounded-md p-3">
                    <div className="flex items-start space-x-2">
                      <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">{student.observations}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {student.completion_date && (
                <div className="mt-2 pl-13">
                  <p className="text-xs text-gray-500">
                    Completado: {new Date(student.completion_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}