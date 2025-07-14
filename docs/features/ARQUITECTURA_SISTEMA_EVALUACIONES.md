# Arquitectura y Lógica del Sistema de Evaluaciones - Análisis Técnico Profundo

## 📋 Introducción

Este documento proporciona un análisis técnico exhaustivo del sistema de evaluaciones, detallando la arquitectura, lógica de negocio, flujos de datos y componentes del sistema Assignment. Está dirigido a desarrolladores que necesiten entender, mantener o extender el sistema.

## 🏗️ Arquitectura General del Sistema

### 1. **Visión General de Componentes**

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA DE EVALUACIONES                  │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React/TypeScript)                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Teacher UI    │  │   Student UI    │  │   Shared    │ │
│  │                 │  │                 │  │ Components  │ │
│  │ ManageAssign.   │  │ Assignments.tsx │  │ Modals      │ │
│  │ CreateQuestions │  │ StudentForm     │  │ Services    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Backend (Supabase)                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   assignments   │  │   assignment_   │  │   users/    │ │
│  │      table      │  │   submissions   │  │   courses   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2. **Flujo de Datos Principal**

```
Profesor → ManageAssignments → CreateQuestions → Database
                                     ↓
Database → Assignment Record → Student View → StudentModal
                                     ↓
Student Response → Automatic Grading → Submission Record
```

## 🔧 Componente Assignment - Análisis Detallado

### 1. **StudentAssignments.tsx - Arquitectura Interna**

#### **1.1 Estructura de Estado**
```typescript
interface AssignmentState {
  assignments: Assignment[];        // Lista principal de evaluaciones
  isLoading: boolean;              // Estado de carga inicial
  isRefreshing: boolean;           // Estado de actualización
  filter: FilterType;              // Filtro actual aplicado
  uploadModalOpen: boolean;        // Control de modal de archivos
  formModalOpen: boolean;          // Control de modal de formularios
  selectedAssignment: Assignment | null; // Evaluación seleccionada
}
```

#### **1.2 Lógica de Carga de Datos**
```typescript
const fetchAssignments = async (showNotification = false) => {
  /*
   * PASO 1: Obtener matriculaciones activas del estudiante
   * - Consulta tabla 'enrollments'
   * - Filtra por user_id del estudiante
   * - Determina estado activo (is_active o status)
   */
  
  /*
   * PASO 2: Obtener evaluaciones de cursos matriculados
   * - Consulta tabla 'assignments' con JOIN a 'courses'
   * - Filtra por course_id de matriculaciones activas
   * - Incluye información del profesor y curso
   */
  
  /*
   * PASO 3: Obtener entregas/respuestas del estudiante
   * - Consulta tabla 'assignment_submissions'
   * - Filtra por assignment_id y student_id
   * - Crea mapa de entregas para procesamiento
   */
  
  /*
   * PASO 4: Procesar y combinar datos
   * - Determina estado de completitud por tipo
   * - Calcula días restantes y vencimiento
   * - Estructura datos para interfaz
   */
};
```

#### **1.3 Lógica de Determinación de Estados**
```typescript
const determineAssignmentState = (assignment, submission) => {
  /*
   * LÓGICA DE ESTADOS:
   * 
   * 1. INACTIVA: assignment.is_active === false
   *    - Botón: "Inactiva" (deshabilitado)
   *    - Color: Gris
   *    - Acción: Mostrar mensaje de error
   * 
   * 2. COMPLETADA: 
   *    - file_upload: !!submission
   *    - form/external_form: !!submission?.grade
   *    - Botón: "Completada" / "Calificado Automáticamente"
   *    - Color: Verde
   *    - Acción: Mostrar resultados
   * 
   * 3. VENCIDA: daysRemaining < 0 && !isCompleted
   *    - Botón: "Vencida" 
   *    - Color: Rojo
   *    - Acción: Permitir acceso con advertencia
   * 
   * 4. PENDIENTE: Estado por defecto
   *    - Botón: "Responder" / "Subir Archivo"
   *    - Color: Azul
   *    - Acción: Abrir modal correspondiente
   */
};
```

#### **1.4 Manejo de Clicks y Acciones**
```typescript
const handleAssignmentClick = (assignment: Assignment) => {
  /*
   * ÁRBOL DE DECISIONES:
   * 
   * 1. Verificar si está activa
   *    ├─ NO → Mostrar error "Evaluación inactiva"
   *    └─ SÍ → Continuar
   * 
   * 2. Verificar tipo de evaluación
   *    ├─ file_upload
   *    │  ├─ Ya tiene entrega → Error "Archivo ya enviado"
   *    │  └─ Sin entrega → Abrir FileUploadModal
   *    │
   *    ├─ form
   *    │  ├─ Ya completada → Error "Evaluación completada"
   *    │  └─ Sin completar → Abrir StudentFormModal
   *    │
   *    └─ external_form
   *       └─ Abrir URL externa en nueva ventana
   */
};
```

### 2. **StudentFormModal.tsx - Lógica de Evaluación**

#### **2.1 Ciclo de Vida del Modal**
```typescript
const ModalLifecycle = {
  /*
   * FASE 1: INICIALIZACIÓN
   * - useEffect detecta apertura (isOpen && assignment?.id)
   * - Ejecuta fetchQuestions()
   * - Establece estado de carga
   */
  
  /*
   * FASE 2: CARGA DE PREGUNTAS
   * - Consulta assignments.form_questions
   * - Convierte formato FormQuestion → Question
   * - Inicializa respuestas vacías
   * - Fallback a assignment_questions si es necesario
   */
  
  /*
   * FASE 3: INTERACCIÓN
   * - Navegación entre preguntas
   * - Captura de respuestas
   * - Validación en tiempo real
   * - Actualización de progreso
   */
  
  /*
   * FASE 4: ENVÍO
   * - Validación final de respuestas obligatorias
   * - Cálculo automático de puntaje
   * - Guardado en assignment_submissions
   * - Actualización de estado padre
   */
};
```

#### **2.2 Algoritmo de Calificación Automática**
```typescript
const calculateScore = () => {
  let totalScore = 0;
  
  questions.forEach(question => {
    const studentAnswer = answers[question.id];
    
    switch (question.question_type) {
      case 'multiple_choice':
        /*
         * ALGORITMO DE OPCIÓN MÚLTIPLE:
         * 1. Obtener respuestas correctas ordenadas
         * 2. Obtener respuestas del estudiante ordenadas
         * 3. Comparar arrays usando JSON.stringify
         * 4. Coincidencia exacta = puntos completos
         * 5. Cualquier diferencia = 0 puntos
         */
        const correctAnswers = question.correct_answers.sort();
        const studentAnswers = (studentAnswer || []).sort();
        
        if (JSON.stringify(correctAnswers) === JSON.stringify(studentAnswers)) {
          totalScore += question.max_points;
        }
        break;
        
      case 'text':
        /*
         * ALGORITMO DE TEXTO:
         * 1. Verificar que hay respuesta
         * 2. Verificar que no está vacía (trim)
         * 3. Si cumple condiciones = puntos completos
         * 
         * NOTA: Implementación básica, se puede extender
         * para comparación de texto más sofisticada
         */
        if (studentAnswer && studentAnswer.trim() !== '') {
          totalScore += question.max_points;
        }
        break;
        
      case 'essay':
        /*
         * ALGORITMO DE ENSAYO:
         * Similar a texto pero diseñado para respuestas largas
         * En implementación futura podría requerir revisión manual
         */
        if (studentAnswer && studentAnswer.trim() !== '') {
          totalScore += question.max_points;
        }
        break;
    }
  });
  
  return totalScore;
};
```

#### **2.3 Sistema de Validación**
```typescript
const validateAnswers = () => {
  /*
   * VALIDACIÓN POR TIPO DE PREGUNTA:
   * 
   * multiple_choice:
   * - Verificar que array no esté vacío
   * - Verificar que al menos una opción esté seleccionada
   * 
   * text/essay:
   * - Verificar que string no esté vacío
   * - Verificar que contenga caracteres después de trim()
   * 
   * FLUJO DE VALIDACIÓN:
   * 1. Iterar sobre preguntas obligatorias
   * 2. Verificar respuesta según tipo
   * 3. Mostrar error específico si falla
   * 4. Detener envío si alguna falla
   * 5. Continuar si todas pasan
   */
  
  for (const question of questions) {
    if (question.is_required) {
      const answer = answers[question.id];
      
      if (question.question_type === 'multiple_choice') {
        if (!answer || answer.length === 0) {
          showError('Respuesta requerida', 
            `La pregunta "${question.question_text}" es obligatoria.`);
          return false;
        }
      } else {
        if (!answer || answer.trim() === '') {
          showError('Respuesta requerida', 
            `La pregunta "${question.question_text}" es obligatoria.`);
          return false;
        }
      }
    }
  }
  
  return true;
};
```

