import { BookOpen } from 'lucide-react';

const Logo = () => {
  return (
    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-300 to-primary-500 rounded-lg shadow-md">
      <BookOpen className="text-white" size={24} />
    </div>
  );
};

export default Logo;