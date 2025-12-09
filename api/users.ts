// ============================================
// USERS API - Vercel Serverless Function
// Gestión de usuarios con Supabase
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, isSupabaseConfigured } from './_lib/supabase.js';
import crypto from 'crypto';

// Hash password with SHA-256
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// CORS headers helper
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verificar que Supabase está configurado
  if (!isSupabaseConfigured) {
    return res.status(503).json({
      success: false,
      error: 'Base de datos no configurada.',
    });
  }

  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const id = pathParts[pathParts.length - 1] !== 'users' ? pathParts[pathParts.length - 1] : null;

  // ============================================
  // GET /api/users - Listar usuarios
  // ============================================
  if (req.method === 'GET' && !id) {
    try {
      const { role, status, search, page = '1', limit = '10' } = req.query;

      let query = supabaseAdmin
        .from('users')
        .select('id, email, first_name, last_name, role, is_active, created_at', { count: 'exact' });

      // Filtrar por rol
      if (role && role !== 'all') {
        query = query.eq('role', role);
      }

      // Filtrar por estado
      if (status && status !== 'all') {
        query = query.eq('is_active', status === 'active');
      }

      // Búsqueda por nombre o email
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      // Paginación
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const offset = (pageNum - 1) * limitNum;

      query = query.range(offset, offset + limitNum - 1).order('created_at', { ascending: false });

      const { data: users, error, count } = await query;

      if (error) {
        console.error('Error obteniendo usuarios:', error);
        return res.status(500).json({
          success: false,
          error: 'Error al obtener usuarios',
        });
      }

      // Obtener estadísticas
      const { data: stats } = await supabaseAdmin
        .from('users')
        .select('role, is_active');

      const statsData = stats || [];

      return res.status(200).json({
        success: true,
        data: users?.map((u) => ({
          id: u.id,
          email: u.email,
          firstName: u.first_name,
          lastName: u.last_name,
          role: u.role,
          status: u.is_active ? 'active' : 'inactive',
          createdAt: u.created_at,
        })) || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limitNum),
        },
        stats: {
          total: statsData.length,
          active: statsData.filter((u) => u.is_active).length,
          inactive: statsData.filter((u) => !u.is_active).length,
          byRole: {
            ADMIN: statsData.filter((u) => u.role === 'ADMIN').length,
            PROFESOR: statsData.filter((u) => u.role === 'PROFESOR').length,
            ALUMNO: statsData.filter((u) => u.role === 'ALUMNO').length,
          },
        },
      });
    } catch (error) {
      console.error('Error en GET /api/users:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // ============================================
  // GET /api/users/:id - Obtener usuario
  // ============================================
  if (req.method === 'GET' && id) {
    try {
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('id, email, first_name, last_name, role, is_active, created_at, last_login')
        .eq('id', id)
        .single();

      if (error || !user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado',
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          status: user.is_active ? 'active' : 'inactive',
          createdAt: user.created_at,
          lastLogin: user.last_login,
        },
      });
    } catch (error) {
      console.error('Error en GET /api/users/:id:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // ============================================
  // POST /api/users - Crear usuario
  // ============================================
  if (req.method === 'POST') {
    try {
      const { email, password, firstName, lastName, role, status = 'active' } = req.body;

      if (!email || !password || !firstName || !lastName || !role) {
        return res.status(400).json({
          success: false,
          error: 'Campos requeridos: email, password, firstName, lastName, role',
        });
      }

      // Verificar si el email ya existe
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'El email ya está registrado',
        });
      }

      // Crear usuario
      const { data: newUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          email: email.toLowerCase(),
          password: hashPassword(password),
          first_name: firstName,
          last_name: lastName,
          role: role,
          is_active: status === 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creando usuario:', error);
        return res.status(500).json({
          success: false,
          error: 'Error al crear usuario',
        });
      }

      return res.status(201).json({
        success: true,
        data: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          role: newUser.role,
          status: newUser.is_active ? 'active' : 'inactive',
          createdAt: newUser.created_at,
        },
      });
    } catch (error) {
      console.error('Error en POST /api/users:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // ============================================
  // PUT /api/users/:id - Actualizar usuario
  // ============================================
  if (req.method === 'PUT' && id) {
    try {
      const { email, password, firstName, lastName, role, status } = req.body;

      // Verificar que el usuario existe
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', id)
        .single();

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado',
        });
      }

      // Construir objeto de actualización
      const updateData: Record<string, unknown> = {};
      if (email) updateData.email = email.toLowerCase();
      if (password) updateData.password = hashPassword(password);
      if (firstName) updateData.first_name = firstName;
      if (lastName) updateData.last_name = lastName;
      if (role) updateData.role = role;
      if (status !== undefined) updateData.is_active = status === 'active';

      const { data: updatedUser, error } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando usuario:', error);
        return res.status(500).json({
          success: false,
          error: 'Error al actualizar usuario',
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          role: updatedUser.role,
          status: updatedUser.is_active ? 'active' : 'inactive',
        },
      });
    } catch (error) {
      console.error('Error en PUT /api/users/:id:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // ============================================
  // DELETE /api/users/:id - Eliminar usuario
  // ============================================
  if (req.method === 'DELETE' && id) {
    try {
      // Verificar que el usuario existe
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', id)
        .single();

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado',
        });
      }

      // Soft delete - solo desactivar
      const { error } = await supabaseAdmin
        .from('users')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Error eliminando usuario:', error);
        return res.status(500).json({
          success: false,
          error: 'Error al eliminar usuario',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Usuario eliminado correctamente',
      });
    } catch (error) {
      console.error('Error en DELETE /api/users/:id:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
