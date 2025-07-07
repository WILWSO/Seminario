import { useState, useEffect } from 'react';
import { User, Search, Filter, Plus, Edit, Trash, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { adminService } from '../../services/api';
import { supabase } from '../../config/supabase';
import type { User as UserType } from '../../config/supabase';

const ManageUsers = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all'
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const usersData = await adminService.getAllUsers();
        setUsers(usersData);
        setFilteredUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
        setFilteredUsers([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUsers();
  }, []);

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
      // Usar a função do Supabase para adicionar role
      const { error } = await supabase.rpc('add_user_role', {
        user_id: userId,
        new_role: newRole
      });

      if (error) throw error;

      // Atualizar estado local
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, role: [...(user.role || []), newRole] }
            : user
        )
      );
    } catch (error) {
      console.error('Error adding role:', error);
      alert('Error al agregar rol: ' + (error as Error).message);
    }
  };

  const handleRemoveRole = async (userId: string, roleToRemove: 'student' | 'teacher' | 'admin') => {
    // Verificar se é o último role
    const user = users.find(u => u.id === userId);
    if (user && user.role && user.role.length <= 1) {
      alert('No se puede eliminar el último rol del usuario. Cada usuario debe tener al menos un rol.');
      return;
    }
    
    try {
      // Usar a função do Supabase para remover role
      const { error } = await supabase.rpc('remove_user_role', {
        user_id: userId,
        old_role: roleToRemove
      });

      if (error) throw error;

      // Atualizar estado local
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, role: (user.role || []).filter(r => r !== roleToRemove) }
            : user
        )
      );
    } catch (error) {
      console.error('Error removing role:', error);
      alert('Error al remover rol: ' + (error as Error).message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await adminService.deleteUser(userId);
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error al eliminar usuario: ' + (error as Error).message);
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
                          {role !== 'student' && (
                            <button
                              onClick={() => handleRemoveRole(user.id, role as any)}
                              className="ml-1 text-red-500 hover:text-red-700 text-xs"
                              title="Remover rol"
                            >
                              ×
                            </button>
                          )}
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