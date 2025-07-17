
## IMPLEMENTACIONES NECESÁRIAS

1. **' EN SUPABASE '**  
```typescript

 1. //Tabla grades
 - Eliminar tabla 'Grades';

 2. ✅ //Tabla enrollments
 - Crear campo 'type_coursed' para guardar el "tipo de cursada" que el estudiante eligirá al matricularse (en la aplicación deberá aparecer un modal que solicitará esa información en un selector de opciones: "Oyente" | "Regular");
 - Crear campo `period` para diferenciar un curso en una matricula. (imagine que un estudiante se haya matriculado en el curso TBAT en el periodo 1-Cuatri/2025 y desaprobo. En el periodo siguiente queire hacerlo otra vez, luego su matricula anterior al cierre del periodo figurara como `is_active` = false y no aparecera en la pantalla como matriculado. Tendra que matricularse otra vez y el `enrollmentId` sera otro con nuevo historial completo. Al imprimir el historial, el periodo del curso y la `enrollmentId` seran diferentes, aunque el `courseId` sea el mismo siempre.)
 - Seria bueno crear un `trigger` o una `function` que modifica el campo `is_active` = false cada vez que el campo `completion_date` for rellenado.
  
 3. //Tabla evaluation_score
 - Eliminar tabla;

 4. //Tabla lessons
 - Comparar y eliminar las tablas `lessons_content` y `completed_lessons`. Parece que todas llevan el mismo contenido y proposito;

 5. ✅ //Tabla courses
 - Trasnferir los datos del campo `period` para el campo `period` de la tabla `enrollments`;
 - Eliminar campo `period` de la tabla `courses`. Los cursos son simpre adaptables a todos los periodos, lo que caduca debe ser siempre la matricula (`enrollmentsId`) que perderá su ciclo de vida al terminar el periodo.  
 - Cada estudiante podra matricularse varias veces en el mismo curso (`courseId`), pero cada matricula será unica (`enrollmentId`) y sera identificada por el periodo cursado.
 - Mantener la integridad de los datos con la aplicación.

 6. //Tabla assignment_submissions
 - Eliminar el campo 'graded_by' ya que parece cumplir la misma función del campo 'student_id'.

 7. ✅ //Tabla periods
  - Crear la tabla periods para mejorar los indices de consultas. Crear el campo `period_id` en la tabla `enrollments`. Copiar los datos del campo `period` de la tabala `enrollments`para el campo `name` de la tabla `periods`. Asignar al campo `enrollments.period_id` cada `periods.id` donde `periods.name` = `enrollments.period`. Eliminar el campo `period` de la tabla `enrollments`.
``` 


### SRC/COMPONENTES ###
**/ LOGICA /**
 - ✅ Crear un nuevo componente nombrado `FinalGrade.tsx` para realizar una logica de alta performance que calcula la nota final del estudiante, por matricula (enrollments). La idea que tengo es: 
    1) SUMA-A: sumar el puntaje maximo de todas las assignments de un curso activo en determinado periodo (tabla "assignments", campos: "max_score", "is_active = true"); 
    2) SUMA-B: Sumar todas las notas de la tabla "assignment_submissions" campos: "grade", "assignment_id", "student_id" del estudiante de aquel curso; 
    3) dividir la suma "B" por la suma "A" * 100 = resultado. El resultado debe ser guardado en la tabla "enrollments" campo: "final_grade";

 - ✅ Hay que hacer tanbién una segunda lógica para el `status` de `FinalGrade.tsx`:
    1) Si la nota final for < 70% entoces `status` = "Desaprobado"; si >= 70% `status` = "Aprobado", si en la tabla `enrollments` campo `type_coursed` === "Oyente" entonces `status` = "Oyente"; si en la tabla `enrollments` campo "status" === "Desistido", entonces `status` = "Desistido"


### SRC/PAGES ###

**student**
 - Crear componente `src/pages/student/ManageFinalGrade.tsx` que consumirá nuestro componente `FinalGrade.tsx`. 
    1) El nuevo componente se encargará de la parte visual y mostrará en la pantalla de estudiantes las notas de sus matriculas por periodo especifico, o todos los periodos. El `userId` del estudiante `role` = ['student'] deberá ser tomado del `userId` logado. El estilo visual debe constar de los siguientes datos: `Estudiante`, `Curso`, `Periodo`, `Nota Final`, `status`. 

**teacher**
 - Crear componente `src/pages/teacher/ManageFinalGrade.tsx` con el nombre visual que consumirá nuestro componente `FinalGrade.tsx`. 
    1) El nuevo componente se encargará de la parte visual y mostrará en el portal de profesores las notas de sus estudiantes con matriculas por periodo especifico, o todos los periodos. También deberá consultar por estudiante y por curso. El estilo visual debe constar de los siguientes datos: `Estudiante`, `Curso`, `Periodo`, `Nota Final`, `status`. `
    2) Un boton de acceso al ambiente visual debe aparecer en el portal del profesor ubicado en la `src/components/Sidebar.tsx` nombrado **Cerrar Período**. Dicho enlace mostrará los datos de la tabla `enrollments` con los siguientes campos: `Estudiante`, `Curso`, `Periodo`, `Nota Final`, `status`. Si la matricula estuvier activa (`enrollments` campo `is_active`= "true")deberá aparecer la posibilidad del profesor editar los campos `Nota Final` y `status` manualmente y guardar las modificaciones en la base de datos `enrollments`, del contrario la opcion de editar es desabilitada.    
    3) El campo `completation_date` deberá ser rellenado en la fecha que el profesor cerrar el curso. Un botón de **finalizar Curso** deberá aparecer en alguna parte visual de la misma pantalla del ambiente de **Gestión Final**, con la opción de elegir cual curso activo el profesor quiere finalizar.  
    

**admin**
 - ✅ Crear componente `src/pages/admin/ManageFinalGrade.tsx` con el nombre visual que consumirá nuestro componente `FinalGrade.tsx`. 
    1) El nuevo componente se encargará de la parte visual y mostrará en el portal de administadores las notas de todos los estudiantes del seminario por periodo especifico, o todos los periodos. También deberá consultar por estudiante y por curso. El estilo visual debe constar de los siguientes datos: `Estudiante`, `Curso`, `Periodo`, `Nota Final`, `status`. `
    2) Un boton de acceso al ambiente visual debe aparecer en el portal del admin ubicado en la `src/components/Sidebar.tsx` nombrado **Secretaría**. Dicho enlace mostrará los datos de la tabla `enrollments` con los siguientes campos: `Estudiante`, `Curso`, `Periodo`, `Nota Final`, `status`.
    3) El admin no podrá modificar ningun dato de los valores mostrados, pero podrá enviar un mensaje que aparecerá unicamente al profesor del curso especifico.  
      
      
## IMPLEMENTACION DEL MODAL PARA CONFRIMACION DE MATRICULACIONES Y PAGAMENTOS
**student**
 - Crear un modal al pulsar sobre el botón `matricularse` en mis cursos. 
    1) el modal deberá constar un selector de "tipo de cursada" que será guardada en la tabla `enrollment` campo `type_coursed` según la foto; la aplicación visual deberá aparecer un modal que solicitará esa información en un selector de opciones: `Oyente` | `Regular`.
    2) deberá mostrar un aviso inline: "El estudiante que optar por el tipo `Oyente` estará desobligado de responder las asignaciones, sin embargo, no obtendrá la CERTIFICACIÓN OFICIAL, unicamente un atestado de participación como oyente."
    3) deberá mostrar las opciones de pagamento: El pagamento podrá ser por tarjeta de crédito, transferencia por mercado pago o asignar un codigo de BECA.