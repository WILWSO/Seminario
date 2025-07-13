# Políticas de Eliminación en Cascada - Supabase

## Resumen de Cambios

Se ha estandarizado la configuración de foreign keys en la base de datos para garantizar la integridad referencial y prevenir eliminaciones accidentales.

## Políticas Implementadas

### 1. ON DELETE CASCADE (Eliminación Automática)
Cuando se elimina un usuario, estos datos se eliminan automáticamente:

#### Para Estudiantes:
- ✅ **Matrículas** (`enrollments.user_id`)
- ✅ **Entregas de tareas** (`assignment_submissions.student_id`)
- ✅ **Calificaciones** (`evaluation_scores.student_id`)
- ✅ **Progreso de aprendizaje** (`progress.user_id`)

#### Para Cursos:
- ✅ **Módulos** (`modules.course_id`)
- ✅ **Tareas** (`assignments.course_id`)

#### Para Módulos:
- ✅ **Lecciones** (`lessons.module_id`)

#### Para Lecciones:
- ✅ **Progreso** (`progress.lesson_id`)

### 2. ON DELETE SET NULL (Preservar Registro)
Estos campos se limpian pero los registros se mantienen:

- 🔄 **Calificador de entregas** (`assignment_submissions.graded_by`)
- 🔄 **Calificador de evaluaciones** (`evaluation_scores.graded_by`)
- 🔄 **Creador de anuncios** (`announcements.created_by`)

### 3. ON DELETE RESTRICT (Prevenir Eliminación)
Estas relaciones impiden la eliminación del usuario:

- ❌ **Profesor con cursos activos** (`courses.teacher_id`)

## Comportamiento en ManageUsers.tsx

### Advertencias Automáticas
El componente ahora muestra advertencias precisas basadas en la configuración real:

#### Para Estudiantes:
- Muestra número de matrículas, entregas y calificaciones que se eliminarán
- Indica que el progreso de aprendizaje se perderá

#### Para Profesores:
- **BLOQUEA** la eliminación si tiene cursos activos
- Muestra mensaje específico sobre reasignación de cursos
- Indica que las calificaciones asignadas se mantendrán

#### Para Administradores:
- **BLOQUEA** la eliminación del único administrador
- Requiere asignar el rol a otro usuario primero

### Indicadores Visuales
- 🔺 **Triángulo ámbar**: Indica vínculos que impiden eliminación
- 🔴 **Mensajes de error**: Explican por qué no se puede eliminar
- ⚠️ **Advertencias detalladas**: Listan todos los datos que se afectarán

## Aplicación de la Migración

### Comando SQL:
```sql
-- Ejecutar en Supabase SQL Editor
\i 20250712120000_standardize_foreign_keys_cascade.sql
```

### Verificación:
```sql
-- Ver todas las foreign keys relacionadas con users
SELECT * FROM check_foreign_key_constraints();
```

## Beneficios

### 1. Integridad de Datos
- Previene registros huérfanos
- Garantiza consistencia referencial
- Elimina datos dependientes automáticamente

### 2. Seguridad
- Impide eliminaciones accidentales críticas
- Preserva historial importante
- Protege contra pérdida de datos

### 3. Experiencia de Usuario
- Advertencias claras y específicas
- Información precisa sobre consecuencias
- Validaciones preventivas

### 4. Mantenimiento
- Configuración estándar y consistente
- Fácil comprensión de dependencias
- Comportamiento predecible

## Casos de Uso Comunes

### Eliminar un Estudiante
✅ **Permitido**: Se eliminan automáticamente matrículas, entregas, calificaciones y progreso

### Eliminar un Profesor
❌ **Bloqueado** si tiene cursos activos
✅ **Permitido** si no tiene cursos asignados

### Eliminar un Administrador
❌ **Bloqueado** si es el único administrador
✅ **Permitido** si hay otros administradores

### Eliminar un Curso
✅ **Permitido**: Se eliminan automáticamente módulos, lecciones, tareas y progreso

## Troubleshooting

### Error: "No se puede eliminar profesor con cursos activos"
**Solución**: Reasignar cursos a otro profesor antes de eliminar

### Error: "Este es el único administrador del sistema"
**Solución**: Asignar rol de administrador a otro usuario primero

### Error: "violates foreign key constraint"
**Solución**: Verificar que la migración se aplicó correctamente

## Comandos Útiles

### Verificar constraints actuales:
```sql
SELECT * FROM check_foreign_key_constraints();
```

### Ver usuarios con vínculos:
```sql
-- Estudiantes con matrículas
SELECT u.email, COUNT(e.id) as enrollments 
FROM users u 
LEFT JOIN enrollments e ON u.id = e.user_id 
WHERE u.role @> '["student"]' 
GROUP BY u.id, u.email;

-- Profesores con cursos
SELECT u.email, COUNT(c.id) as courses 
FROM users u 
LEFT JOIN courses c ON u.id = c.teacher_id 
WHERE u.role @> '["teacher"]' 
GROUP BY u.id, u.email;
```

## Notas Importantes

1. **Backup**: Siempre haz backup antes de aplicar la migración
2. **Testing**: Prueba en ambiente de desarrollo primero
3. **Rollback**: La migración incluye verificaciones para evitar errores
4. **Performance**: Se crearon índices para optimizar las eliminaciones
5. **Monitoring**: Revisa logs después de la aplicación

---

**Fecha de creación**: 12 de julio de 2025
**Versión**: 1.0
**Migración**: `20250712120000_standardize_foreign_keys_cascade.sql`
