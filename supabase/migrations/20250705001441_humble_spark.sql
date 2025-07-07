-- Insert sample data for SEMBRAR Seminary

-- First, we need to create some sample users
-- Note: These will be created through the auth system, but we'll prepare the profile data

-- Sample courses data
INSERT INTO courses (name, description, teacher_id, credits, image_url) VALUES
('Introducción a la Teología', 'Fundamentos básicos de la teología cristiana y su importancia en la formación ministerial. Este curso proporciona una base sólida para el estudio teológico.', (SELECT id FROM users WHERE role = 'teacher' LIMIT 1), 4, 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'),
('Historia de la Iglesia I', 'Estudio de la iglesia primitiva hasta la Reforma Protestante, explorando los eventos clave y figuras importantes que moldearon el cristianismo.', (SELECT id FROM users WHERE role = 'teacher' LIMIT 1), 3, 'https://images.pexels.com/photos/2304169/pexels-photo-2304169.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'),
('Hermenéutica Bíblica', 'Principios y métodos de interpretación de las Escrituras para una comprensión adecuada del texto bíblico en su contexto histórico y cultural.', (SELECT id FROM users WHERE role = 'teacher' LIMIT 1), 4, 'https://images.pexels.com/photos/3952080/pexels-photo-3952080.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'),
('Griego Bíblico I', 'Introducción al idioma griego del Nuevo Testamento, enfocado en la gramática básica y vocabulario esencial para el estudio bíblico.', (SELECT id FROM users WHERE role = 'teacher' LIMIT 1), 4, 'https://images.pexels.com/photos/4590206/pexels-photo-4590206.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'),
('Teología Sistemática I', 'Estudio de las doctrinas fundamentales de la fe cristiana, incluyendo la revelación, Dios, la creación y la antropología bíblica.', (SELECT id FROM users WHERE role = 'teacher' LIMIT 1), 4, 'https://images.pexels.com/photos/1370296/pexels-photo-1370296.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'),
('Homilética', 'El arte y la ciencia de la predicación, con énfasis en la preparación y entrega de sermones expositivos fieles al texto bíblico.', (SELECT id FROM users WHERE role = 'teacher' LIMIT 1), 3, 'https://images.pexels.com/photos/159740/library-la-trobe-study-students-159740.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2');

-- Sample modules for the first course (Introducción a la Teología)
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
WHERE c.name = 'Introducción a la Teología';

-- Sample lessons for the first module
INSERT INTO lessons (module_id, title, description, type, duration, "order")
SELECT 
  m.id,
  lesson_data.title,
  lesson_data.description,
  lesson_data.type::text,
  lesson_data.duration,
  lesson_data.order_num
FROM modules m,
(VALUES 
  ('Qué es la teología', 'Definición y alcance de la teología cristiana', 'video', '45 min', 1),
  ('Fuentes del conocimiento teológico', 'Escritura, tradición, razón y experiencia', 'document', '30 min', 2),
  ('Metodología teológica', 'Cómo hacer teología de manera sistemática', 'video', '40 min', 3)
) AS lesson_data(title, description, type, duration, order_num)
WHERE m.title = 'Introducción a la disciplina teológica';

-- Sample announcements
INSERT INTO announcements (title, content, created_by) 
SELECT 
  announcement_data.title,
  announcement_data.content,
  u.id
FROM users u,
(VALUES 
  ('Bienvenidos al nuevo semestre', 'Damos la bienvenida a todos los estudiantes al nuevo semestre académico. Las clases comenzarán el próximo lunes. Por favor, revisen sus horarios en el portal de estudiantes.'),
  ('Fechas importantes del semestre', 'Recordamos las fechas importantes: Exámenes parciales del 15-20 de julio, Receso de invierno del 25 de julio al 5 de agosto, Exámenes finales del 15-25 de noviembre.'),
  ('Conferencia especial de Teología Reformada', 'Tendremos una conferencia especial sobre Teología Reformada el próximo sábado en el auditorio principal a las 18:00. La participación es gratuita y abierta a toda la comunidad.')
) AS announcement_data(title, content)
WHERE u.role = 'admin'
LIMIT 1;

-- Sample assignments for courses
INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
  c.id,
  assignment_data.title,
  assignment_data.description,
  (CURRENT_DATE + INTERVAL '30 days')::timestamptz,
  assignment_data.max_score
FROM courses c,
(VALUES 
  ('Ensayo sobre la Doctrina de Dios', 'Escriba un ensayo de 1500 palabras sobre los atributos comunicables e incomunicables de Dios, basándose en las lecturas del curso.', 100),
  ('Examen parcial - Revelación', 'Examen sobre los temas de revelación general y especial cubiertos en las primeras semanas del curso.', 100),
  ('Trabajo práctico de hermenéutica', 'Aplique los principios hermenéuticos estudiados a un pasaje bíblico específico de su elección.', 100)
) AS assignment_data(title, description, max_score)
WHERE c.name IN ('Introducción a la Teología', 'Hermenéutica Bíblica')
LIMIT 3;