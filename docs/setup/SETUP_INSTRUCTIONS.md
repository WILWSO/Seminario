# 🔧 Instruções de Configuração do Supabase

## ⚠️ IMPORTANTE: Como executar as migrações

**NÃO** digite o nome do arquivo no SQL Editor. Você deve copiar e colar o CONTEÚDO dos arquivos.

## 📋 Passo a Passo

### ⚠️ ORDEM IMPORTANTE

1. **Primeiro**: Execute a migração de criação de tabelas
2. **Segundo**: Registre-se na aplicação (crie seu usuário)
3. **Terceiro**: Promova-se a admin
4. **Quarto**: Execute a migração de dados de exemplo (opcional)

### 1. Primeira Migração - Criar Tabelas

1. Abra o **SQL Editor** no painel do Supabase
2. Copie TODO o conteúdo abaixo e cole no SQL Editor:

```sql
-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 0,
  image_url text,
  syllabus_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create modules table
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('video', 'document', 'quiz')),
  content_url text,
  duration text,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrollment_date timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(user_id, course_id)
);

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date timestamptz,
  max_score numeric NOT NULL DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create grades table
CREATE TABLE IF NOT EXISTS grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  grade numeric NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, assignment_id)
);

-- Create completed_lessons table
CREATE TABLE IF NOT EXISTS completed_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Create a SECURITY DEFINER function to check admin role (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  DECLARE
    user_role text;
  BEGIN
    SELECT role INTO user_role FROM public.users WHERE id = auth.uid();
    RETURN user_role = 'admin';
  END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (public.is_admin());

-- Courses policies
CREATE POLICY "Anyone can read active courses" ON courses
  FOR SELECT USING (is_active = true);

CREATE POLICY "Teachers can manage own courses" ON courses
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Admins can manage all courses" ON courses
  FOR ALL USING (
    public.is_admin()
  );

-- Modules policies
CREATE POLICY "Anyone can read modules of active courses" ON modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE id = course_id AND is_active = true
    )
  );

CREATE POLICY "Teachers can manage modules of own courses" ON modules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE id = course_id AND teacher_id = auth.uid()
    )
  );

-- Lessons policies
CREATE POLICY "Anyone can read lessons of active courses" ON lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = module_id AND c.is_active = true
    )
  );

CREATE POLICY "Teachers can manage lessons of own courses" ON lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = module_id AND c.teacher_id = auth.uid()
    )
  );

-- Enrollments policies
CREATE POLICY "Students can read own enrollments" ON enrollments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Students can create own enrollments" ON enrollments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Teachers can read enrollments for own courses" ON enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE id = course_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all enrollments" ON enrollments
  FOR ALL USING (
    public.is_admin()
  );

-- Assignments policies
CREATE POLICY "Students can read assignments for enrolled courses" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments 
      WHERE course_id = assignments.course_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage assignments for own courses" ON assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE id = course_id AND teacher_id = auth.uid()
    )
  );

-- Grades policies
CREATE POLICY "Students can read own grades" ON grades
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teachers can manage grades for own courses" ON grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE id = course_id AND teacher_id = auth.uid()
    )
  );

-- Completed lessons policies
CREATE POLICY "Students can manage own completed lessons" ON completed_lessons
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Teachers can read completed lessons for own courses" ON completed_lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE l.id = lesson_id AND c.teacher_id = auth.uid()
    )
  );

-- Announcements policies
CREATE POLICY "Anyone can read announcements" ON announcements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage announcements" ON announcements
  FOR ALL USING (
    public.is_admin()
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON grades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

3. Clique em **"Run"** para executar

### 2. Registrar-se na Aplicação

1. Vá para a aplicação e clique em "Iniciar sesión"
2. Registre-se com seu email e senha
3. Após o registro, promova-se a admin no SQL Editor:

```sql
UPDATE users SET role = 'admin' WHERE email = 'SEU-EMAIL@EXEMPLO.COM';
```

### 3. Terceira Migração - Inserir Dados de Exemplo (OPCIONAL)

Após se registrar e se promover a admin, você pode adicionar dados de exemplo:

```sql
-- Primeiro, crie um usuário professor (se ainda não tiver)
UPDATE users SET role = 'teacher' WHERE email = 'professor@sembrar.edu.ar';
-- OU se você quiser ser professor também:
-- UPDATE users SET role = 'teacher' WHERE email = 'SEU-EMAIL@EXEMPLO.COM';

-- Agora execute a migração de dados de exemplo
-- (Cole o conteúdo do arquivo 20250705002000_fix_sample_data.sql)
```

## 🔧 Solução para o Erro teacher_id null

O erro aconteceu porque tentamos criar cursos sem ter professores. A solução:

1. **Primeiro**: Crie as tabelas
2. **Segundo**: Registre-se na aplicação  
3. **Terceiro**: Promova-se a admin E professor
4. **Quarto**: Execute a migração de dados de exemplo

## ✅ Verificação

Após executar as migrações, você deve ver as seguintes tabelas no Supabase:

- users
- courses  
- modules
- lessons
- enrollments
- assignments
- grades
- completed_lessons
- announcements

## 🚀 Próximos Passos

1. ✅ Execute a primeira migração (obrigatória)
2. ✅ Registre-se na aplicação
3. ✅ Promova-se a admin E professor
4. ✅ Execute a migração de dados de exemplo (opcional)
5. ✅ Comece a usar o sistema!

## ❓ Problemas?

Se encontrar algum erro:
1. Verifique se copiou TODO o conteúdo SQL
2. Certifique-se de que está no SQL Editor do Supabase
3. Verifique se as variáveis de ambiente estão configuradas
4. Entre em contato: ipamarcospaz@gmail.com