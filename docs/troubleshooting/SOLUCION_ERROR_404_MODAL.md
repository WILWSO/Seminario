# Solución para el Error 404 en el Modal de Preguntas

## Problema
El modal de creación de preguntas genera un error 404 porque falta el campo `correct_answers` en la tabla `assignment_questions` de la base de datos.

## Solución

### Paso 1: Ejecutar la migración de base de datos

1. **Acceder a Supabase Dashboard**
   - Ir a [supabase.com](https://supabase.com)
   - Iniciar sesión y seleccionar el proyecto

2. **Ejecutar la migración SQL**
   - Ir a la sección "SQL Editor"
   - Ejecutar el siguiente código SQL:

```sql
-- Agregar campo correct_answers a la tabla assignment_questions
ALTER TABLE assignment_questions 
ADD COLUMN IF NOT EXISTS correct_answers INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- Comentario para documentación
COMMENT ON COLUMN assignment_questions.correct_answers IS 'Índices de las respuestas correctas para preguntas de opción múltiple';

-- Verificar que el campo se agregó correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'assignment_questions'
ORDER BY ordinal_position;
```

3. **Verificar la estructura de la tabla**
   - Después de ejecutar la migración, verificar que la tabla `assignment_questions` tenga los siguientes campos:
     - `id` (UUID)
     - `assignment_id` (UUID)
     - `question_text` (TEXT)
     - `question_type` (VARCHAR)
     - `options` (TEXT[])
     - `correct_answers` (INTEGER[]) ← **Este es el campo que faltaba**
     - `is_required` (BOOLEAN)
     - `max_points` (INTEGER)
     - `order_number` (INTEGER)
     - `created_at` (TIMESTAMP)
     - `updated_at` (TIMESTAMP)

### Paso 2: Verificar las políticas RLS (Row Level Security)

Las políticas ya están configuradas correctamente, pero si hay problemas de permisos, ejecutar:

```sql
-- Verificar que las políticas estén activas
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'assignment_questions';

-- Si rowsecurity es false, activar RLS
ALTER TABLE assignment_questions ENABLE ROW LEVEL SECURITY;
```

### Paso 3: Probar la funcionalidad

1. **Crear una evaluación de tipo "Formulario Interno"**
   - Ir a la página de gestión de evaluaciones
   - Crear una nueva evaluación
   - Seleccionar tipo "Formulario interno"

2. **Abrir el modal de preguntas**
   - Buscar el botón violeta con icono de signo de pregunta
   - Hacer clic para abrir el modal

3. **Crear preguntas de prueba**
   - Agregar una pregunta de texto
   - Agregar una pregunta de opción múltiple
   - Marcar respuestas correctas
   - Guardar las preguntas

## Archivos modificados

1. **`src/components/CreateAssignmentQuestionsModal.tsx`**
   - Mejorado el manejo de errores
   - Agregados logs detallados para debugging
   - Mejor validación de datos

2. **`src/pages/teacher/ManageAssignments.tsx`**
   - Agregado botón para abrir el modal
   - Integración del modal con la página existente

3. **`supabase/migrations/20250712000000_add_correct_answers_to_assignment_questions.sql`**
   - Migración para agregar el campo `correct_answers`

4. **`supabase/execute_correct_answers_migration.sql`**
   - Script SQL para ejecutar directamente en Supabase

## Logs de debugging

El modal ahora incluye logs detallados que aparecerán en la consola del navegador:
- Información sobre la consulta de la evaluación
- Datos de las preguntas existentes
- Proceso de guardado paso a paso
- Errores específicos con mensajes descriptivos

Para ver los logs:
1. Abrir las herramientas de desarrollador del navegador (F12)
2. Ir a la pestaña "Console"
3. Intentar usar el modal y observar los mensajes

## Notas importantes

- **Backup**: Siempre hacer backup de la base de datos antes de ejecutar migraciones
- **Permisos**: Verificar que el usuario tenga permisos para crear evaluaciones y preguntas
- **Navegadores**: Probar en diferentes navegadores si persisten los problemas
- **Cache**: Limpiar cache del navegador si hay problemas de carga

## Solución de problemas adicionales

### Si el modal no se abre:
1. Verificar que la evaluación sea de tipo "form" (no "external_form" o "file_upload")
2. Revisar la consola del navegador para errores JavaScript
3. Verificar que el usuario tenga permisos de profesor

### Si las preguntas no se guardan:
1. Verificar que la migración se ejecutó correctamente
2. Comprobar las políticas RLS
3. Revisar los logs en la consola del navegador

### Si aparecen errores de permisos:
1. Verificar que el usuario esté logueado como profesor
2. Confirmar que el profesor es dueño del curso
3. Revisar las políticas de seguridad en Supabase
