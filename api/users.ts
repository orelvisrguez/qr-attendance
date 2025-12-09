// ============================================
// USERS API - Vercel Serverless Function
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mock database
let mockUsers = [
  { id: '1', email: 'admin@demo.com', firstName: 'Admin', lastName: 'Sistema', role: 'ADMIN', status: 'active', createdAt: new Date().toISOString() },
  { id: '2', email: 'profesor@demo.com', firstName: 'Juan', lastName: 'Pérez', role: 'PROFESOR', status: 'active', createdAt: new Date().toISOString() },
  { id: '3', email: 'profesor2@demo.com', firstName: 'Ana', lastName: 'López', role: 'PROFESOR', status: 'active', createdAt: new Date().toISOString() },
  { id: '4', email: 'alumno@demo.com', firstName: 'María', lastName: 'García', role: 'ALUMNO', status: 'active', createdAt: new Date().toISOString() },
  { id: '5', email: 'alumno2@demo.com', firstName: 'Carlos', lastName: 'Rodríguez', role: 'ALUMNO', status: 'active', createdAt: new Date().toISOString() },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  // GET /api/users - List all users
  if (req.method === 'GET' && !id) {
    const { role, status, search, page = '1', limit = '10' } = req.query;

    let filtered = [...mockUsers];

    if (role && role !== 'all') {
      filtered = filtered.filter((u) => u.role === role);
    }

    if (status && status !== 'all') {
      filtered = filtered.filter((u) => u.status === status);
    }

    if (search) {
      const searchLower = (search as string).toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.firstName.toLowerCase().includes(searchLower) ||
          u.lastName.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower)
      );
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const start = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(start, start + limitNum);

    return res.status(200).json({
      success: true,
      data: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limitNum),
      },
      stats: {
        total: mockUsers.length,
        active: mockUsers.filter((u) => u.status === 'active').length,
        inactive: mockUsers.filter((u) => u.status === 'inactive').length,
        byRole: {
          ADMIN: mockUsers.filter((u) => u.role === 'ADMIN').length,
          PROFESOR: mockUsers.filter((u) => u.role === 'PROFESOR').length,
          ALUMNO: mockUsers.filter((u) => u.role === 'ALUMNO').length,
        },
      },
    });
  }

  // GET /api/users/:id
  if (req.method === 'GET' && id) {
    const user = mockUsers.find((u) => u.id === id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }
    return res.status(200).json({ success: true, data: user });
  }

  // POST /api/users - Create user
  if (req.method === 'POST') {
    const { email, firstName, lastName, role, status = 'active' } = req.body;

    if (!email || !firstName || !lastName || !role) {
      return res.status(400).json({ success: false, error: 'Campos requeridos faltantes' });
    }

    const newUser = {
      id: Date.now().toString(),
      email,
      firstName,
      lastName,
      role,
      status,
      createdAt: new Date().toISOString(),
    };

    mockUsers.push(newUser);
    return res.status(201).json({ success: true, data: newUser });
  }

  // PUT /api/users/:id - Update user
  if (req.method === 'PUT' && id) {
    const index = mockUsers.findIndex((u) => u.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    mockUsers[index] = { ...mockUsers[index], ...req.body };
    return res.status(200).json({ success: true, data: mockUsers[index] });
  }

  // DELETE /api/users/:id
  if (req.method === 'DELETE' && id) {
    const index = mockUsers.findIndex((u) => u.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    mockUsers.splice(index, 1);
    return res.status(200).json({ success: true, message: 'Usuario eliminado' });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
