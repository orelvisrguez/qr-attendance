// ============================================
// USERS API ROUTES
// CRUD completo para gestión de usuarios
// ============================================

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Tipos
interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'PROFESOR' | 'ALUMNO';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Mock database (en producción: usar Prisma)
let USERS_DB: User[] = [
  {
    id: '1',
    email: 'admin@demo.com',
    password: 'demo123',
    firstName: 'Administrador',
    lastName: 'Sistema',
    role: 'ADMIN',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    email: 'profesor@demo.com',
    password: 'demo123',
    firstName: 'Juan',
    lastName: 'Pérez',
    role: 'PROFESOR',
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '3',
    email: 'maria.garcia@demo.com',
    password: 'demo123',
    firstName: 'María',
    lastName: 'García',
    role: 'PROFESOR',
    isActive: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: '4',
    email: 'alumno@demo.com',
    password: 'demo123',
    firstName: 'Carlos',
    lastName: 'López',
    role: 'ALUMNO',
    isActive: true,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
  },
  {
    id: '5',
    email: 'ana.martinez@demo.com',
    password: 'demo123',
    firstName: 'Ana',
    lastName: 'Martínez',
    role: 'ALUMNO',
    isActive: true,
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15'),
  },
  {
    id: '6',
    email: 'pedro.sanchez@demo.com',
    password: 'demo123',
    firstName: 'Pedro',
    lastName: 'Sánchez',
    role: 'ALUMNO',
    isActive: false,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
  },
  {
    id: '7',
    email: 'lucia.fernandez@demo.com',
    password: 'demo123',
    firstName: 'Lucía',
    lastName: 'Fernández',
    role: 'ALUMNO',
    isActive: true,
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-03-10'),
  },
  {
    id: '8',
    email: 'diego.rodriguez@demo.com',
    password: 'demo123',
    firstName: 'Diego',
    lastName: 'Rodríguez',
    role: 'ALUMNO',
    isActive: true,
    createdAt: new Date('2024-03-15'),
    updatedAt: new Date('2024-03-15'),
  },
];

// Helper: excluir password
const excludePassword = (user: User) => {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

// GET /api/users - Listar usuarios con filtros y paginación
router.get('/', (req: Request, res: Response) => {
  try {
    const {
      search = '',
      role = '',
      status = '',
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    let filtered = [...USERS_DB];

    // Filtro por búsqueda (nombre o email)
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.firstName.toLowerCase().includes(searchLower) ||
          u.lastName.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por rol
    if (role && role !== 'ALL') {
      filtered = filtered.filter((u) => u.role === role);
    }

    // Filtro por estado
    if (status === 'active') {
      filtered = filtered.filter((u) => u.isActive);
    } else if (status === 'inactive') {
      filtered = filtered.filter((u) => !u.isActive);
    }

    // Ordenar
    filtered.sort((a, b) => {
      const aVal = a[sortBy as keyof User];
      const bVal = b[sortBy as keyof User];

      if (aVal instanceof Date && bVal instanceof Date) {
        return sortOrder === 'asc'
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return 0;
    });

    // Paginación
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginated = filtered.slice(startIndex, endIndex);

    // Estadísticas
    const stats = {
      total: USERS_DB.length,
      active: USERS_DB.filter((u) => u.isActive).length,
      inactive: USERS_DB.filter((u) => !u.isActive).length,
      admins: USERS_DB.filter((u) => u.role === 'ADMIN').length,
      profesores: USERS_DB.filter((u) => u.role === 'PROFESOR').length,
      alumnos: USERS_DB.filter((u) => u.role === 'ALUMNO').length,
    };

    res.json({
      success: true,
      data: paginated.map(excludePassword),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limitNum),
      },
      stats,
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ success: false, error: 'Error al listar usuarios' });
  }
});

// GET /api/users/:id - Obtener usuario por ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const user = USERS_DB.find((u) => u.id === req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    res.json({ success: true, data: excludePassword(user) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener usuario' });
  }
});

// POST /api/users - Crear nuevo usuario
router.post('/', (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Validaciones
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son requeridos',
      });
    }

    // Verificar email único
    if (USERS_DB.some((u) => u.email === email)) {
      return res.status(400).json({
        success: false,
        error: 'El email ya está registrado',
      });
    }

    // Validar rol
    if (!['ADMIN', 'PROFESOR', 'ALUMNO'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Rol inválido',
      });
    }

    const newUser: User = {
      id: uuidv4(),
      email,
      password, // En producción: hashear con bcrypt
      firstName,
      lastName,
      role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    USERS_DB.push(newUser);

    res.status(201).json({
      success: true,
      data: excludePassword(newUser),
      message: 'Usuario creado exitosamente',
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: 'Error al crear usuario' });
  }
});

// PUT /api/users/:id - Actualizar usuario
router.put('/:id', (req: Request, res: Response) => {
  try {
    const userIndex = USERS_DB.findIndex((u) => u.id === req.params.id);

    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    const { email, firstName, lastName, role, password } = req.body;
    const currentUser = USERS_DB[userIndex];

    // Verificar email único (si se cambió)
    if (email && email !== currentUser.email) {
      if (USERS_DB.some((u) => u.email === email && u.id !== req.params.id)) {
        return res.status(400).json({
          success: false,
          error: 'El email ya está registrado',
        });
      }
    }

    // Actualizar campos
    USERS_DB[userIndex] = {
      ...currentUser,
      email: email || currentUser.email,
      firstName: firstName || currentUser.firstName,
      lastName: lastName || currentUser.lastName,
      role: role || currentUser.role,
      password: password || currentUser.password,
      updatedAt: new Date(),
    };

    res.json({
      success: true,
      data: excludePassword(USERS_DB[userIndex]),
      message: 'Usuario actualizado exitosamente',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar usuario' });
  }
});

// PATCH /api/users/:id/toggle-status - Activar/Desactivar usuario
router.patch('/:id/toggle-status', (req: Request, res: Response) => {
  try {
    const userIndex = USERS_DB.findIndex((u) => u.id === req.params.id);

    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    USERS_DB[userIndex].isActive = !USERS_DB[userIndex].isActive;
    USERS_DB[userIndex].updatedAt = new Date();

    res.json({
      success: true,
      data: excludePassword(USERS_DB[userIndex]),
      message: USERS_DB[userIndex].isActive
        ? 'Usuario activado'
        : 'Usuario desactivado',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al cambiar estado' });
  }
});

// DELETE /api/users/:id - Eliminar usuario
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const userIndex = USERS_DB.findIndex((u) => u.id === req.params.id);

    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    // Prevenir eliminar el último admin
    const user = USERS_DB[userIndex];
    if (user.role === 'ADMIN') {
      const adminCount = USERS_DB.filter((u) => u.role === 'ADMIN').length;
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'No se puede eliminar el último administrador',
        });
      }
    }

    USERS_DB.splice(userIndex, 1);

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al eliminar usuario' });
  }
});

export default router;
