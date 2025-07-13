export interface LessonContent {
  id: string;
  type: string;
  title: string;
  description?: string;
  content_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  order: number;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  type: string;
  content_url?: string;
  duration?: string;
  order: number;
  completed: boolean;
  file_name?: string;
  contents: LessonContent[];
}

export interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  name: string;
  description: string;
  teacher_name: string;
  course_code?: string;
  credits: number;
  image_url: string;
  syllabus_url?: string;
  modules: Module[];
}
