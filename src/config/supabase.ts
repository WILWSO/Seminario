import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'Present' : 'Missing',
    key: supabaseAnonKey ? 'Present' : 'Missing'
  });
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Validate URL format
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  console.error('Invalid Supabase URL format:', supabaseUrl);
  throw new Error('Invalid Supabase URL format. Expected format: https://your-project.supabase.co');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  }
});

// Test connection on initialization
supabase.auth.getSession().catch(error => {
  console.error('Supabase connection test failed:', error);
});

// Database types
export interface User {
  id: string;
  name?: string;
  first_name: string;
  last_name: string;
  email: string;
  role: ('student' | 'teacher' | 'admin')[];
  document_type: 'dni' | 'passport' | 'cedula' | 'other';
  document_number: string;
  profile_photo_url?: string;
  whatsapp?: string;
  social_networks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  street_address: string;
  street_number: string;
  locality: string;
  department: string;
  province: string;
  postal_code: string;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  teacher_id: string;
  credits: number;
  image_url?: string;
  syllabus_url?: string;
  is_active: boolean;
  created_at: string;
  teacher?: User;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order: number;
  created_at: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description?: string;
  type: 'video' | 'document' | 'quiz';
  content_url?: string;
  duration?: string;
  order: number;
  created_at: string;
  completed?: boolean;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrollment_date: string;
  is_active: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  author?: User;
}