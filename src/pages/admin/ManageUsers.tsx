import { useState, useEffect } from 'react';
import { User, Search, Filter, Edit, Trash, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../config/supabase';
import type { User as UserType } from '../../config/supabase';
import { useNotifications } from '../../contexts/NotificationContext';;


const ManageUsers = () => {
  const { showSuccess, showError } = useNotifications();
  const [users, setUsers] = useState<UserType[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [userLinks, setUserLinks] = useState<Record<string, any>>({});
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all'
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        setUsers(data || []);
        setFilteredUsers(data || []);
        
        // Cargar vínculos para cada usuario
        if (data) {
          await loadUserLinks(data);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        showError(
          'Error al cargar usuarios',
          'No se pudieron cargar los usuarios. Por favor, intente nuevamente.',
          5000
        );
        setUsers([]);
        setFilteredUsers([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUsers();
  }, []);

  const loadUserLinks = async (usersList: UserType[]) => {
    try {
      const linksData: Record<string, any> = {};
      
      // Inicializar datos para todos los usuarios
      usersList.forEach(user => {
        linksData[user.id] = {
          enrollments: 0,
          courses: 0,
          isOnlyAdmin: false
        };
      });

      // Obtener todos los IDs de usuarios con cada rol
      const studentIds = usersList.filter(user => user.role?.includes('student')).map(u => u.id);
      const teacherIds = usersList.filter(user => user.role?.includes('teacher')).map(u => u.id);
      const adminIds = usersList.filter(user => user.role?.includes('admin')).map(u => u.id);

      // Consulta masiva para matrículas activas (estudiantes)
      if (studentIds.length > 0) {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('user_id')
          .in('user_id', studentIds)
          .eq('is_active', true);

        if (enrollments) {
          // Contar matrículas por usuario
          const enrollmentCounts = enrollments.reduce((acc, enrollment) => {
            acc[enrollment.user_id] = (acc[enrollment.user_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          // Actualizar datos
          Object.keys(enrollmentCounts).forEach(userId => {
            if (linksData[userId]) {
              linksData[userId].enrollments = enrollmentCounts[userId];
            }
          });
        }
      }

      // Consulta masiva para cursos (profesores)
      if (teacherIds.length > 0) {
        const { data: courses } = await supabase
          .from('courses')
          .select('teacher_id')
          .in('teacher_id', teacherIds);

        if (courses) {
          // Contar cursos por profesor
          const courseCounts = courses.reduce((acc, course) => {
            acc[course.teacher_id] = (acc[course.teacher_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          // Actualizar datos
          Object.keys(courseCounts).forEach(userId => {
            if (linksData[userId]) {
              linksData[userId].courses = courseCounts[userId];
            }
          });
        }
      }

      // Verificar administradores únicos (solo una consulta)
      if (adminIds.length > 0) {
        const { data: allAdmins } = await supabase
          .from('users')
          .select('id, role')
          .contains('role', ['admin']);

        if (allAdmins) {
          const activeAdminIds = allAdmins
            .filter(admin => admin.role?.includes('admin'))
            .map(admin => admin.id);

          // Si solo hay un administrador activo, marcarlo
          if (activeAdminIds.length === 1) {
            const onlyAdminId = activeAdminIds[0];
            if (linksData[onlyAdminId]) {
              linksData[onlyAdminId].isOnlyAdmin = true;
            }
          }
        }
      }
      
      setUserLinks(linksData);
    } catch (error) {
      console.error('Error loading user links:', error);
    }
  };

  const updateUserLinks = async (userId: string, role: 'student' | 'teacher' | 'admin', action: 'add' | 'remove') => {
    try {
      const currentLinks = userLinks[userId] || {
        enrollments: 0,
        courses: 0,
        isOnlyAdmin: false
      };

      if (action === 'add') {
        // Al agregar un rol, verificar si necesita actualizar los vínculos
        if (role === 'student') {
          // Verificar matrículas para el nuevo estudiante
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('user_id')
            .eq('user_id', userId)
            .eq('is_active', true);
          currentLinks.enrollments = enrollments?.length || 0;
        }
        
        if (role === 'teacher') {
          // Verificar cursos para el nuevo profesor
          const { data: courses } = await supabase
            .from('courses')
            .select('teacher_id')
            .eq('teacher_id', userId);
          currentLinks.courses = courses?.length || 0;
        }
        
        if (role === 'admin') {
          // Verificar si será el único administrador
          const { data: allAdmins } = await supabase
            .from('users')
            .select('id, role')
            .contains('role', ['admin']);
          
          if (allAdmins) {
            const activeAdminIds = allAdmins
              .filter(admin => admin.role?.includes('admin'))
              .map(admin => admin.id);
            currentLinks.isOnlyAdmin = activeAdminIds.length === 1;
          }
        }
      } else if (action === 'remove') {
        // Al eliminar un rol, limpiar los vínculos correspondientes
        if (role === 'student') {
          currentLinks.enrollments = 0;
        }
        if (role === 'teacher') {
          currentLinks.courses = 0;
        }
        if (role === 'admin') {
          currentLinks.isOnlyAdmin = false;
        }
      }

      // Actualizar el estado local
      setUserLinks(prevLinks => ({
        ...prevLinks,
        [userId]: currentLinks
      }));
    } catch (error) {
      console.error('Error updating user links:', error);
    }
  };

  useEffect(() => {
    // Apply filters and search
    let result = [...users];
    
    // Apply role filter
    if (filters.role !== 'all') {
      result = result.filter(user => user.role?.includes(filters.role as any));
    }
    
    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        user => 
          (user.name?.toLowerCase().includes(term)) ||
          (user.first_name?.toLowerCase().includes(term)) ||
          (user.last_name?.toLowerCase().includes(term)) ||
          user.email.toLowerCase().includes(term)
      );
    }
    
    setFilteredUsers(result);
  }, [users, searchTerm, filters]);

  const handleAddRole = async (userId: string, newRole: 'student' | 'teacher' | 'admin') => {
    try {
      const { error } = await supabase.rpc('add_user_role', {
        user_id: userId,
        new_role: newRole
      });

      if (error) throw error;

      // Actualizar el usuario en el estado
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, role: [...(user.role || []), newRole] }
            : user
        )
      );

      // Actualizar los enlaces del usuario específico
      await updateUserLinks(userId, newRole, 'add');
      
      showSuccess(
        'Rol agregado',
        `Se ha agregado el rol ${newRole} al usuario correctamente.`,
        3000
      );
    } catch (error) {
      console.error('Error adding role:', error);
      showError(
        'Error al agregar rol',
        'No se pudo agregar el rol. Por favor, intente nuevamente.',
        5000
      );
    }
  };

  const handleRemoveRole = async (userId: string, roleToRemove: 'student' | 'teacher' | 'admin') => {
    try {
      // Verificar vínculos activos antes de eliminar el rol
      const hasActiveLinks = await checkActiveLinks(userId, roleToRemove);
      
      if (hasActiveLinks.hasLinks) {
        showError(
          'No se puede eliminar el rol',
          hasActiveLinks.message,
          8000
        );
        return;
      }

      const { error } = await supabase.rpc('remove_user_role', {
        user_id: userId,
        old_role: roleToRemove
      });

      if (error) throw error;

      // Actualizar el usuario en el estado
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, role: (user.role || []).filter(r => r !== roleToRemove) }
            : user
        )
      );

      // Actualizar los enlaces del usuario específico
      await updateUserLinks(userId, roleToRemove, 'remove');
      
      showSuccess(
        'Rol eliminado',
        `Se ha eliminado el rol ${roleToRemove} del usuario correctamente.`,
        3000
      );
    } catch (error) {
      console.error('Error removing role:', error);
      showError(
        'Error al eliminar rol',
        'No se pudo eliminar el rol. Por favor, intente nuevamente.',
        5000
      );
    }
  };

  const checkActiveLinks = async (userId: string, roleToRemove: 'student' | 'teacher' | 'admin') => {
    try {
      let hasLinks = false;
      let message = '';
      let details: string[] = [];

      // Primero verificar con datos ya cargados
      const userLink = userLinks[userId];
      
      if (roleToRemove === 'student') {
        // Usar datos ya cargados si están disponibles
        if (userLink && userLink.enrollments > 0) {
          hasLinks = true;
          details.push(`${userLink.enrollments} matrícula(s) activa(s) como estudiante`);
          
          // Solo consultar detalles adicionales (nombres de cursos) si es necesario
          try {
            const { data: enrollments } = await supabase
              .from('enrollments')
              .select('course:courses(name)')
              .eq('user_id', userId)
              .eq('is_active', true)
              .limit(5); // Limitar para evitar consultas muy grandes

            if (enrollments) {
              const courseNames = enrollments.map((e: any) => e.course?.name).filter(Boolean);
              if (courseNames.length > 0) {
                details.push(`Cursos: ${courseNames.slice(0, 3).join(', ')}${courseNames.length > 3 ? '...' : ''}`);
              }
            }
          } catch (error) {
            console.warn('Error fetching course details:', error);
          }
        }
      }

      if (roleToRemove === 'teacher') {
        // Usar datos ya cargados si están disponibles
        if (userLink && userLink.courses > 0) {
          hasLinks = true;
          details.push(`${userLink.courses} curso(s) como profesor`);
          
          // Solo consultar detalles adicionales (nombres de cursos) si es necesario
          try {
            const { data: courses } = await supabase
              .from('courses')
              .select('name')
              .eq('teacher_id', userId)
              .limit(5); // Limitar para evitar consultas muy grandes

            if (courses) {
              const courseNames = courses.map(c => c.name);
              details.push(`Cursos: ${courseNames.slice(0, 3).join(', ')}${courseNames.length > 3 ? '...' : ''}`);
            }
          } catch (error) {
            console.warn('Error fetching course details:', error);
          }
        }
      }

      if (roleToRemove === 'admin') {
        // Usar datos ya cargados si están disponibles
        if (userLink && userLink.isOnlyAdmin) {
          hasLinks = true;
          details.push('Este es el único administrador del sistema');
        }
      }

      if (hasLinks) {
        message = `No se puede eliminar el rol ${roleToRemove} porque el usuario tiene vínculos activos:\n\n${details.join('\n')}\n\nPara eliminar este rol, primero debe:\n`;
        
        if (roleToRemove === 'student') {
          message += '• Desmatricular al usuario de todos los cursos\n• O transferir las matrículas a otro usuario';
        } else if (roleToRemove === 'teacher') {
          message += '• Asignar los cursos a otro profesor\n• O eliminar los cursos si ya no son necesarios';
        } else if (roleToRemove === 'admin') {
          message += '• Promover a otro usuario como administrador\n• O mantener al menos un administrador activo';
        }
      }

      return { hasLinks, message };
    } catch (error) {
      console.error('Error checking active links:', error);
      return { 
        hasLinks: true, 
        message: 'Error al verificar vínculos activos. Por seguridad, no se puede eliminar el rol.' 
      };
    }
  };

  const handleDeleteUser = async (userId: string) => {
    // Obtener información del usuario y sus vínculos
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Preparar mensaje de advertencia basado en los vínculos conocidos
    const userLink = userLinks[userId];
    
    let warningMessage = '¿Está seguro de que desea eliminar este usuario?\n\n';
    
    // Verificar vínculos basándose en los roles y datos ya cargados
    const cascadeWarnings = [];
    
    if (user.role?.includes('student') && userLink?.enrollments > 0) {
      cascadeWarnings.push(`• ${userLink.enrollments} matrícula(s) activa(s) serán eliminadas`);
    }
    
    if (user.role?.includes('teacher') && userLink?.courses > 0) {
      cascadeWarnings.push(`• ${userLink.courses} curso(s) activo(s) - ELIMINACIÓN BLOQUEADA (RESTRICT)`);
    }
    
    if (user.role?.includes('admin') && userLink?.isOnlyAdmin) {
      cascadeWarnings.push('• ¡ADVERTENCIA! Este es el único administrador del sistema');
    }
    
    // Agregar advertencias adicionales sobre posibles vínculos en cascada
    const additionalWarnings = [];
    
    // Advertencias específicas basadas en la configuración real de CASCADE
    if (user.role?.includes('student')) {
      additionalWarnings.push('• Todas las entregas de tareas del estudiante serán eliminadas (CASCADE)');
      additionalWarnings.push('• Todas las calificaciones del estudiante serán eliminadas (CASCADE)');
      additionalWarnings.push('• El progreso de aprendizaje del estudiante será eliminado (CASCADE)');
    }
    
    if (user.role?.includes('teacher')) {
      additionalWarnings.push('• Los cursos del profesor quedarán sin instructor (RESTRICT - puede fallar)');
      additionalWarnings.push('• Las calificaciones asignadas por el profesor se mantendrán (SET NULL)');
    }
    
    // Advertencias generales para todos los usuarios
    additionalWarnings.push('• Los anuncios creados por el usuario se mantendrán (SET NULL)');
    additionalWarnings.push('• El historial de actividad del usuario se perderá permanentemente');
    
    if (cascadeWarnings.length > 0 || user.role?.length > 0) {
      warningMessage += '⚠️ ELIMINACIÓN EN CASCADA:\n';
      warningMessage += 'Esta acción eliminará automáticamente:\n\n';
      
      if (cascadeWarnings.length > 0) {
        warningMessage += cascadeWarnings.join('\n') + '\n';
      }
      
      warningMessage += additionalWarnings.join('\n') + '\n\n';
      warningMessage += 'Esta acción NO se puede deshacer.\n\n';
      
      if (userLink?.isOnlyAdmin) {
        warningMessage += '❌ ACCIÓN BLOQUEADA: No se puede eliminar al único administrador del sistema.\n';
        warningMessage += 'Debe asignar el rol de administrador a otro usuario antes de continuar.';
        
        showError(
          'No se puede eliminar usuario',
          'Este es el único administrador del sistema. Debe asignar el rol de administrador a otro usuario antes de eliminar este usuario.',
          8000
        );
        return;
      }
      
      if (user.role?.includes('teacher') && userLink?.courses > 0) {
        warningMessage += '❌ ACCIÓN BLOQUEADA: No se puede eliminar un profesor con cursos activos.\n';
        warningMessage += 'Debe reasignar los cursos a otro profesor antes de continuar.';
        
        showError(
          'No se puede eliminar usuario',
          `Este profesor tiene ${userLink.courses} curso(s) activo(s). Debe reasignar los cursos a otro profesor antes de eliminar este usuario.`,
          8000
        );
        return;
      }
      
      warningMessage += '¿Desea continuar con la eliminación?';
    } else {
      warningMessage += 'Esta acción no se puede deshacer.\n¿Desea continuar?';
    }

    if (!window.confirm(warningMessage)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      
      showSuccess(
        'Usuario eliminado',
        'El usuario y todos sus datos asociados han sido eliminados correctamente.',
        3000
      );
    } catch (error) {
      console.error('Error deleting user:', error);
      showError(
        'Error al eliminar usuario',
        'No se pudo eliminar el usuario. Por favor, intente nuevamente.',
        5000
      );
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'teacher':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'teacher': return 'Profesor';
      case 'student': return 'Estudiante';
      default: return role;
    }
  };

  const getAvailableRoles = (userRoles: string[]) => {
    const allRoles = ['student', 'teacher', 'admin'];
    return allRoles.filter(role => !userRoles.includes(role));
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">      
      {/* NotificationContext es aplicado en App globalmente sin necesidad de agregar codigo acá*/}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Administrar usuarios
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gestione los usuarios del sistema y sus roles
          </p>
        </div>
      </div>

      {/* Información sobre vínculos y eliminaciones */}
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Información sobre eliminación de roles
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Los roles no se pueden eliminar si el usuario tiene vínculos activos. 
                El ícono <AlertTriangle size={12} className="inline mx-1 text-amber-500" /> indica vínculos que impiden la eliminación.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Eliminación en cascada de usuarios
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Al eliminar un usuario, se eliminarán automáticamente todos sus datos relacionados: 
                matrículas, tareas, entregas, comentarios y participaciones. Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Buscar usuarios por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition"
          >
            <Filter size={18} className="mr-2" />
            Filtros
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Rol
                </label>
                <select
                  value={filters.role}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                  title="Filtrar por rol"
                >
                  <option value="all">Todos los roles</option>
                  <option value="student">Estudiantes</option>
                  <option value="teacher">Profesores</option>
                  <option value="admin">Administradores</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Users List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-750">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Fecha de registro
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {filteredUsers.map((user) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-750"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-sky-100 dark:bg-sky-900 flex items-center justify-center">
                          <User className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-800 dark:text-white">
                          {user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Sin nombre'}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {(user.role || []).map((role, index) => (
                        <div key={index} className="flex items-center">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(role)}`}>
                            {getRoleDisplayName(role)}
                          </span>
                          {(user.role || []).length > 1 && (
                            <div className="flex items-center ml-1">
                              <button
                                onClick={() => handleRemoveRole(user.id, role as any)}
                                className="text-red-500 hover:text-red-700 text-xs"
                                title="Remover rol"
                              >
                                ×
                              </button>
                            </div>
                          )}
                          {/* Indicador de vínculos activos específico por rol */}
                          {(() => {
                            const userLink = userLinks[user.id];
                            let hasRoleLinks = false;
                            let roleWarnings = [];
                            
                            if (role === 'student' && userLink?.enrollments > 0) {
                              hasRoleLinks = true;
                              roleWarnings.push(`${userLink.enrollments} matrícula(s) activa(s)`);
                            }
                            
                            if (role === 'teacher' && userLink?.courses > 0) {
                              hasRoleLinks = true;
                              roleWarnings.push(`${userLink.courses} curso(s) como profesor`);
                            }
                            
                            if (role === 'admin' && userLink?.isOnlyAdmin) {
                              hasRoleLinks = true;
                              roleWarnings.push('Único administrador');
                            }
                            
                            return hasRoleLinks ? (
                              <div className="ml-1" title={`${roleWarnings.join(', ')}`}>
                                <AlertTriangle size={12} className="text-amber-500" />
                              </div>
                            ) : null;
                          })()}
                        </div>
                      ))}
                      
                      {/* Dropdown para agregar roles */}
                      {getAvailableRoles(user.role || []).length > 0 && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddRole(user.id, e.target.value as any);
                              e.target.value = '';
                            }
                          }}
                          className="text-xs border border-slate-300 dark:border-slate-600 rounded px-2 py-1 dark:bg-slate-700 dark:text-white"
                          defaultValue=""
                          title="Agregar rol al usuario"
                        >
                          <option value="">+ Agregar rol</option>
                          {getAvailableRoles(user.role || []).map(role => (
                            <option key={role} value={role}>
                              {getRoleDisplayName(role)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {new Date(user.created_at).toLocaleDateString('es-AR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        className="text-sky-600 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title="Eliminar"
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
                <Search size={24} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-1">
                No se encontraron usuarios
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {searchTerm || filters.role !== 'all' 
                  ? 'No hay usuarios que coincidan con los criterios de búsqueda'
                  : 'No hay usuarios registrados en el sistema'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageUsers;