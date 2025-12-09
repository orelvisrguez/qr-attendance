// ============================================
// AUTH API - Vercel Serverless Function
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mock users for demo
const MOCK_USERS = [
  {
    id: '1',
    email: 'admin@demo.com',
    password: 'demo123',
    firstName: 'Admin',
    lastName: 'Sistema',
    role: 'ADMIN',
  },
  {
    id: '2',
    email: 'profesor@demo.com',
    password: 'demo123',
    firstName: 'Juan',
    lastName: 'Pérez',
    role: 'PROFESOR',
  },
  {
    id: '3',
    email: 'alumno@demo.com',
    password: 'demo123',
    firstName: 'María',
    lastName: 'García',
    role: 'ALUMNO',
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Route: POST /api/auth (login)
  if (req.method === 'POST') {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email y contraseña son requeridos',
        });
      }

      const user = MOCK_USERS.find((u) => u.email === email);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas',
        });
      }

      if (password !== user.password) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas',
        });
      }

      // Generate mock token
      const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

      const { password: _, ...userWithoutPassword } = user;

      return res.status(200).json({
        success: true,
        data: {
          user: userWithoutPassword,
          token,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
