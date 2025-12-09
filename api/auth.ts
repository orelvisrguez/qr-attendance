// ============================================
// AUTH API - Vercel Serverless Function
// Autenticación con Supabase
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, isSupabaseConfigured } from './_lib/supabase.js';
import crypto from 'crypto';

// Hash password with SHA-256 (usar bcrypt en producción para mayor seguridad)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// CORS headers helper
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
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
      error: 'Base de datos no configurada. Por favor configure las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.',
    });
  }

  // ============================================
  // POST /api/auth - Login
  // ============================================
  if (req.method === 'POST') {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email y contraseña son requeridos',
        });
      }

      // Buscar usuario en Supabase
      const { data: dbUser, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .single();

      if (error || !dbUser) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas',
        });
      }

      // Verificar contraseña (soporta hash SHA-256 y texto plano para desarrollo)
      const hashedPassword = hashPassword(password);
      if (dbUser.password !== hashedPassword && dbUser.password !== password) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas',
        });
      }

      // Construir objeto de usuario
      const user = {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.first_name,
        lastName: dbUser.last_name,
        role: dbUser.role,
        isActive: dbUser.is_active,
      };

      // Generar token JWT simple
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        iat: Date.now(),
        exp: Date.now() + 24 * 60 * 60 * 1000, // 24 horas
      };
      const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

      // Actualizar último login
      await supabaseAdmin
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', dbUser.id);

      return res.status(200).json({
        success: true,
        data: {
          user: {
            ...user,
            accessToken: token,
          },
          token,
        },
      });
    } catch (error) {
      console.error('Error en login:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // ============================================
  // GET /api/auth - Verificar sesión
  // ============================================
  if (req.method === 'GET') {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Token no proporcionado',
        });
      }

      const token = authHeader.substring(7);

      try {
        const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));

        if (payload.exp < Date.now()) {
          return res.status(401).json({
            success: false,
            error: 'Token expirado',
          });
        }

        // Obtener usuario actualizado de la base de datos
        const { data: user, error } = await supabaseAdmin
          .from('users')
          .select('id, email, first_name, last_name, role, is_active')
          .eq('id', payload.userId)
          .eq('is_active', true)
          .single();

        if (error || !user) {
          return res.status(401).json({
            success: false,
            error: 'Usuario no encontrado',
          });
        }

        return res.status(200).json({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              firstName: user.first_name,
              lastName: user.last_name,
              role: user.role,
              isActive: user.is_active,
            },
          },
        });
      } catch {
        return res.status(401).json({
          success: false,
          error: 'Token inválido',
        });
      }
    } catch (error) {
      console.error('Error verificando sesión:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // ============================================
  // DELETE /api/auth - Logout
  // ============================================
  if (req.method === 'DELETE') {
    return res.status(200).json({
      success: true,
      message: 'Sesión cerrada',
    });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
