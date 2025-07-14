# Seminario - Sistema de Gestión Educativa

Un sistema completo de gestión educativa desarrollado con React, TypeScript, Vite y Supabase, diseñado para el Seminario Bíblico Reformado da Argentina (SEMBRAR).

## 🚀 Funcionalidades

### Para Estudiantes
- Dashboard personalizado con progreso de los cursos.
- Visualización de cursos disponibles e inscritos.
- Acceso a módulos y lecciones.
- Acompanhamento de progresso.
- Visualización de anuncios importantes.

### Para Profesores
- Dashboard con estadísticas de los cursos.
- Gestión de cursos y contenido.
- Sistema de calificaciones.
- Visualización de estudiantes inscritos.

### Para Administradores
- Dashboard administrativo completo.
- Gestión de usuarios.
- Creación y edición de anuncios.
- Estadísticas del sistema.
- Control de acceso basado en roles.

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Estilos**: Tailwind CSS
- **Roteamento**: React Router DOM
- **Animações**: Framer Motion
- **Ícones**: Lucide React
- **Linting**: ESLint
- **Build Tool**: Vite

## 📚 Documentación

La documentación del proyecto está organizada en las siguientes secciones:

- **Configuración**:
  - [Instrucciones de configuración](./docs/setup/SETUP_INSTRUCTIONS.md) - Guía paso a paso para configurar el proyecto.
- **Solución de Problemas**:
  - [Corrección de errores](./docs/troubleshooting/ERROR_FIXES.md) - Soluciones a problemas comunes.
  - [Solución error 404 modal](./docs/troubleshooting/SOLUCION_ERROR_404_MODAL.md) - Solución específica para errores de modal.
- **Características**:
  - [Sistema de evaluación](./docs/features/EVALUATION_SYSTEM_SUMMARY.md) - Resumen del sistema de evaluación.
  - [Modal de preguntas](./docs/features/MODAL_PREGUNTAS_DOCUMENTACION.md) - Documentación del modal de preguntas.
- **Políticas y Configuraciones**:
  - [Políticas en cascada](./docs/policies/CASCADE_POLICIES_DOCUMENTATION.md) - Documentación de políticas de base de datos.

## 🏗️ Estructura del Proyecto

```
project_seminario/
├── docs/                    # Documentación del proyecto
├── src/                     # Código fuente
│   ├── components/         # Componentes React
│   ├── pages/              # Páginas de la aplicación
│   ├── services/           # Servicios y API
│   ├── types/              # Definiciones de tipos TypeScript
│   └── ...
├── supabase/               # Configuración y migraciones de Supabase
└── ...
```

## 🤝 Contribución

Para contribuir al proyecto, consulta la documentación en la carpeta `docs/` para obtener información detallada sobre la estructura y funcionamiento del sistema.

Para reportar bugs o solicitar funcionalidades, abra una issue no repositório o entre em contato através do email: ipamarcospaz@gmail.com

## 📝 Licencia

Este proyecto está bajo la licencia que se especifica en el archivo de licencia correspondiente.
