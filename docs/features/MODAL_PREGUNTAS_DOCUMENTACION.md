# Modal de Creación de Preguntas para Evaluaciones

## Descripción

Se ha implementado un modal interactivo que permite a los profesores crear y gestionar preguntas para evaluaciones de tipo "Formulario Interno" directamente desde el portal de profesores.

## Características Principales

### 🎯 Funcionalidades Implementadas

1. **Modal Responsivo**: Modal que se abre desde la página de gestión de evaluaciones
2. **Tipos de Preguntas**: 
   - Texto corto
   - Ensayo
   - Opción múltiple
3. **Gestión de Opciones**: Para preguntas de opción múltiple:
   - Agregar/eliminar opciones
   - Marcar múltiples respuestas correctas
   - Validación visual de opciones correctas
4. **Reordenamiento**: Arrastra y suelta para reordenar preguntas
5. **Validación**: Validación completa antes de guardar
6. **Estadísticas**: Muestra total de preguntas y puntos

### 🛠️ Implementación Técnica

#### Archivos Creados/Modificados

1. **`src/components/CreateAssignmentQuestionsModal.tsx`** (Nuevo)
   - Componente modal principal
   - Gestión completa de preguntas
   - Integración con Supabase

2. **`src/pages/teacher/ManageAssignments.tsx`** (Modificado)
   - Agregado botón "Crear Preguntas" para evaluaciones tipo 'form'
   - Integración del modal
   - Estados para controlar la visibilidad del modal

#### Características del Modal

- **Responsive**: Se adapta a diferentes tamaños de pantalla
- **Accesible**: Incluye títulos, labels y aria-labels apropiados
- **Validación**: Validación en tiempo real y antes de guardar
- **UX Mejorada**: Indicadores visuales claros para respuestas correctas

### 🎨 Experiencia de Usuario

#### Flujo de Uso

1. **Acceso**: Desde la página de gestión de evaluaciones, hacer clic en el botón de preguntas (icono de ayuda) en evaluaciones tipo "Formulario Interno"
2. **Creación**: 
   - Agregar preguntas usando el botón "Agregar Pregunta"
   - Configurar tipo de pregunta, puntos y obligatoriedad
   - Para opción múltiple: agregar opciones y marcar las correctas
3. **Organización**: Reordenar preguntas arrastrando y soltando
4. **Guardado**: Validación automática y guardado en base de datos

#### Validaciones Implementadas

- ✅ Texto de pregunta obligatorio
- ✅ Mínimo 2 opciones para preguntas de opción múltiple
- ✅ Al menos una respuesta correcta marcada para opción múltiple
- ✅ Opciones con contenido no vacío

### 📊 Estadísticas Visuales

El modal muestra:
- **Total de preguntas**: Contador dinámico
- **Puntos totales**: Suma automática de todos los puntos
- **Indicadores visuales**: Respuestas correctas destacadas en verde

### 🔧 Integración con la Base de Datos

- **Tabla**: `assignment_questions`
- **Campos**: question_text, question_type, options, correct_answers, is_required, max_points, order_number
- **Operaciones**: Create, Update, Delete con transacciones seguras

### 🚀 Mejoras Futuras Posibles

1. **Importar/Exportar**: Funcionalidad para importar preguntas desde archivos
2. **Plantillas**: Banco de preguntas predefinidas
3. **Previsualización**: Vista previa de cómo se verá la evaluación para estudiantes
4. **Colaboración**: Permitir que múltiples profesores editen preguntas
5. **Análisis**: Estadísticas de dificultad de preguntas basadas en respuestas

### 📱 Responsividad

El modal está optimizado para:
- **Desktop**: Experiencia completa con arrastrar y soltar
- **Tablet**: Interfaz adaptada manteniendo funcionalidad
- **Mobile**: Versión compacta con navegación táctil

### 🎭 Temas

Compatible con:
- **Tema Claro**: Colores suaves y contraste adecuado
- **Tema Oscuro**: Paleta oscura con elementos destacados

## Uso

Para usar esta funcionalidad:

1. Ir a la página de **Gestión de Evaluaciones**
2. Buscar una evaluación de tipo **"Formulario Interno"**
3. Hacer clic en el botón de **preguntas** (icono de ayuda violeta)
4. Crear, editar y organizar preguntas según sea necesario
5. Hacer clic en **"Guardar Preguntas"** para confirmar cambios

El modal se integra perfectamente con el flujo de trabajo existente del portal de profesores, proporcionando una experiencia fluida y profesional para la creación de evaluaciones.