### 3. **ManageAssignments.tsx - Lógica del Profesor**

#### **3.1 Flujo de Creación de Evaluaciones**
```typescript
const CreateAssignmentFlow = {
  /*
   * PASO 1: FORMULARIO BÁSICO
   * - Profesor llena datos básicos (título, descripción, etc.)
   * - Selecciona tipo "Formulario Interno"
   * - Hace clic en "Crear Evaluación"
   */
  
  /*
   * PASO 2: INTERCEPTACIÓN EN handleSubmit
   * - Detecta assignment_type === 'form'
   * - Limpia selectedAssignmentId (null)
   * - Abre modal de preguntas
   * - Retorna sin guardar aún
   */
  
  /*
   * PASO 3: CONFIGURACIÓN DE PREGUNTAS
   * - Modal CreateAssignmentQuestionsModalNew se abre
   * - Profesor agrega preguntas y respuestas correctas
   * - Valida preguntas antes de guardar
   */
  
  /*
   * PASO 4: GUARDADO COMBINADO
   * - handleQuestionsModalSave recibe preguntas
   * - Convierte formato Question → FormQuestion
   * - Combina datos de evaluación + preguntas
   * - Guarda todo en tabla assignments
   */
};
```

#### **3.2 Conversión de Formatos de Preguntas**
```typescript
const convertQuestionFormats = (questions) => {
  /*
   * CONVERSIÓN: Question → FormQuestion
   * 
   * MAPEO DE CAMPOS:
   * Question.id → FormQuestion.id
   * Question.question_text → FormQuestion.question
   * Question.question_type → FormQuestion.type
   * Question.options → FormQuestion.options
   * Question.correct_answers → FormQuestion.correct_answers ✅
   * Question.is_required → FormQuestion.required
   * Question.max_points → FormQuestion.points
   * 
   * VALIDACIONES:
   * - Filtrar opciones vacías para multiple_choice
   * - Asegurar correct_answers para calificación
   * - Validar que todos los campos requeridos estén presentes
   */
  
  return questions.map(q => ({
    id: q.id,
    question: q.question_text,
    type: q.question_type === 'multiple_choice' ? 'multiple_choice' : 'text',
    options: q.options || [],
    correct_answers: q.correct_answers || [], // CRÍTICO para calificación
    required: q.is_required,
    points: q.max_points
  }));
};
```

#### **3.3 Lógica de Estados de Modal**
```typescript
const ModalStateLogic = {
  /*
   * PROBLEMA ORIGINAL:
   * - assignmentId recibía string vacío ''
   * - Modal interpretaba como modo edición
   * - No permitía creación de nuevas evaluaciones
   * 
   * SOLUCIÓN IMPLEMENTADA:
   * - assignmentId recibe undefined para creación
   * - Modal detecta undefined y entra en modo creación
   * - Permite configurar preguntas sin ID de evaluación
   * 
   * LÓGICA DE DETECCIÓN:
   * if (!assignmentId) {
   *   // Modo creación: devolver preguntas al padre
   *   onSave(formattedQuestions);
   * } else {
   *   // Modo edición: guardar directamente en DB
   *   await saveToDatabase(assignmentId, questions);
   * }
   */
};
```

## 🔄 Flujos de Datos Detallados

### 1. **Flujo de Creación de Evaluación**

