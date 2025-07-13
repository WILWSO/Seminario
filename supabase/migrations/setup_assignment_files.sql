-- Configuración completa del bucket assignment-files para subida de archivos de evaluaciones

-- 1. Crear el bucket (si no existe)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignment-files',
  'assignment-files',
  false,
  52428800, -- 50MB en bytes
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Política para que los estudiantes puedan subir archivos a sus propias carpetas
CREATE POLICY "Students can upload files to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assignment-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Política para que los estudiantes puedan ver y descargar sus propios archivos
CREATE POLICY "Students can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'assignment-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Política para que los estudiantes puedan eliminar sus propios archivos
CREATE POLICY "Students can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'assignment-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Política para que los profesores puedan ver archivos de evaluaciones de sus cursos
CREATE POLICY "Teachers can view assignment files from their courses"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'assignment-files' AND
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN courses c ON a.course_id = c.id
    WHERE c.teacher_id = auth.uid()
    AND a.id = (storage.foldername(name))[2]
  )
);

-- 6. Política para que los administradores puedan ver todos los archivos
CREATE POLICY "Admins can view all assignment files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'assignment-files' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- 7. Comentarios para documentar la estructura
COMMENT ON POLICY "Students can upload files to own folder" ON storage.objects IS 
'Permite a los estudiantes subir archivos a su propia carpeta: {student_id}/{assignment_id}/{filename}';

COMMENT ON POLICY "Students can view own files" ON storage.objects IS 
'Permite a los estudiantes ver y descargar sus propios archivos de evaluaciones';

COMMENT ON POLICY "Teachers can view assignment files from their courses" ON storage.objects IS 
'Permite a los profesores ver archivos de evaluaciones de sus cursos';

-- Verificar que las políticas se crearon correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%assignment%';

-- Verificar que el bucket se creó correctamente
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'assignment-files';
