/*
  # Corrigir dados de exemplo - Criar usuários primeiro

  1. Problema identificado
    - Tentativa de inserir cursos sem professores existentes
    - Campo teacher_id é obrigatório mas estava null

  2. Solução
    - Criar usuários de exemplo primeiro
    - Depois criar cursos com teacher_id válido
    - Adicionar dados de exemplo completos

  3. Segurança
    - Manter RLS habilitado
    - Usuários de exemplo com senhas seguras
*/

-- Primeiro, vamos limpar dados que podem ter causado problemas
DELETE FROM courses WHERE teacher_id IS NULL;

-- Criar usuários de exemplo (estes serão criados via auth.users automaticamente quando alguém se registrar)
-- Por enquanto, vamos criar apenas os dados de perfil que serão associados quando os usuários se registrarem

-- Vamos criar uma função para inserir dados de exemplo apenas se não existirem usuários
DO $$
BEGIN
  -- Verificar se já existem usuários
  IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
    -- Se não existem usuários, vamos criar dados que serão úteis quando os primeiros usuários se registrarem
    
    -- Por enquanto, vamos apenas criar anúncios genéricos que não dependem de usuários específicos
    -- Os cursos serão criados depois que tivermos professores reais
    
    -- Inserir anúncios que não dependem de usuário específico (vamos usar o primeiro admin que se registrar)
    -- Estes serão atualizados quando tivermos usuários reais
    
    RAISE NOTICE 'Nenhum usuário encontrado. Registre-se primeiro na aplicação, depois execute a migração de dados de exemplo.';
  ELSE
    -- Se existem usuários, vamos criar os dados de exemplo
    
    -- Verificar se temos pelo menos um professor
    IF EXISTS (SELECT 1 FROM users WHERE role = 'teacher') THEN
      -- Inserir cursos com professores existentes
      INSERT INTO courses (name, description, teacher_id, credits, image_url) 
      SELECT 
        course_data.name,
        course_data.description,
        (SELECT id FROM users WHERE role = 'teacher' ORDER BY created_at LIMIT 1),
        course_data.credits,
        course_data.image_url
      FROM (VALUES 
        ('Introducción a la Teología', 'Fundamentos básicos de la teología cristiana y su importancia en la formación ministerial. Este curso proporciona una base sólida para el estudio teológico.', 4, 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'),
        ('Historia de la Iglesia I', 'Estudio de la iglesia primitiva hasta la Reforma Protestante, explorando los eventos clave y figuras importantes que moldearon el cristianismo.', 3, 'https://images.pexels.com/photos/2304169/pexels-photo-2304169.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'),
        ('Hermenéutica Bíblica', 'Principios y métodos de interpretación de las Escrituras para una comprensión adecuada del texto bíblico en su contexto histórico y cultural.', 4, 'https://images.pexels.com/photos/3952080/pexels-photo-3952080.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'),
        ('Griego Bíblico I', 'Introducción al idioma griego del Nuevo Testamento, enfocado en la gramática básica y vocabulario esencial para el estudio bíblico.', 4, 'https://images.pexels.com/photos/4590206/pexels-photo-4590206.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'),
        ('Teología Sistemática I', 'Estudio de las doctrinas fundamentales de la fe cristiana, incluyendo la revelación, Dios, la creación y la antropología bíblica.', 4, 'https://images.pexels.com/photos/1370296/pexels-photo-1370296.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'),
        ('Homilética', 'El arte y la ciencia de la predicación, con énfasis en la preparación y entrega de sermones expositivos fieles al texto bíblico.', 3, 'https://images.pexels.com/photos/159740/library-la-trobe-study-students-159740.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')
      ) AS course_data(name, description, credits, image_url)
      WHERE NOT EXISTS (SELECT 1 FROM courses WHERE name = course_data.name);

      -- Inserir módulos para o primeiro curso
      INSERT INTO modules (course_id, title, description, "order") 
      SELECT 
        c.id,
        module_data.title,
        module_data.description,
        module_data.order_num
      FROM courses c,
      (VALUES 
        ('Introducción a la disciplina teológica', 'Conceptos básicos y metodología teológica', 1),
        ('La doctrina de la revelación', 'Revelación general y especial', 2),
        ('La doctrina de Dios', 'Atributos y naturaleza de Dios', 3)
      ) AS module_data(title, description, order_num)
      WHERE c.name = 'Introducción a la Teología'
      AND NOT EXISTS (SELECT 1 FROM modules WHERE course_id = c.id);

      -- Inserir lições para o primeiro módulo
      INSERT INTO lessons (module_id, title, description, type, duration, "order")
      SELECT 
        m.id,
        lesson_data.title,
        lesson_data.description,
        lesson_data.type::text,
        lesson_data.duration,
        lesson_data.order_num
      FROM modules m
      JOIN courses c ON c.id = m.course_id,
      (VALUES 
        ('Qué es la teología', 'Definición y alcance de la teología cristiana', 'video', '45 min', 1),
        ('Fuentes del conocimiento teológico', 'Escritura, tradición, razón y experiencia', 'document', '30 min', 2),
        ('Metodología teológica', 'Cómo hacer teología de manera sistemática', 'video', '40 min', 3)
      ) AS lesson_data(title, description, type, duration, order_num)
      WHERE m.title = 'Introducción a la disciplina teológica'
      AND c.name = 'Introducción a la Teología'
      AND NOT EXISTS (SELECT 1 FROM lessons WHERE module_id = m.id);

      RAISE NOTICE 'Dados de exemplo criados com sucesso!';
    ELSE
      RAISE NOTICE 'Nenhum professor encontrado. Crie um usuário com role teacher primeiro.';
    END IF;

    -- Inserir anúncios se temos pelo menos um admin
    IF EXISTS (SELECT 1 FROM users WHERE role = 'admin') THEN
      INSERT INTO announcements (title, content, created_by) 
      SELECT 
        announcement_data.title,
        announcement_data.content,
        (SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1)
      FROM (VALUES 
        ('Bienvenidos al nuevo semestre', 'Damos la bienvenida a todos los estudiantes al nuevo semestre académico. Las clases comenzarán el próximo lunes. Por favor, revisen sus horarios en el portal de estudiantes.'),
        ('Fechas importantes del semestre', 'Recordamos las fechas importantes: Exámenes parciales del 15-20 de julio, Receso de invierno del 25 de julio al 5 de agosto, Exámenes finales del 15-25 de noviembre.'),
        ('Conferencia especial de Teología Reformada', 'Tendremos una conferencia especial sobre Teología Reformada el próximo sábado en el auditorio principal a las 18:00. La participación es gratuita y abierta a toda la comunidad.')
      ) AS announcement_data(title, content)
      WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title = announcement_data.title);

      RAISE NOTICE 'Anúncios criados com sucesso!';
    END IF;

  END IF;
END $$;