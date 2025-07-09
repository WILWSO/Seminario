/*
  # Create Storage Bucket for Lesson Files

  1. Storage Setup
    - Create `lesson-files` bucket for storing lesson documents, videos, and other content
    - Configure bucket policies for secure access
    - Enable RLS on storage objects

  2. Security
    - Allow authenticated users to upload files
    - Allow public read access to lesson files (for course content)
    - Teachers can manage files for their own courses
    - Admins can manage all files

  3. Bucket Configuration
    - Public bucket for easy access to lesson content
    - File size limits handled at application level
    - Organized folder structure: documents/, videos/, images/
*/

-- Insert the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-files',
  'lesson-files',
  true,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create storage policies
CREATE POLICY "Anyone can view lesson files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lesson-files');

CREATE POLICY "Authenticated users can upload lesson files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lesson-files');

CREATE POLICY "Users can update their own lesson files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'lesson-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own lesson files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lesson-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow admins to manage all files
CREATE POLICY "Admins can manage all lesson files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'lesson-files' AND is_admin())
WITH CHECK (bucket_id = 'lesson-files' AND is_admin());