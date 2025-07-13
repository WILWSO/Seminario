import { supabase } from '../config/supabase';

export interface FormExport {
  id: string;
  title: string;
  description: string;
  assignment_type: string;
  course_name: string;
  created_at: string;
  questions: FormQuestion[];
  metadata: {
    total_questions: number;
    total_points: number;
    question_types: string[];
    created_by: string;
    export_date: string;
    version: string;
  };
}

export interface FormQuestion {
  id: string;
  question_text: string;
  question_type: 'text' | 'multiple_choice' | 'essay';
  options: string[];
  correct_answers: number[];
  is_required: boolean;
  max_points: number;
  order_number: number;
}

export interface ImportResult {
  success: boolean;
  message: string;
  questionsImported?: number;
  errors?: string[];
}

class FormStorageService {
  private readonly BUCKET_NAME = 'assignment-forms';

  async ensureBucketExists(): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list('', { limit: 1 });

      if (error && error.message.includes('Bucket not found')) {
        // Create bucket if it doesn't exist
        const { error: createError } = await supabase.storage
          .createBucket(this.BUCKET_NAME, {
            public: false,
            allowedMimeTypes: ['application/json'],
            fileSizeLimit: 5242880 // 5MB
          });

        if (createError) {
          throw new Error(`Failed to create storage bucket: ${createError.message}`);
        }
      }
    } catch (error) {
      console.error('Storage bucket check failed:', error);
      throw new Error('Storage not available. Please try again later.');
    }
  }

  async exportForm(assignmentId: string): Promise<{ downloadUrl: string; fileName: string }> {
    try {
      console.log('Exporting form for assignment:', assignmentId);
      
      // Ensure bucket exists
      await this.ensureBucketExists();

      // Fetch assignment data
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          *,
          course:courses(name, teacher_id)
        `)
        .eq('id', assignmentId)
        .single();

      if (assignmentError) throw assignmentError;

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('assignment_questions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('order_number', { ascending: true });

      if (questionsError) throw questionsError;

      // Process questions
      const questions: FormQuestion[] = (questionsData || []).map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options || [],
        correct_answers: q.correct_answers || [],
        is_required: q.is_required,
        max_points: q.max_points,
        order_number: q.order_number
      }));

      // Create export object
      const formExport: FormExport = {
        id: assignmentData.id,
        title: assignmentData.title,
        description: assignmentData.description || '',
        assignment_type: assignmentData.assignment_type,
        course_name: assignmentData.course?.name || 'Unknown Course',
        created_at: assignmentData.created_at,
        questions,
        metadata: {
          total_questions: questions.length,
          total_points: questions.reduce((sum, q) => sum + q.max_points, 0),
          question_types: [...new Set(questions.map(q => q.question_type))],
          created_by: assignmentData.course?.teacher_id || 'unknown',
          export_date: new Date().toISOString(),
          version: '1.0'
        }
      };

      // Generate file name
      const fileName = `form-${assignmentData.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.json`;
      const filePath = `exports/${fileName}`;

      // Convert to JSON
      const jsonContent = JSON.stringify(formExport, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get download URL
      const { data: urlData } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (!urlData?.signedUrl) {
        throw new Error('Failed to generate download URL');
      }

      console.log('Form exported successfully:', fileName);
      return {
        downloadUrl: urlData.signedUrl,
        fileName
      };

    } catch (error) {
      console.error('Error exporting form:', error);
      throw new Error(`Failed to export form: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async importForm(file: File, targetAssignmentId: string): Promise<ImportResult> {
    try {
      console.log('Importing form from file:', file.name);

      // Validate file type
      if (!file.type.includes('json')) {
        throw new Error('Invalid file type. Please select a JSON file.');
      }

      // Read file content
      const fileContent = await file.text();
      let formData: FormExport;

      try {
        formData = JSON.parse(fileContent);
      } catch (error) {
        throw new Error('Invalid JSON format. Please check the file.');
      }

      // Validate form data structure
      if (!formData.questions || !Array.isArray(formData.questions)) {
        throw new Error('Invalid form data structure. Missing questions array.');
      }

      // Validate questions
      const validationErrors: string[] = [];
      formData.questions.forEach((question, index) => {
        if (!question.question_text?.trim()) {
          validationErrors.push(`Question ${index + 1}: Missing question text`);
        }
        if (!['text', 'multiple_choice', 'essay'].includes(question.question_type)) {
          validationErrors.push(`Question ${index + 1}: Invalid question type`);
        }
        if (question.question_type === 'multiple_choice' && (!question.options || question.options.length < 2)) {
          validationErrors.push(`Question ${index + 1}: Multiple choice questions need at least 2 options`);
        }
      });

      if (validationErrors.length > 0) {
        return {
          success: false,
          message: 'Form validation failed',
          errors: validationErrors
        };
      }

      // Delete existing questions
      const { error: deleteError } = await supabase
        .from('assignment_questions')
        .delete()
        .eq('assignment_id', targetAssignmentId);

      if (deleteError) throw deleteError;

      // Insert imported questions
      const questionsToInsert = formData.questions.map((question, index) => ({
        assignment_id: targetAssignmentId,
        question_text: question.question_text,
        question_type: question.question_type,
        options: question.question_type === 'multiple_choice' ? question.options : null,
        correct_answers: question.question_type === 'multiple_choice' ? question.correct_answers : null,
        is_required: question.is_required,
        max_points: question.max_points,
        order_number: index
      }));

      const { error: insertError } = await supabase
        .from('assignment_questions')
        .insert(questionsToInsert);

      if (insertError) throw insertError;

      console.log('Form imported successfully:', formData.questions.length, 'questions');
      return {
        success: true,
        message: 'Form imported successfully',
        questionsImported: formData.questions.length
      };

    } catch (error) {
      console.error('Error importing form:', error);
      return {
        success: false,
        message: `Failed to import form: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async listFormBackups(): Promise<{ name: string; created_at: string; size: number }[]> {
    try {
      await this.ensureBucketExists();

      const { data: files, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list('exports', {
          limit: 100,
          offset: 0
        });

      if (error) throw error;

      return (files || [])
        .filter(file => file.name.endsWith('.json'))
        .map(file => ({
          name: file.name,
          created_at: file.created_at || '',
          size: file.metadata?.size || 0
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    } catch (error) {
      console.error('Error listing form backups:', error);
      throw new Error('Failed to list form backups');
    }
  }

  async deleteFormBackup(fileName: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([`exports/${fileName}`]);

      if (error) throw error;

      console.log('Form backup deleted:', fileName);
    } catch (error) {
      console.error('Error deleting form backup:', error);
      throw new Error('Failed to delete form backup');
    }
  }
}

export const formStorageService = new FormStorageService();
export default formStorageService;
