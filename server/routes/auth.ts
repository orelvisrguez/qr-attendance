// ============================================
// AUTH ROUTES
// ============================================

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const router = Router();

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-jwt-secret-key-min-32-chars!'
);

// Mock users para desarrollo (en producción: usar Prisma)
// En desarrollo usamos contraseñas en texto plano para simplificar
const MOCK_USERS = [
  {
    id: '1',
    email: 'admin@demo.com',
    password: 'demo123',
    firstName: 'Administrador',
    lastName: 'Sistema',
    role: 'ADMIN' as const,
    isActive: true,
  },
  {
    id: '2',
    email: 'profesor@demo.com',
    password: 'demo123',
    firstName: 'Juan',
    lastName: 'Pérez',
    role: 'PROFESOR' as const,
    isActive: true,
  },
  {
    id: '3',
    email: 'alumno@demo.com',
    password: 'demo123',
    firstName: 'Carlos',
    lastName: 'López',
    role: 'ALUMNO' as const,
    isActive: true,
  },
];

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son requeridos',
      });
    }

    // Buscar usuario
    const user = MOCK_USERS.find((u) => u.email === email);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas',
      });
    }

    // Verificar contraseña (comparación directa en desarrollo)
    const isValid = password === user.password;

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Usuario desactivado',
      });
    }

    // Generar JWT
    const accessToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    // Respuesta sin password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: {
        ...userWithoutPassword,
        accessToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token no proporcionado',
      });
    }

    const token = authHeader.slice(7);

    const { payload } = await jwtVerify(token, JWT_SECRET);

    const user = MOCK_USERS.find((u) => u.id === payload.sub);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado',
      });
    }

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: {
        ...userWithoutPassword,
        accessToken: token,
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Token inválido',
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Sesión cerrada' });
});

export default router;
