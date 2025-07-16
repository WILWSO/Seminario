# 🎓 Sistema de Gestión de Cursos por Períodos Académicos

## 📋 Resumen Ejecutivo

Este documento describe la implementación de un sistema completo de gestión de cursos por períodos académicos que permite:

- **Reutilizar cursos** a través de múltiples períodos
- **Mantener historial completo** de estudiantes y evaluaciones
- **Controlar la editabilidad** de cursos según inscripciones
- **Gestionar períodos académicos** de forma eficiente

## 🎯 Objetivos del Sistema

### Funcionalidades Principales:
1. **Gestión de Períodos**: Crear y gestionar períodos académicos (2025-1, 2025-2, Verano, etc.)
2. **Instancias de Cursos**: Un curso base puede tener múltiples instancias por período
3. **Control de Edición**: Restricciones automáticas cuando hay estudiantes inscritos
4. **Historial Completo**: Preservar todos los datos de períodos anteriores
5. **Cierre de Cursos**: Proceso controlado para finalizar períodos

## 🏗️ Arquitectura de Base de Datos

### 1. Nuevas Tablas Principales

#### **academic_periods**
```sql
CREATE TABLE academic_periods (
    id UUID PRIMARY KEY,
    name VARCHAR NOT NULL,                    -- "2025-1", "Verano 2025", etc.
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,          -- Solo un período activo
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### **course_instances**
```sql
CREATE TABLE course_instances (
    id UUID PRIMARY KEY,
    course_id UUID REFERENCES courses(id),           -- Curso plantilla
    period_id UUID REFERENCES academic_periods(id),  -- Período académico
    name VARCHAR NOT NULL,                           -- Nombre específico del período
    description TEXT,                                -- Descripción específica
    max_students INTEGER,
    status VARCHAR DEFAULT 'draft',                  -- draft, active, closed, completed
    start_date DATE,
    end_date DATE,
    is_editable BOOLEAN DEFAULT true,                -- Control automático de edición
    closed_at TIMESTAMP,
    closed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(course_id, period_id)                     -- Un curso por período
);
```

#### **course_instance_modules**
```sql
CREATE TABLE course_instance_modules (
    id UUID PRIMARY KEY,
    course_instance_id UUID REFERENCES course_instances(id),
    title VARCHAR NOT NULL,
    description TEXT,
    "order" INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### **course_instance_lessons**
```sql
CREATE TABLE course_instance_lessons (
    id UUID PRIMARY KEY,
    module_id UUID REFERENCES course_instance_modules(id),
    title VARCHAR NOT NULL,
    description TEXT,
    duration VARCHAR,
    "order" INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Modificaciones a Tablas Existentes

#### **courses** (tabla plantilla)
```sql
-- Agregar campo para indicar que es plantilla
ALTER TABLE courses ADD COLUMN is_template BOOLEAN DEFAULT true;

-- Los cursos se vuelven plantillas reutilizables
-- teacher_id se mantiene para definir el profesor por defecto
```

#### **enrollments** (cambio crítico)
```sql
-- Cambiar relación de courses a course_instances
ALTER TABLE enrollments DROP COLUMN course_id;
ALTER TABLE enrollments ADD COLUMN course_instance_id UUID REFERENCES course_instances(id);

-- Mantener campos existentes:
-- - user_id, status, final_grade, observations, completion_date
```

#### **evaluations** y **assignments**
```sql
-- Cambiar relación de courses a course_instances
ALTER TABLE assignments DROP COLUMN course_id;
ALTER TABLE assignments ADD COLUMN course_instance_id UUID REFERENCES course_instances(id);

-- Similar para otras tablas relacionadas con evaluaciones
```

### 3. Funciones y Triggers de Control

#### **Función de Control de Edición**
```sql
CREATE OR REPLACE FUNCTION can_edit_course_instance(instance_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM course_instances ci
        WHERE ci.id = instance_id 
        AND ci.is_editable = true
        AND ci.status IN ('draft', 'active')
    );
END;
$$ LANGUAGE plpgsql;
```

#### **Trigger Automático de Bloqueo**
```sql
CREATE OR REPLACE FUNCTION check_enrollments_before_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- Si hay estudiantes inscritos, hacer no editable
    IF EXISTS (
        SELECT 1 FROM enrollments 
        WHERE course_instance_id = NEW.id
    ) THEN
        NEW.is_editable = false;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enrollments_check_trigger
    BEFORE UPDATE ON course_instances
    FOR EACH ROW
    EXECUTE FUNCTION check_enrollments_before_edit();
```

#### **Función de Cierre de Curso**
```sql
CREATE OR REPLACE FUNCTION close_course_instance(
    instance_id UUID,
    user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    instance_record course_instances%ROWTYPE;
    course_record courses%ROWTYPE;
BEGIN
    -- Verificar que el usuario es el profesor
    SELECT ci.*, c.* INTO instance_record, course_record
    FROM course_instances ci
    JOIN courses c ON ci.course_id = c.id
    WHERE ci.id = instance_id AND c.teacher_id = user_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Cerrar el curso
    UPDATE course_instances 
    SET status = 'completed',
        closed_at = NOW(),
        closed_by = user_id,
        is_editable = true  -- Vuelve a ser editable
    WHERE id = instance_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;
```

## 💻 Implementación Backend (TypeScript)

### 1. Interfaces y Tipos

```typescript
interface AcademicPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

interface CourseInstance {
  id: string;
  course_id: string;
  period_id: string;
  name: string;
  description: string;
  max_students: number;
  status: 'draft' | 'active' | 'closed' | 'completed';
  start_date: string;
  end_date: string;
  is_editable: boolean;
  closed_at?: string;
  closed_by?: string;
  created_at: string;
  updated_at: string;
}

interface CourseInstanceModule {
  id: string;
  course_instance_id: string;
  title: string;
  description: string;
  order: number;
  is_active: boolean;
  lessons: CourseInstanceLesson[];
}

interface CourseInstanceLesson {
  id: string;
  module_id: string;
  title: string;
  description: string;
  duration: string;
  order: number;
  is_active: boolean;
}
```

### 2. Servicios Principales

#### **CourseInstanceService**
```typescript
class CourseInstanceService {
  // Crear nueva instancia de curso para un período
  async createCourseInstance(courseId: string, periodId: string): Promise<CourseInstance> {
    // Verificar que no existe para este período
    const existing = await supabase
      .from('course_instances')
      .select()
      .eq('course_id', courseId)
      .eq('period_id', periodId)
      .single();
    
    if (existing.data) {
      throw new Error('El curso ya existe para este período');
    }
    
    // Crear instancia
    const { data, error } = await supabase
      .from('course_instances')
      .insert({
        course_id: courseId,
        period_id: periodId,
        status: 'draft'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Clonar módulos y lecciones del curso base
    await this.cloneModulesAndLessons(courseId, data.id);
    
    return data;
  }
  
  // Verificar si se puede editar
  async canEditCourseInstance(instanceId: string): Promise<boolean> {
    const { data } = await supabase
      .rpc('can_edit_course_instance', { instance_id: instanceId });
    
    return data;
  }
  
  // Cerrar curso (solo profesor)
  async closeCourseInstance(instanceId: string, teacherId: string): Promise<boolean> {
    const { data } = await supabase
      .rpc('close_course_instance', { 
        instance_id: instanceId, 
        user_id: teacherId 
      });
    
    return data;
  }
  
  // Clonar curso para nuevo período
  async cloneCourseForNewPeriod(instanceId: string, newPeriodId: string): Promise<CourseInstance> {
    // Implementar lógica de clonado
  }
  
  // Obtener historial de un curso
  async getCourseHistory(courseId: string): Promise<CourseInstance[]> {
    const { data, error } = await supabase
      .from('course_instances')
      .select(`
        *,
        period:academic_periods(*)
      `)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
  
  // Clonar módulos y lecciones privado
  private async cloneModulesAndLessons(courseId: string, instanceId: string): Promise<void> {
    // Obtener módulos del curso base
    const { data: modules } = await supabase
      .from('modules')
      .select('*, lessons(*)')
      .eq('course_id', courseId)
      .order('order');
    
    // Clonar cada módulo
    for (const module of modules || []) {
      const { data: newModule } = await supabase
        .from('course_instance_modules')
        .insert({
          course_instance_id: instanceId,
          title: module.title,
          description: module.description,
          order: module.order
        })
        .select()
        .single();
      
      // Clonar lecciones
      for (const lesson of module.lessons || []) {
        await supabase
          .from('course_instance_lessons')
          .insert({
            module_id: newModule.id,
            title: lesson.title,
            description: lesson.description,
            duration: lesson.duration,
            order: lesson.order
          });
      }
    }
  }
}
```

#### **PeriodManagementService**
```typescript
class PeriodManagementService {
  // Crear nuevo período
  async createPeriod(periodData: Omit<AcademicPeriod, 'id' | 'created_at'>): Promise<AcademicPeriod> {
    const { data, error } = await supabase
      .from('academic_periods')
      .insert(periodData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Activar período (solo uno activo)
  async activatePeriod(periodId: string): Promise<void> {
    // Desactivar todos los períodos
    await supabase
      .from('academic_periods')
      .update({ is_active: false })
      .neq('id', periodId);
    
    // Activar el período seleccionado
    await supabase
      .from('academic_periods')
      .update({ is_active: true })
      .eq('id', periodId);
  }
  
  // Obtener período activo
  async getActivePeriod(): Promise<AcademicPeriod | null> {
    const { data, error } = await supabase
      .from('academic_periods')
      .select()
      .eq('is_active', true)
      .single();
    
    if (error) return null;
    return data;
  }
  
  // Listar todos los períodos
  async getAllPeriods(): Promise<AcademicPeriod[]> {
    const { data, error } = await supabase
      .from('academic_periods')
      .select()
      .order('start_date', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}
```

## 🎨 Componentes Frontend

### 1. Gestión de Períodos

#### **PeriodManager.tsx**
```typescript
interface PeriodManagerProps {
  onPeriodChange?: (period: AcademicPeriod) => void;
}

const PeriodManager: React.FC<PeriodManagerProps> = ({ onPeriodChange }) => {
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const createNewPeriod = async (periodData: CreatePeriodData) => {
    try {
      const newPeriod = await periodService.createPeriod(periodData);
      setPeriods(prev => [newPeriod, ...prev]);
      setShowCreateForm(false);
      showSuccess('Período creado exitosamente');
    } catch (error) {
      showError('Error al crear período');
    }
  };
  
  const activatePeriod = async (periodId: string) => {
    try {
      await periodService.activatePeriod(periodId);
      setPeriods(prev => prev.map(p => ({
        ...p,
        is_active: p.id === periodId
      })));
      showSuccess('Período activado');
    } catch (error) {
      showError('Error al activar período');
    }
  };
  
  return (
    <div className="period-manager">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Gestión de Períodos Académicos</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Crear Período
        </button>
      </div>
      
      {showCreateForm && (
        <CreatePeriodForm
          onSubmit={createNewPeriod}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {periods.map(period => (
          <PeriodCard
            key={period.id}
            period={period}
            onActivate={activatePeriod}
            onEdit={editPeriod}
            onDelete={deletePeriod}
          />
        ))}
      </div>
    </div>
  );
};
```

### 2. Gestión de Instancias de Cursos

#### **CourseInstanceManager.tsx**
```typescript
const CourseInstanceManager: React.FC = () => {
  const [courseInstances, setCourseInstances] = useState<CourseInstance[]>([]);
  const [activePeriod, setActivePeriod] = useState<AcademicPeriod | null>(null);
  const [canEdit, setCanEdit] = useState<Record<string, boolean>>({});
  
  const checkEditPermission = async (instanceId: string) => {
    const canEdit = await courseInstanceService.canEditCourseInstance(instanceId);
    setCanEdit(prev => ({ ...prev, [instanceId]: canEdit }));
  };
  
  const closeCourse = async (instanceId: string) => {
    try {
      const success = await courseInstanceService.closeCourseInstance(instanceId, user.id);
      if (success) {
        showSuccess('Curso cerrado exitosamente');
        fetchCourseInstances();
      }
    } catch (error) {
      showError('Error al cerrar curso');
    }
  };
  
  const cloneCourseToNewPeriod = async (instanceId: string, newPeriodId: string) => {
    try {
      const newInstance = await courseInstanceService.cloneCourseForNewPeriod(instanceId, newPeriodId);
      showSuccess('Curso clonado exitosamente');
      fetchCourseInstances();
    } catch (error) {
      showError('Error al clonar curso');
    }
  };
  
  return (
    <div className="course-instance-manager">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Gestión de Cursos por Período</h2>
        <PeriodSelector
          selectedPeriod={activePeriod}
          onPeriodChange={setActivePeriod}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courseInstances.map(instance => (
          <CourseInstanceCard
            key={instance.id}
            instance={instance}
            canEdit={canEdit[instance.id]}
            onEdit={editCourseInstance}
            onClose={closeCourse}
            onClone={cloneCourseToNewPeriod}
            onCheckPermission={checkEditPermission}
          />
        ))}
      </div>
    </div>
  );
};
```

### 3. Componentes de Soporte

#### **CourseInstanceCard.tsx**
```typescript
interface CourseInstanceCardProps {
  instance: CourseInstance;
  canEdit: boolean;
  onEdit: (instance: CourseInstance) => void;
  onClose: (instanceId: string) => void;
  onClone: (instanceId: string, newPeriodId: string) => void;
  onCheckPermission: (instanceId: string) => void;
}

const CourseInstanceCard: React.FC<CourseInstanceCardProps> = ({
  instance,
  canEdit,
  onEdit,
  onClose,
  onClone,
  onCheckPermission
}) => {
  const [showCloneModal, setShowCloneModal] = useState(false);
  
  useEffect(() => {
    onCheckPermission(instance.id);
  }, [instance.id]);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold">{instance.name}</h3>
        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(instance.status)}`}>
          {instance.status}
        </span>
      </div>
      
      <p className="text-gray-600 mb-4">{instance.description}</p>
      
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {instance.max_students} estudiantes max
        </div>
        
        <div className="flex space-x-2">
          {canEdit && (
            <button
              onClick={() => onEdit(instance)}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              Editar
            </button>
          )}
          
          {instance.status === 'active' && (
            <button
              onClick={() => onClose(instance.id)}
              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
            >
              Cerrar
            </button>
          )}
          
          <button
            onClick={() => setShowCloneModal(true)}
            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
          >
            Clonar
          </button>
        </div>
      </div>
      
      {showCloneModal && (
        <CloneCourseModal
          instance={instance}
          onClone={onClone}
          onCancel={() => setShowCloneModal(false)}
        />
      )}
    </div>
  );
};
```

## 🔄 Flujo de Trabajo Completo

### 1. **Configuración Inicial**
```typescript
// Administrador crea períodos académicos
const period2025_1 = await periodService.createPeriod({
  name: '2025-1',
  start_date: '2025-02-01',
  end_date: '2025-06-30',
  is_active: true
});
```

### 2. **Creación de Instancias**
```typescript
// Profesor/Admin crea instancias de cursos para el período
const courseInstance = await courseInstanceService.createCourseInstance(
  'course-theology-101',
  period2025_1.id
);
```

### 3. **Gestión de Contenido**
```typescript
// Mientras no hay estudiantes: edición libre
const canEdit = await courseInstanceService.canEditCourseInstance(courseInstance.id);
// canEdit = true

// Profesor edita módulos y lecciones
await courseInstanceModuleService.updateModule(moduleId, moduleData);
```

### 4. **Inscripción de Estudiantes**
```typescript
// Primer estudiante se inscribe
await enrollmentService.enrollStudent(studentId, courseInstance.id);

// Automáticamente se bloquea la edición (trigger)
const canEditAfter = await courseInstanceService.canEditCourseInstance(courseInstance.id);
// canEditAfter = false (solo descripción editable)
```

### 5. **Desarrollo del Curso**
```typescript
// Estudiantes toman clases
await lessonService.markLessonComplete(studentId, lessonId);

// Evaluaciones y calificaciones
await evaluationService.gradeAssignment(submissionId, grade);
```

### 6. **Cierre del Curso**
```typescript
// Profesor cierra el curso al final del período
const closed = await courseInstanceService.closeCourseInstance(courseInstance.id, teacherId);

// El curso vuelve a ser editable para ajustes
const canEditAfterClose = await courseInstanceService.canEditCourseInstance(courseInstance.id);
// canEditAfterClose = true
```

### 7. **Nuevo Período**
```typescript
// Crear nuevo período
const period2025_2 = await periodService.createPeriod({
  name: '2025-2',
  start_date: '2025-07-01',
  end_date: '2025-12-15',
  is_active: true
});

// Clonar curso para nuevo período
const newInstance = await courseInstanceService.cloneCourseForNewPeriod(
  courseInstance.id,
  period2025_2.id
);
```

## 📊 Ventajas del Sistema

### **Para Instituciones**
- **Reutilización**: Un curso se configura una vez, se usa infinitas veces
- **Historial**: Datos completos de todos los períodos
- **Reportes**: Estadísticas por período, curso, estudiante
- **Escalabilidad**: Fácil agregar nuevos períodos

### **Para Profesores**
- **Eficiencia**: No recrear contenido cada semestre
- **Flexibilidad**: Adaptar curso para cada período
- **Control**: Cierre controlado de períodos
- **Historial**: Ver evolución del curso

### **Para Estudiantes**
- **Consistencia**: Experiencia uniforme
- **Progreso**: Seguimiento claro por período
- **Historial**: Acceso a cursos anteriores

### **Para Administradores**
- **Gestión**: Control centralizado de períodos
- **Reportes**: Estadísticas institucionales
- **Mantenimiento**: Fácil gestión de datos

## 🚀 Plan de Implementación

### **Fase 1: Preparación (Semana 1)**
- [ ] Crear nuevas tablas sin romper existentes
- [ ] Implementar servicios básicos
- [ ] Migrar datos existentes a course_instances
- [ ] Pruebas de funciones y triggers

### **Fase 2: Adaptación (Semana 2)**
- [ ] Adaptar componentes existentes
- [ ] Crear nuevos componentes de gestión
- [ ] Implementar lógica de períodos
- [ ] Pruebas de integración

### **Fase 3: Optimización (Semana 3)**
- [ ] Optimizar consultas
- [ ] Implementar caché
- [ ] Crear reportes por período
- [ ] Documentación final

## 📈 Métricas de Éxito

### **Técnicas**
- Tiempo de respuesta < 500ms
- 99.9% uptime
- Cero pérdida de datos
- Consultas optimizadas

### **Funcionales**
- Profesores pueden crear períodos en < 5 minutos
- Estudiantes acceden a historial completo
- Administradores generan reportes automáticamente
- Cero conflictos de datos entre períodos

### **Experiencia de Usuario**
- Interfaz intuitiva
- Procesos claros
- Notificaciones informativas
- Tiempos de carga rápidos

## 🔧 Configuración y Deployment

### **Variables de Entorno**
```env
# Períodos académicos
ACADEMIC_YEAR_START=2025
ACADEMIC_YEAR_END=2025
DEFAULT_PERIOD_DURATION=120  # días

# Configuración de cursos
MAX_STUDENTS_PER_COURSE=50
COURSE_CLONE_TIMEOUT=30000   # ms
```

### **Scripts de Migración**
```bash
# Ejecutar migraciones
npm run migrate:periods

# Migrar datos existentes
npm run migrate:data

# Verificar integridad
npm run verify:data
```

## 📚 Recursos Adicionales

### **Documentación Relacionada**
- [Guía de Migración](./MIGRATION_GUIDE.md)
- [API Reference](./API_REFERENCE.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

### **Herramientas de Desarrollo**
- Supabase Dashboard
- PostgreSQL Admin
- VS Code Extensions
- Testing Framework

---

## 📝 Notas de Implementación

**Fecha de Creación**: Julio 15, 2025
**Última Actualización**: Julio 15, 2025
**Estado**: Documentación Completa - Pendiente Implementación
**Prioridad**: Alta
**Estimación**: 2-3 semanas de desarrollo

---

> **Importante**: Este documento debe ser revisado y actualizado antes de iniciar la implementación. Todos los cambios de esquema deben ser probados en ambiente de desarrollo antes de aplicar en producción.
