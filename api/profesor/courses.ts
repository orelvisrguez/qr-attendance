// ============================================
// PROFESOR COURSES API - Vercel Serverless Function
// Obtener cursos y materias asignados al profesor
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase';

// CORS headers helper
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

// Mock data para cuando no hay DB configurada
const MOCK_COURSES = [
  { id: 'course-1', name: '3ro A', grade: '3ro Secundaria', section: 'A', year: 2024, studentCount: 32 },
  { id: 'course-2', name: '3ro B', grade: '3ro Secundaria', section: 'B', year: 2024, studentCount: 30 },
  { id: 'course-3', name: '4to A', grade: '4to Secundaria', section: 'A', year: 2024, studentCount: 28 },
];

const MOCK_SUBJECTS = [
  { id: 'subject-1', name: 'Matemáticas', code: 'MAT-301', courseId: 'course-1' },
  { id: 'subject-2', name: 'Física', code: 'FIS-301', courseId: 'course-1' },
  { id: 'subject-3', name: 'Química', code: 'QUI-301', courseId: 'course-2' },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { profesorId } = req.query;

    if (!profesorId) {
      return res.status(400).json({
        success: false,
        error: 'profesorId es requerido',
      });
    }

    let courses: any[] = [];
    let subjects: any[] = [];
    let isFromDatabase = false;

    try {
      // Obtener cursos asignados al profesor
      const { data: courseAssignments, error: courseError } = await supabaseAdmin
        .from('course_profesors')
        .select(`
          course:courses (
            id,
            name,
            grade,
            section,
            year,
            is_active
          )
        `)
        .eq('profesor_id', profesorId);

      if (!courseError && courseAssignments && courseAssignments.length > 0) {
        isFromDatabase = true;

        // Extraer cursos únicos
        const courseIds: string[] = [];
        courses = courseAssignments
          .map((ca: any) => ca.course)
          .filter((c: any) => c && c.is_active)
          .map((c: any) => {
            courseIds.push(c.id);
            return {
              id: c.id,
              name: c.name,
              grade: c.grade,
              section: c.section,
              year: c.year,
            };
          });

        // Obtener materias de esos cursos
        if (courseIds.length > 0) {
          const { data: subjectData } = await supabaseAdmin
            .from('subjects')
            .select('id, name, code, course_id')
            .in('course_id', courseIds);

          if (subjectData) {
            subjects = subjectData.map((s: any) => ({
              id: s.id,
              name: s.name,
              code: s.code,
              courseId: s.course_id,
            }));
          }
        }

        // Obtener conteo de estudiantes por curso
        for (const course of courses) {
          const { count } = await supabaseAdmin
            .from('course_students')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);

          course.studentCount = count || 0;
        }
      }
    } catch (dbError) {
      console.log('Database not available, using mock data');
    }

    // Fallback a mock data
    if (!isFromDatabase || courses.length === 0) {
      courses = MOCK_COURSES;
      subjects = MOCK_SUBJECTS;
    }

    return res.status(200).json({
      success: true,
      data: {
        courses,
        subjects,
        isFromDatabase,
      },
    });
  } catch (error) {
    console.error('Error en GET /api/profesor/courses:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
}
