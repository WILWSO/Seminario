/*
  # Crear bucket para archivos de evaluaciones

  1. Nuevo bucket 'assignment-files'
    - Almacenará archivos subidos por estudiantes
    - Configurado para archivos privados
    - Acceso controlado por RLS

  2. Políticas de seguridad
    - Estudiantes pueden subir archivos para sus propias evaluaciones
    - Profesores pueden ver archivos de sus cursos
    - Admins pueden gestionar todos los archivos

  3. Configuración del bucket
    - Archivos privados (no públicos)
    - Límite de tamaño configurado
    - Tipos de archivo permitidos
*/

-- Crear bucket para archivos de evaluaciones
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignment-files',
  'assignment-files',
  false, -- Archivos privados
  52428800, -- 50MB límite
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

-- Políticas de seguridad para el bucket assignment-files

-- Estudiantes pueden subir archivos para sus propias evaluaciones
CREATE POLICY "Students can upload files for their assignments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'assignment-files' AND
    -- Verificar que el archivo pertenece a una evaluación del estudiante
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Estudiantes pueden ver sus propios archivos
CREATE POLICY "Students can view their own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'assignment-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Estudiantes pueden actualizar sus propios archivos
CREATE POLICY "Students can update their own files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'assignment-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Profesores pueden ver archivos de evaluaciones de sus cursos
CREATE POLICY "Teachers can view assignment files from their courses" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'assignment-files' AND
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE c.teacher_id = auth.uid()
      AND (storage.foldername(name))[2] = a.id::text
    )
  );

-- Admins pueden gestionar todos los archivos
CREATE POLICY "Admins can manage all assignment files" ON storage.objects
  FOR ALL USING (
    bucket_id = 'assignment-files' AND
    public.is_admin()
  );

-- Comentario sobre la estructura de carpetas
-- Estructura: {student_id}/{assignment_id}/{filename}
-- Ejemplo: 123e4567-e89b-12d3-a456-426614174000/456e7890-e89b-12d3-a456-426614174111/ensayo.pdf
