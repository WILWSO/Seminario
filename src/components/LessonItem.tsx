import { memo } from 'react';
import { Check, Clock, ExternalLink, Video, FileText, LinkIcon, BookOpen } from 'lucide-react';
import { LessonContent } from '../types/course';

interface Lesson {
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

interface LessonItemProps {
  lesson: Lesson;
  isCompleted: boolean;
  onMarkComplete: (lessonId: string) => void;
  onContentClick: (content: LessonContent) => void;
}

const getContentIcon = (type: string) => {
  switch (type) {
    case 'video':
      return <Video size={16} className="text-red-500" />;
    case 'document':
      return <FileText size={16} className="text-blue-500" />;
    case 'link':
      return <LinkIcon size={16} className="text-green-500" />;
    case 'lesson':
      return <BookOpen size={16} className="text-purple-500" />;
    default:
      return <FileText size={16} className="text-gray-500" />;
  }
};

const LessonItem = memo(({ lesson, isCompleted, onMarkComplete, onContentClick }: LessonItemProps) => {
  return (
    <div className="ml-4 border-l-2 border-slate-200 dark:border-slate-600 pl-4 pb-4 last:pb-0">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            {isCompleted ? (
              <Check size={16} className="text-green-500 mr-2" />
            ) : (
              <Clock size={16} className="text-slate-400 mr-2" />
            )}
            <h5 className="font-medium text-slate-800 dark:text-white">
              {lesson.title}
            </h5>
            {lesson.duration && (
              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                {lesson.duration}
              </span>
            )}
          </div>
          {lesson.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              {lesson.description}
            </p>
          )}
          
          {/* Lesson Contents */}
          {lesson.contents && lesson.contents.length > 0 && (
            <div className="space-y-2 mb-3">
              {lesson.contents.map((content) => (
                <div
                  key={content.id}
                  className="flex items-center p-2 bg-slate-50 dark:bg-slate-700 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition"
                  onClick={() => onContentClick(content)}
                >
                  {getContentIcon(content.type)}
                  <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">
                    {content.title}
                  </span>
                  {content.type === 'link' && (
                    <ExternalLink size={12} className="ml-auto text-slate-400" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center ml-4">
          {!isCompleted && (
            <button
              onClick={() => onMarkComplete(lesson.id)}
              className="px-3 py-1 text-xs bg-sky-600 text-white rounded hover:bg-sky-700 transition"
            >
              Marcar como completada
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

LessonItem.displayName = 'LessonItem';

export default LessonItem;
