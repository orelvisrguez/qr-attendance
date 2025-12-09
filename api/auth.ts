// ============================================
// AUTH API - Vercel Serverless Function
// Autenticación con Supabase + fallback mock
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import crypto from 'crypto';

// Mock users para demo (cuando la DB no tiene usuarios)
const MOCK_USERS = [
  {
    id: 'admin-001',
    email: 'admin@demo.com',
    password: 'demo123',
    firstName: 'Carlos',
    lastName: 'Administrador',
    role: 'ADMIN',
    isActive: true,
  },
  {
    id: 'profesor-001',
    email: 'profesor@demo.com',
    password: 'demo123',
    firstName: 'María',
    lastName: 'González',
    role: 'PROFESOR',
    isActive: true,
  },
  {
    id: 'alumno-001',
    email: 'alumno@demo.com',
    password: 'demo123',
    firstName: 'Juan',
    lastName: 'Pérez',
    role: 'ALUMNO',
    isActive: true,
  },
];

// Hash password with SHA-256 (simple para demo, usar bcrypt en producción)
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

      // Intentar buscar usuario en Supabase
      let user = null;
      let isFromDatabase = false;

      try {
        const { data: dbUser, error } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', email.toLowerCase())
          .eq('is_active', true)
          .single();

        if (dbUser && !error) {
          // Verificar contraseña (asumiendo hash SHA-256)
          const hashedPassword = hashPassword(password);
          if (dbUser.password === hashedPassword || dbUser.password === password) {
            user = {
              id: dbUser.id,
              email: dbUser.email,
              firstName: dbUser.first_name,
              lastName: dbUser.last_name,
              role: dbUser.role,
              isActive: dbUser.is_active,
            };
            isFromDatabase = true;
          }
        }
      } catch (dbError) {
        console.log('Database not available, using mock users');
      }

      // Fallback a usuarios mock si no hay DB o no se encontró usuario
      if (!user) {
        const mockUser = MOCK_USERS.find(
          (u) => u.email.toLowerCase() === email.toLowerCase()
        );

        if (mockUser && mockUser.password === password) {
          const { password: _, ...userWithoutPassword } = mockUser;
          user = userWithoutPassword;
        }
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas',
        });
      }

      // Generar token JWT simple
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        iat: Date.now(),
        exp: Date.now() + 24 * 60 * 60 * 1000, // 24 horas
      };
      const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

      return res.status(200).json({
        success: true,
        data: {
          user: {
            ...user,
            accessToken: token,
          },
          token,
          isFromDatabase,
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