```
┌─────────────────────────────────────────────────────────────┐
│                    CREACIÓN DE EVALUACIÓN                   │
└─────────────────────────────────────────────────────────────┘

1. Profesor → ManageAssignments.tsx
   ├─ Llena formulario básico
   ├─ Selecciona tipo "form"
   └─ Click "Crear Evaluación"

2. handleSubmit() intercepta
   ├─ Detecta formData.assignment_type === 'form'
   ├─ Establece selectedAssignmentId = null
   ├─ Abre setShowQuestionsModal(true)
   └─ return; // No guarda aún

3. CreateAssignmentQuestionsModalNew abre
   ├─ Recibe assignmentId = undefined
   ├─ Entra en modo creación
   ├─ Profesor configura preguntas
   └─ Click "Guardar"

4. handleSave() en modal
   ├─ Valida preguntas
   ├─ Formatea preguntas
   ├─ Llama onSave(formattedQuestions)
   └─ Cierra modal

5. handleQuestionsModalSave() en ManageAssignments
   ├─ Recibe preguntas del modal
   ├─ Convierte Question → FormQuestion
   ├─ Combina datos de evaluación + preguntas
   ├─ Guarda en tabla assignments
   └─ Actualiza lista de evaluaciones
```

### 2. **Flujo de Respuesta de Estudiante**

```
┌─────────────────────────────────────────────────────────────┐
│                   RESPUESTA DE ESTUDIANTE                   │
└─────────────────────────────────────────────────────────────┘

1. StudentAssignments.tsx carga
   ├─ fetchAssignments() consulta DB
   ├─ Procesa datos y estados
   ├─ Renderiza lista de evaluaciones
   └─ Muestra botón "Responder Formulario"

2. handleAssignmentClick() ejecuta
   ├─ Valida que esté activa
   ├─ Valida que no esté completada
   ├─ Detecta tipo 'form'
   ├─ Establece selectedAssignment
   └─ Abre setFormModalOpen(true)

3. StudentFormModal se monta
   ├─ useEffect detecta isOpen && assignment?.id
   ├─ Ejecuta fetchQuestions()
   ├─ Carga desde assignments.form_questions
   ├─ Convierte FormQuestion → Question
   └─ Inicializa respuestas vacías

4. Estudiante interactúa
   ├─ Navega entre preguntas
   ├─ handleAnswerChange() actualiza respuestas
   ├─ Validación en tiempo real
   └─ Progreso visual actualizado

5. handleSubmit() ejecuta
   ├─ validateAnswers() verifica obligatorias
   ├─ calculateScore() calcula puntaje
   ├─ Guarda en assignment_submissions
   ├─ Muestra resultados
   └─ Actualiza estado padre
```

### 3. **Flujo de Calificación Automática**

```
┌─────────────────────────────────────────────────────────────┐
│                  CALIFICACIÓN AUTOMÁTICA                    │
└─────────────────────────────────────────────────────────────┘

1. Estudiante completa todas las preguntas
   └─ Respuestas almacenadas en state `answers`

2. handleSubmit() inicia proceso
   ├─ Valida respuestas obligatorias
   └─ Llama calculateScore()

3. calculateScore() procesa cada pregunta
   ├─ Obtiene respuesta del estudiante
   ├─ Obtiene respuestas correctas
   ├─ Aplica algoritmo según tipo:
   │  ├─ multiple_choice: Comparación exacta de arrays
   │  ├─ text: Verificación de contenido
   │  └─ essay: Verificación de contenido
   └─ Suma puntos por pregunta correcta

4. Resultado final
   ├─ totalScore calculado
   ├─ percentage = (score/max_score) * 100
   ├─ Guardado en assignment_submissions
   └─ Feedback inmediato al estudiante
```

## 🗄️ Estructura de Base de Datos

