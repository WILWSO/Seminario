# Instrucciones para agregar la columna course_code a la tabla courses en Supabase

## ⚠️ IMPORTANTE: Si ya intentaste ejecutar la migración y obtuviste un error

Si recibiste el error:
```
ERROR: 23505: could not create unique index "unique_course_code"
DETAIL: Key (course_code)=() is duplicated.
```

Usa la **Opción de Solución de Problemas** al final de este documento.

## Opción 1: Usar el SQL Editor en Supabase Dashboard (RECOMENDADO)
1. Ve a tu proyecto de Supabase
2. Navega a SQL Editor
3. Copia y pega el siguiente SQL:

```sql
-- Add course_code column to courses table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'course_code'
  ) THEN
    -- Add the column without NOT NULL constraint first
    ALTER TABLE courses ADD COLUMN course_code VARCHAR(5);
    
    -- Update existing records with temporary unique codes using a subquery
    UPDATE courses 
    SET course_code = subquery.new_code
    FROM (
      SELECT id, 'TMP' || LPAD(ROW_NUMBER() OVER (ORDER BY id)::text, 2, '0') as new_code
      FROM courses
      WHERE course_code IS NULL
    ) AS subquery
    WHERE courses.id = subquery.id;
    
    -- Now add the NOT NULL constraint
    ALTER TABLE courses ALTER COLUMN course_code SET NOT NULL;
    
    -- Add unique constraint to prevent duplicate course codes
    ALTER TABLE courses ADD CONSTRAINT unique_course_code UNIQUE (course_code);
    
    -- Add check constraint to ensure course_code length is between 2 and 5 characters
    ALTER TABLE courses ADD CONSTRAINT check_course_code_length 
    CHECK (LENGTH(course_code) >= 2 AND LENGTH(course_code) <= 5);
    
    -- Add comment to the column
    COMMENT ON COLUMN courses.course_code IS 'Unique course code (2-5 alphanumeric characters)';
    
    RAISE NOTICE 'Column course_code added to courses table with constraints';
    RAISE NOTICE 'Existing courses have been assigned temporary codes (TMP01, TMP02, etc.)';
    RAISE NOTICE 'Please update these codes to meaningful values through the admin interface';
  ELSE
    RAISE NOTICE 'Column course_code already exists in courses table';
  END IF;
END $$;
```

## Opción 2: Usar Supabase CLI
Si tienes Supabase CLI instalado, puedes ejecutar:

```bash
supabase migration new add_course_code_column
```

Luego copia el contenido del archivo SQL creado en la carpeta migrations.

## Opción 3: Migración manual simple
Si prefieres una migración más simple sin verificaciones:

```sql
ALTER TABLE courses ADD COLUMN course_code VARCHAR(5) NOT NULL DEFAULT '';
ALTER TABLE courses ADD CONSTRAINT unique_course_code UNIQUE (course_code);
ALTER TABLE courses ADD CONSTRAINT check_course_code_length 
CHECK (LENGTH(course_code) >= 2 AND LENGTH(course_code) <= 5);
```

## 🔧 Opción de Solución de Problemas: Si ya obtuviste el error de duplicación

Si ya intentaste ejecutar la migración y obtuviste el error de duplicación, usa este script para limpiar y empezar de nuevo:

```sql
-- Alternative migration to fix the course_code column issue
-- Use this if you need to clean up and start fresh

-- First, remove the column if it exists with issues
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'course_code'
  ) THEN
    -- Drop constraints if they exist
    ALTER TABLE courses DROP CONSTRAINT IF EXISTS unique_course_code;
    ALTER TABLE courses DROP CONSTRAINT IF EXISTS check_course_code_length;
    
    -- Drop the column
    ALTER TABLE courses DROP COLUMN course_code;
    
    RAISE NOTICE 'Existing course_code column and constraints removed';
  END IF;
END $$;

-- Now add the column properly
DO $$
BEGIN
  -- Add the column without NOT NULL constraint first
  ALTER TABLE courses ADD COLUMN course_code VARCHAR(5);
  
  -- Update existing records with temporary unique codes using a subquery
  UPDATE courses 
  SET course_code = subquery.new_code
  FROM (
    SELECT id, 'TMP' || LPAD(ROW_NUMBER() OVER (ORDER BY id)::text, 2, '0') as new_code
    FROM courses
    WHERE course_code IS NULL
  ) AS subquery
  WHERE courses.id = subquery.id;
  
  -- Now add the NOT NULL constraint
  ALTER TABLE courses ALTER COLUMN course_code SET NOT NULL;
  
  -- Add unique constraint to prevent duplicate course codes
  ALTER TABLE courses ADD CONSTRAINT unique_course_code UNIQUE (course_code);
  
  -- Add check constraint to ensure course_code length is between 2 and 5 characters
  ALTER TABLE courses ADD CONSTRAINT check_course_code_length 
  CHECK (LENGTH(course_code) >= 2 AND LENGTH(course_code) <= 5);
  
  -- Add comment to the column
  COMMENT ON COLUMN courses.course_code IS 'Unique course code (2-5 alphanumeric characters)';
  
  RAISE NOTICE 'Column course_code added successfully with constraints';
  RAISE NOTICE 'Existing courses have been assigned temporary codes (TMP01, TMP02, etc.)';
  RAISE NOTICE 'Please update these codes to meaningful values through the admin interface';
END $$;
```

## Verificación
Después de ejecutar cualquiera de las migraciones, puedes verificar que la columna se agregó correctamente:

```sql
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'courses' AND column_name = 'course_code';
```

También puedes verificar que los cursos existentes tienen códigos temporales:

```sql
SELECT id, name, course_code FROM courses ORDER BY id;
```

## Notas importantes después de la migración
- Si ya tenías cursos en la tabla, ahora tendrán códigos temporales como TMP01, TMP02, etc.
- Debes actualizar estos códigos a valores significativos usando la interfaz de administración
- Todos los códigos deben ser únicos y tener entre 2 y 5 caracteres
- Los códigos se convertirán automáticamente a mayúsculas en la interfaz
