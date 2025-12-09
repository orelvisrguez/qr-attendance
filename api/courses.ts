// ============================================
// COURSES API - Vercel Serverless Function
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mock database
let mockCourses = [
  {
    id: 'c1',
    name: '3ro A',
    grade: '3ro Secundaria',
    section: 'A',
    year: 2025,
    isActive: true,
    subjects: [
      { id: 's1', name: 'Matemáticas', code: 'MAT-301' },
      { id: 's2', name: 'Física', code: 'FIS-301' },
      { id: 's3', name: 'Historia', code: 'HIS-301' },
    ],
    profesors: [
      { id: 'p1', name: 'Juan Pérez', subjects: ['Matemáticas', 'Física'] },
    ],
  },
  {
    id: 'c2',
    name: '4to A',
    grade: '4to Secundaria',
    section: 'A',
    year: 2025,
    isActive: true,
    subjects: [
      { id: 's4', name: 'Matemáticas', code: 'MAT-401' },
      { id: 's5', name: 'Química', code: 'QUI-401' },
    ],
    profesors: [],
  },
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

  // GET /api/courses - List all courses
  if (req.method === 'GET' && !id) {
    return res.status(200).json({
      success: true,
      data: mockCourses,
      stats: {
        total: mockCourses.length,
        active: mockCourses.filter((c) => c.isActive).length,
        inactive: mockCourses.filter((c) => !c.isActive).length,
      },
    });
  }

  // GET /api/courses/:id
  if (req.method === 'GET' && id) {
    const course = mockCourses.find((c) => c.id === id);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Curso no encontrado' });
    }
    return res.status(200).json({ success: true, data: course });
  }

  // POST /api/courses - Create course
  if (req.method === 'POST' && !id) {
    const { name, grade, section, year, isActive = true } = req.body;

    const newCourse = {
      id: `c${Date.now()}`,
      name,
      grade,
      section,
      year,
      isActive,
      subjects: [],
      profesors: [],
    };

    mockCourses.push(newCourse);
    return res.status(201).json({ success: true, data: newCourse });
  }

  // PUT /api/courses/:id - Update course
  if (req.method === 'PUT' && id) {
    const index = mockCourses.findIndex((c) => c.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Curso no encontrado' });
    }

    mockCourses[index] = { ...mockCourses[index], ...req.body };
    return res.status(200).json({ success: true, data: mockCourses[index] });
  }

  // DELETE /api/courses/:id
  if (req.method === 'DELETE' && id) {
    const index = mockCourses.findIndex((c) => c.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Curso no encontrado' });
    }

    mockCourses.splice(index, 1);
    return res.status(200).json({ success: true, message: 'Curso eliminado' });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