### 1. **Tabla assignments**
```sql
CREATE TABLE assignments (
  id UUID PRIMARY KEY,
  title VARCHAR NOT NULL,
  description TEXT,
  course_id UUID REFERENCES courses(id),
  assignment_type VARCHAR NOT NULL, -- 'form', 'external_form', 'file_upload'
  due_date TIMESTAMP,
  max_score INTEGER NOT NULL,
  form_questions JSONB, -- ✅ Preguntas almacenadas aquí
  external_form_url VARCHAR,
  file_instructions TEXT,
  allowed_file_types TEXT[],
  max_file_size_mb INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. **Tabla assignment_submissions**
```sql
CREATE TABLE assignment_submissions (
  id UUID PRIMARY KEY,
  assignment_id UUID REFERENCES assignments(id),
  student_id UUID REFERENCES users(id),
  submission_type VARCHAR NOT NULL, -- 'form', 'file', 'external'
  form_answers JSONB, -- Respuestas del estudiante
  file_name VARCHAR,
  file_url VARCHAR,
  grade INTEGER, -- ✅ Calificación automática
  feedback TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  graded_at TIMESTAMP -- ✅ Timestamp de calificación automática
);
```

### 3. **Estructura de form_questions (JSONB)**
```json
[
  {
    "id": "question_1",
    "question": "¿Cuál es la capital de Francia?",
    "type": "multiple_choice",
    "options": ["Madrid", "París", "Londres", "Roma"],
    "correct_answers": [1], // ✅ Índice de respuesta correcta
    "required": true,
    "points": 10
  },
  {
    "id": "question_2", 
    "question": "Explica el concepto de...",
    "type": "text",
    "options": [],
    "correct_answers": [], // ✅ Vacío para texto libre
    "required": true,
    "points": 15
  }
]
```

### 4. **Estructura de form_answers (JSONB)**
```json
{
  "question_1": [1], // Respuesta a opción múltiple
  "question_2": "Mi respuesta de texto libre aquí...", // Respuesta de texto
  "question_3": [0, 2] // Respuesta múltiple con varias opciones
}
```

## 🔍 Algoritmos y Lógica de Negocio

### 1. **Algoritmo de Determinación de Estado**
```typescript
const determineAssignmentStatus = (assignment, submission) => {
  /*
   * PRECEDENCIA DE ESTADOS (en orden):
   * 1. INACTIVA (is_active = false)
   * 2. COMPLETADA (según tipo de evaluación)
   * 3. VENCIDA (fecha pasada y no completada)
   * 4. PENDIENTE (estado por defecto)
   */
  
  // Nivel 1: Verificar actividad
  if (!assignment.is_active) {
    return {
      status: 'inactive',
      buttonText: 'Inactiva',
      buttonColor: 'gray',
      clickable: false
    };
  }
  
  // Nivel 2: Verificar completitud
  const isCompleted = assignment.assignment_type === 'file_upload' 
    ? !!submission 
    : !!submission?.grade;
    
  if (isCompleted) {
    return {
      status: 'completed',
      buttonText: assignment.assignment_type === 'form' 
        ? 'Calificado Automáticamente' 
        : 'Completada',
      buttonColor: 'green',
      clickable: false
    };
  }
  
  // Nivel 3: Verificar vencimiento
  const dueDate = new Date(assignment.due_date);
  const now = new Date();
  const isOverdue = dueDate < now;
  
  if (isOverdue) {
    return {
      status: 'overdue',
      buttonText: 'Vencida',
      buttonColor: 'red',
      clickable: true, // Permitir acceso con advertencia
      warning: true
    };
  }
  
  // Nivel 4: Estado pendiente
  return {
    status: 'pending',
    buttonText: assignment.assignment_type === 'form' 
      ? 'Responder Formulario' 
      : 'Subir Archivo',
    buttonColor: 'blue',
    clickable: true
  };
};
```

### 2. **Algoritmo de Cálculo de Progreso**
```typescript
const calculateProgress = (currentQuestionIndex, totalQuestions) => {
  /*
   * CÁLCULO DE PROGRESO:
   * - Basado en pregunta actual, no en respuestas completadas
   * - Considera pregunta actual como "en progreso"
   * - Proporciona feedback visual continuo
   */
  
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
  
  return {
    percentage: Math.round(progress),
    current: currentQuestionIndex + 1,
    total: totalQuestions,
    isComplete: currentQuestionIndex === totalQuestions - 1
  };
};
```

### 3. **Algoritmo de Validación de Respuestas**
```typescript
const validateResponse = (question, answer) => {
  /*
   * VALIDACIÓN POR TIPO:
   * - multiple_choice: Array no vacío
   * - text: String no vacío después de trim
   * - essay: String no vacío después de trim
   * 
   * CONSIDERACIONES:
   * - Solo aplicar a preguntas obligatorias
   * - Proporcionar mensajes específicos
   * - Permitir respuestas parciales en navegación
   */
  
  if (!question.is_required) {
    return { valid: true };
  }
  
  switch (question.question_type) {
    case 'multiple_choice':
      if (!answer || !Array.isArray(answer) || answer.length === 0) {
        return {
          valid: false,
          message: `La pregunta "${question.question_text}" requiere al menos una opción seleccionada.`
        };
      }
      break;
      
    case 'text':
    case 'essay':
      if (!answer || typeof answer !== 'string' || answer.trim() === '') {
        return {
          valid: false,
          message: `La pregunta "${question.question_text}" requiere una respuesta de texto.`
        };
      }
      break;
  }
  
  return { valid: true };
};
```

## 🎯 Patrones de Diseño Utilizados

### 1. **Patrón Observer**
```typescript
/*
 * IMPLEMENTACIÓN:
 * - StudentAssignments observa cambios en evaluaciones
 * - Auto-refresh cada 5 minutos
 * - Actualización manual con botón refresh
 * - Callback onSubmissionComplete para sincronización
 */

useEffect(() => {
  const intervalId = setInterval(() => {
    fetchAssignments();
  }, 5 * 60 * 1000);
  
  return () => clearInterval(intervalId);
}, []);
```

### 2. **Patrón Strategy**
```typescript
/*
 * IMPLEMENTACIÓN:
 * - Diferentes estrategias según tipo de evaluación
 * - Algoritmos intercambiables de calificación
 * - Manejo específico por tipo de pregunta
 */

const gradingStrategies = {
  multiple_choice: (question, answer) => {
    // Estrategia de comparación exacta
  },
  text: (question, answer) => {
    // Estrategia de verificación de contenido
  },
  essay: (question, answer) => {
    // Estrategia de revisión manual (futuro)
  }
};
```

### 3. **Patrón State Machine**
```typescript
/*
 * ESTADOS DE EVALUACIÓN:
 * inactive → pending → (in_progress) → completed
 *                   ↘ overdue ↗
 * 
 * TRANSICIONES VÁLIDAS:
 * - pending → in_progress (estudiante abre modal)
 * - in_progress → completed (estudiante envía)
 * - pending → overdue (fecha vence)
 * - active → inactive (profesor desactiva)
 */
```

## 🔒 Consideraciones de Seguridad y Rendimiento

### 1. **Seguridad en Calificación**
```typescript
/*
 * MEDIDAS DE SEGURIDAD:
 * 1. Respuestas correctas no se envían al frontend
 * 2. Calificación se realiza en el cliente pero se valida en servidor
 * 3. Timestamps de envío para prevenir manipulación
 * 4. Validación de permisos antes de mostrar evaluaciones
 */
```

### 2. **Optimización de Rendimiento**
```typescript
/*
 * OPTIMIZACIONES:
 * 1. Paginación de evaluaciones (futuro)
 * 2. Caching de respuestas en localStorage
 * 3. Lazy loading de modales
 * 4. Debouncing en auto-refresh
 * 5. Memoización de cálculos costosos
 */
```

### 3. **Manejo de Errores**
```typescript
/*
 * ESTRATEGIAS DE ERROR:
 * 1. Try-catch en todas las operaciones async
 * 2. Fallbacks para carga de datos
 * 3. Mensajes específicos por tipo de error
 * 4. Logging detallado para debugging
 * 5. Recuperación automática cuando es posible
 */
```

## 📚 Conclusiones Técnicas

### 1. **Fortalezas del Sistema**
- **Modularidad**: Componentes bien separados y reutilizables
- **Escalabilidad**: Fácil agregar nuevos tipos de evaluación
- **Mantenibilidad**: Código documentado y estructurado
- **Experiencia de Usuario**: Interfaz intuitiva y responsive

### 2. **Áreas de Mejora**
- **Testing**: Implementar pruebas unitarias y de integración
- **Validación de Servidor**: Duplicar validaciones en backend
- **Optimización**: Implementar caching y lazy loading
- **Accesibilidad**: Mejorar soporte para lectores de pantalla

### 3. **Extensibilidad**
- **Nuevos Tipos de Pregunta**: Arquitectura permite agregar fácilmente
- **Algoritmos de Calificación**: Patrón Strategy facilita extensión
- **Integraciones**: Estructura permite conectar con sistemas externos
- **Análisis**: Base para implementar dashboards y reportes

---

**Documento técnico preparado por:** Equipo de desarrollo  
**Fecha:** Julio 2025  
**Versión:** 1.0  
**Propósito:** Documentación técnica interna para desarrolladores
